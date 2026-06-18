import { ipcMain } from 'electron'
import { simpleGit, SimpleGit } from 'simple-git'
import { basename, join } from 'path'
import { readFile, writeFile, unlink, stat, chmod, mkdir } from 'fs/promises'
import { tmpdir, homedir } from 'os'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
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
  ActivityEvent
} from '../shared/types'
import { recordEvent } from './analytics'
import { recordLog } from './log'

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

const gitFor = (repoPath: string): SimpleGit => simpleGit(repoPath)

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

function parseTrack(track: string): { ahead: number; behind: number } {
  const ahead = /ahead (\d+)/.exec(track)
  const behind = /behind (\d+)/.exec(track)
  return { ahead: ahead ? +ahead[1] : 0, behind: behind ? +behind[1] : 0 }
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
    const git = gitFor(repoPath)
    let raw = ''
    try {
      raw = await git.raw([
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
      ])
    } catch {
      return [] // empty repository
    }
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
    await gitFor(repoPath).fetch([name, '--prune'])
  },

  // ─── Branch / nav operations ───────────────────────────────────────────────

  async checkout(repoPath: string, ref: string): Promise<void> {
    await gitFor(repoPath).checkout(ref)
  },

  async checkoutRemote(repoPath: string, fullName: string, localName: string): Promise<void> {
    await gitFor(repoPath).checkout(['-b', localName, '--track', fullName])
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
    await gitFor(repoPath).push([remote, '--delete', name])
  },

  async renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
    await gitFor(repoPath).branch(['-m', oldName, newName])
  },

  async merge(repoPath: string, ref: string, noFf = false): Promise<void> {
    await gitFor(repoPath).merge([...(noFf ? ['--no-ff'] : []), ref])
  },

  async mergeInto(repoPath: string, source: string, target: string, noFf = false): Promise<void> {
    const git = gitFor(repoPath)
    await git.checkout(target)
    await git.merge([...(noFf ? ['--no-ff'] : []), source])
  },

  async rebase(repoPath: string, onto: string): Promise<void> {
    await gitFor(repoPath).rebase([onto])
  },

  async rebaseAbort(repoPath: string): Promise<void> {
    await gitFor(repoPath).rebase(['--abort'])
  },

  // ─── Sync operations ───────────────────────────────────────────────────────

  async fetchAll(repoPath: string): Promise<void> {
    await gitFor(repoPath).fetch(['--all', '--prune'])
  },

  async pull(repoPath: string, mode: 'default' | 'ff-only' | 'rebase' = 'default'): Promise<void> {
    const git = gitFor(repoPath)
    const args: string[] = []
    if (mode === 'ff-only') args.push('--ff-only')
    if (mode === 'rebase') args.push('--rebase')
    await git.pull(args)
  },

  async push(repoPath: string, branch: string, opts: { force?: boolean; remote?: string } = {}): Promise<void> {
    const git = gitFor(repoPath)
    const args = ['--set-upstream', opts.remote ?? 'origin', branch]
    if (opts.force) args.unshift('--force-with-lease')
    await git.push(args)
  },

  // ─── Stash operations ──────────────────────────────────────────────────────

  async stash(repoPath: string, message?: string): Promise<void> {
    const args = ['push', '--include-untracked']
    if (message) args.push('-m', message)
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
    if (untracked) await git.clean('f', ['--', ...files])
    else await git.raw(['checkout', '--', ...files])
  },

  /**
   * Append repo-relative patterns to the repository's root `.gitignore`,
   * skipping any that are already present. Patterns should be supplied
   * pre-formatted (e.g. anchored with a leading `/`, folders with a
   * trailing `/`). Returns the patterns that were actually added.
   */
  async addToGitignore(repoPath: string, patterns: string[]): Promise<string[]> {
    const file = join(repoPath, '.gitignore')
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

  async revertCommit(repoPath: string, hash: string): Promise<void> {
    await gitFor(repoPath).raw(['revert', '--no-edit', hash])
  },

  async reset(repoPath: string, ref: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    await gitFor(repoPath).reset([`--${mode}`, ref])
  },

  async createTag(repoPath: string, name: string, hash?: string): Promise<void> {
    await gitFor(repoPath).tag(hash ? [name, hash] : [name])
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

  async diffFile(repoPath: string, file: string, staged: boolean, untracked: boolean): Promise<string> {
    const git = gitFor(repoPath)
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
    return git.raw(staged ? ['diff', '--cached', '--', file] : ['diff', '--', file])
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

  async commitFileDiff(repoPath: string, hash: string, file: string): Promise<string> {
    return gitFor(repoPath).raw(['show', '--format=', hash, '--', file])
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

  async stashFileDiff(repoPath: string, sha: string, file: string, untracked?: boolean): Promise<string> {
    const git = gitFor(repoPath)
    if (untracked) {
      return git.raw(['diff-tree', '--root', '--no-commit-id', '-p', `${sha}^3`, '--', file])
    }
    return git.raw(['diff', `${sha}^1`, sha, '--', file])
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
    if (!ref) return readFile(join(repoPath, file), 'utf-8')
    return gitFor(repoPath).raw(['show', `${ref}:${file}`])
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
    filter?: string
  ): Promise<string> {
    const folder = name.trim() || basename(url).replace(/\.git$/, '') || 'repository'
    const target = join(parentDir, folder)
    if (existsSync(target)) throw new Error(`A folder named "${folder}" already exists here.`)
    const cloneUrl = authedCloneUrl(url, host, token)
    // A blob filter (e.g. "blob:none") makes this a partial clone — history without
    // file blobs, fetched on demand. Great for very large repos.
    await simpleGit(parentDir).clone(cloneUrl, folder, filter ? [`--filter=${filter}`] : undefined)
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
