import { ipcMain, shell } from 'electron'
import { simpleGit, SimpleGit } from 'simple-git'
import { basename, join } from 'path'
import { readFile, writeFile, unlink, stat, chmod, mkdir, readdir, rename } from 'fs/promises'
import { tmpdir, homedir } from 'os'
import { existsSync } from 'fs'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'

const pexecFile = promisify(execFile)
import type {
  BlameLine,
  BranchCompareResult,
  ConflictSide,
  BranchesPayload,
  BranchInfo,
  ConflictOpKind,
  ConflictVersions,
  FileChangeKind,
  FileEntry,
  FileHistoryEntry,
  GraphCommit,
  RemoteBranchInfo,
  RemoteInfo,
  RepoStatus,
  RepoSummary,
  RebaseStep,
  RepoStats,
  ReflogEntry,
  BisectStatus,
  CommitSignature,
  SigningConfig,
  HooksInfo,
  HookInfo,
  LfsInfo,
  LfsFile,
  SparseCheckoutInfo,
  StashInfo,
  TagInfo,
  WorktreeInfo,
  SubmoduleInfo,
  SubmoduleStatus,
  TreeEntry,
  TreeStatusKind,
  ActivityEvent,
  CodeSearchHit,
  HistorySearchHit,
  StackInfo,
  StackBranch,
  RepoInsights,
  AuthorStat,
  FileHotspot,
  ChurnPoint,
  ChangelogResult,
  SnapshotInfo,
  CloneProgress,
  RepoHost
} from '../shared/types'
import { recordEvent } from './analytics'
import { recordLog } from './log'
import { activeProfileToken } from './settings'

const SEP = '\x1f'
const REC = '\x1e'

/**
 * Maps a git IPC method to the activity event it should record on success.
 * `commit` is special-cased in the dispatcher (amend flag → 'amend').
 */
const EVENT_FOR_METHOD: Record<string, ActivityEvent> = {
  push: 'push',
  pull: 'pull',
  fetchAll: 'fetch',
  fetchRemote: 'fetch',
  amendCommitMessage: 'amend',
  createBranch: 'branchCreate',
  deleteBranch: 'branchDelete',
  deleteRemoteBranch: 'branchDelete',
  merge: 'merge',
  mergeInto: 'merge',
  rebase: 'rebase',
  runInteractiveRebase: 'rebase',
  stash: 'stash',
  stashPop: 'stashPop',
  resolveConflict: 'conflictResolved',
  conflictTakeSide: 'conflictResolved',
  createTag: 'tagCreate',
  cherryPick: 'cherryPick',
  revertCommit: 'revert',
  open: 'repoOpen',
  clone: 'clone',
  init: 'init'
}

function eventForCall(method: string, args: unknown[]): ActivityEvent | null {
  if (method === 'commit') return args[2] === true ? 'amend' : 'commit'
  return EVENT_FOR_METHOD[method] ?? null
}

/** Parse `Co-authored-by` trailer values ("Name <email>") into authors. */
function parseCoAuthors(raw: string | undefined): import('../shared/types').CommitAuthor[] {
  if (!raw) return []
  return raw
    .split('\x1d')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)\s*<([^>]*)>\s*$/)
      return m ? { name: m[1].trim(), email: m[2].trim() } : { name: line, email: '' }
    })
}

/** Normalise git's `%G?` signature char into a {@link CommitSignature}. */
function mapSignature(char: string | undefined): CommitSignature {
  switch ((char ?? '').trim()) {
    case 'G':
      return 'good'
    case 'U': // good signature, unknown validity
    case 'E': // signature present but cannot be checked (e.g. missing public key)
      return 'unverified'
    case 'X': // expired signature
    case 'Y': // signature made by an expired key
      return 'expired'
    case 'B': // bad signature
    case 'R': // good signature made by a revoked key
      return 'bad'
    default: // 'N' or empty — no signature
      return 'none'
  }
}

/** Common client-side git hooks, in the order git documents them. */
const KNOWN_HOOKS = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'post-rewrite',
  'pre-auto-gc'
]

/** Resolve a repo's hooks directory, honouring a custom `core.hooksPath`. */
async function resolveHooksDir(git: SimpleGit, repoPath: string): Promise<{ dir: string; custom: boolean }> {
  const custom = (await git.raw(['config', '--get', 'core.hooksPath']).catch(() => '')).trim()
  if (custom) {
    let p = custom
    if (p === '~' || p.startsWith('~/')) p = join(homedir(), p.slice(1))
    else if (!p.startsWith('/')) p = join(repoPath, p)
    return { dir: p, custom: true }
  }
  const gitDir = (await git.raw(['rev-parse', '--git-path', 'hooks']).catch(() => '')).trim()
  const dir = gitDir ? (gitDir.startsWith('/') ? gitDir : join(repoPath, gitDir)) : join(repoPath, '.git', 'hooks')
  return { dir, custom: false }
}

// Cache one SimpleGit instance per repo. simple-git serializes tasks within a
// single instance, so reusing the instance makes every op on a repo run
// sequentially — preventing concurrent ops (e.g. a user checkout racing a
// watcher-triggered status refresh) from colliding on `.git/index.lock`.
const gitInstances = new Map<string, SimpleGit>()
const gitFor = (repoPath: string): SimpleGit => {
  let git = gitInstances.get(repoPath)
  if (!git) {
    git = simpleGit(repoPath)
    gitInstances.set(repoPath, git)
  }
  return git
}

/**
 * Auto-stash. If the working tree is dirty, shelve it under a
 * NAMED stash (visible in the stash list), run the operation, then restore it.
 *
 *  - Clean tree → runs the op directly, no stash.
 *  - Op fails    → the named stash is left untouched so the user's changes stay
 *                  recoverable; the original error is surfaced.
 *  - Pop conflicts on restore → git keeps the named stash and the conflict
 *                  surfaces to the user to resolve (their changes aren't lost).
 */
async function withAutoStash<T>(
  repoPath: string,
  label: string,
  op: () => Promise<T>
): Promise<T> {
  const git = gitFor(repoPath)
  const st = await git.status()
  if (st.files.length === 0) return op()
  await git.stash(['push', '--include-untracked', '-m', `Auto-stash before ${label}`])
  const result = await op() // if this throws, the named stash is left for recovery
  await git.stash(['pop']) // a pop conflict throws; git keeps the stash regardless
  return result
}

/** Inject credentials into an https clone URL so private integration repos can be cloned non-interactively. */
function authedCloneUrl(url: string, host?: string, token?: string): string {
  if (!token || !token.trim() || !/^https:\/\//i.test(url)) return url
  try {
    const u = new URL(url)
    const t = token.trim()
    switch (host) {
      case 'github':
        u.username = 'oauth2'
        u.password = t
        break
      case 'gitlab':
        u.username = 'oauth2'
        u.password = t
        break
      case 'bitbucket':
        // token stored as username:app_password
        if (t.includes(':')) {
          const [user, ...rest] = t.split(':')
          u.username = user
          u.password = rest.join(':')
        } else {
          u.username = 'x-token-auth'
          u.password = t
        }
        break
      case 'azure':
        u.username = ''
        u.password = t
        break
      default:
        return url
    }
    return u.toString()
  } catch {
    return url
  }
}

/** Map a remote URL's hostname to the provider whose PAT can authenticate it. */
function hostFromUrl(url: string): RepoHost | undefined {
  try {
    const h = new URL(url).hostname.toLowerCase()
    if (h.includes('github')) return 'github'
    if (h.includes('gitlab')) return 'gitlab'
    if (h.includes('bitbucket')) return 'bitbucket'
    if (h.includes('azure') || h.endsWith('visualstudio.com')) return 'azure'
  } catch {
    /* not a parseable URL (e.g. scp-style ssh) → no host */
  }
  return undefined
}

// Disable git's interactive credential prompt for network ops run from the app.
// Electron has no controlling TTY, so a prompt fails with the opaque macOS error
// "could not read Password … Device not configured". With this set, a missing
// credential surfaces immediately as a clear "could not read Username/Password"
// (terminal prompts disabled) error instead of hanging on /dev/tty.
const noPromptEnv = (): NodeJS.ProcessEnv => ({ ...process.env, GIT_TERMINAL_PROMPT: '0' })

/** Run a git command non-interactively, surfacing stderr as the thrown message. */
async function runGit(repoPath: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await pexecFile('git', ['-C', repoPath, ...args], { env: noPromptEnv() })
    return stdout
  } catch (err) {
    const e = err as { stderr?: string; message?: string }
    throw new Error((e.stderr || e.message || 'git command failed').trim())
  }
}

async function getRemoteUrl(repoPath: string, remote: string): Promise<string> {
  try {
    const { stdout } = await pexecFile('git', ['-C', repoPath, 'remote', 'get-url', remote])
    return stdout.trim()
  } catch {
    return ''
  }
}

/** The remote a plain `git pull` would use (the current branch's upstream), or 'origin'. */
async function upstreamRemote(repoPath: string): Promise<string> {
  try {
    const { stdout } = await pexecFile('git', [
      '-C',
      repoPath,
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{u}'
    ])
    const slash = stdout.trim().indexOf('/')
    if (slash > 0) return stdout.trim().slice(0, slash)
  } catch {
    /* no upstream configured → fall back to origin */
  }
  return 'origin'
}

/**
 * Run a network git operation (push/pull/fetch) against `remote`, injecting the
 * active profile's PAT for the duration of the call. The token is matched to the
 * remote's host and written into the remote URL only transiently — reset in
 * `finally` — so it is never persisted to `.git/config`, mirroring `clone()`.
 * When no token applies (ssh remote, unknown host, or none configured) the op
 * runs as-is and relies on `GIT_TERMINAL_PROMPT=0` to fail fast.
 */
async function withRemoteAuth<T>(repoPath: string, remote: string, op: () => Promise<T>): Promise<T> {
  const url = await getRemoteUrl(repoPath, remote)
  const host = url ? hostFromUrl(url) : undefined
  const token = host ? await activeProfileToken(host) : undefined
  const authed = token ? authedCloneUrl(url, host, token) : url
  if (!authed || authed === url) return op()
  await pexecFile('git', ['-C', repoPath, 'remote', 'set-url', remote, authed])
  try {
    return await op()
  } finally {
    // Restore the token-free URL so the PAT does not linger on disk.
    await pexecFile('git', ['-C', repoPath, 'remote', 'set-url', remote, url]).catch(() => undefined)
  }
}


function parseTrack(track: string): { ahead: number; behind: number } {
  const ahead = /ahead (\d+)/.exec(track)
  const behind = /behind (\d+)/.exec(track)
  return { ahead: ahead ? +ahead[1] : 0, behind: behind ? +behind[1] : 0 }
}

/**
 * Commits each side has that the other lacks, computed without checking out
 * either ref. `ahead` = commits on `local` not on `remote`; `behind` = the
 * reverse. Both > 0 means the branches have diverged and can't be
 * fast-forwarded.
 */
async function divergence(
  git: SimpleGit,
  local: string,
  remote: string
): Promise<{ ahead: number; behind: number }> {
  const out = await git.raw(['rev-list', '--left-right', '--count', `${local}...${remote}`])
  const [ahead, behind] = out.trim().split(/\s+/).map((n) => Number(n) || 0)
  return { ahead: ahead ?? 0, behind: behind ?? 0 }
}

/** Filesystem-safe timestamp (no colons) for naming backup branches. */
function backupStamp(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function mapStatusCode(code: string): FileChangeKind {
  switch (code) {
    case 'A':
      return 'A'
    case 'D':
      return 'D'
    case 'R':
      return 'R'
    case 'C':
      return 'C'
    case 'U':
      return 'U'
    case '?':
      return '?'
    default:
      return 'M'
  }
}

/** Git records a stash's reflog subject as `WIP on <branch>: …` or
 *  `On <branch>: <message>`. Split it into the originating branch and the
 *  meaningful message; the UI shows them separately so the redundant prefix
 *  isn't repeated inline. */
function parseStashSubject(subject: string): { branch: string | null; message: string } {
  const m = subject.match(/^(?:WIP on|On) ([^:]*):\s*(.*)$/)
  if (!m) return { branch: null, message: subject }
  return { branch: m[1] || null, message: (m[2] || '').trim() || subject }
}

/** MIME type by extension, covering images plus the binary formats the file
 *  previewer can render (pdf, video, audio, office docs). Unknown extensions
 *  fall back to a generic binary type so the data URL is still well-formed. */
function fileMime(file: string): string {
  const ext = (file.split('.').pop() || '').toLowerCase()
  const map: Record<string, string> = {
    // images
    svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
    // documents
    pdf: 'application/pdf',
    // video
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime', m4v: 'video/mp4',
    // audio
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac', aac: 'audio/aac',
    // office
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  }
  return map[ext] || `application/octet-stream`
}

/** Read a file as a base64 data URL (mime by extension). Returns null if the
 *  file is missing at the given ref (e.g. an added/deleted side of a diff)
 *  instead of throwing. */
async function readFileDataUrl(repoPath: string, file: string, ref?: string): Promise<string | null> {
  try {
    let buf: Buffer
    if (!ref) {
      buf = await readFile(join(repoPath, file))
    } else {
      buf = await new Promise<Buffer>((resolve, reject) => {
        const child = spawn('git', ['-C', repoPath, 'show', `${ref}:${file}`])
        const chunks: Buffer[] = []
        const errChunks: Buffer[] = []
        child.stdout.on('data', (d: Buffer) => chunks.push(d))
        child.stderr.on('data', (d: Buffer) => errChunks.push(d))
        child.on('error', reject)
        child.on('close', (code) =>
          code === 0
            ? resolve(Buffer.concat(chunks))
            : reject(new Error(Buffer.concat(errChunks).toString() || `git show exited ${code}`))
        )
      })
    }
    return `data:${fileMime(file)};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Build a {@link BisectStatus} snapshot from the current repo state plus the
 * stdout of the bisect command that just ran (git prints progress like
 * "Bisecting: N revisions left … (roughly M steps)" and, on completion,
 * "<sha> is the first bad commit" — both to stdout).
 */
async function buildBisectStatus(repoPath: string, lastOut = ''): Promise<BisectStatus> {
  const git = gitFor(repoPath)
  const gitPath = async (name: string): Promise<string> => (await git.raw(['rev-parse', '--git-path', name])).trim()
  const absPath = (p: string): string => (p.startsWith('/') ? p : join(repoPath, p))
  const inProgress = existsSync(absPath(await gitPath('BISECT_START')))

  const empty: BisectStatus = {
    inProgress: false,
    needGood: false,
    needBad: false,
    currentSha: '',
    currentSubject: '',
    remainingSteps: -1,
    finished: false,
    firstBadSha: '',
    firstBadSubject: ''
  }
  if (!inProgress) return empty

  const finishedMatch = lastOut.match(/([0-9a-f]{40}) is the first bad commit/)
  const stepsMatch = lastOut.match(/roughly (\d+) step/)
  const needGood = /waiting for good|waiting for both/.test(lastOut)
  const needBad = /waiting for both|bad commit/.test(lastOut) && !/bad commit known/.test(lastOut)

  let firstBadSha = ''
  let firstBadSubject = ''
  if (finishedMatch) {
    firstBadSha = finishedMatch[1]
    firstBadSubject = (await git.raw(['log', '-1', '--pretty=%s', firstBadSha]).catch(() => '')).trim()
  }

  let currentSha = ''
  let currentSubject = ''
  if (!finishedMatch && !needGood && !needBad) {
    currentSha = (await git.raw(['rev-parse', 'HEAD']).catch(() => '')).trim()
    currentSubject = (await git.raw(['log', '-1', '--pretty=%s', 'HEAD']).catch(() => '')).trim()
  }

  return {
    inProgress: true,
    needGood,
    needBad,
    currentSha,
    currentSubject,
    remainingSteps: stepsMatch ? +stepsMatch[1] : -1,
    finished: !!finishedMatch,
    firstBadSha,
    firstBadSubject
  }
}

export const gitService = {
  async open(repoPath: string): Promise<RepoSummary> {
    const git = gitFor(repoPath)
    const isRepo = await git.checkIsRepo()
    if (!isRepo) throw new Error(`Not a git repository: ${repoPath}`)
    let current = 'HEAD'
    try {
      current = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim()
    } catch {
      /* empty repo */
    }
    return { path: repoPath, name: basename(repoPath), current }
  },

  async log(repoPath: string, maxCount = 400): Promise<GraphCommit[]> {
    const args = [
      '-C',
      repoPath,
      'log',
      // Real refs only — excludes `refs/original/*` filter-branch backups and
      // other internal refs that `--all` would surface as ghost lanes.
      '--branches',
      '--tags',
      '--remotes',
      'HEAD',
      '--date-order',
      `--max-count=${maxCount}`,
      `--pretty=format:%H${SEP}%P${SEP}%an${SEP}%ae${SEP}%at${SEP}%D${SEP}%s${SEP}%(trailers:key=Co-authored-by,valueonly,separator=%x1d)${SEP}%G?${SEP}%GS${REC}`
    ]
    let raw = ''
    try {
      const { stdout } = await pexecFile('git', args, { maxBuffer: 64 * 1024 * 1024 })
      raw = stdout
    } catch (err) {
      // The `%G?`/`%GS` signature placeholders force git to load the gpg config to
      // verify each commit. A malformed value (e.g. an invalid `gpg.format` in the
      // user's global gitconfig) makes `git log` exit non-zero *after* it has
      // already written the commit records to stdout. Salvage that stdout so the
      // whole graph isn't blanked to "No commits yet" over a signing-config quirk;
      // a genuinely empty repository simply yields no output here.
      raw = (err as { stdout?: string }).stdout ?? ''
    }
    if (!raw.trim()) return [] // empty repository
    return raw
      .split(REC)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((rec) => {
        const [hash, parents, author, email, date, refs, subject, coauthors, sigChar, signer] = rec.split(SEP)
        const signature = mapSignature(sigChar)
        return {
          hash,
          parents: parents ? parents.split(' ').filter(Boolean) : [],
          author,
          email,
          date: +date,
          refs: refs
            ? refs
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          subject: subject ?? '',
          coAuthors: parseCoAuthors(coauthors),
          signature: signature === 'none' ? undefined : signature,
          signer: signer?.trim() || undefined
        }
      })
  },

  async branches(repoPath: string): Promise<BranchesPayload> {
    const git = gitFor(repoPath)
    let current = ''
    try {
      current = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim()
    } catch {
      /* empty repo */
    }

    const locals: BranchInfo[] = []
    try {
      const out = await git.raw([
        'for-each-ref',
        `--format=%(refname:short)${SEP}%(objectname:short)${SEP}%(upstream:short)${SEP}%(upstream:track)`,
        'refs/heads'
      ])
      for (const line of out.split('\n').filter(Boolean)) {
        const [name, sha, upstream, track] = line.split(SEP)
        const { ahead, behind } = parseTrack(track ?? '')
        locals.push({ name, sha, upstream: upstream || null, ahead, behind, isCurrent: name === current })
      }
    } catch {
      /* ignore */
    }

    const remotes: RemoteBranchInfo[] = []
    try {
      const out = await git.raw(['for-each-ref', `--format=%(refname:short)${SEP}%(objectname:short)`, 'refs/remotes'])
      for (const line of out.split('\n').filter(Boolean)) {
        const [fullName, sha] = line.split(SEP)
        if (fullName.endsWith('/HEAD')) continue
        const slash = fullName.indexOf('/')
        remotes.push({ remote: fullName.slice(0, slash), name: fullName.slice(slash + 1), fullName, sha })
      }
    } catch {
      /* ignore */
    }

    const tags: TagInfo[] = []
    try {
      const out = await git.raw([
        'for-each-ref',
        '--sort=-version:refname',
        `--format=%(refname:short)${SEP}%(objectname:short)`,
        'refs/tags'
      ])
      for (const line of out.split('\n').filter(Boolean)) {
        const [name, sha] = line.split(SEP)
        tags.push({ name, sha })
      }
    } catch {
      /* ignore */
    }

    return { current, locals, remotes, tags }
  },

  async status(repoPath: string): Promise<RepoStatus> {
    const git = gitFor(repoPath)
    const st = await git.status()
    const conflictPaths = new Set(st.conflicted)
    const staged: FileEntry[] = []
    const unstaged: FileEntry[] = []
    const conflicted: FileEntry[] = []
    for (const f of st.files) {
      if (conflictPaths.has(f.path)) {
        conflicted.push({ path: f.path, status: 'U' })
        continue
      }
      const index = f.index?.trim() ?? ''
      const work = f.working_dir?.trim() ?? ''
      if (f.index === '?' || f.working_dir === '?') {
        unstaged.push({ path: f.path, status: '?', untracked: true })
        continue
      }
      if (index && index !== '?') staged.push({ path: f.path, status: mapStatusCode(index) })
      if (work && work !== '?') unstaged.push({ path: f.path, status: mapStatusCode(work) })
    }
    return {
      current: st.current ?? '',
      tracking: st.tracking,
      ahead: st.ahead,
      behind: st.behind,
      staged,
      unstaged,
      conflicted
    }
  },

  async mergeState(repoPath: string): Promise<ConflictOpKind | null> {
    const git = gitFor(repoPath)
    const gitPath = async (name: string): Promise<string> => (await git.raw(['rev-parse', '--git-path', name])).trim()
    const abs = (p: string): string => (p.startsWith('/') ? p : join(repoPath, p))
    if (existsSync(abs(await gitPath('rebase-merge'))) || existsSync(abs(await gitPath('rebase-apply')))) return 'rebase'
    if (existsSync(abs(await gitPath('MERGE_HEAD')))) return 'merge'
    if (existsSync(abs(await gitPath('CHERRY_PICK_HEAD')))) return 'cherry-pick'
    if (existsSync(abs(await gitPath('REVERT_HEAD')))) return 'revert'
    return null
  },

  // The message git prepared for an in-progress merge/cherry-pick/revert
  // (e.g. "Merge branch 'main' into feat/ui"). Empty if none is pending. Comment
  // lines (starting with '#') are stripped so it can prefill the commit composer.
  async mergeMessage(repoPath: string): Promise<string> {
    const git = gitFor(repoPath)
    const gitPath = async (name: string): Promise<string> => (await git.raw(['rev-parse', '--git-path', name])).trim()
    const abs = (p: string): string => (p.startsWith('/') ? p : join(repoPath, p))
    const msgPath = abs(await gitPath('MERGE_MSG'))
    if (!existsSync(msgPath)) return ''
    const raw = await readFile(msgPath, 'utf-8')
    return raw
      .split('\n')
      .filter((line) => !line.startsWith('#'))
      .join('\n')
      .trim()
  },

  async conflictVersions(repoPath: string, file: string): Promise<ConflictVersions> {
    const git = gitFor(repoPath)
    const show = async (stage: number): Promise<string | null> => {
      try {
        return await git.raw(['show', `:${stage}:${file}`])
      } catch {
        return null
      }
    }
    let content = ''
    try {
      content = await readFile(join(repoPath, file), 'utf-8')
    } catch {
      /* deleted on disk */
    }
    const [base, ours, theirs] = await Promise.all([show(1), show(2), show(3)])
    return { content, base, ours, theirs }
  },

  async resolveConflict(repoPath: string, file: string, content: string): Promise<void> {
    await writeFile(join(repoPath, file), content, 'utf-8')
    await gitFor(repoPath).add([file])
  },

  async conflictTakeSide(repoPath: string, file: string, side: ConflictSide): Promise<void> {
    const git = gitFor(repoPath)
    if (side === 'delete') {
      await git.raw(['rm', '--', file])
      return
    }
    await git.raw(['checkout', side === 'ours' ? '--ours' : '--theirs', '--', file])
    await git.add([file])
  },

  async conflictOpContinue(repoPath: string, kind: ConflictOpKind): Promise<void> {
    // Suppress the commit-message editor on --continue. Pass core.editor via a
    // `-c` arg (with allowUnsafeEditor) rather than `.env()`: simple-git's
    // unsafe-operations guard scans the *entire* env object handed to `.env()`,
    // so spreading process.env would trip on inherited vars like PAGER /
    // GIT_ASKPASS. The child still inherits the parent env naturally.
    const git = simpleGit(repoPath, { unsafe: { allowUnsafeEditor: true } })
    const noEditor = ['-c', 'core.editor=true']
    if (kind === 'merge') await git.raw([...noEditor, 'merge', '--continue'])
    else if (kind === 'cherry-pick') await git.raw([...noEditor, 'cherry-pick', '--continue'])
    else if (kind === 'rebase') await git.raw([...noEditor, 'rebase', '--continue'])
    else await git.raw([...noEditor, 'revert', '--continue'])
  },

  async conflictOpAbort(repoPath: string, kind: ConflictOpKind): Promise<void> {
    const git = gitFor(repoPath)
    if (kind === 'merge') await git.raw(['merge', '--abort'])
    else if (kind === 'cherry-pick') await git.raw(['cherry-pick', '--abort'])
    else if (kind === 'rebase') await git.raw(['rebase', '--abort'])
    else await git.raw(['revert', '--abort'])
  },

  async stashes(repoPath: string): Promise<StashInfo[]> {
    const git = gitFor(repoPath)
    try {
      const out = await git.raw(['stash', 'list', `--pretty=format:%H${SEP}%P${SEP}%at${SEP}%gs`])
      return out
        .split('\n')
        .filter(Boolean)
        .map((line, i) => {
          const [sha, parents, date, message] = line.split(SEP)
          const parentList = (parents ?? '').split(' ').filter(Boolean)
          const { branch, message: cleanMessage } = parseStashSubject(message ?? '')
          return {
            index: i,
            sha,
            parentSha: parentList[0] ?? '',
            untrackedSha: parentList[2] ?? null,
            date: +date,
            message: cleanMessage,
            branch
          }
        })
    } catch {
      return []
    }
  },

  async remotes(repoPath: string): Promise<RemoteInfo[]> {
    const git = gitFor(repoPath)
    const rs = await git.getRemotes(true)
    return rs.map((r) => ({ name: r.name, url: r.refs.fetch || r.refs.push }))
  },

  async addRemote(repoPath: string, name: string, url: string, pushUrl?: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.addRemote(name, url)
    if (pushUrl && pushUrl !== url) await git.remote(['set-url', '--push', name, pushUrl])
  },

  async removeRemote(repoPath: string, name: string): Promise<void> {
    await gitFor(repoPath).removeRemote(name)
  },

  // Rename a remote and/or update its fetch & push URLs in one shot.
  async editRemote(
    repoPath: string,
    oldName: string,
    newName: string,
    url: string,
    pushUrl?: string
  ): Promise<void> {
    const git = gitFor(repoPath)
    if (newName && newName !== oldName) await git.remote(['rename', oldName, newName])
    const name = newName || oldName
    if (url) await git.remote(['set-url', name, url])
    // An empty pushUrl resets the push URL to mirror the fetch URL.
    if (pushUrl && pushUrl !== url) await git.remote(['set-url', '--push', name, pushUrl])
    else await git.remote(['set-url', '--push', name, url || pushUrl || '']).catch(() => undefined)
  },

  async fetchRemote(repoPath: string, name: string): Promise<void> {
    await withRemoteAuth(repoPath, name, () => runGit(repoPath, ['fetch', name, '--prune']))
  },

  // ─── Branch / nav operations ───────────────────────────────────────────────

  async checkout(repoPath: string, ref: string): Promise<void> {
    await gitFor(repoPath).checkout(ref)
  },

  async checkoutRemote(
    repoPath: string,
    fullName: string,
    localName: string
  ): Promise<{ diverged: boolean; ahead: number; behind: number }> {
    const git = gitFor(repoPath)
    // If a local branch with that name already exists, just switch to it
    // instead of trying to recreate a tracking branch (which would fail with
    // "a branch named '<x>' already exists").
    const branches = await git.branchLocal()
    if (branches.all.includes(localName)) {
      // Compare the existing local branch with the remote tip before touching
      // anything. If they've diverged (both have unique commits) a fast-forward
      // is impossible — report it so the renderer can ask the user how to
      // reconcile instead of dumping git's raw "Not possible to fast-forward".
      const { ahead, behind } = await divergence(git, localName, fullName)
      if (ahead > 0 && behind > 0) {
        return { diverged: true, ahead, behind }
      }
      // Fast-forward the existing local branch to the remote tip so the
      // checkout actually brings in the remote changes. withAutoStash shelves a
      // dirty working tree under a named stash before the FF and restores it
      // after, so local edits don't abort the update.
      await withAutoStash(repoPath, `checkout ${localName}`, async () => {
        await git.checkout(localName)
        if (behind > 0) await git.merge(['--ff-only', fullName])
      })
      return { diverged: false, ahead, behind }
    } else {
      await git.checkout(['-b', localName, '--track', fullName])
      return { diverged: false, ahead: 0, behind: 0 }
    }
  },

  /**
   * Reconcile a diverged local branch with its remote after the user picks a
   * strategy in the divergence dialog. When `backup` is set, a
   * `backup/<localName>-<timestamp>` branch is created at the current local tip
   * first, so even a `reset` can be undone by checking that branch out.
   *   - rebase: replay local commits on top of the remote tip (linear history)
   *   - merge:  --no-ff merge, keeping both histories
   *   - reset:  hard-reset local to the remote tip, discarding local commits
   */
  async resolveDivergedCheckout(
    repoPath: string,
    fullName: string,
    localName: string,
    strategy: 'rebase' | 'merge' | 'reset',
    backup: boolean
  ): Promise<{ backupRef?: string }> {
    const git = gitFor(repoPath)
    let backupRef: string | undefined
    await withAutoStash(repoPath, `checkout ${localName}`, async () => {
      await git.checkout(localName)
      if (backup) {
        backupRef = `backup/${localName}-${backupStamp()}`
        await git.branch([backupRef])
      }
      if (strategy === 'rebase') await git.rebase([fullName])
      else if (strategy === 'merge') await git.merge(['--no-ff', fullName])
      else await git.reset(['--hard', fullName])
    })
    return { backupRef }
  },

  async createBranch(repoPath: string, name: string, at?: string, checkout = true): Promise<void> {
    const git = gitFor(repoPath)
    if (checkout) await git.checkout(at ? ['-b', name, at] : ['-b', name])
    else await git.branch(at ? [name, at] : [name])
  },

  async deleteBranch(repoPath: string, name: string, force = false): Promise<void> {
    await gitFor(repoPath).branch([force ? '-D' : '-d', name])
  },

  async deleteRemoteBranch(repoPath: string, remote: string, name: string): Promise<void> {
    try {
      await withRemoteAuth(repoPath, remote, () => runGit(repoPath, ['push', remote, '--delete', name]))
    } catch (err) {
      // The branch may already be gone on the remote (e.g. Dependabot deleted it
      // after merging its PR) while our local remote-tracking ref lingers because
      // no pruning fetch has run. Git reports this as "remote ref does not exist".
      // In that case there is nothing to push — just prune the stale tracking ref
      // so it disappears from the branch list, which is what the user expects.
      const msg = err instanceof Error ? err.message : String(err)
      if (!/remote ref does not exist/i.test(msg)) throw err
    }
    // Whether the push succeeded or the ref was already gone, drop the local
    // remote-tracking copy so the UI no longer shows the deleted branch.
    await runGit(repoPath, ['update-ref', '-d', `refs/remotes/${remote}/${name}`]).catch(() => undefined)
  },

  // ─── Stacked branches ──────────────────────────────────────────────────
  // A "stack" is a chain of dependent branches where each is based on the one
  // below it. We persist the parent (and the parent tip we last rebased onto)
  // in git config under branch.<name>.gitcitoparent / .gitcitobase, so the
  // metadata travels with the repo and never touches history.

  /** Record (or change) a branch's stack parent, snapshotting the parent tip. */
  async stackSetParent(repoPath: string, branch: string, parent: string): Promise<void> {
    const git = gitFor(repoPath)
    const tip = (await git.revparse([parent])).trim()
    await git.raw(['config', `branch.${branch}.gitcitoparent`, parent])
    await git.raw(['config', `branch.${branch}.gitcitobase`, tip])
  },

  /** Stop tracking a branch as part of a stack. */
  async stackClearParent(repoPath: string, branch: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.raw(['config', '--unset', `branch.${branch}.gitcitoparent`]).catch(() => {})
    await git.raw(['config', '--unset', `branch.${branch}.gitcitobase`]).catch(() => {})
  },

  /**
   * The stack containing `leaf` (defaults to the current branch): walk parent
   * links down to the trunk, then report each level bottom→top with its own
   * commit count and whether its parent has moved (needs a restack).
   */
  async stackInfo(repoPath: string, leaf?: string): Promise<StackInfo> {
    const git = gitFor(repoPath)
    const current = (await git.revparse(['--abbrev-ref', 'HEAD']).catch(() => '')).trim()
    const head = leaf || current
    if (!head || head === 'HEAD') return { trunk: '', branches: [] }

    // Read all recorded parents in one shot.
    const raw = await git
      .raw(['config', '--get-regexp', '^branch\\..*\\.gitcitoparent$'])
      .catch(() => '')
    const parents: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const sp = line.indexOf(' ')
      if (sp < 0) continue
      const key = line.slice(0, sp) // branch.<name>.gitcitoparent
      const val = line.slice(sp + 1).trim()
      const name = key.slice('branch.'.length, key.length - '.gitcitoparent'.length)
      parents[name] = val
    }

    // Walk down to the trunk, guarding against cycles.
    const chainTopDown: string[] = []
    const seen = new Set<string>()
    let cur: string | null = head
    while (cur && parents[cur] && !seen.has(cur)) {
      seen.add(cur)
      chainTopDown.push(cur)
      cur = parents[cur]
    }
    // The bottom-most tracked branch (if any) keeps its parent as trunk; if the
    // leaf itself isn't tracked, the stack is just the leaf on top of `cur`.
    if (chainTopDown.length === 0) chainTopDown.push(head)
    const trunk = parents[chainTopDown[chainTopDown.length - 1]] ?? cur ?? ''
    const ordered = chainTopDown.slice().reverse() // bottom → top

    const branches: StackBranch[] = []
    for (const name of ordered) {
      const parent = parents[name] ?? null
      let ahead = 0
      let needsRestack = false
      if (parent) {
        ahead = Number(
          (await git.raw(['rev-list', '--count', `${parent}..${name}`]).catch(() => '0')).trim()
        )
        const parentTip = (await git.revparse([parent]).catch(() => '')).trim()
        // Restack needed when the parent tip is not yet an ancestor of branch.
        // (merge-base --is-ancestor signals via exit code, which simple-git does
        // not reliably reject on — compare the merge-base sha instead.)
        if (parentTip) {
          const base = (await git.raw(['merge-base', parentTip, name]).catch(() => '')).trim()
          needsRestack = base !== parentTip
        }
      }
      branches.push({ name, parent, isCurrent: name === current, ahead, needsRestack })
    }
    return { trunk, branches }
  },

  /**
   * Restack the chain ending at `leaf`: bottom→top, rebase each branch onto its
   * parent's current tip using the recorded base (so parent rewrites don't
   * duplicate commits). Leaves you back on `leaf`. Throws on conflict.
   */
  async stackRestack(repoPath: string, leaf: string): Promise<void> {
    const git = gitFor(repoPath)
    const info = await gitService.stackInfo(repoPath, leaf)
    for (const b of info.branches) {
      if (!b.parent) continue
      const parentTip = (await git.revparse([b.parent])).trim()
      const mergeBase = (await git.raw(['merge-base', parentTip, b.name]).catch(() => '')).trim()
      if (mergeBase === parentTip) {
        // Parent tip already in this branch — nothing to replay.
        await git.raw(['config', `branch.${b.name}.gitcitobase`, parentTip])
        continue
      }
      let base = (await git.raw(['config', '--get', `branch.${b.name}.gitcitobase`]).catch(() => '')).trim()
      if (!base) base = (await git.raw(['merge-base', b.parent, b.name])).trim()
      // 3-arg form checks out b.name and rebases its commits since `base` onto parentTip.
      await git.raw(['rebase', '--onto', parentTip, base, b.name])
      await git.raw(['config', `branch.${b.name}.gitcitobase`, parentTip])
    }
    await git.checkout(leaf)
  },

  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    await gitFor(repoPath).branch(['-m', oldName, newName])
  },

  /**
   * Rename a branch and move it on the remote too: local `-m`, delete the old
   * upstream branch, then push the new name and set it as upstream. The remote
   * delete is best-effort (e.g. a protected branch may refuse).
   */
  async renameBranchRemote(repoPath: string, oldName: string, newName: string, remote: string): Promise<void> {
    await gitFor(repoPath).branch(['-m', oldName, newName])
    await withRemoteAuth(repoPath, remote, async () => {
      await runGit(repoPath, ['push', remote, '--delete', oldName]).catch(() => undefined)
      await runGit(repoPath, ['push', '-u', remote, newName])
    })
  },

  async merge(repoPath: string, ref: string, noFf = false): Promise<void> {
    await withAutoStash(repoPath, `merge ${ref}`, () =>
      gitFor(repoPath).merge([...(noFf ? ['--no-ff'] : []), ref])
    )
  },

  async mergeInto(repoPath: string, source: string, target: string, noFf = false): Promise<void> {
    const git = gitFor(repoPath)
    await withAutoStash(repoPath, `merge ${source} into ${target}`, async () => {
      await git.checkout(target)
      await git.merge([...(noFf ? ['--no-ff'] : []), source])
    })
  },

  async rebase(repoPath: string, onto: string): Promise<void> {
    await gitFor(repoPath).rebase([onto])
  },

  /** Check out `branch` then rebase it onto `onto` (for the drag-to-rebase gesture). */
  async rebaseOnto(repoPath: string, branch: string, onto: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.checkout(branch)
    await git.rebase([onto])
  },

  async rebaseAbort(repoPath: string): Promise<void> {
    await gitFor(repoPath).rebase(['--abort'])
  },

  /** Commit the staged changes as a `fixup!` of `targetSha` (for autosquash). */
  async commitFixup(repoPath: string, targetSha: string): Promise<void> {
    await gitFor(repoPath).raw(['commit', `--fixup=${targetSha}`])
  },

  /**
   * Rebase onto `base`, auto-ordering and folding any fixup!/squash! commits.
   * Runs non-interactively (the auto-generated todo is accepted as-is).
   */
  async autosquash(repoPath: string, base: string): Promise<void> {
    // Run via execFile, not simple-git: simple-git refuses both a PAGER env
    // (allowUnsafePager) and `-c core.editor` (allowUnsafeEditor). Real git with
    // these *_EDITOR vars set to true accepts the auto-generated todo without
    // opening an editor.
    await pexecFile('git', ['-C', repoPath, 'rebase', '-i', '--autosquash', base], {
      env: { ...process.env, GIT_SEQUENCE_EDITOR: 'true', GIT_EDITOR: 'true' }
    })
  },

  /**
   * Squash a contiguous run of the newest commits (HEAD down to and including
   * `oldestSha`) into a single commit with `message`. Implemented as a soft
   * reset to `oldestSha^` followed by one commit, so it only applies when the
   * selection reaches the branch tip. `ORIG_HEAD` is left pointing at the old
   * tip, so undo is a hard reset to it.
   */
  async squashCommits(repoPath: string, oldestSha: string, message: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.raw(['reset', '--soft', `${oldestSha}^`])
    await git.raw(['commit', '-m', message])
  },

  // ─── Sync operations ───────────────────────────────────────────────────────

  async fetchAll(repoPath: string): Promise<void> {
    // `--all` spans every remote; authenticate the common case (origin). Other
    // private https remotes without a matching PAT fail fast rather than hang.
    await withRemoteAuth(repoPath, 'origin', () => runGit(repoPath, ['fetch', '--all', '--prune']))
  },

  async pull(repoPath: string, mode: 'default' | 'ff-only' | 'rebase' = 'default'): Promise<void> {
    const remote = await upstreamRemote(repoPath)
    const args = ['pull']
    if (mode === 'ff-only') args.push('--ff-only')
    if (mode === 'rebase') args.push('--rebase')
    await withAutoStash(repoPath, 'pull', () =>
      withRemoteAuth(repoPath, remote, () => runGit(repoPath, args))
    )
  },

  async push(repoPath: string, branch: string, opts: { force?: boolean; remote?: string } = {}): Promise<void> {
    const remote = opts.remote ?? 'origin'
    const args = ['push']
    if (opts.force) args.push('--force-with-lease')
    args.push('--set-upstream', remote, branch)
    await withRemoteAuth(repoPath, remote, () => runGit(repoPath, args))
  },

  // ─── Stash operations ──────────────────────────────────────────────────────

  async stash(repoPath: string, message?: string): Promise<void> {
    const args = ['push', '--include-untracked']
    if (message) args.push('-m', message)
    await gitFor(repoPath).stash(args)
  },

  /**
   * Stash a chosen subset of changes (partial stash). With `paths`, only those
   * pathspecs are stashed; empty/omitted stashes everything. `keepIndex` leaves
   * the staged index intact in the working tree (`git stash push --keep-index`).
   */
  async stashPush(
    repoPath: string,
    message?: string,
    paths?: string[],
    keepIndex = false
  ): Promise<void> {
    const args = ['push', '--include-untracked']
    if (keepIndex) args.push('--keep-index')
    if (message) args.push('-m', message)
    if (paths && paths.length) args.push('--', ...paths)
    await gitFor(repoPath).stash(args)
  },

  async stashPop(repoPath: string, index = 0): Promise<void> {
    await gitFor(repoPath).stash(['pop', `stash@{${index}}`])
  },

  async stashApply(repoPath: string, index = 0): Promise<void> {
    await gitFor(repoPath).stash(['apply', `stash@{${index}}`])
  },

  async stashDrop(repoPath: string, index = 0): Promise<void> {
    await gitFor(repoPath).stash(['drop', `stash@{${index}}`])
  },

  /**
   * Create a new branch from a stash and apply it there (`git stash branch`).
   * Branches off the commit the stash was made on, checks it out, applies the
   * stash, and drops it on success — handy when a stash won't apply cleanly onto
   * the current branch.
   */
  async stashToBranch(repoPath: string, branch: string, index = 0): Promise<void> {
    await gitFor(repoPath).stash(['branch', branch, `stash@{${index}}`])
  },

  /**
   * Rename a stash by rewriting its reflog subject in place. Git has no native
   * rename, but `stash@{n}` is just an entry in `logs/refs/stash` — editing the
   * message after the tab keeps the stash's commit and stack position intact.
   * The `WIP on <branch>:` / `On <branch>:` prefix is preserved so the branch
   * label still shows; only the user-facing message is replaced.
   */
  async renameStash(repoPath: string, index: number, message: string): Promise<void> {
    const git = gitFor(repoPath)
    let logPath = (await git.raw(['rev-parse', '--git-path', 'logs/refs/stash'])).trim()
    if (!logPath) throw new Error('No stash reflog found')
    if (!logPath.startsWith('/')) logPath = join(repoPath, logPath)
    const raw = await readFile(logPath, 'utf8')
    const lines = raw.split('\n')
    // The reflog is oldest-first, so stash@{0} is the last non-empty line.
    const nonEmpty: number[] = []
    lines.forEach((l, i) => l.length > 0 && nonEmpty.push(i))
    const target = nonEmpty.length - 1 - index
    if (target < 0 || target >= nonEmpty.length) throw new Error(`No stash at index ${index}`)
    const fileIdx = nonEmpty[target]
    const tab = lines[fileIdx].indexOf('\t')
    if (tab < 0) throw new Error('Malformed stash reflog entry')
    const meta = lines[fileIdx].slice(0, tab)
    const subject = lines[fileIdx].slice(tab + 1)
    const prefix = /^((?:WIP on|On) [^:]*:\s*)/.exec(subject)?.[1] ?? ''
    lines[fileIdx] = `${meta}\t${prefix}${message.trim()}`
    // split/join round-trips the trailing newline (last element stays '').
    await writeFile(logPath, lines.join('\n'), 'utf8')
  },

  async stashApplyFiles(repoPath: string, sha: string, tracked: string[], untracked: string[]): Promise<void> {
    const git = gitFor(repoPath)
    if (tracked.length) await git.raw(['restore', '--source', sha, '--worktree', '--', ...tracked])
    if (untracked.length) await git.raw(['restore', '--source', `${sha}^3`, '--worktree', '--', ...untracked])
  },

  // ─── Working directory / commits ───────────────────────────────────────────

  async stage(repoPath: string, files: string[]): Promise<void> {
    await gitFor(repoPath).add(files)
  },

  async stageAll(repoPath: string): Promise<void> {
    await gitFor(repoPath).add(['-A'])
  },

  async unstage(repoPath: string, files: string[]): Promise<void> {
    await gitFor(repoPath).raw(['restore', '--staged', '--', ...files])
  },

  async unstageAll(repoPath: string): Promise<void> {
    await gitFor(repoPath).raw(['reset', 'HEAD', '--', '.'])
  },

  async discard(repoPath: string, files: string[], untracked: boolean): Promise<void> {
    const git = gitFor(repoPath)
    if (untracked) {
      await git.clean('f', ['--', ...files])
      return
    }
    // Per-file so one tricky path doesn't fail the whole batch:
    //  1. `checkout -- f` restores a modified file from the index (keeps staged
    //     changes — the common case, unchanged behavior).
    //  2. staged deletions/renames aren't in the index, so fall back to
    //     `checkout HEAD -- f` to bring the file back from the last commit.
    //  3. staged-new files don't exist in HEAD either, so drop them from the
    //     index and disk with `rm -f`.
    for (const f of files) {
      try {
        await git.raw(['checkout', '--', f])
        continue
      } catch {
        /* not in index — try HEAD */
      }
      try {
        await git.raw(['checkout', 'HEAD', '--', f])
        continue
      } catch {
        /* not in HEAD — staged-new */
      }
      await git.raw(['rm', '-f', '--', f]).catch(() => {})
    }
  },

  /**
   * Append repo-relative patterns to the repository's root `.gitignore`,
   * skipping any that are already present. Patterns should be supplied
   * pre-formatted (e.g. anchored with a leading `/`, folders with a
   * trailing `/`). Returns the patterns that were actually added.
   */
  async addToGitignore(repoPath: string, patterns: string[]): Promise<string[]> {
    return gitService.addToGitignoreAt(repoPath, '', patterns)
  },

  /**
   * Append patterns to the .gitignore in `dir` (relative to the repo; '' = root).
   * Creates the file if absent, skips entries already present.
   */
  async addToGitignoreAt(repoPath: string, dir: string, patterns: string[]): Promise<string[]> {
    const file = join(repoPath, dir, '.gitignore')
    let current = ''
    try {
      current = await readFile(file, 'utf8')
    } catch {
      current = ''
    }
    const existing = new Set(current.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    const toAdd = patterns.map((p) => p.trim()).filter((p) => p && !existing.has(p))
    if (toAdd.length === 0) return []
    const needsNl = current.length > 0 && !current.endsWith('\n')
    const next = current + (needsNl ? '\n' : '') + toAdd.join('\n') + '\n'
    await mkdir(join(repoPath, dir), { recursive: true }).catch(() => {})
    await writeFile(file, next, 'utf8')
    return toAdd
  },

  /**
   * Stop tracking files/folders. By default they are removed from the index
   * only (kept on disk); when `deleteFromDisk` is true they are also removed
   * from the working tree. `-r` allows folders; `--ignore-unmatch` keeps the
   * call safe if a path was already untracked.
   */
  async untrack(repoPath: string, files: string[], deleteFromDisk = false): Promise<void> {
    if (files.length === 0) return
    const args = ['rm', '-r', '--ignore-unmatch']
    if (!deleteFromDisk) args.push('--cached')
    await gitFor(repoPath).raw([...args, '--', ...files])
  },

  // ─── Project tree (working-directory file explorer) ──────────────────────

  /**
   * Immediate children of `relDir` (repo-relative POSIX path; '' = root).
   * The `.git` directory is hidden. Sorted folders-first, then by name.
   * Lazy per-directory listing keeps huge trees (node_modules) responsive.
   */
  async listDir(repoPath: string, relDir = ''): Promise<TreeEntry[]> {
    const abs = join(repoPath, relDir)
    // A folder can vanish or become unreadable between listing and a re-read
    // (e.g. a tool regenerates .husky/_, a watcher refresh races a delete).
    // Treat that as an empty folder rather than surfacing a scary ENOENT.
    const ents = await readdir(abs, { withFileTypes: true }).catch(() => [])
    const out: TreeEntry[] = []
    for (const e of ents) {
      if (relDir === '' && e.name === '.git') continue
      const dir = e.isDirectory()
      const path = relDir ? `${relDir}/${e.name}` : e.name
      out.push({ name: e.name, path, dir })
    }
    out.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1))
    return out
  },

  /**
   * Flat list of every searchable file path (repo-relative POSIX): tracked plus
   * untracked-but-not-ignored, the same scope VSCode searches by default. Fast —
   * `ls-files` skips node_modules/etc via the ignore rules, no fs walk.
   */
  async listFiles(repoPath: string): Promise<string[]> {
    const raw = await gitFor(repoPath)
      .raw(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
      .catch(() => '')
    // De-dupe (a path can appear in both cached + others briefly during edits).
    return Array.from(new Set(raw.split('\0').filter(Boolean)))
  },

  /**
   * Per-repo protected branches, stored in git config (gitcito.protectedbranches,
   * comma-joined) so they travel with the repo. Unset → default main/master.
   */
  async protectedBranches(repoPath: string): Promise<string[]> {
    const raw = await gitFor(repoPath).raw(['config', '--get', 'gitcito.protectedbranches']).catch(() => null)
    if (raw === null) return ['main', 'master'] // never configured → sensible default
    return raw
      .trim()
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean)
  },

  async setProtectedBranches(repoPath: string, branches: string[]): Promise<void> {
    const value = branches.map((b) => b.trim()).filter(Boolean).join(',')
    await gitFor(repoPath).raw(['config', 'gitcito.protectedbranches', value])
  },

  /** Tracked files only (in the index) — for the push-time secret guard. */
  async listTrackedFiles(repoPath: string): Promise<string[]> {
    const raw = await gitFor(repoPath).raw(['ls-files', '--cached', '-z']).catch(() => '')
    return raw.split('\0').filter(Boolean)
  },

  /** Commit hashes that touched `path` (file or folder) — for the graph path filter. */
  async commitsTouchingPath(repoPath: string, path: string, max = 1000): Promise<string[]> {
    const raw = await gitFor(repoPath)
      .raw(['log', '--format=%H', `--max-count=${max}`, '--', path])
      .catch(() => '')
    return raw.split('\n').filter(Boolean)
  },

  /** Byte size + binary-ness of working-tree files — for the large-file commit guard. */
  async fileSizes(repoPath: string, files: string[]): Promise<Record<string, { size: number; binary: boolean }>> {
    const out: Record<string, { size: number; binary: boolean }> = {}
    await Promise.all(
      files.map(async (f) => {
        try {
          const abs = join(repoPath, f)
          const st = await stat(abs)
          // Sniff the first 8KB for a NUL byte → treat as binary.
          let binary = false
          try {
            const buf = await readFile(abs)
            binary = buf.subarray(0, 8192).includes(0)
          } catch {
            /* unreadable → leave non-binary */
          }
          out[f] = { size: st.size, binary }
        } catch {
          /* missing/deleted → skip */
        }
      })
    )
    return out
  },

  /**
   * Map of repo-relative path → status kind for every changed/untracked/ignored
   * path, from a single `git status --porcelain --ignored -uall` call. Directory
   * paths are also populated with an aggregated status so folders can show a dot
   * when something inside them changed. Clean tracked files are absent (= clean).
   */
  async treeStatus(repoPath: string): Promise<Record<string, TreeStatusKind>> {
    const git = gitFor(repoPath)
    const raw = await git.raw(['status', '--porcelain=v1', '--ignored', '-uall', '-z']).catch(() => '')
    const out: Record<string, TreeStatusKind> = {}
    // Priority when a folder aggregates mixed child statuses (higher wins).
    const rank: Record<TreeStatusKind, number> = {
      conflicted: 6, modified: 5, added: 4, deleted: 3, renamed: 2, untracked: 1, ignored: 0
    }
    const bump = (p: string, kind: TreeStatusKind): void => {
      const cur = out[p]
      if (!cur || rank[kind] > rank[cur]) out[p] = kind
    }
    const records = raw.split('\0').filter(Boolean)
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const xy = rec.slice(0, 2)
      let path = rec.slice(3)
      // Renames/copies emit "R  new\0old" — the old path is the next NUL field.
      if (xy[0] === 'R' || xy[0] === 'C') i++
      const kind: TreeStatusKind =
        xy === '!!' ? 'ignored'
          : xy === '??' ? 'untracked'
          : xy.includes('U') || xy === 'AA' || xy === 'DD' ? 'conflicted'
          : xy.includes('R') ? 'renamed'
          : xy.includes('A') ? 'added'
          : xy.includes('D') ? 'deleted'
          : 'modified'
      path = path.replace(/\/$/, '')
      bump(path, kind)
      // Propagate to ancestor directories (ignored stays leaf-only so whole
      // ignored trees don't paint every parent grey).
      if (kind !== 'ignored') {
        let slash = path.lastIndexOf('/')
        while (slash > 0) {
          bump(path.slice(0, slash), kind)
          slash = path.lastIndexOf('/', slash - 1)
        }
      }
    }
    return out
  },

  /** Create an empty file or a directory at `relPath` (repo-relative). */
  async fsCreate(repoPath: string, relPath: string, isDir: boolean): Promise<void> {
    const abs = join(repoPath, relPath)
    if (existsSync(abs)) throw new Error(`Already exists: ${relPath}`)
    if (isDir) {
      await mkdir(abs, { recursive: true })
    } else {
      await mkdir(join(abs, '..'), { recursive: true })
      await writeFile(abs, '', 'utf8')
    }
  },

  /** Rename/move a path within the repo (uses `git mv` when tracked so history
   *  follows, else a plain fs rename for untracked paths). */
  async fsRename(repoPath: string, from: string, to: string): Promise<void> {
    if (from === to) return
    const dest = join(repoPath, to)
    if (existsSync(dest)) throw new Error(`Already exists: ${to}`)
    await mkdir(join(dest, '..'), { recursive: true })
    const tracked = (await gitFor(repoPath).raw(['ls-files', '--', from]).catch(() => '')).trim()
    if (tracked) {
      await gitFor(repoPath).raw(['mv', from, to])
    } else {
      await rename(join(repoPath, from), dest)
    }
  },

  /** Move paths to the OS trash (recoverable). Refuses paths outside the repo. */
  async fsDelete(repoPath: string, relPaths: string[]): Promise<void> {
    for (const rel of relPaths) {
      const abs = join(repoPath, rel)
      if (!abs.startsWith(repoPath)) throw new Error(`Refusing to delete outside repo: ${rel}`)
      await shell.trashItem(abs)
    }
  },

  async commit(repoPath: string, message: string, amend = false): Promise<void> {
    const git = gitFor(repoPath)
    await git.commit(message, amend ? ['--amend'] : [])
  },

  async getCommitMessage(repoPath: string, hash: string): Promise<string> {
    return gitFor(repoPath).raw(['log', '-1', '--format=%B', hash])
  },

  async amendCommitMessage(repoPath: string, message: string): Promise<void> {
    await gitFor(repoPath).raw(['commit', '--amend', '--only', '-m', message])
  },

  /**
   * Contents of the repo's `commit.template` (.gitmessage), or '' if none is
   * configured / the file is missing. Path is resolved against ~ and the repo
   * root so both absolute and relative `commit.template` settings work.
   */
  async commitTemplate(repoPath: string): Promise<string> {
    const tpl = (await gitFor(repoPath).raw(['config', '--get', 'commit.template']).catch(() => '')).trim()
    if (!tpl) return ''
    let p = tpl
    if (p === '~' || p.startsWith('~/')) p = join(homedir(), p.slice(1))
    else if (!p.startsWith('/')) p = join(repoPath, p)
    return readFile(p, 'utf-8').catch(() => '')
  },

  /** Read this repo's commit-signing configuration. */
  async signingConfig(repoPath: string): Promise<SigningConfig> {
    const git = gitFor(repoPath)
    const get = async (key: string): Promise<string> =>
      (await git.raw(['config', '--get', key]).catch(() => '')).trim()
    const [sign, format, key] = await Promise.all([
      get('commit.gpgsign'),
      get('gpg.format'),
      get('user.signingkey')
    ])
    return { sign: sign === 'true', format: format || 'openpgp', key }
  },

  /** Update this repo's commit-signing configuration (only provided fields). */
  async setSigningConfig(
    repoPath: string,
    opts: { sign?: boolean; format?: string; key?: string }
  ): Promise<void> {
    const git = gitFor(repoPath)
    if (opts.sign !== undefined) await git.raw(['config', 'commit.gpgsign', String(opts.sign)])
    if (opts.format !== undefined) await git.raw(['config', 'gpg.format', opts.format])
    if (opts.key !== undefined) {
      if (opts.key) await git.raw(['config', 'user.signingkey', opts.key])
      else await git.raw(['config', '--unset', 'user.signingkey']).catch(() => {})
    }
  },

  // ─── Hooks ─────────────────────────────────────────────────────────────────

  /** Enumerate the repo's hooks + detect a custom hooksPath / pre-commit framework. */
  async hooksInfo(repoPath: string): Promise<HooksInfo> {
    const git = gitFor(repoPath)
    const { dir, custom } = await resolveHooksDir(git, repoPath)
    const preCommitFramework =
      existsSync(join(repoPath, '.pre-commit-config.yaml')) || existsSync(join(repoPath, '.pre-commit-config.yml'))
    const hooks: HookInfo[] = []
    for (const name of KNOWN_HOOKS) {
      const p = join(dir, name)
      let exists = false
      let executable = false
      let size = 0
      try {
        const st = await stat(p)
        exists = st.isFile()
        size = st.size
        executable = (st.mode & 0o111) !== 0
      } catch {
        /* no real hook by this name */
      }
      const sample = !exists && existsSync(`${p}.sample`)
      hooks.push({ name, exists, executable, sample, size })
    }
    return { hooksDir: dir, customHooksPath: custom, preCommitFramework, hooks }
  },

  /**
   * Read a hook's contents for editing. Falls back to the shipped `.sample`
   * template, then to a minimal shebang, so the editor is never blank.
   */
  async readHook(repoPath: string, name: string): Promise<string> {
    const git = gitFor(repoPath)
    const { dir } = await resolveHooksDir(git, repoPath)
    const p = join(dir, name)
    const real = await readFile(p, 'utf-8').catch(() => null)
    if (real !== null) return real
    const sample = await readFile(`${p}.sample`, 'utf-8').catch(() => null)
    if (sample !== null) return sample
    return '#!/bin/sh\n'
  },

  /** Write a hook and make it executable (so git will run it). */
  async writeHook(repoPath: string, name: string, content: string): Promise<void> {
    const git = gitFor(repoPath)
    const { dir } = await resolveHooksDir(git, repoPath)
    await mkdir(dir, { recursive: true }).catch(() => {})
    const p = join(dir, name)
    await writeFile(p, content, 'utf-8')
    await chmod(p, 0o755)
  },

  /** Toggle a hook's executable bit — git only runs hooks that are executable. */
  async setHookEnabled(repoPath: string, name: string, enabled: boolean): Promise<void> {
    const git = gitFor(repoPath)
    const { dir } = await resolveHooksDir(git, repoPath)
    const p = join(dir, name)
    const st = await stat(p)
    const mode = enabled ? st.mode | 0o755 : st.mode & ~0o111
    await chmod(p, mode)
  },

  /** Delete a hook file. The shipped `.sample` template (if any) is left intact. */
  async deleteHook(repoPath: string, name: string): Promise<void> {
    const git = gitFor(repoPath)
    const { dir } = await resolveHooksDir(git, repoPath)
    await unlink(join(dir, name)).catch(() => {})
  },

  // ─── Git LFS ───────────────────────────────────────────────────────────────

  /** LFS state: whether git-lfs is installed, tracked patterns, and LFS files. */
  async lfsInfo(repoPath: string): Promise<LfsInfo> {
    const git = gitFor(repoPath)
    const installed = await git
      .raw(['lfs', 'version'])
      .then(() => true)
      .catch(() => false)
    if (!installed) return { installed: false, enabled: false, patterns: [], files: [] }

    const ga = await readFile(join(repoPath, '.gitattributes'), 'utf-8').catch(() => '')
    const patterns = ga
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && /filter=lfs/.test(l))
      .map((l) => l.split(/\s+/)[0])

    const out = await git.raw(['lfs', 'ls-files']).catch(() => '')
    const files: LfsFile[] = []
    for (const line of out.split('\n').map((l) => l.trim()).filter(Boolean)) {
      // Format: "<oid> <* or -> <path>"  (* = downloaded, - = pointer only)
      const m = line.match(/^(\S+)\s+([*-])\s+(.+)$/)
      if (m) files.push({ oid: m[1], downloaded: m[2] === '*', path: m[3] })
    }
    return { installed: true, enabled: patterns.length > 0 || files.length > 0, patterns, files }
  },

  /** Track a glob pattern with LFS (writes .gitattributes). */
  async lfsTrack(repoPath: string, pattern: string): Promise<void> {
    await gitFor(repoPath).raw(['lfs', 'track', pattern])
  },

  /** Stop tracking a pattern with LFS. */
  async lfsUntrack(repoPath: string, pattern: string): Promise<void> {
    await gitFor(repoPath).raw(['lfs', 'untrack', pattern])
  },

  /** Download LFS content for pointers in the working tree. */
  async lfsPull(repoPath: string): Promise<void> {
    await gitFor(repoPath).raw(['lfs', 'pull'])
  },

  /** Prune old/unreferenced LFS objects from local storage. */
  async lfsPrune(repoPath: string): Promise<void> {
    await gitFor(repoPath).raw(['lfs', 'prune'])
  },

  // ─── Sparse-checkout ─────────────────────────────────────────────────────────

  /** Cone-mode sparse-checkout state + the top-level dirs available to toggle. */
  async sparseCheckoutInfo(repoPath: string): Promise<SparseCheckoutInfo> {
    const git = gitFor(repoPath)
    const cfg = async (key: string): Promise<string> =>
      (await git.raw(['config', '--get', key]).catch(() => '')).trim()
    const enabled = (await cfg('core.sparseCheckout')) === 'true'
    const cone = (await cfg('core.sparseCheckoutCone')) === 'true'
    const norm = (s: string): string => s.trim().replace(/^\/+|\/+$/g, '')
    const dirs = enabled
      ? (await git.raw(['sparse-checkout', 'list']).catch(() => ''))
          .split('\n')
          .map(norm)
          .filter(Boolean)
      : []
    const topLevelDirs = (await git.raw(['ls-tree', '--name-only', '-d', 'HEAD']).catch(() => ''))
      .split('\n')
      .map(norm)
      .filter(Boolean)
    return { enabled, cone, dirs, topLevelDirs }
  },

  /** Enable cone-mode sparse-checkout and restrict the working tree to `dirs`. */
  async sparseCheckoutSet(repoPath: string, dirs: string[]): Promise<void> {
    await gitFor(repoPath).raw(['sparse-checkout', 'set', '--cone', ...dirs])
  },

  /** Disable sparse-checkout — restore the full working tree. */
  async sparseCheckoutDisable(repoPath: string): Promise<void> {
    await gitFor(repoPath).raw(['sparse-checkout', 'disable'])
  },

  async cherryPick(repoPath: string, hash: string, noCommit = false): Promise<void> {
    const args = ['cherry-pick']
    if (noCommit) args.push('-n')
    args.push(hash)
    await gitFor(repoPath).raw(args)
  },

  // Cherry-pick several commits in one go. Hashes are applied in the given
  // order, so callers should pass them oldest-first to preserve history order.
  async cherryPickMany(repoPath: string, hashes: string[], noCommit = false): Promise<void> {
    if (!hashes.length) return
    const args = ['cherry-pick']
    if (noCommit) args.push('-n')
    args.push(...hashes)
    await gitFor(repoPath).raw(args)
  },

  async revertCommit(repoPath: string, hash: string): Promise<void> {
    await gitFor(repoPath).raw(['revert', '--no-edit', hash])
  },

  async reset(repoPath: string, ref: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    await gitFor(repoPath).reset([`--${mode}`, ref])
  },

  async createTag(
    repoPath: string,
    name: string,
    hash?: string,
    opts?: { message?: string; sign?: boolean }
  ): Promise<void> {
    const args: string[] = []
    // A message (or signing) makes it an annotated/signed tag object; otherwise
    // it stays a lightweight tag (just a ref).
    if (opts?.sign) args.push('-s')
    else if (opts?.message) args.push('-a')
    if (opts?.message) args.push('-m', opts.message)
    args.push(name)
    if (hash) args.push(hash)
    await gitFor(repoPath).tag(args)
  },

  async deleteTag(repoPath: string, name: string): Promise<void> {
    await gitFor(repoPath).tag(['-d', name])
  },

  async pushTag(repoPath: string, name: string, remote = 'origin'): Promise<void> {
    await gitFor(repoPath).push([remote, `refs/tags/${name}`])
  },

  async deleteRemoteTag(repoPath: string, name: string, remote = 'origin'): Promise<void> {
    await gitFor(repoPath).push([remote, '--delete', `refs/tags/${name}`])
  },

  async getRemoteTags(repoPath: string, remote = 'origin'): Promise<string[]> {
    try {
      const out = await gitFor(repoPath).raw(['ls-remote', '--tags', '--refs', remote])
      return out.split('\n').filter(Boolean).map((line) => {
        const ref = line.split('\t')[1] ?? ''
        return ref.replace('refs/tags/', '')
      })
    } catch {
      return []
    }
  },

  // ─── Diffs ─────────────────────────────────────────────────────────────────

  async diffFile(repoPath: string, file: string, staged: boolean, untracked: boolean, ignoreWs = false): Promise<string> {
    const git = gitFor(repoPath)
    const ws = ignoreWs ? ['-w'] : []
    if (untracked) {
      try {
        const content = await readFile(`${repoPath}/${file}`, 'utf-8')
        const lines = content.split('\n')
        return [
          `diff --git a/${file} b/${file}`,
          'new file',
          `--- /dev/null`,
          `+++ b/${file}`,
          `@@ -0,0 +1,${lines.length} @@`,
          ...lines.map((l) => `+${l}`)
        ].join('\n')
      } catch {
        return ''
      }
    }
    return git.raw(staged ? ['diff', '--cached', ...ws, '--', file] : ['diff', ...ws, '--', file])
  },

  async commitFiles(repoPath: string, hash: string): Promise<FileEntry[]> {
    const git = gitFor(repoPath)
    const out = await git.raw(['diff-tree', '--no-commit-id', '--name-status', '-r', '--root', '-m', '--first-parent', hash])
    const seen = new Set<string>()
    const files: FileEntry[] = []
    for (const line of out.split('\n').filter(Boolean)) {
      const [code, ...rest] = line.split('\t')
      const path = rest[rest.length - 1]
      if (!path || seen.has(path)) continue
      seen.add(path)
      files.push({ path, status: mapStatusCode(code[0]) })
    }
    return files
  },

  async commitFileDiff(repoPath: string, hash: string, file: string, ignoreWs = false): Promise<string> {
    // `--first-parent` so merge commits diff against their first parent (matching
    // `commitFiles`). Without it, `git show` falls back to a combined diff (--cc)
    // that's empty for files which only changed on the merged-in branch — the
    // "No changes to display" bug.
    return gitFor(repoPath).raw(['show', '--format=', '--first-parent', ...(ignoreWs ? ['-w'] : []), hash, '--', file])
  },

  async stashFiles(repoPath: string, sha: string, untrackedSha?: string | null): Promise<FileEntry[]> {
    const git = gitFor(repoPath)
    const out = await git.raw(['diff', '--name-status', `${sha}^1`, sha])
    const files: FileEntry[] = []
    for (const line of out.split('\n').filter(Boolean)) {
      const [code, ...rest] = line.split('\t')
      const path = rest[rest.length - 1]
      if (path) files.push({ path, status: mapStatusCode(code[0]) })
    }
    if (untrackedSha) {
      try {
        const u = await git.raw(['ls-tree', '-r', '--name-only', untrackedSha])
        for (const path of u.split('\n').filter(Boolean)) {
          files.push({ path, status: '?', untracked: true })
        }
      } catch {
        /* untracked tree unavailable */
      }
    }
    return files
  },

  async stashFileDiff(repoPath: string, sha: string, file: string, untracked?: boolean, ignoreWs = false): Promise<string> {
    const git = gitFor(repoPath)
    const ws = ignoreWs ? ['-w'] : []
    if (untracked) {
      return git.raw(['diff-tree', '--root', '--no-commit-id', '-p', ...ws, `${sha}^3`, '--', file])
    }
    return git.raw(['diff', ...ws, `${sha}^1`, sha, '--', file])
  },

  async stagedDiff(repoPath: string): Promise<string> {
    return gitFor(repoPath).raw(['diff', '--cached'])
  },

  /** Full patch of a single commit (vs its first parent; root commit shows full tree). */
  async commitDiff(repoPath: string, hash: string): Promise<string> {
    return gitFor(repoPath).raw(['show', '--format=', '--first-parent', hash])
  },

  // ─── File inspection (file view / blame / history) ──────────────────────

  async fileContent(repoPath: string, file: string, ref?: string): Promise<string> {
    if (!ref) {
      // Working-tree read; empty if the file was deleted on disk.
      return readFile(join(repoPath, file), 'utf-8').catch(() => '')
    }
    try {
      return await gitFor(repoPath).raw(['show', `${ref}:${file}`])
    } catch {
      // The ref view may be missing — e.g. a staged deletion isn't in the index
      // (':0'). Fall back to the on-disk copy, then the last committed version,
      // so File view shows something instead of a fatal error.
      const onDisk = await readFile(join(repoPath, file), 'utf-8').catch(() => null)
      if (onDisk !== null) return onDisk
      return gitFor(repoPath).raw(['show', `HEAD:${file}`]).catch(() => '')
    }
  },

  /**
   * Filter the given changed-file paths down to those whose working-tree content
   * matches `query`. Used by the commit panel's search bar. Reads files directly
   * (only the handful of changed files), so it covers tracked + untracked alike.
   * Returns `files` unchanged when the query is empty; `[]` for an invalid regex.
   */
  async searchFileContents(
    repoPath: string,
    files: string[],
    query: string,
    opts?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean }
  ): Promise<string[]> {
    if (!query) return files
    let pattern: RegExp
    try {
      const src = opts?.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const body = opts?.wholeWord ? `\\b${src}\\b` : src
      pattern = new RegExp(body, opts?.caseSensitive ? '' : 'i')
    } catch {
      return []
    }
    const matched = await Promise.all(
      files.map(async (f) => {
        try {
          const content = await readFile(join(repoPath, f), 'utf-8')
          return pattern.test(content) ? f : null
        } catch {
          return null // binary, deleted, or unreadable
        }
      })
    )
    return matched.filter((f): f is string => f !== null)
  },

  /**
   * Working-tree code search via `git grep -n` (tracked + untracked, honouring
   * .gitignore). Returns up to `max` file:line:text hits. git grep exits 1 when
   * nothing matches, which simple-git throws on — that's a clean empty result.
   */
  async grepWorkingTree(
    repoPath: string,
    query: string,
    opts?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean; max?: number }
  ): Promise<CodeSearchHit[]> {
    if (!query.trim()) return []
    const max = opts?.max ?? 500
    const args = ['grep', '-n', '-I', '--no-color', '--untracked', '--full-name']
    if (!opts?.caseSensitive) args.push('-i')
    if (opts?.wholeWord) args.push('-w')
    args.push(opts?.regex ? '-E' : '-F')
    args.push('-e', query, '--')
    let raw = ''
    try {
      raw = await gitFor(repoPath).raw(args)
    } catch {
      return [] // no matches (exit 1) or invalid pattern
    }
    const hits: CodeSearchHit[] = []
    for (const line of raw.split('\n')) {
      if (!line) continue
      const m = /^(.*?):(\d+):(.*)$/.exec(line)
      if (!m) continue
      hits.push({ file: m[1], line: Number(m[2]), text: m[3].slice(0, 400) })
      if (hits.length >= max) break
    }
    return hits
  },

  /**
   * History pickaxe: commits that changed the number of occurrences of `query`
   * (`-S`, literal) or whose diff matches it (`-G`, regex). The "who introduced
   * / removed this string" search.
   */
  async searchHistory(
    repoPath: string,
    query: string,
    opts?: { caseSensitive?: boolean; regex?: boolean; max?: number }
  ): Promise<HistorySearchHit[]> {
    if (!query.trim()) return []
    const max = opts?.max ?? 200
    const args = [
      'log',
      `--max-count=${max}`,
      `--pretty=format:%H${SEP}%an${SEP}%at${SEP}%s${REC}`
    ]
    if (!opts?.caseSensitive) args.push('--regexp-ignore-case')
    args.push(opts?.regex ? `-G${query}` : `-S${query}`)
    let raw = ''
    try {
      raw = await gitFor(repoPath).raw(args)
    } catch {
      return []
    }
    return raw
      .split(REC)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((rec) => {
        const [hash, author, date, subject] = rec.split(SEP)
        return { hash, author, date: Number(date), subject }
      })
  },

  async fileDataUrl(repoPath: string, file: string, ref?: string): Promise<string> {
    const url = await readFileDataUrl(repoPath, file, ref)
    if (url === null) throw new Error(`Cannot read image: ${file}`)
    return url
  },

  async imageDiff(
    repoPath: string,
    file: string,
    beforeRef: string | null,
    afterRef?: string
  ): Promise<{ before: string | null; after: string | null }> {
    const [before, after] = await Promise.all([
      beforeRef == null ? Promise.resolve(null) : readFileDataUrl(repoPath, file, beforeRef),
      readFileDataUrl(repoPath, file, afterRef)
    ])
    return { before, after }
  },

  async blameFile(repoPath: string, file: string, ref?: string): Promise<BlameLine[]> {
    const args = ['blame', '--line-porcelain']
    if (ref) args.push(ref)
    args.push('--', file)
    const out = await gitFor(repoPath).raw(args)
    const result: BlameLine[] = []
    let sha = ''
    let author = ''
    let date = 0
    let lineNo = 1
    for (const l of out.split('\n')) {
      if (/^[0-9a-f]{40} /.test(l)) sha = l.slice(0, 40)
      else if (l.startsWith('author ')) author = l.slice(7)
      else if (l.startsWith('author-time ')) date = +l.slice(12)
      else if (l.startsWith('\t')) result.push({ sha, author, date, lineNo: lineNo++, text: l.slice(1) })
    }
    return result
  },

  async fileHistory(repoPath: string, file: string): Promise<FileHistoryEntry[]> {
    const out = await gitFor(repoPath).raw([
      'log',
      '--follow',
      '--max-count=200',
      `--pretty=format:%H${SEP}%an${SEP}%at${SEP}%s`,
      '--',
      file
    ])
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, subject] = line.split(SEP)
        return { hash, author, date: +date, subject }
      })
  },

  // ─── Worktrees ───────────────────────────────────────────────────────────

  async worktrees(repoPath: string): Promise<WorktreeInfo[]> {
    const out = await gitFor(repoPath).raw(['worktree', 'list', '--porcelain']).catch(() => '')
    const result: WorktreeInfo[] = []
    let cur: Partial<WorktreeInfo> | null = null
    const flush = (): void => {
      if (cur && cur.path) {
        result.push({
          path: cur.path,
          branch: cur.branch ?? null,
          head: cur.head ?? '',
          isMain: false,
          isCurrent: false,
          locked: cur.locked ?? false,
          detached: cur.detached ?? false
        })
      }
      cur = null
    }
    for (const line of out.split('\n')) {
      if (line.startsWith('worktree ')) {
        flush()
        cur = { path: line.slice('worktree '.length).trim() }
      } else if (!cur) {
        continue
      } else if (line.startsWith('HEAD ')) {
        cur.head = line.slice('HEAD '.length).trim()
      } else if (line.startsWith('branch ')) {
        cur.branch = line.slice('branch '.length).trim().replace('refs/heads/', '')
      } else if (line === 'detached') {
        cur.detached = true
      } else if (line === 'locked' || line.startsWith('locked ')) {
        cur.locked = true
      }
    }
    flush()
    const normalizedRepo = repoPath.replace(/\/+$/, '')
    if (result.length) result[0].isMain = true
    for (const w of result) {
      if (w.path.replace(/\/+$/, '') === normalizedRepo) w.isCurrent = true
    }
    return result
  },

  async worktreeAdd(repoPath: string, path: string, branch: string, newBranch: boolean): Promise<void> {
    const args = ['worktree', 'add']
    if (newBranch) args.push('-b', branch, path)
    else args.push(path, branch)
    await gitFor(repoPath).raw(args)
  },

  async worktreeRemove(repoPath: string, path: string, force: boolean): Promise<void> {
    const args = ['worktree', 'remove']
    if (force) args.push('--force')
    args.push(path)
    await gitFor(repoPath).raw(args)
  },

  // ─── Submodules ──────────────────────────────────────────────────────────

  async submodules(repoPath: string): Promise<SubmoduleInfo[]> {
    const git = gitFor(repoPath)
    // `.gitmodules` is the source of truth for registered submodules; without it
    // there is nothing to show (and `git submodule status` would print nothing).
    const config = await git.raw(['config', '--file', '.gitmodules', '--list']).catch(() => '')
    if (!config.trim()) return []

    // name → { path, url, branch }, built from `submodule.<name>.<key>=<value>`.
    const meta = new Map<string, { path?: string; url?: string; branch?: string }>()
    for (const line of config.split('\n').filter(Boolean)) {
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq)
      const value = line.slice(eq + 1)
      const m = /^submodule\.(.+)\.(path|url|branch)$/.exec(key)
      if (!m) continue
      const entry = meta.get(m[1]) ?? {}
      entry[m[2] as 'path' | 'url' | 'branch'] = value
      meta.set(m[1], entry)
    }

    // `git submodule status` reports the live state. The leading char encodes
    // status, followed by the SHA, the path, and an optional `(describe)`.
    const statusOut = await git.raw(['submodule', 'status']).catch(() => '')
    const statusByPath = new Map<string, { sha: string; status: SubmoduleStatus; describe: string | null }>()
    for (const line of statusOut.split('\n').filter(Boolean)) {
      const m = /^([ +\-U])([0-9a-f]{7,40})\s+(.+?)(?:\s+\((.+)\))?$/.exec(line)
      if (!m) continue
      const flag = m[1]
      const status: SubmoduleStatus =
        flag === '+' ? 'modified' : flag === '-' ? 'uninitialized' : flag === 'U' ? 'conflict' : 'initialized'
      statusByPath.set(m[3], { sha: m[2], status, describe: m[4] ?? null })
    }

    // The commit each submodule is *pinned* to lives as a gitlink (mode 160000)
    // in the superproject's HEAD tree. Used to measure drift for modified ones.
    const recordedByPath = new Map<string, string>()
    const tree = await git.raw(['ls-tree', '-r', 'HEAD']).catch(() => '')
    for (const line of tree.split('\n').filter(Boolean)) {
      const m = /^160000 commit ([0-9a-f]{40})\t(.+)$/.exec(line)
      if (m) recordedByPath.set(m[2], m[1])
    }

    const result: SubmoduleInfo[] = []
    for (const [name, info] of meta) {
      if (!info.path) continue
      const st = statusByPath.get(info.path)
      const recordedSha = recordedByPath.get(info.path) ?? ''
      let ahead = 0
      let behind = 0
      // For a checked-out submodule sitting off its recorded commit, count the
      // divergence so the UI can render an out-of-sync "↑n / ↓n" indicator.
      if (st?.status === 'modified' && recordedSha && st.sha && recordedSha !== st.sha) {
        const counts = await gitFor(join(repoPath, info.path))
          .raw(['rev-list', '--left-right', '--count', `${recordedSha}...${st.sha}`])
          .catch(() => '')
        const parts = counts.trim().split(/\s+/)
        if (parts.length === 2) {
          behind = Number(parts[0]) || 0
          ahead = Number(parts[1]) || 0
        }
      }
      result.push({
        name,
        path: info.path,
        url: info.url ?? '',
        branch: info.branch ?? null,
        sha: st?.sha ?? '',
        recordedSha,
        describe: st?.describe ?? null,
        status: st?.status ?? 'uninitialized',
        ahead,
        behind
      })
    }
    result.sort((a, b) => a.path.localeCompare(b.path))
    return result
  },

  async submoduleAdd(repoPath: string, url: string, path: string, branch?: string): Promise<void> {
    const args = ['submodule', 'add']
    if (branch) args.push('-b', branch)
    args.push('--', url, path)
    await gitFor(repoPath).raw(args)
  },

  /** Update a submodule's remote URL in `.gitmodules` and sync the live config. */
  async submoduleSetUrl(repoPath: string, name: string, url: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.raw(['config', '--file', '.gitmodules', `submodule.${name}.url`, url])
    await git.raw(['submodule', 'sync', '--', name]).catch(() => '')
  },

  async submoduleUpdate(repoPath: string, path?: string, init = true): Promise<void> {
    const args = ['submodule', 'update']
    if (init) args.push('--init')
    args.push('--recursive')
    if (path) args.push('--', path)
    await gitFor(repoPath).raw(args)
  },

  async submoduleSync(repoPath: string, path?: string): Promise<void> {
    const args = ['submodule', 'sync', '--recursive']
    if (path) args.push('--', path)
    await gitFor(repoPath).raw(args)
  },

  async submoduleDeinit(repoPath: string, path: string, force = false): Promise<void> {
    const args = ['submodule', 'deinit']
    if (force) args.push('--force')
    args.push('--', path)
    await gitFor(repoPath).raw(args)
  },

  /**
   * Fully removes a submodule: deinit, drop the working tree from the index,
   * and strip its `.gitmodules` stanza so it no longer shows up.
   */
  async submoduleRemove(repoPath: string, path: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.raw(['submodule', 'deinit', '--force', '--', path]).catch(() => '')
    await git.raw(['rm', '--force', '--', path]).catch(() => '')
    // `git rm` of a submodule may leave the stale .git metadata behind.
    await git.raw(['config', '--remove-section', `submodule.${path}`]).catch(() => '')
  },

  // ─── Config / profiles ─────────────────────────────────────────────────────

  async getUser(repoPath: string): Promise<{ name: string; email: string }> {
    const git = gitFor(repoPath)
    const name = (await git.raw(['config', '--get', 'user.name']).catch(() => '')).trim()
    const email = (await git.raw(['config', '--get', 'user.email']).catch(() => '')).trim()
    return { name, email }
  },

  async setUser(repoPath: string, name: string, email: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.addConfig('user.name', name)
    await git.addConfig('user.email', email)
  },

  async clone(
    parentDir: string,
    url: string,
    name: string,
    host?: string,
    token?: string,
    filter?: string,
    onProgress?: (p: CloneProgress) => void
  ): Promise<string> {
    const folder = name.trim() || basename(url).replace(/\.git$/, '') || 'repository'
    const target = join(parentDir, folder)
    if (existsSync(target)) throw new Error(`A folder named "${folder}" already exists here.`)
    const cloneUrl = authedCloneUrl(url, host, token)
    // Streaming the underlying `git clone --progress` so the UI can show real progress;
    // simpleGit auto-appends --progress when a progress handler is configured.
    const git = simpleGit({
      baseDir: parentDir,
      progress: onProgress
        ? ({ stage, progress, processed, total }) => onProgress({ stage, progress, processed, total })
        : undefined
    })
    // A blob filter (e.g. "blob:none") makes this a partial clone — history without
    // file blobs, fetched on demand. Great for very large repos.
    await git.clone(cloneUrl, folder, filter ? [`--filter=${filter}`] : undefined)
    // Reset the origin URL back to the token-free version so the PAT is not persisted on disk.
    if (cloneUrl !== url) {
      try {
        await simpleGit(target).remote(['set-url', 'origin', url])
      } catch {
        /* non-fatal */
      }
    }
    return target
  },

  async init(parentDir: string, name: string): Promise<string> {
    const { mkdir } = await import('fs/promises')
    const folder = name.trim() || 'my-repo'
    const target = join(parentDir, folder)
    if (existsSync(target)) throw new Error(`A folder named "${folder}" already exists here.`)
    await mkdir(target, { recursive: true })
    await simpleGit(target).init()
    return target
  },

  // ─── Interactive rebase ────────────────────────────────────────────────────

  async interactiveRebaseSteps(repoPath: string, base: string): Promise<{ hash: string; subject: string }[]> {
    const out = await gitFor(repoPath)
      .raw(['log', '--reverse', `${base}..HEAD`, `--format=%H${SEP}%s`])
      .catch(() => '')
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(SEP)
        return { hash: line.slice(0, idx), subject: line.slice(idx + 1) }
      })
  },

  async runInteractiveRebase(repoPath: string, base: string, steps: RebaseStep[]): Promise<void> {
    const tmpTodo = join(tmpdir(), `gitcito-rebase-${Date.now()}.txt`)
    const lines: string[] = []
    for (const s of steps) {
      if (s.action === 'drop') {
        lines.push(`drop ${s.hash.slice(0, 7)} ${s.subject}`)
      } else if (s.action === 'reword' && s.newMessage) {
        lines.push(`pick ${s.hash.slice(0, 7)} ${s.subject}`)
        const escaped = s.newMessage.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")
        lines.push(`exec git commit --amend -m '${escaped}'`)
      } else {
        lines.push(`${s.action} ${s.hash.slice(0, 7)} ${s.subject}`)
      }
    }
    await writeFile(tmpTodo, lines.join('\n') + '\n', 'utf-8')
    try {
      // Drive the rebase todo via `-c sequence.editor` (copies our generated
      // todo over git's) and silence the commit editor via `-c core.editor`.
      // Use `-c` args rather than `.env()` so simple-git's unsafe guard doesn't
      // scan (and reject) inherited env vars such as PAGER / GIT_ASKPASS.
      await simpleGit(repoPath, { unsafe: { allowUnsafeEditor: true } }).raw([
        '-c',
        `sequence.editor=cp ${JSON.stringify(tmpTodo)}`,
        '-c',
        'core.editor=true',
        'rebase',
        '-i',
        base
      ])
    } finally {
      await unlink(tmpTodo).catch(() => {})
    }
  },

  // ─── Patch staging ─────────────────────────────────────────────────────────

  async stagePatch(repoPath: string, patch: string): Promise<void> {
    const tmpPatch = join(tmpdir(), `gitcito-patch-${Date.now()}.patch`)
    await writeFile(tmpPatch, patch, 'utf-8')
    try {
      await gitFor(repoPath).raw(['apply', '--cached', tmpPatch])
    } finally {
      await unlink(tmpPatch).catch(() => {})
    }
  },

  // ─── Reflog (recovery) ─────────────────────────────────────────────────────

  /**
   * Read `git reflog` for a ref (default HEAD). Each entry is a point history
   * passed through — checkout/reset/amend/rebase all leave a trace, so this is
   * the net for recovering "lost" commits. Restore by checking out, resetting,
   * or branching from an entry's sha via the existing reset/checkout/branch ops.
   */
  async reflog(repoPath: string, ref = 'HEAD', max = 200): Promise<ReflogEntry[]> {
    const git = gitFor(repoPath)
    const out = await git
      .raw(['reflog', 'show', `--max-count=${max}`, `--format=%H${SEP}%gD${SEP}%gs${SEP}%ct${REC}`, ref])
      .catch(() => '')
    return out
      .split(REC)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((rec) => {
        const [sha, selector, action, date] = rec.split(SEP)
        return { sha, selector: selector ?? '', action: action ?? '', date: +date || 0 }
      })
  },

  // ─── Bisect ────────────────────────────────────────────────────────────────

  /** Current bisect state (used when (re)opening the UI mid-session). */
  async bisectStatus(repoPath: string): Promise<BisectStatus> {
    return buildBisectStatus(repoPath)
  },

  /** Begin a bisect session. Caller then marks HEAD good/bad to seed the range. */
  async bisectStart(repoPath: string): Promise<BisectStatus> {
    const out = await gitFor(repoPath).raw(['bisect', 'start']).catch(() => '')
    return buildBisectStatus(repoPath, out)
  },

  /**
   * Mark a commit during bisect. `term` is good/bad/skip; `rev` defaults to the
   * current candidate (HEAD). Git narrows the range and checks out the next
   * commit to test, or reports the first bad commit when done.
   */
  async bisectMark(repoPath: string, term: 'good' | 'bad' | 'skip', rev?: string): Promise<BisectStatus> {
    const args = ['bisect', term]
    if (rev) args.push(rev)
    const out = await gitFor(repoPath).raw(args)
    return buildBisectStatus(repoPath, out)
  },

  /** End the bisect session and return to the original branch/HEAD. */
  async bisectReset(repoPath: string): Promise<void> {
    await gitFor(repoPath).raw(['bisect', 'reset'])
  },

  // ─── Patches ───────────────────────────────────────────────────────────────

  /** Generate a mailbox-style patch (format-patch) for `count` commits ending at `ref`. */
  async formatPatch(repoPath: string, ref: string, count = 1): Promise<string> {
    return gitFor(repoPath).raw(['format-patch', `-${count}`, ref, '--stdout'])
  },

  /**
   * Apply a patch. `am=true` uses `git am` (applies AND commits, preserving the
   * author/message from a format-patch mailbox); otherwise `git apply` patches
   * the working tree without committing. Both use 3-way merge for better fuzz.
   */
  async applyPatch(repoPath: string, content: string, am = false): Promise<void> {
    const tmp = join(tmpdir(), `gitcito-apply-${Date.now()}.patch`)
    await writeFile(tmp, content, 'utf-8')
    try {
      await gitFor(repoPath).raw(am ? ['am', '--3way', tmp] : ['apply', '--3way', tmp])
    } finally {
      await unlink(tmp).catch(() => {})
    }
  },

  // ─── Branch comparison ─────────────────────────────────────────────────────

  async compareBranches(repoPath: string, a: string, b: string): Promise<BranchCompareResult> {
    const git = gitFor(repoPath)
    const parseLog = async (range: string): Promise<GraphCommit[]> => {
      const out = await git
        .raw(['log', range, `--pretty=format:%H${SEP}%P${SEP}%an${SEP}%ae${SEP}%at${SEP}%D${SEP}%s${REC}`])
        .catch(() => '')
      return out
        .split(REC)
        .map((r) => r.trim())
        .filter(Boolean)
        .map((rec) => {
          const [hash, parents, author, email, date, refs, subject] = rec.split(SEP)
          return {
            hash,
            parents: parents ? parents.split(' ').filter(Boolean) : [],
            author,
            email,
            date: +date,
            refs: refs ? refs.split(',').map((s) => s.trim()).filter(Boolean) : [],
            subject: subject ?? ''
          }
        })
    }
    const [aheadCommits, behindCommits, diff] = await Promise.all([
      parseLog(`${b}..${a}`),
      parseLog(`${a}..${b}`),
      git.raw(['diff', `${b}...${a}`]).catch(() => '')
    ])
    return { aheadCommits, behindCommits, diff }
  },

  /** Per-day commit counts and author tallies from the repo's history. `sinceDays` 0 = whole history. */
  async repoStats(repoPath: string, sinceDays = 0): Promise<RepoStats> {
    const git = gitFor(repoPath)
    const args = ['log', '--no-merges', `--pretty=format:%at${SEP}%an`]
    if (sinceDays > 0) args.push(`--since=${sinceDays}.days.ago`)
    const out = await git.raw(args).catch(() => '')
    const perDayMap = new Map<string, number>()
    const authorMap = new Map<string, number>()
    let first = 0
    let last = 0
    let totalCommits = 0
    for (const line of out.split('\n')) {
      const [at, ...nameParts] = line.split(SEP)
      const ts = +at
      if (!ts) continue
      const name = nameParts.join(SEP).trim() || 'Unknown'
      totalCommits += 1
      if (!last || ts > last) last = ts
      if (!first || ts < first) first = ts
      const d = new Date(ts * 1000)
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1)
      authorMap.set(name, (authorMap.get(name) ?? 0) + 1)
    }
    const perDay = [...perDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const authors = [...authorMap.entries()]
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits)
    return { totalCommits, first, last, perDay, authors }
  },

  /**
   * Rich repository insights from one `git log --numstat` pass: per-file change
   * frequency + churn (hotspots), per-author contribution totals, and a weekly
   * churn timeline. Renames are followed; binary files (numstat "-") count as a
   * touch but contribute no line counts.
   */
  /** Distinct commit authors (name + email), most-frequent first — for the
   *  composer's co-author picker. */
  async contributors(repoPath: string, max = 100): Promise<{ name: string; email: string }[]> {
    const out = await gitFor(repoPath)
      .raw(['log', '--no-merges', '-5000', `--pretty=format:%an${SEP}%ae`])
      .catch(() => '')
    const counts = new Map<string, { name: string; email: string; n: number }>()
    for (const line of out.split('\n')) {
      const [name, email] = line.split(SEP)
      if (!name || !email) continue
      const key = email.toLowerCase()
      const e = counts.get(key)
      if (e) e.n++
      else counts.set(key, { name, email, n: 1 })
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, max).map(({ name, email }) => ({ name, email }))
  },

  async repoInsights(repoPath: string, sinceDays = 0): Promise<RepoInsights> {
    const git = gitFor(repoPath)
    // \x01 prefixes each commit header so it's distinguishable from numstat rows.
    const args = ['log', '--no-merges', '--numstat', '-M', `--pretty=format:\x01%at${SEP}%an`]
    if (sinceDays > 0) args.push(`--since=${sinceDays}.days.ago`)
    const out = await git.raw(args).catch(() => '')

    const authorMap = new Map<string, AuthorStat>()
    const fileMap = new Map<string, FileHotspot>()
    const churnMap = new Map<string, ChurnPoint>()
    let totalCommits = 0
    let first = 0
    let last = 0
    let curAuthor = 'Unknown'
    let curWeek = ''
    let curTs = 0

    // ISO Monday of the week containing `ts` (seconds), as YYYY-MM-DD.
    const weekOf = (ts: number): string => {
      const d = new Date(ts * 1000)
      const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
      d.setUTCDate(d.getUTCDate() - day)
      return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${`${d.getUTCDate()}`.padStart(2, '0')}`
    }

    for (const line of out.split('\n')) {
      if (line.startsWith('\x01')) {
        const [at, name] = line.slice(1).split(SEP)
        curTs = +at || 0
        curAuthor = (name ?? '').trim() || 'Unknown'
        curWeek = weekOf(curTs)
        totalCommits += 1
        if (!last || curTs > last) last = curTs
        if (!first || curTs < first) first = curTs
        const a = authorMap.get(curAuthor) ?? { name: curAuthor, commits: 0, added: 0, removed: 0 }
        a.commits += 1
        authorMap.set(curAuthor, a)
        const w = churnMap.get(curWeek) ?? { week: curWeek, added: 0, removed: 0, commits: 0 }
        w.commits += 1
        churnMap.set(curWeek, w)
        continue
      }
      if (!line.trim()) continue
      // numstat row: "<added>\t<removed>\t<path>" ("-" for binary).
      const parts = line.split('\t')
      if (parts.length < 3) continue
      const added = parts[0] === '-' ? 0 : Number(parts[0]) || 0
      const removed = parts[1] === '-' ? 0 : Number(parts[1]) || 0
      // For renames numstat shows "old => new" (or "{a => b}/c"); keep the new path.
      let path = parts.slice(2).join('\t')
      if (path.includes('=>')) {
        path = path.replace(/\{[^}]*=>\s*([^}]*)\}/g, '$1').replace(/.*=>\s*/, '').trim()
      }
      const f = fileMap.get(path) ?? { path, commits: 0, added: 0, removed: 0 }
      f.commits += 1
      f.added += added
      f.removed += removed
      fileMap.set(path, f)
      const a = authorMap.get(curAuthor)
      if (a) {
        a.added += added
        a.removed += removed
      }
      const w = churnMap.get(curWeek)
      if (w) {
        w.added += added
        w.removed += removed
      }
    }

    const authors = [...authorMap.values()].sort((a, b) => b.commits - a.commits)
    const hotspots = [...fileMap.values()].sort((a, b) => b.commits - a.commits).slice(0, 30)
    const churn = [...churnMap.values()].sort((a, b) => a.week.localeCompare(b.week))
    return { totalCommits, first, last, filesTouched: fileMap.size, authors, hotspots, churn }
  },

  /**
   * Build a Conventional-Commits changelog for the range `from..to` (defaults to
   * the latest tag → HEAD). Commits are parsed as `type(scope)!: subject`,
   * grouped by type with breaking changes surfaced first.
   */
  async generateChangelog(
    repoPath: string,
    opts?: { from?: string; to?: string; version?: string }
  ): Promise<ChangelogResult> {
    const git = gitFor(repoPath)
    const to = opts?.to?.trim() || 'HEAD'
    // Default `from` to the most recent tag reachable from `to`, if any.
    let from = opts?.from?.trim() || ''
    if (!from) from = (await git.raw(['describe', '--tags', '--abbrev=0', to]).catch(() => '')).trim()
    const range = from ? `${from}..${to}` : to

    const raw = await git
      .raw(['log', range, '--no-merges', `--pretty=format:%h${SEP}%s${SEP}%b${REC}`])
      .catch(() => '')

    const GROUPS: { key: string; title: string }[] = [
      { key: 'feat', title: '✨ Features' },
      { key: 'fix', title: '🐛 Bug Fixes' },
      { key: 'perf', title: '⚡ Performance' },
      { key: 'refactor', title: '♻️ Refactoring' },
      { key: 'docs', title: '📝 Documentation' },
      { key: 'test', title: '✅ Tests' },
      { key: 'build', title: '📦 Build' },
      { key: 'ci', title: '🤖 CI' },
      { key: 'style', title: '💄 Styles' },
      { key: 'chore', title: '🔧 Chores' },
      { key: 'revert', title: '⏪ Reverts' }
    ]
    const buckets = new Map<string, string[]>()
    const breaking: string[] = []
    const other: string[] = []
    let count = 0

    const re = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/
    for (const rec of raw.split(REC)) {
      const t = rec.trim()
      if (!t) continue
      const [hash, subject, body] = t.split(SEP)
      if (!subject) continue
      count += 1
      const m = re.exec(subject.trim())
      const isBreaking = !!m?.[3] || /BREAKING[ -]CHANGE/.test(body ?? '')
      if (m) {
        const [, type, scope, , desc] = m
        const line = `- ${scope ? `**${scope}:** ` : ''}${desc} (\`${hash}\`)`
        if (isBreaking) breaking.push(line)
        const key = type.toLowerCase()
        if (GROUPS.some((g) => g.key === key)) {
          const arr = buckets.get(key) ?? []
          arr.push(line)
          buckets.set(key, arr)
        } else {
          other.push(line)
        }
      } else {
        const line = `- ${subject.trim()} (\`${hash}\`)`
        if (isBreaking) breaking.push(line)
        other.push(line)
      }
    }

    const date = new Date().toISOString().slice(0, 10)
    const heading = opts?.version?.trim() || (from ? `${from}..${to}` : to)
    const out: string[] = [`## ${heading} (${date})`, '']
    if (breaking.length) {
      out.push('### ⚠ BREAKING CHANGES', '', ...breaking, '')
    }
    for (const g of GROUPS) {
      const arr = buckets.get(g.key)
      if (arr?.length) out.push(`### ${g.title}`, '', ...arr, '')
    }
    if (other.length) out.push('### Other', '', ...other, '')
    if (count === 0) out.push('_No commits in this range._', '')

    return { markdown: out.join('\n').trimEnd() + '\n', count }
  },

  // ─── WIP snapshots ─────────────────────────────────────────────────────
  // A lightweight safety net: `git stash create` builds a commit capturing the
  // working tree + index WITHOUT touching either or the stash list. We pin it
  // under refs/gitcito/wip/<ts> so it survives gc and is browseable/restorable.

  /** Take a snapshot of the current changes. Returns null when nothing changed. */
  async createSnapshot(repoPath: string, auto = false, max = 30): Promise<SnapshotInfo | null> {
    const git = gitFor(repoPath)
    const status = await git.status().catch(() => null)
    if (!status || status.isClean()) return null
    const ts = Math.floor(Date.now() / 1000)
    const label = `gitcito-wip ${new Date(ts * 1000).toISOString()}${auto ? ' (auto)' : ''}`
    const sha = (await git.raw(['stash', 'create', label]).catch(() => '')).trim()
    if (!sha) return null
    const ref = `refs/gitcito/wip/${ts}${auto ? '-a' : '-m'}`
    await git.raw(['update-ref', ref, sha])
    // Prune oldest beyond `max`.
    const all = await gitService.listSnapshots(repoPath)
    for (const old of all.slice(max)) await git.raw(['update-ref', '-d', old.ref]).catch(() => {})
    const files = await git
      .raw(['stash', 'show', '--name-only', sha])
      .then((o) => o.split('\n').filter(Boolean).length)
      .catch(() => 0)
    return { ref, sha, time: ts, files, auto }
  },

  /** All saved snapshots, newest first. */
  async listSnapshots(repoPath: string): Promise<SnapshotInfo[]> {
    const git = gitFor(repoPath)
    // NB: for-each-ref does NOT interpret %xHH hex escapes (that's a git-log
    // pretty-format feature). refname/sha/unixtime contain no spaces, so a plain
    // space is a safe field separator here.
    const raw = await git
      .raw(['for-each-ref', '--sort=-creatordate', '--format=%(refname) %(objectname) %(creatordate:unix)', 'refs/gitcito/wip'])
      .catch(() => '')
    const out: SnapshotInfo[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const [ref, sha, time] = line.split(' ')
      const files = await git
        .raw(['stash', 'show', '--name-only', sha])
        .then((o) => o.split('\n').filter(Boolean).length)
        .catch(() => 0)
      out.push({ ref, sha, time: Number(time), files, auto: ref.endsWith('-a') })
    }
    return out
  },

  /** Apply a snapshot back into the working tree (does not delete it). */
  async restoreSnapshot(repoPath: string, sha: string): Promise<void> {
    await gitFor(repoPath).raw(['stash', 'apply', sha])
  },

  async deleteSnapshot(repoPath: string, ref: string): Promise<void> {
    await gitFor(repoPath).raw(['update-ref', '-d', ref]).catch(() => {})
  },

  /** Prepend a changelog block to CHANGELOG.md (created if absent). */
  async writeChangelogFile(repoPath: string, markdown: string): Promise<void> {
    const file = join(repoPath, 'CHANGELOG.md')
    const existing = await readFile(file, 'utf-8').catch(() => '')
    const header = '# Changelog\n\n'
    const bodyExisting = existing.startsWith(header) ? existing.slice(header.length) : existing
    await writeFile(file, `${header}${markdown.trimEnd()}\n\n${bodyExisting}`.trimEnd() + '\n', 'utf-8')
  },

  async version(): Promise<string> {
    const res = await simpleGit().version()
    return `${res.major}.${res.minor}.${res.patch}`
  }
}

export function registerGitHandlers(): void {
  ipcMain.handle('git', async (_e, method: string, ...args: unknown[]) => {
    const fn = (gitService as Record<string, unknown>)[method]
    if (typeof fn !== 'function') throw new Error(`Unknown git method: ${method}`)
    const event = eventForCall(method, args)
    // Stream clone progress back to the renderer. Functions can't cross IPC, so the
    // callback is appended here (after the renderer's positional args).
    if (method === 'clone') {
      args = [
        ...args,
        (p: CloneProgress) => {
          if (!_e.sender.isDestroyed()) _e.sender.send('clone:progress', p)
        }
      ]
    }
    // First positional arg is the repo path for almost every method; clone/init
    // operate before a repo exists locally, so they are recorded as app-level.
    const repoPath =
      event && typeof args[0] === 'string' && method !== 'clone' && method !== 'init' ? (args[0] as string) : ''
    try {
      const result = await (fn as (...a: unknown[]) => Promise<unknown>)(...args)
      if (event) {
        void recordEvent(event)
        void recordLog({ event, repoPath, ok: true })
      }
      return result
    } catch (err) {
      if (event) {
        void recordLog({ event, repoPath, ok: false, error: err instanceof Error ? err.message : String(err) })
      }
      throw err
    }
  })
}
