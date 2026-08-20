import { ipcMain, shell } from 'electron'
import { simpleGit, SimpleGit } from 'simple-git'
import { basename, dirname, join, resolve as resolvePath, sep } from 'path'
import { pathToFileURL } from 'url'
import { readFile, writeFile, unlink, stat, chmod, mkdir, readdir, rename, cp, open } from 'fs/promises'
import { tmpdir, homedir } from 'os'
import { existsSync } from 'fs'
import { spawn, spawnSync, execFile } from 'child_process'
import { promisify } from 'util'

const pexecFile = promisify(execFile)
import type {
  BlameLine,
  BranchCompareResult,
  CheckoutRemoteResult,
  ConflictSide,
  DivergedStrategy,
  BranchesPayload,
  BranchInfo,
  CommitBranchInfo,
  ConflictContext,
  ConflictOpKind,
  ConflictRefInfo,
  ConflictVersions,
  FileChangeKind,
  FileEntry,
  FileHistoryEntry,
  FsDropMode,
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
  CosmosCommit,
  ChangelogResult,
  SnapshotInfo,
  SnapshotKind,
  TeammateRadarEntry,
  TeammateRadarResult,
  CommitEditInfo,
  CommitEditStep,
  CommitEditPreview,
  CommitEditResult,
  BlobAtCommit,
  CloneProgress,
  CloneOptions,
  GitflowConfig,
  GitflowKind,
  GitflowStatus,
  GitflowSnapshot,
  PushRemoteResult,
  RerereStatus,
  SubtreeInfo,
  CleanEntry,
  CleanPreview,
  CleanResult,
  ArchiveFormat,
  ArchiveResult,
  AttributeCheck,
  CredentialCandidate,
  CredentialStatus,
  ReplaceRef,
  ReplaceStatus,
  CredentialHelperInfo,
  CredentialUrlRule,
  AttributeFile,
  DiffDriverInfo,
  DiffDriverSuggestion,
  ConflictCommit,
  GitObject,
  GitObjectKind,
  RefObject,
  MergeOptions,
  FsckReport,
  MaintenanceResult,
  MaintenanceStats,
  MaintenanceTask,
  BundleInfo,
  BundleRef,
  BundleResult,
  BundleScope,
  HistoryPathEntry,
  HistoryPurgePreview,
  HistoryPurgeBackup,
  HistoryPurgeResult,
  RepoHost,
  MergePreviewEntry,
  MergePreviewResult,
  MergeRiskKind,
  BlobSpec,
  SemanticDiff,
  RangeDiffEntry,
  RefTip,
  ForcedRefUpdate,
  AbsorbPlan,
  AbsorbTarget,
  AbsorbHunk,
  TimelapseCommit,
  RepoPulse,
  RepoDetail,
  PrPreviewMode,
  PrPreviewResult,
  PrRefProbe,
  PreparedRepoChatFileAction,
  RepoFileBatchResult
} from '../shared/types'
import { FILE_TOO_LARGE_PREFIX } from '../shared/types'
import { prRefCandidates } from '../shared/prRefs'
import { parseMergeTreeSingle, parseMergeTreeStdin, type MergeTreeRecord } from '../shared/mergeTree'
import { parseRangeDiff } from '../shared/rangeDiff'
import { parseForcedUpdates } from '../shared/fetchPorcelain'
import { buildPatch, parsePatch, touchedOldLines } from '../shared/patchHunks'
import { semanticCompare } from './semantic'
import { recordEvent } from './analytics'
import { recordLog } from './log'
import { activeProfileToken, readSettings } from './settings'
import { applyPreparedRepoFileActions, RepoFileActionError } from './repoFileActions'

const SEP = '\x1f'

/**
 * How eagerly `git range-diff` pairs a commit with its rewritten self. git's
 * default (60) leaves small commits unpaired — they show up as a delete plus an
 * add, which is exactly the "everything changed" noise this feature exists to
 * remove. Pairing slightly too eagerly is the better failure: the interdiff is
 * right there to judge it by.
 *
 * 75 was not eager enough. A one-line change to a four-line file — the
 * `force-push` playground's "validate password", and the shape of most review
 * fixes — still scored as two unrelated commits; the pairing only holds from
 * 80 up. 85 sits clear of that edge without pairing commits that merely touch
 * the same file.
 */
const CREATION_FACTOR = '--creation-factor=85'

/** Days of commit activity summarised in a Mission Control sparkline. */
const ACTIVITY_DAYS = 14
const REC = '\x1e'

/**
 * Maps a git IPC method to the activity event it should record on success.
 * `commit` is special-cased in the dispatcher (amend flag → 'amend').
 */
const EVENT_FOR_METHOD: Record<string, ActivityEvent> = {
  push: 'push',
  pushToRemotes: 'push',
  pushAllTags: 'push',
  pull: 'pull',
  fetchAll: 'fetch',
  fetchRemote: 'fetch',
  amendCommitMessage: 'amend',
  createBranch: 'branchCreate',
  gitflowStart: 'branchCreate',
  gitflowFinish: 'merge',
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
  init: 'init',
  initHere: 'init'
}

function eventForCall(method: string, args: unknown[]): ActivityEvent | null {
  if (method === 'commit') return args[2] === true ? 'amend' : 'commit'
  // A preview either merges into HEAD or just parks a fetched ref on a branch.
  if (method === 'previewRef') return args[3] === 'merge' ? 'merge' : 'fetch'
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

// Bounded LRU for immutable, content-addressed reads. A commit's file list and
// diff never change for a given sha, so re-opening the same commit (or paging
// its files) can be served from memory instead of re-shelling git. Rewritten
// shas (amend/rebase) simply orphan their old entries, which age out.
class LruCache<V> {
  private map = new Map<string, V>()
  private bytes = 0
  constructor(
    private readonly max: number,
    // Byte-bound the cache too: 500 entries of multi-MB lockfile diffs is
    // gigabytes while the entry count reads as "within limits".
    private readonly maxBytes: number,
    private readonly sizeOf: (v: V) => number
  ) {}
  get(key: string): V | undefined {
    const v = this.map.get(key)
    if (v !== undefined) {
      this.map.delete(key)
      this.map.set(key, v) // mark most-recently-used
    }
    return v
  }
  set(key: string, value: V): void {
    const size = this.sizeOf(value)
    // An entry bigger than half the byte budget would evict everything else
    // for one hit — cheaper to just recompute it on demand.
    if (size > this.maxBytes / 2) return
    const prev = this.map.get(key)
    if (prev !== undefined) {
      this.map.delete(key)
      this.bytes -= this.sizeOf(prev)
    }
    this.map.set(key, value)
    this.bytes += size
    while (this.map.size > this.max || this.bytes > this.maxBytes) {
      const oldest = this.map.keys().next().value
      if (oldest === undefined) break
      const evicted = this.map.get(oldest)
      this.map.delete(oldest)
      if (evicted !== undefined) this.bytes -= this.sizeOf(evicted)
    }
  }
}
// JS strings are UTF-16 → ~2 bytes per code unit.
const strBytes = (s: string): number => s.length * 2
const commitDiffCache = new LruCache<string>(500, 48 * 1024 * 1024, strBytes)
const commitFilesCache = new LruCache<FileEntry[]>(
  500,
  16 * 1024 * 1024,
  (files) => files.reduce((n, f) => n + strBytes(f.path) + 64, 0)
)
async function memo<V>(cache: LruCache<V>, key: string, fetch: () => Promise<V>): Promise<V> {
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const val = await fetch()
  cache.set(key, val)
  return val
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

/**
 * A git config key cannot hold a slash in its subsection when written this way,
 * and a prefix is a path — so it is encoded, and decoded on the way back.
 */
function encodeSubtreeKey(prefix: string): string {
  return prefix.replace(/\//g, '%2F')
}

function decodeSubtreeKey(key: string): string {
  return key.replace(/%2F/g, '/')
}

/** Remember where a subtree came from — git itself keeps no such record. */
async function rememberSubtree(repoPath: string, prefix: string, url: string, ref: string): Promise<void> {
  const key = encodeSubtreeKey(prefix)
  const git = gitFor(repoPath)
  await git.raw(['config', `gitcito.subtree.${key}.url`, url])
  await git.raw(['config', `gitcito.subtree.${key}.ref`, ref])
}

/**
 * `git subtree` is a shell script shipped alongside git, not a builtin, so a
 * stripped-down install can be missing it. Say that plainly instead of letting
 * "'subtree' is not a git command" reach a toast.
 */
async function runSubtree(repoPath: string, args: string[]): Promise<string> {
  // `git subtree` checks for local modifications with a plumbing command that
  // trusts the index's stat cache. A repository whose files were touched without
  // being changed — a checkout, a copy, a restored backup — then looks dirty and
  // the command refuses. Porcelain refreshes first; so do we.
  await runGit(repoPath, ['update-index', '-q', '--refresh']).catch(() => undefined)
  try {
    return await runGit(repoPath, ['subtree', ...args])
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/is not a git command|subtree.*not found/i.test(message)) {
      throw new Error("This git installation has no `git subtree` — it ships as a contrib script and is missing here.")
    }
    throw err
  }
}

/**
 * Files git resolved from a memorised resolution during the operation that is
 * currently conflicted, per repository.
 *
 * Git only says so once — "Resolved 'x' using previous resolution." on the
 * output of the merge/rebase that hit the conflict — and nothing in the
 * repository records it afterwards. Deriving it from `rerere status`/`remaining`
 * later does not work: after a replay the file is absent from both, and so is a
 * conflict rerere never understood. So it is captured when it is said.
 *
 * Session state on purpose: if Gitcito restarts mid-conflict the hint is simply
 * gone, which is better than showing a guess.
 */
const rerereReplayed = new Map<string, string[]>()

const RESOLVED_LINE = /Resolved '(.+?)' using previous resolution/g

/** Run an operation that may conflict, noting any rerere replays it announces. */
async function withRerereCapture<T>(repoPath: string, op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (err) {
    const output = err instanceof Error ? err.message : String(err)
    const files: string[] = []
    for (const match of output.matchAll(RESOLVED_LINE)) files.push(match[1])
    if (files.length) rerereReplayed.set(repoPath, files)
    throw err
  }
}

/** Config key holding the paths a purge removed. Git config keys must begin
 *  with a letter, so the timestamp cannot stand alone. */
function prePurgeKey(at: number): string {
  return `gitcito.prepurge.at${at}`
}

/**
 * Total size of every blob ever stored at `paths`. Walks all reachable objects
 * once and keeps the ones whose recorded name matches — `rev-list --objects`
 * prints `<sha> <path>` for anything that has a name.
 */
async function blobBytesForPaths(repoPath: string, paths: string[]): Promise<number> {
  const wanted = new Set(paths)
  const listed = await runGit(repoPath, ['rev-list', '--objects', '--branches', '--tags', '--', ...paths]).catch(
    () => ''
  )
  const shas = new Set<string>()
  for (const line of listed.split('\n')) {
    const space = line.indexOf(' ')
    if (space <= 0) continue
    const name = line.slice(space + 1).trim()
    if (wanted.has(name)) shas.add(line.slice(0, space))
  }
  if (!shas.size) return 0

  // `cat-file --batch-check` would need a stdin pipe; a handful of blobs is
  // cheaper to size one at a time than to wire that up.
  let bytes = 0
  for (const sha of shas) {
    const size = await runGit(repoPath, ['cat-file', '-s', sha]).catch(() => '')
    bytes += Number(size.trim()) || 0
  }
  return bytes
}

/**
 * Turn {@link MergeOptions} into git flags.
 *
 * Accepts a bare boolean as well: every caller before merge options existed
 * passed `noFf` positionally, and a merge is not the place to break a signature.
 */
function mergeArgs(options: MergeOptions | boolean): string[] {
  const o: MergeOptions = typeof options === 'boolean' ? { noFf: options } : (options ?? {})
  const args: string[] = []
  if (o.ffOnly) args.push('--ff-only')
  else if (o.noFf) args.push('--no-ff')
  if (o.squash) args.push('--squash')
  if (o.noCommit) args.push('--no-commit')
  if (o.strategy && o.strategy !== 'ort') args.push('-s', o.strategy)
  // -X ours/theirs resolves only the hunks that actually clash. It is not
  // `-s ours`, which throws the other side away wholesale — a difference worth
  // keeping straight, since one is routine and the other loses work.
  if (o.favour) args.push('-X', o.favour)
  if (o.ignoreSpace) args.push('-X', `ignore-space-${o.ignoreSpace === 'eol' ? 'at-eol' : o.ignoreSpace}`)
  return args
}

/** In-flight `git bisect run` children, so one can be stopped by repo path. */
const bisectRuns = new Map<string, import('child_process').ChildProcess>()

/** How much of a blob the object explorer shows before saying "truncated". */
const OBJECT_BLOB_PREVIEW = 200_000

/**
 * Does a configured credential helper actually exist?
 *
 * git resolves a bare name to `git-credential-<name>`, which lives beside git
 * rather than on PATH — hence the exec-path probe. A `!`-prefixed value is a
 * shell command git runs verbatim, so only its first word can be checked.
 */
function credentialHelperExists(value: string): boolean {
  const raw = value.trim()
  if (!raw) return false
  if (raw.startsWith('!')) return hasBinary(raw.slice(1).trim().split(/\s+/)[0].replace(/^"|"$/g, ''))
  const name = raw.split(/\s+/)[0]
  // Absolute path, or a command of its own.
  if (name.includes('/') || name.includes('\\')) return existsSync(name) || hasBinary(name)
  if (name === 'cache' || name === 'store') return true // built into git itself
  if (hasBinary(`git-credential-${name}`)) return true
  const execPath = spawnSync('git', ['--exec-path'], { encoding: 'utf-8' }).stdout?.trim()
  return !!execPath && existsSync(join(execPath, `git-credential-${name}`))
}

/** The helpers worth offering on this platform, and whether they are installed. */
function credentialCandidates(): CredentialCandidate[] {
  const platform = process.platform
  const names =
    platform === 'darwin'
      ? ['osxkeychain', 'cache', 'store']
      : platform === 'win32'
        ? ['manager', 'wincred', 'cache', 'store']
        : ['libsecret', 'cache', 'store']
  const best = platform === 'darwin' ? 'osxkeychain' : platform === 'win32' ? 'manager' : 'libsecret'
  return names.map((name) => ({
    name,
    available: credentialHelperExists(name),
    recommended: name === best
  }))
}

/** Is this command on PATH? Used to say which diff converters are real here. */
function hasBinary(command: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which'
  try {
    return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0
  } catch {
    return false
  }
}

/** How many removable paths a clean preview will size and show. */
const CLEAN_ENTRY_CAP = 400

/** How many files a directory walk will stat before giving up on an exact size. */
const CLEAN_WALK_CAP = 20000

/** Space a file actually occupies, not the length of its contents.
 *
 *  The difference is not academic here: a loose git object is a few hundred
 *  bytes in a 4 KB block, so a repository with a thousand of them costs 4 MB of
 *  disk and reports 250 KB of content. `git count-objects` answers in blocks,
 *  and a panel that mixes the two makes the parts add up to more than the whole.
 *  `blocks` is absent on some Windows filesystems — fall back to the length. */
function diskBytes(s: { size: number; blocks?: number }): number {
  return s.blocks && s.blocks > 0 ? s.blocks * 512 : s.size
}

/**
 * Bytes under a directory, as the disk gives them up. Capped: an untracked
 * `node_modules` holds hundreds of thousands of files, and a preview that stats
 * all of them is a preview nobody waits for. Hitting the cap under-reports
 * rather than stalls.
 */
async function dirBytes(dir: string, budget: { files: number }): Promise<number> {
  let total = 0
  const stack = [dir]
  while (stack.length && budget.files > 0) {
    const current = stack.pop() as string
    const entries = await readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (budget.files-- <= 0) break
      const full = join(current, entry.name)
      // Symlinks are never followed: their target may sit outside the repo.
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) total += await stat(full).then(diskBytes).catch(() => 0)
    }
  }
  return total
}

/**
 * Everything `git clean` could remove, as git itself sees it.
 *
 * `--directory` collapses a wholly untracked folder into one entry (`dist/`)
 * instead of listing every file inside it — the same grouping `git clean -d`
 * removes by, and the only listing short enough to read.
 */
async function cleanCandidates(repoPath: string): Promise<{ untracked: string[]; ignored: string[] }> {
  const list = async (extra: string[]): Promise<string[]> => {
    const out = await runGit(repoPath, [
      'ls-files',
      '-z',
      '--others',
      '--exclude-standard',
      '--directory',
      '--no-empty-directory',
      ...extra
    ]).catch(() => '')
    return out.split('\0').filter(Boolean)
  }
  return { untracked: await list([]), ignored: await list(['--ignored']) }
}

/** The configured branch prefix for a git-flow kind. */
function prefixFor(config: GitflowConfig, kind: GitflowKind): string {
  return kind === 'feature' ? config.featurePrefix : kind === 'release' ? config.releasePrefix : config.hotfixPrefix
}

/** Local branch names, short form. */
async function localBranches(repoPath: string): Promise<string[]> {
  const raw = await gitFor(repoPath)
    .raw(['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
    .catch(() => '')
  return raw.split('\n').map((l) => l.trim()).filter(Boolean)
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

/**
 * Strip `user:secret@` out of every URL in a message.
 *
 * Git echoes the remote URL back in its errors, and `withRemoteAuth` puts the
 * active PAT into that URL for the duration of a network call — so without this
 * an unlucky failure prints the token into the UI, the operation log, and any
 * screenshot of either.
 */
export function redactCredentials(msg: string): string {
  return msg.replace(/(:\/\/)[^/\s@]+(?::[^/\s@]*)?@/g, '$1***@')
}

/** Run a git command non-interactively, surfacing stderr as the thrown message. */
async function runGit(repoPath: string, args: string[], extraEnv?: NodeJS.ProcessEnv): Promise<string> {
  try {
    const { stdout } = await pexecFile('git', ['-C', repoPath, ...args], {
      env: extraEnv ? { ...noPromptEnv(), ...extraEnv } : noPromptEnv()
    })
    return stdout
  } catch (err) {
    const e = err as { stderr?: string; message?: string }
    throw new Error(redactCredentials((e.stderr || e.message || 'git command failed').trim()))
  }
}

// ─── WIP snapshot plumbing (see the gitService section for the full story) ───

const SNAPSHOT_SUFFIX: Record<SnapshotKind, string> = { auto: '-a', manual: '-m', guard: '-g' }

function kindForSnapshotRef(ref: string): SnapshotKind {
  return ref.endsWith('-a') ? 'auto' : ref.endsWith('-g') ? 'guard' : 'manual'
}

/** Snapshot refs, newest first. Cheap: one for-each-ref, no per-ref subprocesses. */
async function listSnapshotRefs(repoPath: string): Promise<{ ref: string; sha: string; time: number }[]> {
  // NB: for-each-ref does NOT interpret %xHH hex escapes (that's a git-log
  // pretty-format feature). refname/sha/unixtime contain no spaces, so a plain
  // space is a safe field separator here.
  const raw = await gitFor(repoPath)
    .raw(['for-each-ref', '--sort=-creatordate', '--format=%(refname) %(objectname) %(creatordate:unix)', 'refs/gitcito/wip'])
    .catch(() => '')
  const out: { ref: string; sha: string; time: number }[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [ref, sha, time] = line.split(' ')
    out.push({ ref, sha, time: Number(time) })
  }
  return out
}

/**
 * Best-effort snapshot taken right before a destructive operation, so the state
 * about to be destroyed stays recoverable. Never blocks the operation: every
 * failure here is swallowed — the guard is a parachute, not a gate.
 */
async function guardSnapshot(repoPath: string): Promise<void> {
  try {
    const settings = await readSettings()
    if (settings.snapshotGuard === false) return
    await gitService.createSnapshot(repoPath, 'guard')
  } catch {
    /* the operation must not be blocked by its own parachute */
  }
}

// ─── Commit-edit plumbing (see the gitService section for the full story) ───

/** Read a blob at `<sha>:<file>` as a raw Buffer (git show, no encoding loss). */
function readBlobBuffer(repoPath: string, spec: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'show', spec], { env: noPromptEnv() })
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

/**
 * Cherry-pick `commit` onto `onto` entirely in memory: merge-tree with the
 * commit's own parent as the explicit base, so only the commit's patch moves.
 * Exit 1 (conflict) is a result, not an error.
 */
async function cherryPickTree(
  repoPath: string,
  base: string,
  onto: string,
  commit: string
): Promise<MergeTreeRecord> {
  const args = ['-C', repoPath, 'merge-tree', '--write-tree', '--name-only', '--messages', `--merge-base=${base}`, onto, commit]
  try {
    const { stdout } = await pexecFile('git', args, { env: noPromptEnv(), maxBuffer: 16 * 1024 * 1024 })
    return parseMergeTreeSingle(stdout, 0)
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string }
    const code = typeof e.code === 'number' ? e.code : 2
    return parseMergeTreeSingle(e.stdout ?? '', code, e.stderr || e.message || '')
  }
}

/** Author identity + full message of one commit, for faithful rewrites. */
async function commitIdentity(
  repoPath: string,
  sha: string
): Promise<{ name: string; email: string; date: string; message: string }> {
  const raw = await runGit(repoPath, ['log', '-1', '--format=%an%x00%ae%x00%aI%x00%B', sha])
  const [name, email, date, ...rest] = raw.split('\x00')
  return { name, email, date, message: rest.join('\x00').replace(/\n+$/, '') }
}

/** Env that re-commits as the original author (committer stays the local user). */
function authorEnv(id: { name: string; email: string; date: string }): NodeJS.ProcessEnv {
  return { GIT_AUTHOR_NAME: id.name, GIT_AUTHOR_EMAIL: id.email, GIT_AUTHOR_DATE: id.date }
}

/**
 * The engine under commit editing: build a replacement for `sha` with edited
 * file contents and/or a new message, then replay every descendant up to HEAD
 * on top of it — all with plumbing (temp index, hash-object, commit-tree,
 * in-memory merge-tree). No ref moves, no worktree writes: the caller decides
 * whether the resulting tip becomes real. Dangling objects from a discarded
 * preview are ordinary gc food.
 */
async function rewriteWithEdits(
  repoPath: string,
  sha: string,
  edits: Record<string, string>,
  message: string
): Promise<CommitEditPreview> {
  const gitDir = (await runGit(repoPath, ['rev-parse', '--absolute-git-dir'])).trim()
  const stamp = `${process.pid}-${Date.now()}`
  const tmpIndex = join(gitDir, `gitcito-edit-index-${stamp}`)
  const tmpBlob = join(gitDir, `gitcito-edit-blob-${stamp}`)
  const env = { GIT_INDEX_FILE: tmpIndex }
  try {
    // 1. The edited commit's replacement tree.
    await runGit(repoPath, ['read-tree', `${sha}^{tree}`], env)
    for (const [file, content] of Object.entries(edits)) {
      const entry = (await runGit(repoPath, ['ls-tree', sha, '--', file])).trim()
      const mode = entry.split(' ')[0]
      if (mode !== '100644' && mode !== '100755') throw new Error(`Not an editable file in this commit: ${file}`)
      await writeFile(tmpBlob, content, 'utf-8')
      const blob = (await runGit(repoPath, ['hash-object', '-w', '--', tmpBlob])).trim()
      await runGit(repoPath, ['update-index', '--add', '--cacheinfo', `${mode},${blob},${file}`], env)
    }
    const newTree = (await runGit(repoPath, ['write-tree'], env)).trim()

    // 2. Replacement commit, same parents and author, possibly a new message.
    const parentLine = (await runGit(repoPath, ['rev-list', '--parents', '-n', '1', sha])).trim().split(' ')
    const parents = parentLine.slice(1).flatMap((p) => ['-p', p])
    const id = await commitIdentity(repoPath, sha)
    let tip = (
      await runGit(repoPath, ['commit-tree', newTree, ...parents, '-m', message || id.message], authorEnv(id))
    ).trim()

    // 3. Replay descendants oldest → newest. Each one is an in-memory
    //    cherry-pick; the first conflict stops the cascade and marks the rest.
    const range = (await runGit(repoPath, ['log', '--reverse', '--format=%H%x00%s', `${sha}..HEAD`]))
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [h, ...s] = l.split('\x00')
        return { sha: h, subject: s.join('\x00') }
      })
    const steps: CommitEditStep[] = []
    let prevOld = sha
    let conflicted = false
    for (const c of range) {
      if (conflicted) {
        steps.push({ sha: c.sha, subject: c.subject, status: 'blocked', files: [] })
        continue
      }
      const rec = await cherryPickTree(repoPath, prevOld, tip, c.sha)
      if (rec.status !== 'clean') {
        conflicted = true
        steps.push({ sha: c.sha, subject: c.subject, status: 'conflict', files: rec.files })
        continue
      }
      const cid = await commitIdentity(repoPath, c.sha)
      tip = (await runGit(repoPath, ['commit-tree', rec.tree, '-p', tip, '-m', cid.message], authorEnv(cid))).trim()
      steps.push({ sha: c.sha, subject: c.subject, status: 'clean', files: [] })
      prevOld = c.sha
    }
    return { newTip: conflicted ? null : tip, steps }
  } finally {
    await unlink(tmpIndex).catch(() => {})
    await unlink(tmpBlob).catch(() => {})
  }
}

/** True when `sha` is an ancestor of HEAD with a merge-free path up to it. */
async function isLinearToHead(repoPath: string, sha: string): Promise<boolean> {
  const ancestor = await runGit(repoPath, ['merge-base', '--is-ancestor', sha, 'HEAD']).then(
    () => true,
    () => false
  )
  if (!ancestor) return false
  const merges = (await runGit(repoPath, ['rev-list', '--merges', `${sha}..HEAD`]).catch(() => 'x')).trim()
  if (merges) return false
  // The edited commit itself must not be a merge either.
  const parents = (await runGit(repoPath, ['rev-list', '--parents', '-n', '1', sha])).trim().split(' ')
  return parents.length <= 2
}

/**
 * Run git with `input` on stdin and hand back whatever it wrote to stdout.
 * A non-zero exit is not an error here: `merge-tree --stdin` aborts the batch
 * on the first fatal merge, and the records it already emitted are still good.
 */
function gitWithStdin(repoPath: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('git', ['-C', repoPath, ...args], { env: noPromptEnv() })
    let out = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.on('error', () => resolve(out))
    child.on('close', () => resolve(out))
    child.stdin.on('error', () => undefined)
    child.stdin.end(input)
  })
}

/** One in-memory merge of `ref` into `base`, used to fill gaps left by a batch abort. */
async function singleMergeTree(repoPath: string, base: string, ref: string): Promise<MergeTreeRecord> {
  const args = ['-C', repoPath, 'merge-tree', '--write-tree', '--name-only', '--messages', base, ref]
  try {
    const { stdout } = await pexecFile('git', args, { env: noPromptEnv(), maxBuffer: 16 * 1024 * 1024 })
    return parseMergeTreeSingle(stdout, 0)
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string }
    const code = typeof e.code === 'number' ? e.code : 2
    return parseMergeTreeSingle(e.stdout ?? '', code, e.stderr || e.message || '')
  }
}

/** How far back absorb may reach: your unpublished commits, and no further. */
async function absorbCandidates(
  repoPath: string
): Promise<{ commits: { sha: string; subject: string }[]; base: string; label: string }> {
  interface Range {
    commits: { sha: string; subject: string }[]
    base: string
    label: string
  }
  const none: Range = { commits: [], base: '', label: '' }
  const read = async (range: string, label: string, base: string): Promise<Range | null> => {
    const out = await runGit(repoPath, ['log', `--format=%H${SEP}%s`, range]).catch(() => '')
    const commits = out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, subject] = line.split(SEP)
        return { sha, subject: subject ?? '' }
      })
    return commits.length ? { commits, base, label } : null
  }

  // Preferred: everything the upstream branch doesn't have yet.
  const upstream = await runGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
    .then((o) => o.trim())
    .catch(() => '')
  if (upstream) {
    const found = await read(`${upstream}..HEAD`, `unpushed (${upstream}..HEAD)`, upstream)
    if (found) return found
  }

  // No upstream: fall back to the commits this branch added on top of the trunk.
  for (const trunk of ['origin/main', 'origin/master', 'main', 'master']) {
    const base = await runGit(repoPath, ['merge-base', 'HEAD', trunk])
      .then((o) => o.trim())
      .catch(() => '')
    if (!base) continue
    const found = await read(`${base}..HEAD`, `since ${trunk}`, base)
    if (found) return found
  }

  // Brand-new repo with no trunk to compare against: offer the recent commits.
  const found = await read('-25 HEAD', 'last 25 commits', 'HEAD~25')
  return found ?? none
}

/**
 * Blame the old side of each hunk and hand it to the newest candidate commit
 * that owns any of its lines. Deleted lines are the strong signal; a hunk that
 * only adds falls back to the context around it, which is where the new code
 * is going.
 */
async function attributeHunks(
  repoPath: string,
  diff: string,
  candidates: { sha: string; subject: string }[]
): Promise<{ targets: AbsorbTarget[]; unmatched: AbsorbHunk[] }> {
  // Candidates come newest-first; the index doubles as "how recent".
  const rank = new Map(candidates.map((c, i) => [c.sha, i]))
  const byTarget = new Map<string, AbsorbHunk[]>()
  const unmatched: AbsorbHunk[] = []

  for (const file of parsePatch(diff)) {
    for (const hunk of file.hunks) {
      const entry: AbsorbHunk = {
        file: file.newPath,
        header: hunk.header,
        added: hunk.lines.filter((l) => l.startsWith('+')).length,
        removed: hunk.lines.filter((l) => l.startsWith('-')).length
      }
      // A new or binary file has no history to attribute to.
      if (file.binary || !hunk.oldCount) {
        unmatched.push(entry)
        continue
      }

      const { deleted, context } = touchedOldLines(hunk)
      const lines = deleted.length ? deleted : context
      const owners = await blameOwners(repoPath, file.oldPath, lines)
      let best: string | null = null
      for (const sha of owners) {
        const r = rank.get(sha)
        if (r === undefined) continue
        if (best === null || r < rank.get(best)!) best = sha
      }
      if (!best) {
        unmatched.push(entry)
        continue
      }
      const list = byTarget.get(best)
      if (list) list.push(entry)
      else byTarget.set(best, [entry])
    }
  }

  // Keep the targets in history order (newest first), like the graph shows them.
  const targets: AbsorbTarget[] = candidates
    .filter((c) => byTarget.has(c.sha))
    .map((c) => ({ sha: c.sha, subject: c.subject, hunks: byTarget.get(c.sha)! }))
  return { targets, unmatched }
}

/** Commits that last touched the given lines of a file in HEAD. */
async function blameOwners(repoPath: string, file: string, lines: number[]): Promise<Set<string>> {
  const owners = new Set<string>()
  if (!lines.length) return owners
  // One blame per contiguous run keeps the number of processes down on a hunk
  // that spans many lines.
  for (const [start, end] of contiguousRuns(lines)) {
    const out = await runGit(repoPath, [
      'blame',
      '-w',
      '--porcelain',
      '-L',
      `${start},${end}`,
      'HEAD',
      '--',
      file
    ]).catch(() => '')
    for (const line of out.split('\n')) {
      const m = /^([0-9a-f]{40}) \d+ \d+/.exec(line)
      if (m) owners.add(m[1])
    }
  }
  return owners
}

function contiguousRuns(lines: number[]): [number, number][] {
  const sorted = [...new Set(lines)].sort((a, b) => a - b)
  const runs: [number, number][] = []
  for (const n of sorted) {
    const last = runs[runs.length - 1]
    if (last && n === last[1] + 1) last[1] = n
    else runs.push([n, n])
  }
  return runs
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
  const token = host ? await activeProfileToken(host, repoPath) : undefined
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

// In-memory caps for whole-file reads. Both are overridable per call with
// `force` — the renderer surfaces the refusal and offers "load anyway", so
// nothing becomes unreachable, but a stray click on a 2GB video no longer
// allocates 5× its size across main + IPC + renderer.
const PREVIEW_MAX_BYTES = 32 * 1024 * 1024
const TEXT_MAX_BYTES = 16 * 1024 * 1024

/** Byte size of a working-tree file or a blob at `ref`, null when unknowable. */
async function blobSize(repoPath: string, file: string, ref?: string): Promise<number | null> {
  try {
    if (!ref) return (await stat(join(repoPath, file))).size
    const out = await gitFor(repoPath).raw(['cat-file', '-s', `${ref}:${file}`])
    const n = Number(out.trim())
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

async function assertUnderCap(repoPath: string, file: string, ref: string | undefined, cap: number): Promise<void> {
  const size = await blobSize(repoPath, file, ref)
  if (size !== null && size > cap) throw new Error(`${FILE_TOO_LARGE_PREFIX}${size}`)
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

/** Decide the base name a dropped item lands under in `dir`, honouring the
 *  caller's conflict choice. 'replace' trashes the existing entry first (so the
 *  drop is recoverable); 'keepBoth' picks the next free "name 2" style suffix. */
async function resolveDrop(repoPath: string, dir: string, name: string, mode: FsDropMode): Promise<string> {
  const dirAbs = join(repoPath, dir)
  const target = join(dirAbs, name)
  if (!existsSync(target)) return name
  if (mode === 'error') throw new Error(`Already exists: ${dir ? `${dir}/${name}` : name}`)
  if (mode === 'replace') {
    await shell.trashItem(target)
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem} ${i}${ext}`
    if (!existsSync(join(dirAbs, candidate))) return candidate
  }
  throw new Error(`No free name left for ${name}`)
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

  /**
   * First-parent SHAs of every stash entry — the commits each stash was saved
   * on top of. Used to seed `log()` so unreachable stash bases still appear in
   * the graph and their stashes have something to connect to. Best-effort: a
   * repo with no stashes (or a failure listing them) simply yields none.
   */
  async stashBaseShas(repoPath: string): Promise<string[]> {
    try {
      const out = await gitFor(repoPath).raw(['stash', 'list', '--pretty=format:%P'])
      const bases = new Set<string>()
      for (const line of out.split('\n')) {
        const first = line.trim().split(' ')[0]
        if (first) bases.add(first)
      }
      return [...bases]
    } catch {
      return []
    }
  },

  // `skip` pages deeper into history so "load more" fetches only the next
  // window instead of re-reading everything already loaded. Ordering is stable
  // (--date-order over the same revs), and the store dedupes by hash, so a
  // page boundary shifting under new commits cannot duplicate rows.
  async log(repoPath: string, maxCount = 400, skip = 0): Promise<GraphCommit[]> {
    // Stash base commits are frequently unreachable from any branch (a stash is
    // the only thing pointing at them). Feed those bases in as explicit revs so
    // the graph can show where each stash was taken from, instead of leaving the
    // stash floating with no parent. `--ignore-missing` keeps a stale/pruned
    // base from failing the whole log.
    const stashBases = await gitService.stashBaseShas(repoPath)
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
      ...stashBases,
      '--ignore-missing',
      '--date-order',
      `--max-count=${maxCount}`,
      ...(skip > 0 ? [`--skip=${skip}`] : []),
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

    const mergedRefs = new Set<string>()
    try {
      const out = await git.raw([
        'for-each-ref',
        '--merged=HEAD',
        '--format=%(refname)',
        'refs/heads',
        'refs/remotes'
      ])
      for (const ref of out.split('\n').filter(Boolean)) mergedRefs.add(ref)
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
        locals.push({
          name,
          sha,
          upstream: upstream || null,
          ahead,
          behind,
          isCurrent: name === current,
          mergedIntoCurrent: mergedRefs.has(`refs/heads/${name}`)
        })
      }
    } catch {
      /* ignore */
    }

    const remotes: RemoteBranchInfo[] = []
    try {
      const out = await git.raw([
        'for-each-ref',
        `--format=%(refname)${SEP}%(objectname:short)${SEP}%(symref)`,
        'refs/remotes'
      ])
      for (const line of out.split('\n').filter(Boolean)) {
        const [refName, sha, symref] = line.split(SEP)
        if (symref || !refName.startsWith('refs/remotes/')) continue
        const fullName = refName.slice('refs/remotes/'.length)
        if (fullName.endsWith('/HEAD')) continue
        const slash = fullName.indexOf('/')
        if (slash <= 0) continue
        remotes.push({
          remote: fullName.slice(0, slash),
          name: fullName.slice(slash + 1),
          fullName,
          sha,
          mergedIntoCurrent: mergedRefs.has(refName)
        })
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

  /**
   * Conflict Radar — merge every ref into `base` inside the object database and
   * report which ones would conflict. `git merge-tree --write-tree` writes only
   * loose objects: no index, no working tree, no refs, no checkout, so this is
   * safe to run over every branch while the user keeps working.
   */
  async mergePreview(repoPath: string, base: string, refs: string[]): Promise<MergePreviewResult> {
    const baseSha = (await runGit(repoPath, ['rev-parse', base])).trim()
    const baseTree = (await runGit(repoPath, ['rev-parse', `${base}^{tree}`])).trim()
    // Refs never contain whitespace; anything that does would corrupt the
    // one-merge-per-line stdin protocol.
    const wanted = [...new Set(refs.filter((r) => r && !/\s/.test(r)))]

    // One process for the whole batch. git aborts the stream on the first fatal
    // merge (unknown ref, unrelated histories), so short results are re-run one
    // ref at a time below rather than being reported as failures.
    let records: MergeTreeRecord[] = []
    if (wanted.length) {
      const stdin = wanted.map((r) => `${baseSha} ${r}`).join('\n') + '\n'
      const out = await gitWithStdin(repoPath, ['merge-tree', '--stdin', '--name-only'], stdin)
      records = parseMergeTreeStdin(out)
    }

    const entries: MergePreviewEntry[] = []
    for (let i = 0; i < wanted.length; i++) {
      const ref = wanted[i]
      const rec = records[i] ?? (await singleMergeTree(repoPath, baseSha, ref))
      // A merge whose result is the base tree changes nothing — the ref is
      // already contained in the base.
      const status: MergeRiskKind =
        rec.status === 'clean' && rec.tree === baseTree ? 'merged' : rec.status
      entries.push({
        ref,
        status,
        files: rec.files,
        message: rec.status === 'error' ? rec.message || 'merge-tree failed' : undefined
      })
    }

    return { base, baseSha, entries, scannedAt: Date.now() }
  },

  /**
   * Teammate radar: remote awareness computed entirely from the last fetch.
   * For every recently-moved remote branch with commits HEAD does not have,
   * report who moved it, which files those commits touch, which of them are
   * dirty in the local working tree right now, and whether merging the branch
   * into HEAD would conflict (batched in-memory merge-tree). No network.
   */
  async teammateRadar(
    repoPath: string,
    opts?: { maxBranches?: number; maxDays?: number }
  ): Promise<TeammateRadarResult> {
    const maxBranches = opts?.maxBranches ?? 30
    const maxAgeSec = (opts?.maxDays ?? 45) * 86_400
    const empty: TeammateRadarResult = { entries: [], dirtyCount: 0, scannedAt: Date.now() }

    // Unborn HEAD → nothing to compare against.
    const head = (await runGit(repoPath, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim()
    if (!head) return empty

    // One call: every remote tip with its last committer and date, newest first.
    const raw = await runGit(repoPath, [
      'for-each-ref',
      '--sort=-committerdate',
      '--format=%(refname:short)|%(objectname:short)|%(committerdate:unix)|%(committername)',
      'refs/remotes'
    ]).catch(() => '')
    const now = Math.floor(Date.now() / 1000)
    const tips: { ref: string; sha: string; time: number; author: string }[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      // committername may itself contain '|' in pathological configs — keep it last and rejoin.
      const [ref, sha, time, ...rest] = line.split('|')
      // Symbolic origin/HEAD shortens to just "origin" — a real remote branch
      // short name always carries a slash.
      if (ref.endsWith('/HEAD') || !ref.includes('/')) continue
      if (now - Number(time) > maxAgeSec) continue
      tips.push({ ref, sha, time: Number(time), author: rest.join('|') })
      if (tips.length >= maxBranches) break
    }
    if (!tips.length) return empty

    const status = await gitFor(repoPath).status().catch(() => null)
    const dirty = new Set((status?.files ?? []).map((f) => f.path))

    const entries: TeammateRadarEntry[] = []
    for (const t of tips) {
      const ahead = Number(
        (await runGit(repoPath, ['rev-list', '--count', `${head}..${t.ref}`]).catch(() => '0')).trim()
      )
      if (!ahead) continue
      // Three-dot diff = what the branch would bring in, measured from the merge base.
      const files = (await runGit(repoPath, ['diff', '--name-only', `${head}...${t.ref}`]).catch(() => ''))
        .split('\n')
        .filter(Boolean)
      entries.push({
        ref: t.ref,
        sha: t.sha,
        author: t.author,
        time: t.time,
        ahead,
        filesTouched: files.length,
        overlap: files.filter((f) => dirty.has(f)),
        risk: 'clean',
        conflictFiles: []
      })
    }

    // One batched merge-tree for the conflict forecast.
    if (entries.length) {
      const preview = await gitService.mergePreview(repoPath, 'HEAD', entries.map((e) => e.ref)).catch(() => null)
      for (const p of preview?.entries ?? []) {
        const e = entries.find((x) => x.ref === p.ref)
        if (!e) continue
        e.risk = p.status
        e.conflictFiles = p.status === 'conflict' ? p.files : []
      }
    }

    // Most collision-prone first: overlap, then predicted conflicts, then recency.
    entries.sort(
      (a, b) =>
        b.overlap.length - a.overlap.length ||
        Number(b.risk === 'conflict') - Number(a.risk === 'conflict') ||
        b.time - a.time
    )
    return { entries, dirtyCount: dirty.size, scannedAt: Date.now() }
  },

  /**
   * `git range-diff` — pair up the commits of two versions of a branch and show
   * how each one was rewritten. This is the answer to "someone force-pushed,
   * what actually changed since I reviewed it?", which a plain diff cannot give
   * because every commit after a rebase looks brand new.
   *
   * With `base`, both ranges are taken from it (`base..old` vs `base..new`);
   * without it the symmetric `old...new` form lets git work the bases out —
   * which is what you want when the branch was rebased onto something else.
   */
  async rangeDiff(repoPath: string, oldRev: string, newRev: string, base?: string): Promise<RangeDiffEntry[]> {
    // Resolve first: git rejects reflog selectors inside the `old...new` form
    // ("need two commit ranges"), and `origin/feature@{1}` is exactly what the
    // reflog picker hands us.
    const [oldSha, newSha] = await Promise.all([
      runGit(repoPath, ['rev-parse', oldRev]).then((o) => o.trim()),
      runGit(repoPath, ['rev-parse', newRev]).then((o) => o.trim())
    ])
    // Without an explicit base, take the two versions' common ancestor: it
    // keeps the comparison to the commits that actually differ, and (unlike the
    // `old...new` form) still lists identical commits as unchanged when the
    // branch was rebased onto something newer.
    let effectiveBase = base?.trim()
    if (!effectiveBase) {
      effectiveBase = await runGit(repoPath, ['merge-base', oldSha, newSha])
        .then((o) => o.trim())
        .catch(() => '')
    }
    const args = effectiveBase
      ? ['range-diff', CREATION_FACTOR, effectiveBase, oldSha, newSha]
      : ['range-diff', CREATION_FACTOR, `${oldSha}...${newSha}`]
    const out = await runGit(repoPath, args)
    return parseRangeDiff(out)
  },

  /**
   * Where a ref has been, newest first, from its reflog — the free record of
   * every rebase, reset and forced fetch. Entry 0 is the current tip, so the
   * "what changed since…" picker starts at index 1.
   */
  async refTips(repoPath: string, ref: string, max = 20): Promise<RefTip[]> {
    let out = ''
    try {
      out = await runGit(repoPath, [
        'reflog',
        'show',
        `--max-count=${max}`,
        `--format=%H${SEP}%gd${SEP}%gs${SEP}%ct${SEP}%s`,
        ref
      ])
    } catch {
      return [] // no reflog for this ref (a fresh clone's remote refs, say)
    }
    const tips: RefTip[] = []
    for (const line of out.split('\n').filter(Boolean)) {
      const [sha, selector, reason, date, subject] = line.split(SEP)
      if (!sha) continue
      tips.push({ sha, selector, reason: reason ?? '', date: Number(date) || 0, subject: subject ?? '' })
    }
    // Consecutive entries pointing at the same commit (a checkout, a no-op
    // fetch) would offer the user a comparison against itself.
    return tips.filter((t, i) => i === 0 || t.sha !== tips[i - 1].sha)
  },

  /**
   * A cheap, purely local health check for one repository — the row Mission
   * Control shows for it.
   *
   * `status --porcelain=v2 --branch` answers branch, upstream, ahead/behind and
   * every dirty path in a single process, so a dashboard over twenty repos
   * costs twenty git calls rather than a hundred. Nothing here touches the
   * network: no fetch, no host API.
   */
  async repoPulse(repoPath: string): Promise<RepoPulse> {
    const pulse: RepoPulse = {
      path: repoPath,
      name: basename(repoPath),
      branch: '',
      upstream: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      stashes: 0,
      lastCommitAt: 0,
      operation: null,
      activity: [],
      error: null
    }

    try {
      const out = await runGit(repoPath, ['status', '--porcelain=v2', '--branch', '-z'])
      for (const line of out.split('\0')) {
        if (!line) continue
        if (line.startsWith('# branch.head ')) {
          const head = line.slice('# branch.head '.length).trim()
          pulse.branch = head === '(detached)' ? '' : head
        } else if (line.startsWith('# branch.upstream ')) {
          pulse.upstream = line.slice('# branch.upstream '.length).trim()
        } else if (line.startsWith('# branch.ab ')) {
          const m = /\+(\d+) -(\d+)/.exec(line)
          if (m) {
            pulse.ahead = Number(m[1])
            pulse.behind = Number(m[2])
          }
        } else if (line.startsWith('u ')) {
          pulse.conflicted++
        } else if (line.startsWith('? ')) {
          pulse.untracked++
        } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
          // `<XY>` staged/worktree status pair, e.g. "1 .M N... ".
          const xy = line.slice(2, 4)
          if (xy[0] !== '.') pulse.staged++
          if (xy[1] !== '.') pulse.unstaged++
        }
      }
    } catch (err) {
      pulse.error = err instanceof Error ? err.message : String(err)
      return pulse
    }

    const [stashes, lastCommit, operation] = await Promise.all([
      runGit(repoPath, ['stash', 'list']).catch(() => ''),
      runGit(repoPath, ['log', '-1', '--format=%ct']).catch(() => ''),
      gitService.mergeState(repoPath).catch(() => null)
    ])
    pulse.stashes = stashes.split('\n').filter(Boolean).length
    pulse.lastCommitAt = Number(lastCommit.trim()) || 0
    pulse.operation = operation

    // Commits per day for the last fortnight, oldest bucket first — the row's
    // sparkline. One extra cheap `log`, and only timestamps come back.
    const since = Math.floor(Date.now() / 1000) - ACTIVITY_DAYS * 86400
    const stamps = await runGit(repoPath, ['log', `--since=@${since}`, '--format=%ct']).catch(() => '')
    const buckets = new Array<number>(ACTIVITY_DAYS).fill(0)
    for (const line of stamps.split('\n')) {
      const at = Number(line)
      if (!at) continue
      const day = Math.floor((Date.now() / 1000 - at) / 86400)
      if (day >= 0 && day < ACTIVITY_DAYS) buckets[ACTIVITY_DAYS - 1 - day]++
    }
    pulse.activity = buckets
    return pulse
  },

  /**
   * The extra detail one row expands to show: what is dirty and what is waiting
   * to be pushed. Only fetched for the row the user actually opens, so a
   * dashboard of twenty repos doesn't pay for twenty of these.
   */
  async repoDetail(repoPath: string, max = 8): Promise<RepoDetail> {
    const [status, unpushed] = await Promise.all([
      gitService.status(repoPath).catch(() => null),
      // No shell involved, so the revspec goes through verbatim; a branch with
      // no upstream simply yields nothing.
      runGit(repoPath, ['log', '--format=%h%x1f%s', `--max-count=${max}`, '@{upstream}..HEAD']).catch(() => '')
    ])
    const files = [...(status?.conflicted ?? []), ...(status?.staged ?? []), ...(status?.unstaged ?? [])]
      .slice(0, max)
      .map((f) => ({ path: f.path, status: f.status }))
    const commits = unpushed
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, subject] = line.split(SEP)
        return { hash, subject: subject ?? '' }
      })
    return { files, commits }
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

  // Who is being merged into whom. Drives the "Merging X into Y" header and the
  // "commit abc123 on branch" labels above each side of the conflict editor.
  // Returns null when no merge/rebase/cherry-pick/revert is in progress.
  async conflictContext(repoPath: string): Promise<ConflictContext | null> {
    const kind = await gitService.mergeState(repoPath)
    if (!kind) return null
    const git = gitFor(repoPath)
    const gitPath = async (name: string): Promise<string> => (await git.raw(['rev-parse', '--git-path', name])).trim()
    const abs = (p: string): string => (p.startsWith('/') ? p : join(repoPath, p))
    const readIfPresent = async (name: string): Promise<string> => {
      const p = abs(await gitPath(name))
      if (!existsSync(p)) return ''
      try {
        return (await readFile(p, 'utf-8')).trim()
      } catch {
        return ''
      }
    }

    // `main~2` / `feature^0` still identify a branch for display purposes.
    const branchOf = async (ref: string): Promise<string> => {
      try {
        const out = (await git.raw(['name-rev', '--name-only', '--refs=refs/heads/*', ref])).trim()
        if (!out || out === 'undefined') return ''
        return out.replace(/[~^].*$/, '')
      } catch {
        return ''
      }
    }
    const info = async (ref: string): Promise<ConflictRefInfo | null> => {
      try {
        const out = await git.raw(['log', '-1', `--format=%h${SEP}%s${SEP}%an${SEP}%aI`, ref])
        const [sha, subject, author, date] = out.trim().split(SEP)
        if (!sha) return null
        return { sha, subject: subject ?? '', branch: await branchOf(ref), author: author ?? '', date: date ?? '' }
      } catch {
        return null
      }
    }

    const currentBranch = async (): Promise<string> => {
      try {
        return (await git.raw(['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim()
      } catch {
        return ''
      }
    }

    const theirsRef =
      kind === 'merge'
        ? 'MERGE_HEAD'
        : kind === 'cherry-pick'
          ? 'CHERRY_PICK_HEAD'
          : kind === 'revert'
            ? 'REVERT_HEAD'
            : 'REBASE_HEAD'
    const [ours, theirs] = await Promise.all([info('HEAD'), info(theirsRef)])

    let source = ''
    let target = ''
    if (kind === 'rebase') {
      // During a rebase HEAD sits on the upstream side, so `ours` is the target
      // branch and the replayed commits (`theirs`) belong to the rebased branch.
      const headName = (await readIfPresent('rebase-merge/head-name')) || (await readIfPresent('rebase-apply/head-name'))
      const onto = (await readIfPresent('rebase-merge/onto')) || (await readIfPresent('rebase-apply/onto'))
      source = headName.replace(/^refs\/heads\//, '')
      target = onto ? await branchOf(onto) : ''
      if (!target) target = ours?.branch || (onto ? onto.slice(0, 7) : '')
    } else {
      target = (await currentBranch()) || ours?.branch || ours?.sha || ''
      if (kind === 'merge') {
        // MERGE_MSG carries the ref the user actually typed ("Merge branch 'x'");
        // name-rev only knows where the sha happens to live.
        const msg = await readIfPresent('MERGE_MSG')
        const m = /^Merge (?:remote-tracking )?branch(?:es)? '([^']+)'/m.exec(msg) ?? /^Merge tag '([^']+)'/m.exec(msg)
        source = m?.[1] ?? ''
      }
      if (!source) source = theirs?.branch || theirs?.sha || ''
    }

    return { kind, source, target, ours, theirs }
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

  // ─── Previewing someone else's work ────────────────────────────────────────

  /**
   * Find the ref a pull request's head lives under on `remote`.
   *
   * Every candidate convention goes into one `ls-remote`, so an unknown or
   * self-hosted forge costs the same single round trip as GitHub. No API token
   * and no fork remote are involved — which is the whole point: a PR from a
   * fork is previewable even when its source repository is unreachable.
   *
   * Returns null when the remote publishes no such ref (the host does not
   * mirror PR heads, or the number does not exist).
   *
   * Deliberately **not** a READ_METHOD despite reading nothing: `withRemoteAuth`
   * rewrites `.git/config` to inject the PAT, so two of these under the shared
   * read lock race for `.git/config.lock` and one loses.
   */
  async resolvePrRef(repoPath: string, remote: string, number: number): Promise<PrRefProbe | null> {
    const candidates = prRefCandidates(number, await getRemoteUrl(repoPath, remote))
    const out = await withRemoteAuth(repoPath, remote, () =>
      runGit(repoPath, ['ls-remote', remote, ...candidates.map((c) => c.ref)])
    )
    const found = new Map<string, string>()
    for (const line of out.split('\n')) {
      const [sha, ref] = line.split('\t')
      if (sha && ref) found.set(ref.trim(), sha.trim())
    }
    // Candidate order is priority order, so the first hit is the best guess.
    for (const c of candidates) {
      const sha = found.get(c.ref)
      if (sha) return { ...c, sha }
    }
    return null
  },

  /**
   * Bring `ref` down from `remote` and apply it locally without writing a
   * commit, so the work can be run and then dropped without a trace:
   *
   * - `checkout` fetches it onto `localBranch` (reset with `-B`, so previewing
   *   the same PR twice reuses the branch) and switches to it.
   * - `merge` merges it into the current branch with `--no-commit --no-ff`,
   *   leaving the merged tree staged. Conflicts are reported rather than
   *   thrown, because a conflicted preview is a useful answer.
   *
   * The fetch is deliberately `--no-tags`: a preview should not drag the
   * remote's tag namespace into the local repository.
   */
  async previewRef(
    repoPath: string,
    remote: string,
    ref: string,
    mode: PrPreviewMode,
    localBranch?: string
  ): Promise<PrPreviewResult> {
    await withRemoteAuth(repoPath, remote, () => runGit(repoPath, ['fetch', '--no-tags', remote, ref]))
    const sha = (await runGit(repoPath, ['rev-parse', 'FETCH_HEAD'])).trim()

    if (mode === 'checkout') {
      if (!localBranch) throw new Error('A local branch name is required to check out a preview')
      await runGit(repoPath, ['checkout', '-B', localBranch, sha])
      return { ref, sha, mode, localBranch, conflicts: [] }
    }

    // Run the merge through `runGit`, not simple-git: simple-git's `raw`
    // *resolves* on a conflicted merge, which would report a clean preview over
    // a conflicted tree. A non-zero exit here is expected — the conflicted tree
    // it leaves behind is exactly what the user asked to see, so read the
    // conflicts back instead of surfacing git's error.
    try {
      await runGit(repoPath, ['merge', '--no-commit', '--no-ff', sha])
    } catch (err) {
      const conflicts = (await runGit(repoPath, ['diff', '--name-only', '--diff-filter=U']))
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (conflicts.length === 0) throw err
      return { ref, sha, mode, conflicts }
    }
    return { ref, sha, mode, conflicts: [] }
  },

  // ─── Branch / nav operations ───────────────────────────────────────────────

  async checkout(repoPath: string, ref: string): Promise<void> {
    await gitFor(repoPath).checkout(ref)
  },

  async checkoutRemote(
    repoPath: string,
    fullName: string,
    localName: string,
    remote?: string
  ): Promise<CheckoutRemoteResult> {
    const git = gitFor(repoPath)
    if (remote) {
      // Refresh the remote-tracking ref first, so "checkout as local" always
      // picks up the actual remote tip instead of whatever was last fetched.
      // Uses the shared `gitFor` instance (not a raw exec) so it's queued
      // alongside every other git op on this repo — a bare exec here would run
      // truly concurrently with in-flight status/checkout/stash calls and can
      // collide on `.git/index.lock`. Best-effort: offline/auth hiccups
      // shouldn't block checking out the locally-known ref.
      await withRemoteAuth(repoPath, remote, () => git.fetch(remote, localName)).catch(() => {})
    }
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
        return { diverged: true, aheadOnly: false, ahead, behind }
      }
      // The local branch is ahead and the remote has nothing new. Silently
      // checking it out answers a request for the remote branch with local
      // work — so report it and let the renderer ask what the user meant.
      if (ahead > 0) {
        return { diverged: false, aheadOnly: true, ahead, behind }
      }
      // Fast-forward the existing local branch to the remote tip so the
      // checkout actually brings in the remote changes. withAutoStash shelves a
      // dirty working tree under a named stash before the FF and restores it
      // after, so local edits don't abort the update.
      await withAutoStash(repoPath, `checkout ${localName}`, async () => {
        await git.checkout(localName)
        if (behind > 0) await git.merge(['--ff-only', fullName])
      })
      return { diverged: false, aheadOnly: false, ahead, behind }
    } else {
      await git.checkout(['-b', localName, '--track', fullName])
      return { diverged: false, aheadOnly: false, ahead: 0, behind: 0 }
    }
  },

  /**
   * Reconcile a diverged local branch with its remote after the user picks a
   * strategy in the divergence dialog. When `backup` is set, a
   * `backup/<localName>-<timestamp>` branch is created at the current local tip
   * first, so even a `reset` can be undone by checking that branch out.
   *   - rebase:       replay local commits on top of the remote tip (linear history)
   *   - merge:        --no-ff merge, keeping both histories
   *   - reset-soft:   move the branch to the remote tip, keep the commits' changes staged
   *   - reset-mixed:  same, but leave the changes unstaged in the working tree
   *   - reset-hard:   discard the local commits and their changes entirely
   */
  async resolveDivergedCheckout(
    repoPath: string,
    fullName: string,
    localName: string,
    strategy: DivergedStrategy,
    backup: boolean
  ): Promise<{ backupRef?: string; previousRef: string }> {
    const git = gitFor(repoPath)
    let backupRef: string | undefined
    // The tip we are about to move away from — the renderer keeps it as the
    // undo target, so a reset is recoverable even without a backup branch.
    const previousRef = (await git.revparse([localName])).trim()
    await withAutoStash(repoPath, `checkout ${localName}`, async () => {
      await git.checkout(localName)
      if (backup) {
        backupRef = `backup/${localName}-${backupStamp()}`
        await git.branch([backupRef])
      }
      if (strategy === 'rebase') await git.rebase([fullName])
      else if (strategy === 'merge') await git.merge(['--no-ff', fullName])
      // reset-soft / reset-mixed / reset-hard map straight onto git's modes:
      // how much of the discarded commits survives in the index and the tree.
      else await git.reset([`--${strategy.slice('reset-'.length)}`, fullName])
    })
    return { backupRef, previousRef }
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

  /**
   * Drop stack levels whose PR has landed: while the bottom-most tracked branch
   * is already contained in the trunk (as seen by the last fetch when an
   * origin/<trunk> exists), reparent its child onto the trunk, untrack it, and
   * safe-delete the branch (`-d` refuses anything unmerged; the current branch
   * is left alone). Squash merges are invisible to the local ancestry check;
   * callers pass branches with a host-verified merged PR via `alsoMerged`.
   * Returns the pruned branch names, bottom first.
   */
  async stackPruneMerged(repoPath: string, alsoMerged: string[] = []): Promise<string[]> {
    const git = gitFor(repoPath)
    const pruned: string[] = []
    for (;;) {
      const info = await gitService.stackInfo(repoPath)
      const bottom = info.branches[0]
      if (!info.trunk || !bottom) break
      const trunkRef = (await runGit(repoPath, ['rev-parse', '--verify', `origin/${info.trunk}`]).catch(() => ''))
        ? `origin/${info.trunk}`
        : info.trunk
      // `alsoMerged` carries host-side proof (a merged PR) for squash merges,
      // which leave no ancestry a local git can see.
      const merged =
        alsoMerged.includes(bottom.name) ||
        (await runGit(repoPath, ['merge-base', '--is-ancestor', bottom.name, trunkRef]).then(
          () => true,
          () => false
        ))
      if (!merged) break
      const child = info.branches[1]
      if (child) await gitService.stackSetParent(repoPath, child.name, info.trunk)
      await gitService.stackClearParent(repoPath, bottom.name)
      // -D, not -d: git's own safety check measures against HEAD (the leaf),
      // which need not contain the bottom — the ancestor test above already
      // proved the trunk has everything this branch ever was.
      if (!bottom.isCurrent) await git.raw(['branch', '-D', bottom.name]).catch(() => {})
      pruned.push(bottom.name)
    }
    return pruned
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

  async merge(repoPath: string, ref: string, options: MergeOptions | boolean = {}): Promise<void> {
    const args = mergeArgs(options)
    await withRerereCapture(repoPath, () =>
      withAutoStash(repoPath, `merge ${ref}`, () => gitFor(repoPath).merge([...args, ref]))
    )
  },

  async mergeInto(
    repoPath: string,
    source: string,
    target: string,
    options: MergeOptions | boolean = {}
  ): Promise<void> {
    const git = gitFor(repoPath)
    const args = mergeArgs(options)
    await withRerereCapture(repoPath, () =>
      withAutoStash(repoPath, `merge ${source} into ${target}`, async () => {
        await git.checkout(target)
        await git.merge([...args, source])
      })
    )
  },

  /**
   * The commits behind a conflict: what each side did to this file since they
   * parted.
   *
   * This is `git log --merge`, which git has shipped forever and nobody finds.
   * A conflict marker says *what* clashes; this says *who changed it and why*,
   * which is usually the question that actually decides the resolution.
   */
  async conflictCommits(repoPath: string, file: string): Promise<ConflictCommit[]> {
    const out = await runGit(repoPath, [
      'log',
      '--merge',
      '--left-right',
      `--format=%m${SEP}%H${SEP}%s${SEP}%an${SEP}%aI`,
      '--',
      file
    ]).catch(() => '')
    const commits: ConflictCommit[] = []
    for (const line of out.split('\n')) {
      const [mark, sha, subject, author, date] = line.split(SEP)
      if (!sha) continue
      // `<` is the side already checked out, `>` the one being merged in.
      commits.push({ sha, subject, author, date, side: mark === '<' ? 'ours' : 'theirs' })
    }
    return commits
  },

  async rebase(repoPath: string, onto: string): Promise<void> {
    await withRerereCapture(repoPath, () => gitFor(repoPath).rebase([onto]))
  },

  /** Check out `branch` then rebase it onto `onto` (for the drag-to-rebase gesture). */
  async rebaseOnto(repoPath: string, branch: string, onto: string): Promise<void> {
    const git = gitFor(repoPath)
    await git.checkout(branch)
    await withRerereCapture(repoPath, () => git.rebase([onto]))
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
  async autosquash(repoPath: string, base: string, autostash = false): Promise<void> {
    // Run via execFile, not simple-git: simple-git refuses both a PAGER env
    // (allowUnsafePager) and `-c core.editor` (allowUnsafeEditor). Real git with
    // these *_EDITOR vars set to true accepts the auto-generated todo without
    // opening an editor.
    // `--autostash` lets the rebase run with a dirty tree (absorb leaves the
    // unattributed changes in place), restoring them afterwards.
    const args = ['-C', repoPath, 'rebase', '-i', '--autosquash']
    if (autostash) args.push('--autostash')
    args.push(base)
    await pexecFile('git', args, {
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

  /**
   * Returns the refs that were **force-updated** by this fetch — history the
   * remote rewrote under us. `--porcelain` is what makes that knowable without
   * diffing every ref by hand; on a git too old to support it we simply fetch
   * and report nothing.
   */
  async fetchAll(repoPath: string): Promise<ForcedRefUpdate[]> {
    // `--all` spans every remote; authenticate the common case (origin). Other
    // private https remotes without a matching PAT fail fast rather than hang.
    try {
      const out = await withRemoteAuth(repoPath, 'origin', () =>
        runGit(repoPath, ['fetch', '--all', '--prune', '--porcelain'])
      )
      return parseForcedUpdates(out)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!/unknown option|porcelain/i.test(message)) throw err
      await withRemoteAuth(repoPath, 'origin', () => runGit(repoPath, ['fetch', '--all', '--prune']))
      return []
    }
  },

  async pull(repoPath: string, mode: 'default' | 'ff-only' | 'rebase' = 'default'): Promise<void> {
    const remote = await upstreamRemote(repoPath)
    const args = ['pull']
    if (mode === 'ff-only') args.push('--ff-only')
    if (mode === 'rebase') args.push('--rebase')
    await withRerereCapture(repoPath, () =>
      withAutoStash(repoPath, 'pull', () => withRemoteAuth(repoPath, remote, () => runGit(repoPath, args)))
    )
  },

  async push(repoPath: string, branch: string, opts: { force?: boolean; remote?: string } = {}): Promise<void> {
    const remote = opts.remote ?? 'origin'
    const args = ['push']
    if (opts.force) args.push('--force-with-lease')
    args.push('--set-upstream', remote, branch)
    await withRemoteAuth(repoPath, remote, () => runGit(repoPath, args))
  },

  /**
   * Push one branch to several remotes in turn.
   *
   * A failure against one remote does not cancel the others: pushing a fork and
   * its upstream is the whole point, and "upstream rejected it" is no reason to
   * leave the fork behind. Each result is reported separately.
   */
  async pushToRemotes(
    repoPath: string,
    branch: string,
    remotes: string[],
    opts: { force?: boolean; tags?: boolean } = {}
  ): Promise<PushRemoteResult[]> {
    const targets = remotes.map((r) => r.trim()).filter(Boolean)
    if (!targets.length) throw new Error('Choose at least one remote.')

    const results: PushRemoteResult[] = []
    for (const remote of targets) {
      const args = ['push']
      if (opts.force) args.push('--force-with-lease')
      // Only the first remote's push sets the upstream — a branch has one, and
      // the last remote pushed to is not automatically the one to track.
      if (remote === targets[0]) args.push('--set-upstream')
      if (opts.tags) args.push('--follow-tags')
      args.push(remote, branch)
      try {
        await withRemoteAuth(repoPath, remote, () => runGit(repoPath, args))
        results.push({ remote, ok: true, error: '' })
      } catch (err) {
        results.push({ remote, ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return results
  },

  /** Publish every local tag to a remote. Annotated and lightweight alike. */
  async pushAllTags(repoPath: string, remote = 'origin'): Promise<void> {
    await withRemoteAuth(repoPath, remote, () => runGit(repoPath, ['push', remote, '--tags']))
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

  /** Overwrite the working copies of `paths` with their content at `hash` —
   *  "take these changes" from a commit without touching HEAD or the index. */
  async restoreFromCommit(repoPath: string, hash: string, paths: string[]): Promise<void> {
    if (!paths.length) return
    await guardSnapshot(repoPath)
    const git = gitFor(repoPath)
    await git.raw(['restore', '--source', hash, '--worktree', '--', ...paths])
  },

  /**
   * Force-apply (or pop) a stash whose untracked files collide with files that
   * already exist in the working tree. Plain `git stash apply` aborts with
   * "could not restore untracked files from stash" rather than clobber them, so
   * we delete the colliding untracked paths — they're about to be replaced by the
   * stash's own copies — then retry the apply/pop.
   */
  async stashApplyOverwrite(repoPath: string, index = 0, pop = false): Promise<void> {
    const git = gitFor(repoPath)
    const ref = `stash@{${index}}`
    const sha = (await git.raw(['rev-parse', ref])).trim()
    // The untracked tree (`^3`) exists only when the stash was made with -u.
    const listed = await git.raw(['ls-tree', '-r', '-z', '--name-only', `${sha}^3`]).catch(() => '')
    for (const rel of listed.split('\0').filter(Boolean)) {
      const abs = join(repoPath, rel)
      if (existsSync(abs)) await unlink(abs).catch(() => {})
    }
    await gitFor(repoPath).stash([pop ? 'pop' : 'apply', ref])
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

  // ─── Object replacement (`git replace`) ────────────────────────────────────
  // A replacement is a ref that says "wherever you were going to read object A,
  // read B instead". Nothing is rewritten and no sha changes — which makes it
  // the honest way to shorten a clone's history without the violence of a
  // filter-branch, and a genuinely dangerous thing to leave lying around
  // unexplained, since the history everyone sees is no longer the history that
  // is stored.

  /** Every replacement, with enough of each side to tell them apart. */
  async replacements(repoPath: string): Promise<ReplaceStatus> {
    const listed = await runGit(repoPath, ['replace', '-l', '--format=long']).catch(() => '')
    const refs: ReplaceRef[] = []
    for (const line of listed.split('\n')) {
      // "<original> (<type>) -> <replacement> (<type>)"
      const match = /^([0-9a-f]{40,64})\s+\([^)]*\)\s+->\s+([0-9a-f]{40,64})/.exec(line.trim())
      if (!match) continue
      const [, original, replacement] = match
      // The original is behind the replacement now, so ask for it with
      // replacements switched off — otherwise both sides read the same.
      const subject = async (sha: string, raw: boolean): Promise<string> =>
        (
          await runGit(repoPath, [...(raw ? ['--no-replace-objects'] : []), 'log', '-1', '--format=%s', sha]).catch(
            () => ''
          )
        ).trim()
      const parents = (
        await runGit(repoPath, ['--no-replace-objects', 'log', '-1', '--format=%P', replacement]).catch(() => '')
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      refs.push({
        original,
        originalSubject: await subject(original, true),
        replacement,
        replacementSubject: await subject(replacement, false),
        replacementParents: parents
      })
    }
    const useReplace = (await runGit(repoPath, ['config', '--get', 'core.useReplaceRefs']).catch(() => '')).trim()
    return { refs, enabled: useReplace !== 'false' }
  },

  /**
   * Graft a commit onto different parents — or onto none at all.
   *
   * `git replace --graft <commit>` with no parents makes that commit look like
   * the beginning of history: everything before it becomes unreachable through
   * normal walks, without a single object being rewritten. Point it at a commit
   * in an archive repository instead, and the truncated clone gets its full
   * history back.
   */
  async replaceGraft(repoPath: string, commit: string, parents: string[]): Promise<string> {
    const target = commit.trim()
    if (!target) throw new Error('Choose a commit to graft.')
    const args = ['replace', '--graft', target, ...parents.map((p) => p.trim()).filter(Boolean)]
    await runGit(repoPath, args)
    return (await runGit(repoPath, ['rev-parse', target])).trim()
  },

  /** Replace one object with another outright. */
  async replaceObject(repoPath: string, original: string, replacement: string): Promise<void> {
    if (!original.trim() || !replacement.trim()) throw new Error('Both objects are needed.')
    await runGit(repoPath, ['replace', '-f', original.trim(), replacement.trim()])
  },

  /** Drop a replacement. The original was never touched, so this restores it. */
  async replaceDelete(repoPath: string, original: string): Promise<void> {
    if (!original.trim()) throw new Error('Nothing to delete.')
    await runGit(repoPath, ['replace', '-d', original.trim()])
  },

  /** Turn replacements on or off for this repository (`core.useReplaceRefs`). */
  async setUseReplaceRefs(repoPath: string, enabled: boolean): Promise<void> {
    if (enabled) await runGit(repoPath, ['config', '--local', '--unset', 'core.useReplaceRefs']).catch(() => undefined)
    else await runGit(repoPath, ['config', '--local', 'core.useReplaceRefs', 'false'])
  },

  // ─── Credential helpers ────────────────────────────────────────────────────
  // Git has its own credential store, and it is neither Gitcito's keychain nor
  // your SSH agent. Misconfiguring it is the usual reason a push asks for a
  // password every single time — or, worse, the reason a password is sitting in
  // a plain file. Nothing here ever reads a secret: `git credential fill` would
  // print one to stdout, so it is not used at all.

  /** How git will answer the next password prompt, and what it would use. */
  async credentialStatus(repoPath: string): Promise<CredentialStatus> {
    const readScope = async (scope: 'system' | 'global' | 'repo'): Promise<string[]> => {
      const flag = scope === 'repo' ? '--local' : `--${scope}`
      const out = await runGit(repoPath, ['config', flag, '--get-all', 'credential.helper']).catch(() => '')
      return out.split('\n').map((l) => l.trim()).filter(Boolean)
    }

    const helpers: CredentialHelperInfo[] = []
    for (const scope of ['system', 'global', 'repo'] as const) {
      for (const value of await readScope(scope)) {
        helpers.push({
          value,
          scope,
          available: credentialHelperExists(value),
          plaintext: value === 'store' || value.startsWith('store ')
        })
      }
    }

    // Per-URL sections: `credential.https://github.com.helper`. These beat the
    // plain setting for the URLs they match, which is exactly the kind of thing
    // that is invisible until it bites.
    const urlRules: CredentialUrlRule[] = []
    for (const scope of ['system', 'global', 'repo'] as const) {
      const flag = scope === 'repo' ? '--local' : `--${scope}`
      const out = await runGit(repoPath, ['config', flag, '--get-regexp', '^credential\\..*\\.(helper|username)$']).catch(
        () => ''
      )
      for (const line of out.split('\n')) {
        const space = line.indexOf(' ')
        if (space < 0) continue
        const match = /^credential\.(.*)\.(helper|username)$/.exec(line.slice(0, space))
        if (!match) continue
        const [, url, key] = match
        const value = line.slice(space + 1).trim()
        const existing = urlRules.find((r) => r.url === url && r.scope === scope)
        const rule = existing ?? { url, helper: '', username: '', scope }
        if (key === 'helper') rule.helper = value
        else rule.username = value
        if (!existing) urlRules.push(rule)
      }
    }

    const plaintextPath = join(homedir(), '.git-credentials')
    const plaintext = await readFile(plaintextPath, 'utf-8').catch(() => null)

    const remotes = await runGit(repoPath, ['remote', '-v']).catch(() => '')
    const hosts = new Set<string>()
    for (const line of remotes.split('\n')) {
      const url = line.split(/\s+/)[1] ?? ''
      const host = /^https?:\/\/(?:[^@/]*@)?([^/]+)/.exec(url)?.[1]
      if (host) hosts.add(host)
    }

    return {
      helpers,
      urlRules,
      candidates: credentialCandidates(),
      plaintextFile: {
        path: plaintextPath,
        exists: plaintext !== null,
        // Counted, never returned: every line of that file is a live password.
        entries: plaintext ? plaintext.split('\n').filter((l) => l.trim()).length : 0
      },
      httpsHosts: [...hosts]
    }
  },

  /** Set or clear `credential.helper`. An empty value removes the setting. */
  async setCredentialHelper(repoPath: string, value: string, scope: 'global' | 'repo'): Promise<void> {
    const flag = scope === 'repo' ? '--local' : '--global'
    // `--unset-all`, not `--unset`: helpers stack, and leaving one behind is how
    // "I turned it off and it still remembers" happens.
    await runGit(repoPath, ['config', flag, '--unset-all', 'credential.helper']).catch(() => undefined)
    if (value.trim()) await runGit(repoPath, ['config', flag, '--add', 'credential.helper', value.trim()])
  },

  /**
   * Make git forget what it has stored for a host.
   *
   * `git credential reject` is the documented way in: it hands the request to
   * whichever helper is configured and asks it to erase. Nothing is read back,
   * so no secret passes through here.
   */
  async forgetCredential(repoPath: string, host: string, protocol = 'https'): Promise<void> {
    const target = host.trim()
    if (!target) throw new Error('Give a host to forget.')
    await new Promise<void>((resolve, reject) => {
      const child = spawn('git', ['-C', repoPath, 'credential', 'reject'], { env: noPromptEnv() })
      let err = ''
      child.stderr.on('data', (d: Buffer) => (err += d.toString()))
      child.on('error', reject)
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || `git credential reject exited ${code}`))))
      child.stdin.end(`protocol=${protocol}\nhost=${target}\n\n`)
    })
  },

  // ─── Attributes ────────────────────────────────────────────────────────────
  // `.gitattributes` is how a repository teaches git about its own files —
  // which are binary, which should concatenate on merge, which never leave the
  // repo in an archive. It travels with the clone, so one person fixing it
  // fixes it for everyone.

  /** Every `.gitattributes` in the repository, plus the private local one. */
  async attributeFiles(repoPath: string): Promise<AttributeFile[]> {
    const tracked = await runGit(repoPath, ['ls-files', '-z', '--', '.gitattributes', '**/.gitattributes']).catch(
      () => ''
    )
    const paths = new Set(tracked.split('\0').filter(Boolean))
    // An untracked root file is the common case right after someone creates one.
    if (existsSync(join(repoPath, '.gitattributes'))) paths.add('.gitattributes')

    const files: AttributeFile[] = []
    for (const path of [...paths].sort()) {
      files.push({ path, content: await readFile(join(repoPath, path), 'utf-8').catch(() => ''), local: false })
    }
    const gitDir = resolvePath(repoPath, (await runGit(repoPath, ['rev-parse', '--git-dir']).catch(() => '.git')).trim())
    const infoPath = join(gitDir, 'info', 'attributes')
    if (existsSync(infoPath)) {
      files.push({
        path: '.git/info/attributes',
        content: await readFile(infoPath, 'utf-8').catch(() => ''),
        local: true
      })
    }
    return files
  },

  /**
   * Write one attributes file whole.
   *
   * The editing is done in the renderer against the file's text, so comments
   * and ordering survive; this only has to refuse to write anywhere else.
   */
  async attributeWrite(repoPath: string, path: string, content: string): Promise<void> {
    const gitDir = resolvePath(repoPath, (await runGit(repoPath, ['rev-parse', '--git-dir']).catch(() => '.git')).trim())
    const target = path === '.git/info/attributes' ? join(gitDir, 'info', 'attributes') : resolvePath(repoPath, path)
    const root = resolvePath(repoPath)
    if (basename(target) !== '.gitattributes' && basename(target) !== 'attributes') {
      throw new Error(`Not an attributes file: ${path}`)
    }
    if (!target.startsWith(root + sep) && !target.startsWith(gitDir + sep)) {
      throw new Error(`Refusing to write outside the repository: ${path}`)
    }
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf-8')
  },

  /** What git says applies to these paths — the answer no hand-reading gives. */
  async checkAttributes(repoPath: string, paths: string[]): Promise<AttributeCheck[]> {
    const wanted = paths.map((p) => p.trim()).filter(Boolean)
    if (!wanted.length) return []
    // `-a` asks for every attribute git knows about for the path, `-z` keeps
    // paths with spaces intact: <path>\0<attr>\0<value>\0…
    const out = await runGit(repoPath, ['check-attr', '-a', '-z', '--', ...wanted]).catch(() => '')
    const fields = out.split('\0')
    const byPath = new Map<string, Record<string, string>>(wanted.map((p) => [p, {}]))
    for (let i = 0; i + 2 < fields.length; i += 3) {
      const [path, attr, value] = [fields[i], fields[i + 1], fields[i + 2]]
      if (!path) continue
      const entry = byPath.get(path) ?? {}
      entry[attr] = value
      byPath.set(path, entry)
    }
    return wanted.map((path) => ({ path, attrs: byPath.get(path) ?? {} }))
  },

  /** Diff drivers configured here, and whether their converter is installed. */
  async diffDrivers(repoPath: string): Promise<DiffDriverInfo[]> {
    const read = async (scope: 'repo' | 'global'): Promise<DiffDriverInfo[]> => {
      const args = ['config', ...(scope === 'global' ? ['--global'] : ['--local']), '--get-regexp', '^diff\\..*\\.textconv']
      const out = await runGit(repoPath, args).catch(() => '')
      return out
        .split('\n')
        .map((line) => {
          const space = line.indexOf(' ')
          if (space < 0) return null
          const name = /^diff\.(.*)\.textconv$/.exec(line.slice(0, space))?.[1]
          const textconv = line.slice(space + 1).trim()
          if (!name || !textconv) return null
          return { name, textconv, available: hasBinary(textconv.split(/\s+/)[0]), scope }
        })
        .filter((d): d is DiffDriverInfo => !!d)
    }
    return [...(await read('repo')), ...(await read('global'))]
  },

  /** Converters Gitcito can wire up for the formats it already previews. */
  // Takes the repo path it will never use: every repo-scoped method does, and
  // the dispatcher locks on it.
  async diffDriverSuggestions(_repoPath: string): Promise<DiffDriverSuggestion[]> {
    // Each of these is a real, widely packaged tool. Gitcito does not ship any
    // of them, so the UI says plainly which are missing rather than writing a
    // driver that fails at the first diff.
    const candidates: Omit<DiffDriverSuggestion, 'available'>[] = [
      { name: 'word', patterns: ['*.docx', '*.doc'], textconv: 'pandoc --to=plain', binary: 'pandoc' },
      { name: 'pdf', patterns: ['*.pdf'], textconv: 'pdftotext -layout - -', binary: 'pdftotext' },
      { name: 'excel', patterns: ['*.xlsx', '*.xls'], textconv: 'xlsx2csv', binary: 'xlsx2csv' },
      { name: 'exif', patterns: ['*.jpg', '*.jpeg', '*.png'], textconv: 'exiftool', binary: 'exiftool' },
      { name: 'json', patterns: ['*.json'], textconv: 'jq --sort-keys .', binary: 'jq' }
    ]
    return candidates.map((c) => ({ ...c, available: hasBinary(c.binary) }))
  },

  /** Set (or clear) `diff.<name>.textconv`. */
  async setDiffDriver(repoPath: string, name: string, textconv: string, global = false): Promise<void> {
    const scope = global ? ['--global'] : ['--local']
    const key = `diff.${name}.textconv`
    if (textconv.trim()) await runGit(repoPath, ['config', ...scope, key, textconv.trim()])
    else await runGit(repoPath, ['config', ...scope, '--unset', key]).catch(() => undefined)
  },

  // ─── Object explorer ───────────────────────────────────────────────────────
  // Everything git does is four object types and some refs pointing at them.
  // These two reads expose that layer as it actually is — no porcelain, no
  // interpretation, and nothing that can change a byte.

  /** Every ref in the repository, plus HEAD, with what it points at. */
  async objectRefs(repoPath: string): Promise<RefObject[]> {
    const out = await runGit(repoPath, [
      'for-each-ref',
      `--format=%(refname)${SEP}%(objectname)${SEP}%(objecttype)`
    ]).catch(() => '')
    const refs: RefObject[] = []
    for (const line of out.split('\n')) {
      const [name, sha, kind] = line.split(SEP)
      if (name && sha) refs.push({ name, sha, kind: (kind as GitObjectKind) ?? 'commit' })
    }
    // HEAD is a ref too, and the one people start from — for-each-ref omits it.
    const head = (await runGit(repoPath, ['rev-parse', 'HEAD']).catch(() => '')).trim()
    if (head) refs.unshift({ name: 'HEAD', sha: head, kind: 'commit' })
    return refs
  },

  /**
   * Resolve any revision expression to the object it names, decoded.
   *
   * `rev` is whatever `git rev-parse` accepts: a sha, `HEAD~3`, `main^{tree}`,
   * `v1.0^{}`, or `HEAD:src/app.ts`. Being able to type those is half the point
   * — the explorer is a way to learn the model, not just to browse it.
   */
  async gitObject(repoPath: string, rev: string): Promise<GitObject> {
    const wanted = rev.trim() || 'HEAD'
    const sha = (await runGit(repoPath, ['rev-parse', '--verify', `${wanted}`])).trim()
    const kind = (await runGit(repoPath, ['cat-file', '-t', sha])).trim() as GitObjectKind
    const size = Number((await runGit(repoPath, ['cat-file', '-s', sha]).catch(() => '0')).trim()) || 0
    const object: GitObject = { sha, kind, size, rev: wanted }

    if (kind === 'tree') {
      const listing = await runGit(repoPath, ['ls-tree', '-l', '-z', sha]).catch(() => '')
      object.tree = listing
        .split('\0')
        .filter(Boolean)
        .map((entry) => {
          // "<mode> <type> <sha> <size>\t<name>" — size is '-' for trees.
          const [meta, name = ''] = entry.split('\t')
          const [mode, type, childSha, rawSize] = meta.trim().split(/\s+/)
          return {
            mode,
            kind: type as GitObjectKind,
            sha: childSha,
            name,
            size: rawSize && rawSize !== '-' ? Number(rawSize) : null
          }
        })
      return object
    }

    const body = await runGit(repoPath, ['cat-file', '-p', sha]).catch(() => '')

    if (kind === 'commit') {
      const header = body.split('\n\n')[0] ?? ''
      const field = (key: string): string => new RegExp(`^${key} (.*)$`, 'm').exec(header)?.[1]?.trim() ?? ''
      object.commit = {
        tree: field('tree'),
        parents: [...header.matchAll(/^parent (.*)$/gm)].map((m) => m[1].trim()),
        author: field('author'),
        committer: field('committer'),
        message: body.slice(header.length).replace(/^\n+/, '')
      }
      return object
    }

    if (kind === 'tag') {
      const header = body.split('\n\n')[0] ?? ''
      const field = (key: string): string => new RegExp(`^${key} (.*)$`, 'm').exec(header)?.[1]?.trim() ?? ''
      object.tag = {
        object: field('object'),
        type: field('type'),
        name: field('tag'),
        tagger: field('tagger'),
        message: body.slice(header.length).replace(/^\n+/, '')
      }
      return object
    }

    // A blob: show the head of it, and say plainly when it is not text rather
    // than spraying control characters into the pane.
    const raw = await pexecFile('git', ['-C', repoPath, 'cat-file', '-p', sha], {
      env: noPromptEnv(),
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024
    }).catch(() => ({ stdout: Buffer.alloc(0) }))
    const buffer = raw.stdout as Buffer
    const head = buffer.subarray(0, OBJECT_BLOB_PREVIEW)
    const binary = head.includes(0)
    object.blob = {
      text: binary ? null : head.toString('utf-8'),
      truncated: buffer.length > head.length
    }
    return object
  },

  // ─── Repository maintenance ────────────────────────────────────────────────
  // git keeps working whatever state its object database is in, which is why
  // nobody ever runs gc until a clone takes ten minutes. These read the numbers
  // that would otherwise stay invisible, and run the jobs that act on them.

  /** Where the disk went, and how much of it maintenance could get back. */
  async maintenanceStats(repoPath: string): Promise<MaintenanceStats> {
    const counts = await runGit(repoPath, ['count-objects', '-v']).catch(() => '')
    const num = (key: string): number => Number(new RegExp(`^${key}: (\\d+)$`, 'm').exec(counts)?.[1] ?? 0)

    const gitDir = resolvePath(repoPath, (await runGit(repoPath, ['rev-parse', '--git-dir']).catch(() => '.git')).trim())

    // `prune -n` is a full reachability walk: the honest number, and the slow
    // one. It is also the only way to say what "unreachable" costs here. Only
    // loose objects are listed, which is exactly what prune removes — so each
    // one is a file to stat rather than an object to ask git about.
    const prunable = await runGit(repoPath, ['prune', '-n', '--expire=now']).catch(() => '')
    const shas = prunable
      .split('\n')
      .map((line) => /^([0-9a-f]{40,64})\b/.exec(line.trim())?.[1])
      .filter((sha): sha is string => !!sha)
    let prunableBytes = 0
    for (const sha of shas) {
      prunableBytes += await stat(join(gitDir, 'objects', sha.slice(0, 2), sha.slice(2)))
        .then(diskBytes)
        .catch(() => 0)
    }
    const gitBytes = await dirBytes(gitDir, { files: 200_000 })

    // The newest packfile's mtime is when gc last did something worth doing.
    let lastPack: string | null = null
    const packDir = join(gitDir, 'objects', 'pack')
    for (const name of await readdir(packDir).catch(() => [] as string[])) {
      if (!name.endsWith('.pack')) continue
      const when = await stat(join(packDir, name)).then((s) => s.mtime.toISOString()).catch(() => null)
      if (when && (!lastPack || when > lastPack)) lastPack = when
    }

    const registered = await runGit(repoPath, ['config', '--global', '--get-all', 'maintenance.repo']).catch(() => '')
    const real = resolvePath(repoPath)

    return {
      looseObjects: num('count'),
      looseBytes: num('size') * 1024,
      packedObjects: num('in-pack'),
      packs: num('packs'),
      packBytes: num('size-pack') * 1024,
      prunePackable: num('prune-packable'),
      garbageFiles: num('garbage'),
      garbageBytes: num('size-garbage') * 1024,
      prunable: shas.length,
      prunableBytes,
      gitBytes,
      lastPack,
      scheduled: registered.split('\n').some((line) => resolvePath(line.trim() || '.') === real),
      gcLog: await readFile(join(gitDir, 'gc.log'), 'utf-8').catch(() => '')
    }
  },

  /**
   * Run one maintenance job, reporting the size on either side of it.
   *
   * `prune` is the only one that destroys anything: gc keeps unreachable objects
   * for two weeks precisely so a bad reset stays recoverable, and pruning now
   * throws that safety net away.
   */
  async maintenanceRun(repoPath: string, task: MaintenanceTask): Promise<MaintenanceResult> {
    const gitDir = resolvePath(repoPath, (await runGit(repoPath, ['rev-parse', '--git-dir']).catch(() => '.git')).trim())
    const before = await dirBytes(gitDir, { files: 200_000 })
    const args: Record<MaintenanceTask, string[]> = {
      gc: ['gc'],
      aggressive: ['gc', '--aggressive'],
      commitGraph: ['commit-graph', 'write', '--reachable'],
      prune: ['gc', '--prune=now']
    }
    const output = await runGit(repoPath, args[task])
    return { before, after: await dirBytes(gitDir, { files: 200_000 }), output: output.trim() }
  },

  /** Register or unregister this repository with `git maintenance`. */
  async maintenanceSchedule(repoPath: string, on: boolean): Promise<boolean> {
    // `start` writes the OS schedule (launchd / systemd / Task Scheduler) as
    // well as registering; `unregister` leaves the schedule alone for the other
    // repositories still in it.
    await runGit(repoPath, ['maintenance', on ? 'start' : 'unregister'])
    return on
  },

  /** Check the object database. Dangling is normal; missing is damage. */
  async fsck(repoPath: string): Promise<FsckReport> {
    let output = ''
    let ok = true
    try {
      const { stdout, stderr } = await pexecFile(
        'git',
        ['-C', repoPath, 'fsck', '--no-progress', '--dangling'],
        { env: noPromptEnv(), maxBuffer: 16 * 1024 * 1024 }
      )
      output = `${stdout}${stderr}`
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      ok = false
      output = `${e.stdout ?? ''}${e.stderr || e.message || ''}`
    }
    const lines = output.split('\n')
    return {
      ok,
      dangling: lines.filter((l) => l.startsWith('dangling ')).length,
      missing: lines.filter((l) => /^missing |^broken link/.test(l)).length,
      output: output.trim().slice(0, 20_000)
    }
  },

  // ─── Bundles and archives ──────────────────────────────────────────────────
  // Two ways to put a repository into a single file. A bundle is git history —
  // it clones and fetches like a remote, and is how work crosses an air gap. An
  // archive is just the files at one commit, with no history at all.

  /** Write a bundle of `scope` to `file`, and report what it ended up holding. */
  async bundleCreate(repoPath: string, file: string, scope: BundleScope): Promise<BundleResult> {
    const args = ['bundle', 'create', file]
    if (scope.kind === 'all') args.push('--all')
    else if (scope.kind === 'ref') args.push(scope.ref)
    // A range bundle records the far end as a prerequisite: it is a patch of
    // history, useless to anyone who does not already have `from`.
    else args.push(`${scope.from}..${scope.to}`)
    await runGit(repoPath, args)

    const heads = await runGit(repoPath, ['bundle', 'list-heads', file]).catch(() => '')
    return {
      path: file,
      bytes: await stat(file).then((s) => s.size).catch(() => 0),
      refs: heads.split('\n').filter((l) => l.trim()).length
    }
  },

  /** What a bundle holds, and whether this repository has what it needs to use it. */
  async bundleInspect(repoPath: string, file: string): Promise<BundleInfo> {
    const heads = await runGit(repoPath, ['bundle', 'list-heads', file]).catch(() => '')
    const refs: BundleRef[] = []
    for (const line of heads.split('\n')) {
      const [sha, ...rest] = line.trim().split(/\s+/)
      if (/^[0-9a-f]{7,}$/.test(sha) && rest.length) refs.push({ sha, name: rest.join(' ') })
    }

    // `git bundle verify` says everything useful on stderr and exits non-zero
    // when a prerequisite is missing — which is a fact to report, not a failure.
    let ok = true
    let output = ''
    try {
      const { stdout, stderr } = await pexecFile('git', ['-C', repoPath, 'bundle', 'verify', file], {
        env: noPromptEnv()
      })
      output = `${stdout}${stderr}`
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      ok = false
      output = `${e.stdout ?? ''}${e.stderr || e.message || ''}`
    }
    // verify prints shas twice over — the refs the bundle *contains*, and the
    // ones it *requires* — so the prerequisites are only the shas under the
    // requires heading (or, when git could not read them, its `error:` lines).
    const prerequisites: string[] = []
    let inRequires = false
    for (const raw of output.split('\n')) {
      const line = raw.trim().replace(/^error:\s*/, '')
      if (/requires (this|these).*ref|lacks these prerequisite/i.test(line)) {
        inRequires = true
        continue
      }
      const m = /^([0-9a-f]{40,64})\b/.exec(line)
      if (m) {
        if (inRequires) prerequisites.push(m[1])
      } else if (line) {
        inRequires = false
      }
    }
    return { refs, prerequisites, usable: ok, message: output.trim() }
  },

  /**
   * Fetch refs out of a bundle into `refs/remotes/bundle/*`.
   *
   * Deliberately not onto the local branches: a bundle is someone else's work
   * arriving, and landing it on `main` behind the user's back is how you lose
   * commits. Under a remote-shaped namespace it shows up in the branch list and
   * merges (or does not) on their terms.
   */
  async bundleFetch(repoPath: string, file: string, refs: string[]): Promise<string[]> {
    const wanted = refs.filter(Boolean)
    if (!wanted.length) throw new Error('Choose at least one ref to import.')
    const specs = wanted.map((ref) => {
      const short = ref.replace(/^refs\/heads\//, '').replace(/^refs\//, '')
      return `+${ref}:refs/remotes/bundle/${short}`
    })
    await runGit(repoPath, ['fetch', file, ...specs])
    return wanted.map((ref) => `bundle/${ref.replace(/^refs\/heads\//, '').replace(/^refs\//, '')}`)
  },

  /**
   * Export one tree as a zip or tarball. `git archive` honours `export-ignore`
   * in .gitattributes, so a repository can keep its own CI config and fixtures
   * out of the file it hands to someone else.
   */
  async archiveCreate(
    repoPath: string,
    file: string,
    ref: string,
    format: ArchiveFormat,
    prefix: string,
    subdir: string
  ): Promise<ArchiveResult> {
    const args = ['archive', `--format=${format}`, '-o', file]
    // Without a prefix every path lands at the root of the archive, which turns
    // an unzip in the wrong directory into a mess of loose files.
    if (prefix.trim()) args.push(`--prefix=${prefix.trim().replace(/\/*$/, '/')}`)
    args.push(ref.trim() || 'HEAD')
    if (subdir.trim()) args.push('--', subdir.trim())
    await runGit(repoPath, args)
    return { path: file, bytes: await stat(file).then((s) => s.size).catch(() => 0) }
  },

  // ─── Untracked files (`git clean`) ─────────────────────────────────────────
  // Removing untracked files is the one destructive git operation with no
  // recovery: the content was never in an object, so no reflog, no stash, no
  // undo. Hence a preview that says exactly what would go and how big it is,
  // and a trash option that takes the finality out of it.

  /** What `git clean` would remove, sized, with ignored paths kept apart. */
  async cleanPreview(repoPath: string): Promise<CleanPreview> {
    const { untracked, ignored } = await cleanCandidates(repoPath)
    const all = [
      ...untracked.map((path) => ({ path, ignored: false })),
      ...ignored.map((path) => ({ path, ignored: true }))
    ]
    const kept = all.slice(0, CLEAN_ENTRY_CAP)
    const budget = { files: CLEAN_WALK_CAP }

    const entries: CleanEntry[] = []
    for (const { path, ignored: isIgnored } of kept) {
      const isDir = path.endsWith('/')
      const full = resolvePath(repoPath, path)
      entries.push({
        path,
        kind: isDir ? 'dir' : 'file',
        ignored: isIgnored,
        bytes: isDir
          ? await dirBytes(full, budget)
          : await stat(full).then((s) => s.size).catch(() => 0),
        nested: isDir && existsSync(join(full, '.git'))
      })
    }
    return { entries, truncated: all.length > kept.length }
  },

  /**
   * Remove untracked paths, either to the OS trash or for good.
   *
   * Every path is checked against git's own candidate list first: the trash
   * route does not go through git, so without that check a tracked file could
   * be deleted by passing its name.
   */
  async clean(repoPath: string, paths: string[], trash: boolean): Promise<CleanResult> {
    const targets = paths.filter(Boolean)
    if (!targets.length) throw new Error('Nothing selected to remove.')
    await guardSnapshot(repoPath)

    const { untracked, ignored } = await cleanCandidates(repoPath)
    const removable = new Set([...untracked, ...ignored])
    const root = resolvePath(repoPath)
    for (const path of targets) {
      if (!removable.has(path)) throw new Error(`Not an untracked path in this repository: ${path}`)
      const full = resolvePath(repoPath, path)
      if (full !== root && !full.startsWith(root + sep)) {
        throw new Error(`Refusing to remove outside the repository: ${path}`)
      }
    }

    const budget = { files: CLEAN_WALK_CAP }
    const failed: string[] = []
    let removed = 0
    let bytes = 0
    for (const path of targets) {
      const full = resolvePath(repoPath, path)
      const size = path.endsWith('/')
        ? await dirBytes(full, budget)
        : await stat(full).then((s) => s.size).catch(() => 0)
      try {
        if (trash) await shell.trashItem(full)
        // `-x` so an explicitly chosen ignored path goes too; the pathspec keeps
        // that from meaning "and everything else ignored".
        else await runGit(repoPath, ['clean', '-f', '-d', '-x', '--', path])
        // git skips a directory that is its own repository and still exits 0.
        if (existsSync(full)) throw new Error('git skipped it — a nested repository can only go to the trash')
        removed++
        bytes += size
      } catch (err) {
        failed.push(`${path} — ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    if (failed.length) throw new Error(`Could not remove ${failed.length} of ${targets.length}:\n${failed.join('\n')}`)
    return { removed, bytes, trashed: trash }
  },

  async discard(repoPath: string, files: string[], untracked: boolean): Promise<void> {
    await guardSnapshot(repoPath)
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
   * The same listing, but for a repo as it was at `ref` — read straight from the
   * object database (`git ls-tree`), so the Time Machine can walk any past
   * commit's tree without checking anything out or touching the working copy.
   */
  async listDirAt(repoPath: string, ref: string, relDir = ''): Promise<TreeEntry[]> {
    // The trailing slash keeps ls-tree listing *inside* the directory rather
    // than returning the directory entry itself.
    const spec = relDir ? `${ref}:${relDir}` : `${ref}:`
    const raw = await gitFor(repoPath)
      .raw(['ls-tree', '-z', '--full-name', spec])
      .catch((err: unknown) => {
        // A path (or ref) that simply isn't in that tree is an ordinary answer:
        // the folder didn't exist yet at this point in history. Anything else
        // is a real failure and must reach the caller instead of quietly
        // rendering as an empty directory.
        const message = err instanceof Error ? err.message : String(err)
        if (/not a valid object name|does not exist|exists on disk, but not in/i.test(message)) return ''
        throw err
      })
    const out: TreeEntry[] = []
    for (const record of raw.split('\0').filter(Boolean)) {
      // `<mode> <type> <oid>\t<path>`
      const tab = record.indexOf('\t')
      if (tab < 0) continue
      const type = record.slice(0, tab).split(/\s+/)[1]
      // ls-tree names are relative to the rev's prefix (`HEAD:src`), so the
      // repo-relative path has to be rebuilt from the directory we asked for.
      const name = record.slice(tab + 1)
      const path = relDir ? `${relDir}/${name}` : name
      // Submodules (`commit` entries) have no tree to descend into here.
      out.push({ name, path, dir: type === 'tree' })
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

  // ─── rerere ──────────────────────────────────────────────────────────────
  // "reuse recorded resolution": git memorises how you resolved a conflict and
  // replays it the next time the same one appears. The payoff is a long-lived
  // branch rebased repeatedly through the same collision — you resolve it once.

  async rerereStatus(repoPath: string): Promise<RerereStatus> {
    const git = gitFor(repoPath)
    const read = async (key: string, scope?: string[]): Promise<string> =>
      (await git.raw(['config', ...(scope ?? []), '--get', key]).catch(() => '')).trim()

    const enabled = await read('rerere.enabled')
    const local = await read('rerere.enabled', ['--local'])

    // `.git/rr-cache` holds one directory per memorised conflict.
    const gitDir = (await git.raw(['rev-parse', '--git-dir']).catch(() => '.git')).trim()
    const cache = resolvePath(repoPath, gitDir, 'rr-cache')
    let recorded = 0
    try {
      const { readdirSync } = await import('fs')
      recorded = readdirSync(cache).filter((name) => !name.startsWith('.')).length
    } catch {
      /* no cache yet — nothing memorised */
    }

    // Only what git itself announced during the operation still in progress. A
    // file the *user* resolved without staging also has no markers and is also
    // still unmerged, so content alone cannot tell the two apart.
    const conflicted = new Set(
      (await git.raw(['diff', '--name-only', '--diff-filter=U']).catch(() => ''))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    if (!conflicted.size) rerereReplayed.delete(repoPath)
    const replayed = (rerereReplayed.get(repoPath) ?? []).filter((file) => conflicted.has(file))

    return {
      enabled: enabled === 'true',
      autoUpdate: (await read('rerere.autoUpdate')) === 'true',
      perRepo: !!local,
      recorded,
      replayed
    }
  },

  /**
   * Turn the memory on or off. Written globally by default — someone who wants
   * git to remember their resolutions wants that everywhere, and it is the same
   * `rerere.enabled` their command line reads.
   */
  async setRerere(
    repoPath: string,
    values: { enabled?: boolean; autoUpdate?: boolean },
    scope: 'global' | 'repo' = 'global'
  ): Promise<void> {
    const where = scope === 'global' ? ['--global'] : ['--local']
    const git = gitFor(repoPath)
    if (values.enabled !== undefined) await git.raw(['config', ...where, 'rerere.enabled', String(values.enabled)])
    if (values.autoUpdate !== undefined) {
      await git.raw(['config', ...where, 'rerere.autoUpdate', String(values.autoUpdate)])
    }
  },

  /**
   * Drop the memorised resolution for one file and bring its conflict back.
   *
   * `git rerere forget` alone only stops the replay happening *next* time — it
   * leaves the already-written file as it is, which is not what someone asking
   * for the conflict back means. `checkout --merge` rebuilds the markers from
   * the index stages, which are still there.
   */
  async rerereForget(repoPath: string, file: string): Promise<void> {
    await runGit(repoPath, ['rerere', 'forget', '--', file])
    await runGit(repoPath, ['checkout', '--merge', '--', file]).catch(() => undefined)
  },

  /** Empty the whole memory. Files and history are untouched. */
  async rerereClear(repoPath: string): Promise<void> {
    const git = gitFor(repoPath)
    const gitDir = (await git.raw(['rev-parse', '--git-dir'])).trim()
    const { rm } = await import('fs/promises')
    await rm(resolvePath(repoPath, gitDir, 'rr-cache'), { recursive: true, force: true })
  },

  // ─── Subtrees ────────────────────────────────────────────────────────────
  // `git subtree` vendors another repository into a subdirectory. The files are
  // really in the tree — a plain clone gets them, with no submodule dance — but
  // git keeps no manifest of where they came from, only a `git-subtree-dir:`
  // trailer on the import commit. So this discovers prefixes from history and
  // remembers the url/ref alongside, in the repo's own config.

  async subtrees(repoPath: string): Promise<SubtreeInfo[]> {
    const git = gitFor(repoPath)
    // The trailers git subtree writes are the only trace in history.
    const body = await git
      .raw(['log', '--no-merges', '--grep=git-subtree-dir:', '--pretty=%b%x00'])
      .catch(() => '')
    const merged = await git.raw(['log', '--merges', '--grep=git-subtree-dir:', '--pretty=%b%x00']).catch(() => '')

    const found = new Map<string, string>()
    for (const record of `${body}${merged}`.split('\0')) {
      const dir = /^\s*git-subtree-dir:\s*(.+)$/m.exec(record)?.[1]?.trim().replace(/\/+$/, '')
      if (!dir) continue
      const split = /^\s*git-subtree-split:\s*([0-9a-f]+)/m.exec(record)?.[1] ?? ''
      // `log` is newest-first, so the first sighting is the latest import.
      if (!found.has(dir)) found.set(dir, split)
    }

    // Anything the user told us about, including prefixes added by another tool.
    const remembered = await git.raw(['config', '--get-regexp', '^gitcito\\.subtree\\.']).catch(() => '')
    const meta = new Map<string, { url: string; ref: string }>()
    for (const line of remembered.split('\n')) {
      const match = /^gitcito\.subtree\.(.+)\.(url|ref)\s+(.*)$/.exec(line.trim())
      if (!match) continue
      const [, key, field, value] = match
      const prefix = decodeSubtreeKey(key)
      const entry = meta.get(prefix) ?? { url: '', ref: '' }
      if (field === 'url') entry.url = value
      else entry.ref = value
      meta.set(prefix, entry)
      if (!found.has(prefix)) found.set(prefix, '')
    }

    const out: SubtreeInfo[] = []
    for (const [prefix, lastSplit] of found) {
      out.push({
        prefix,
        url: meta.get(prefix)?.url ?? '',
        ref: meta.get(prefix)?.ref ?? '',
        present: existsSync(join(repoPath, prefix)),
        lastSplit
      })
    }
    return out.sort((a, b) => a.prefix.localeCompare(b.prefix))
  },

  /** Vendor a repository into `prefix`, and remember where it came from. */
  async subtreeAdd(
    repoPath: string,
    prefix: string,
    url: string,
    ref: string,
    squash = true
  ): Promise<void> {
    const dir = prefix.trim().replace(/^\/+|\/+$/g, '')
    if (!dir || !url.trim() || !ref.trim()) throw new Error('A prefix, a repository and a ref are all required.')
    if (existsSync(join(repoPath, dir))) throw new Error(`"${dir}" already exists — subtree add needs a free path.`)
    await runSubtree(repoPath, ['add', `--prefix=${dir}`, ...(squash ? ['--squash'] : []), url.trim(), ref.trim()])
    await rememberSubtree(repoPath, dir, url.trim(), ref.trim())
  },

  /** Pull upstream changes into an existing subtree. */
  async subtreePull(repoPath: string, prefix: string, url: string, ref: string, squash = true): Promise<void> {
    if (!url.trim() || !ref.trim()) throw new Error('This subtree has no remembered repository — enter one.')
    await runSubtree(repoPath, ['pull', `--prefix=${prefix}`, ...(squash ? ['--squash'] : []), url.trim(), ref.trim()])
    await rememberSubtree(repoPath, prefix, url.trim(), ref.trim())
  },

  /** Send local changes under `prefix` back to the source repository. */
  async subtreePush(repoPath: string, prefix: string, url: string, ref: string): Promise<void> {
    if (!url.trim() || !ref.trim()) throw new Error('This subtree has no remembered repository — enter one.')
    await runSubtree(repoPath, ['push', `--prefix=${prefix}`, url.trim(), ref.trim()])
  },

  /** Extract the subtree's own history into a local branch. */
  async subtreeSplit(repoPath: string, prefix: string, branch: string): Promise<string> {
    const name = branch.trim()
    if (!name) throw new Error('A branch name is required.')
    const out = await runSubtree(repoPath, ['split', `--prefix=${prefix}`, '-b', name])
    return out.trim()
  },

  /** Forget the remembered url/ref. Touches no files and no history. */
  async subtreeForget(repoPath: string, prefix: string): Promise<void> {
    const key = encodeSubtreeKey(prefix)
    const git = gitFor(repoPath)
    for (const field of ['url', 'ref']) {
      await git.raw(['config', '--unset', `gitcito.subtree.${key}.${field}`]).catch(() => undefined)
    }
  },

  // ─── Notes ───────────────────────────────────────────────────────────────
  // `git notes` attaches text to a commit without touching the commit itself —
  // the only way to annotate history that is already published. Gitcito uses the
  // default `refs/notes/commits` ref, which is what `git log` and every other
  // tool reads by default.

  /** The note attached to a commit, or '' when it has none. */
  async note(repoPath: string, sha: string): Promise<string> {
    // `notes show` exits 1 for "no note", which is an answer, not a failure.
    return (await runGit(repoPath, ['notes', 'show', sha]).catch(() => '')).replace(/\n+$/, '')
  },

  /** Commits that carry a note. One cheap call, so the graph can mark them. */
  async notedCommits(repoPath: string): Promise<string[]> {
    const raw = await runGit(repoPath, ['notes', 'list']).catch(() => '')
    return raw
      .split('\n')
      .map((line) => line.trim().split(' ')[1])
      .filter((sha): sha is string => !!sha)
  },

  /** Write (or overwrite) a commit's note. An empty text removes it instead. */
  async setNote(repoPath: string, sha: string, text: string): Promise<void> {
    if (!text.trim()) return gitService.removeNote(repoPath, sha)
    // `-F -` would need stdin; a temp file keeps multi-line notes intact without
    // fighting the shell over quoting.
    const { writeFile, rm, mkdtemp } = await import('fs/promises')
    const { tmpdir } = await import('os')
    const dir = await mkdtemp(join(tmpdir(), 'gitcito-note-'))
    const file = join(dir, 'note.txt')
    try {
      await writeFile(file, text, 'utf-8')
      await runGit(repoPath, ['notes', 'add', '--force', '-F', file, sha])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  },

  async removeNote(repoPath: string, sha: string): Promise<void> {
    await runGit(repoPath, ['notes', 'remove', '--ignore-missing', sha])
  },

  /**
   * Notes live under `refs/notes/*`, which a normal fetch or push ignores
   * entirely — the single most common reason someone's notes "disappear" on
   * another machine. These two move them explicitly.
   */
  async fetchNotes(repoPath: string, remote = 'origin'): Promise<void> {
    await withRemoteAuth(repoPath, remote, () =>
      runGit(repoPath, ['fetch', remote, '+refs/notes/*:refs/notes/*'])
    )
  },

  async pushNotes(repoPath: string, remote = 'origin'): Promise<void> {
    await withRemoteAuth(repoPath, remote, () => runGit(repoPath, ['push', remote, 'refs/notes/*']))
  },

  // ─── Removing a path from history ────────────────────────────────────────
  // The last resort after the secret guard has already failed: a token, or a
  // 400 MB file, that is committed and cannot be un-committed by reverting.
  // Every commit from the first touch onwards is rewritten, so this is measured
  // first, backed up second, and only then run.

  /**
   * Every path that has ever been committed, heaviest first.
   *
   * A file dialog cannot answer this question: the interesting paths are the
   * ones already deleted from the working tree, which is exactly what a picker
   * over the filesystem cannot see. Sorting by bytes also makes the other
   * reason for a purge — "why is this clone two gigabytes" — self-answering.
   */
  async historyPaths(repoPath: string, max = 400): Promise<HistoryPathEntry[]> {
    // One pass for sizes of every object in the database…
    const sizes = new Map<string, number>()
    const sized = await runGit(repoPath, [
      'cat-file',
      '--batch-all-objects',
      '--batch-check=%(objectname) %(objecttype) %(objectsize)'
    ]).catch(() => '')
    for (const line of sized.split('\n')) {
      const [sha, type, size] = line.split(' ')
      if (type === 'blob') sizes.set(sha, Number(size) || 0)
    }

    // …and one for which of them were ever recorded under which name.
    const named = await runGit(repoPath, ['rev-list', '--objects', '--all']).catch(() => '')
    const byPath = new Map<string, { bytes: number; blobs: Set<string> }>()
    for (const line of named.split('\n')) {
      const space = line.indexOf(' ')
      if (space <= 0) continue
      const sha = line.slice(0, space)
      const size = sizes.get(sha)
      if (size === undefined) continue // a tree, not a blob
      const path = line.slice(space + 1).trim()
      if (!path) continue
      const entry = byPath.get(path) ?? { bytes: 0, blobs: new Set<string>() }
      // The same blob under the same path is one copy, not several.
      if (!entry.blobs.has(sha)) {
        entry.blobs.add(sha)
        entry.bytes += size
      }
      byPath.set(path, entry)
    }

    const tracked = new Set(
      (await runGit(repoPath, ['ls-files']).catch(() => '')).split('\n').map((p) => p.trim()).filter(Boolean)
    )
    return [...byPath.entries()]
      .map(([path, entry]) => ({
        path,
        bytes: entry.bytes,
        versions: entry.blobs.size,
        deleted: !tracked.has(path)
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, max)
  },

  async historyPurgePreview(repoPath: string, paths: string[]): Promise<HistoryPurgePreview> {
    const git = gitFor(repoPath)
    const clean = paths.map((p) => p.trim()).filter(Boolean)
    const empty: HistoryPurgePreview = {
      paths: clean,
      commits: 0,
      firstCommit: null,
      branches: [],
      tags: [],
      bytes: 0,
      blocked: ''
    }
    if (!clean.length) return { ...empty, blocked: 'Choose at least one path.' }

    // A rewrite rewrites the checkout too, so anything uncommitted would be at
    // risk — and a half-finished merge has no single history to rewrite.
    const status = await git.status()
    const state = await gitService.mergeState(repoPath)
    const blocked = state
      ? 'Finish or abort the operation in progress first.'
      : status.files.length
        ? 'Commit or stash your changes first.'
        : ''

    // `--branches --tags` mirrors exactly what the rewrite will touch. `--all`
    // would also walk `refs/gitcito/pre-purge/*`, so a second purge in the same
    // repository would count commits that only a previous backup still holds
    // and promise work the rewrite is not going to do.
    const log = await git
      .raw(['log', '--branches', '--tags', '--format=%H%x00%s%x00%at', '--', ...clean])
      .catch(() => '')
    const entries = log
      .split('\n')
      .map((line) => line.split('\0'))
      .filter((parts) => parts.length === 3)
    const oldest = entries[entries.length - 1]

    const refs = (await git.raw(['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/tags']).catch(() => ''))
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)

    return {
      paths: clean,
      commits: entries.length,
      firstCommit: oldest ? { sha: oldest[0], subject: oldest[1], date: Number(oldest[2]) } : null,
      branches: refs.filter((r) => r.startsWith('refs/heads/')).map((r) => r.slice('refs/heads/'.length)),
      tags: refs.filter((r) => r.startsWith('refs/tags/')).map((r) => r.slice('refs/tags/'.length)),
      bytes: await blobBytesForPaths(repoPath, clean),
      blocked
    }
  },

  /**
   * Rewrite every branch and tag without the given paths, after copying each ref
   * to `refs/gitcito/pre-purge/<timestamp>/…`.
   *
   * The backup is deliberately outside `--all`'s reach, so the rewrite cannot
   * eat its own safety net — and it keeps the old objects alive, which is why
   * space is only reclaimed once the backup is dropped.
   */
  async historyPurge(repoPath: string, paths: string[]): Promise<HistoryPurgeResult> {
    const git = gitFor(repoPath)
    const clean = paths.map((p) => p.trim()).filter(Boolean)
    if (!clean.length) throw new Error('Choose at least one path.')

    const preview = await gitService.historyPurgePreview(repoPath, clean)
    if (preview.blocked) throw new Error(preview.blocked)
    if (!preview.commits) throw new Error('No commit touches that path — nothing to rewrite.')

    const at = Math.floor(Date.now() / 1000)
    const prefix = `refs/gitcito/pre-purge/${at}`
    const refs = (await git.raw(['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads', 'refs/tags']))
      .split('\n')
      .map((line) => line.trim().split(' '))
      .filter((parts) => parts.length === 2)
    for (const [name, sha] of refs) {
      await git.raw(['update-ref', `${prefix}/${name.replace(/^refs\//, '')}`, sha])
    }
    // Record what was purged, so the UI can label the backup later. A git
    // config key has to start with a letter, hence the `at` prefix.
    await git.raw(['config', prePurgeKey(at), clean.join('\n')])

    // `--index-filter` rewrites the index directly — no checkout per commit,
    // which is the difference between minutes and hours on a real history.
    // `--branches --tags` rather than `--all`: `--all` would include the backup.
    const rm = ['git', 'rm', '--cached', '--ignore-unmatch', '--'].concat(clean.map((p) => `'${p.replace(/'/g, "'\\''")}'`))
    await pexecFile(
      'git',
      [
        '-C',
        repoPath,
        'filter-branch',
        '--force',
        '--index-filter',
        rm.join(' '),
        '--prune-empty',
        // Without this, tags keep pointing at the pre-rewrite commits.
        '--tag-name-filter',
        'cat',
        '--',
        '--branches',
        '--tags'
      ],
      {
        env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: '1', GIT_TERMINAL_PROMPT: '0' },
        maxBuffer: 64 * 1024 * 1024
      }
    )

    // filter-branch leaves its own copies under refs/original; ours supersedes
    // them, and leaving both means twice the confusion about which to restore.
    const originals = (await git.raw(['for-each-ref', '--format=%(refname)', 'refs/original']).catch(() => ''))
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
    for (const ref of originals) await git.raw(['update-ref', '-d', ref]).catch(() => undefined)

    return {
      backup: { prefix, at, refs: refs.length, paths: clean },
      rewritten: refs.length
    }
  },

  /** Every purge backup still in the repository, newest first. */
  async historyPurgeBackups(repoPath: string): Promise<HistoryPurgeBackup[]> {
    const git = gitFor(repoPath)
    const refs = (await git.raw(['for-each-ref', '--format=%(refname)', 'refs/gitcito/pre-purge']).catch(() => ''))
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)

    const byStamp = new Map<number, number>()
    for (const ref of refs) {
      const at = Number(ref.split('/')[3])
      if (Number.isFinite(at)) byStamp.set(at, (byStamp.get(at) ?? 0) + 1)
    }
    const out: HistoryPurgeBackup[] = []
    for (const [at, count] of byStamp) {
      const recorded = await git.raw(['config', '--get', prePurgeKey(at)]).catch(() => '')
      out.push({
        prefix: `refs/gitcito/pre-purge/${at}`,
        at,
        refs: count,
        paths: recorded.trim() ? recorded.trim().split('\n') : []
      })
    }
    return out.sort((a, b) => b.at - a.at)
  },

  /** Put every branch and tag back where the backup says it was. */
  async historyPurgeRestore(repoPath: string, prefix: string): Promise<void> {
    const git = gitFor(repoPath)
    if (!prefix.startsWith('refs/gitcito/pre-purge/')) throw new Error('Not a purge backup.')
    const saved = (await git.raw(['for-each-ref', '--format=%(refname) %(objectname)', prefix]))
      .split('\n')
      .map((line) => line.trim().split(' '))
      .filter((parts) => parts.length === 2)
    if (!saved.length) throw new Error('That backup is empty.')

    // Detach first: the branch we are standing on is about to move under us.
    await runGit(repoPath, ['checkout', '--detach']).catch(() => undefined)
    for (const [ref, sha] of saved) {
      const original = `refs/${ref.slice(`${prefix}/`.length)}`
      await git.raw(['update-ref', original, sha])
    }
    const head = saved.find(([ref]) => ref.includes('/heads/'))
    if (head) await runGit(repoPath, ['checkout', head[0].split('/heads/')[1]])
  },

  /**
   * Delete a backup and garbage-collect. This is what actually reclaims the
   * space — and what makes the purge irreversible.
   */
  async historyPurgeDropBackup(repoPath: string, prefix: string): Promise<void> {
    const git = gitFor(repoPath)
    if (!prefix.startsWith('refs/gitcito/pre-purge/')) throw new Error('Not a purge backup.')
    const refs = (await git.raw(['for-each-ref', '--format=%(refname)', prefix]).catch(() => ''))
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
    for (const ref of refs) await git.raw(['update-ref', '-d', ref]).catch(() => undefined)
    await git.raw(['config', '--unset', prePurgeKey(Number(prefix.split('/')[3]))]).catch(() => undefined)
    // The old commits are only unreachable once the reflog forgets them too.
    await git.raw(['reflog', 'expire', '--expire=now', '--all']).catch(() => undefined)
    await git.raw(['gc', '--prune=now']).catch(() => undefined)
  },

  // ─── git-flow ────────────────────────────────────────────────────────────
  // Stored under the same `gitflow.*` keys the `git flow` CLI writes, so a repo
  // set up by either tool reads correctly in the other. Gitcito runs plain git
  // commands throughout — the CLI is never required to be installed.

  async gitflowStatus(repoPath: string): Promise<GitflowStatus> {
    const git = gitFor(repoPath)
    const read = async (key: string): Promise<string | null> =>
      (await git.raw(['config', '--get', key]).catch(() => null))?.trim() || null

    const [master, develop, feature, release, hotfix, versionTag] = await Promise.all([
      read('gitflow.branch.master'),
      read('gitflow.branch.develop'),
      read('gitflow.prefix.feature'),
      read('gitflow.prefix.release'),
      read('gitflow.prefix.hotfix'),
      read('gitflow.prefix.versiontag')
    ])

    const locals = (await git.raw(['for-each-ref', '--format=%(refname:short)', 'refs/heads']).catch(() => ''))
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    // Nothing configured yet: propose a layout that matches what is already
    // there rather than one the user then has to correct.
    const config: GitflowConfig = {
      main: master ?? (locals.includes('main') ? 'main' : locals.includes('master') ? 'master' : 'main'),
      develop: develop ?? 'develop',
      featurePrefix: feature ?? 'feature/',
      releasePrefix: release ?? 'release/',
      hotfixPrefix: hotfix ?? 'hotfix/',
      versionTagPrefix: versionTag ?? 'v'
    }

    const current = (await git.raw(['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => '')).trim()
    const match = (['feature', 'release', 'hotfix'] as GitflowKind[])
      .map((kind) => ({ kind, prefix: prefixFor(config, kind) }))
      .find(({ prefix }) => prefix && current.startsWith(prefix))

    return {
      config,
      initialized: !!master && !!develop,
      hasMain: locals.includes(config.main),
      hasDevelop: locals.includes(config.develop),
      current,
      currentFlow: match ? { kind: match.kind, name: current.slice(match.prefix.length) } : null
    }
  },

  /** Write the layout and create the develop branch if it does not exist yet. */
  async gitflowInit(repoPath: string, config: GitflowConfig): Promise<void> {
    const git = gitFor(repoPath)
    const entries: [string, string][] = [
      ['gitflow.branch.master', config.main],
      ['gitflow.branch.develop', config.develop],
      ['gitflow.prefix.feature', config.featurePrefix],
      ['gitflow.prefix.release', config.releasePrefix],
      ['gitflow.prefix.hotfix', config.hotfixPrefix],
      ['gitflow.prefix.versiontag', config.versionTagPrefix]
    ]
    for (const [key, value] of entries) await git.raw(['config', key, value])

    const locals = await localBranches(repoPath)
    if (!locals.includes(config.main)) throw new Error(`Branch "${config.main}" does not exist.`)
    // develop is the one branch this can reasonably create: it starts at main.
    if (!locals.includes(config.develop)) await git.raw(['branch', config.develop, config.main])
  },

  /** Branch off the right base and check the new branch out. Returns its name. */
  async gitflowStart(repoPath: string, kind: GitflowKind, name: string): Promise<string> {
    const status = await gitService.gitflowStatus(repoPath)
    const branch = prefixFor(status.config, kind) + name.trim()
    if (!name.trim()) throw new Error('A name is required.')
    // Features integrate through develop; releases and hotfixes ship from main.
    const base = kind === 'hotfix' ? status.config.main : status.config.develop
    const locals = await localBranches(repoPath)
    if (locals.includes(branch)) throw new Error(`Branch "${branch}" already exists.`)
    if (!locals.includes(base)) throw new Error(`Branch "${base}" does not exist.`)
    await runGit(repoPath, ['checkout', '-b', branch, base])
    return branch
  },

  /**
   * Close a flow branch: merge it where it belongs, tag a release/hotfix, and
   * delete the branch. Returns the refs as they were, so `gitflowUndo` can put
   * everything back — a merge conflict aborts and leaves nothing behind.
   */
  async gitflowFinish(
    repoPath: string,
    kind: GitflowKind,
    name: string,
    opts: { tag?: boolean; deleteBranch?: boolean; message?: string } = {}
  ): Promise<GitflowSnapshot> {
    const git = gitFor(repoPath)
    const status = await gitService.gitflowStatus(repoPath)
    const branch = prefixFor(status.config, kind) + name.trim()
    const { main, develop } = status.config

    const dirty = (await git.status()).files.length > 0
    if (dirty) throw new Error('Commit or stash your changes before finishing a branch.')

    const locals = await localBranches(repoPath)
    if (!locals.includes(branch)) throw new Error(`Branch "${branch}" does not exist.`)

    // Features land on develop only; releases and hotfixes land on main first,
    // are tagged there, and are then merged back so develop keeps the fixes.
    const targets = kind === 'feature' ? [develop] : [main, develop]
    for (const target of targets) {
      if (!locals.includes(target)) throw new Error(`Branch "${target}" does not exist.`)
    }

    const shaOf = async (ref: string): Promise<string> => (await git.raw(['rev-parse', ref])).trim()
    const snapshot: GitflowSnapshot = {
      refs: await Promise.all(targets.map(async (name) => ({ name, sha: await shaOf(name) }))),
      tag: null,
      branch: { name: branch, sha: await shaOf(branch) }
    }
    const tagName = opts.tag !== false && kind !== 'feature' ? status.config.versionTagPrefix + name.trim() : null

    try {
      for (const target of targets) {
        await runGit(repoPath, ['checkout', target])
        // --no-ff keeps the branch visible in the graph, which is the whole
        // point of the layout: you can see where a feature began and ended.
        await runGit(repoPath, ['merge', '--no-ff', '-m', `Merge branch '${branch}' into ${target}`, branch])
        if (tagName && target === main) {
          await runGit(repoPath, ['tag', '-a', tagName, '-m', opts.message?.trim() || `Release ${name.trim()}`])
          snapshot.tag = tagName
        }
      }
      if (opts.deleteBranch !== false) await runGit(repoPath, ['branch', '-d', branch])
    } catch (err) {
      // A conflicted merge would strand the repo mid-flow. Roll every ref back
      // to where it started and hand the error on untouched.
      await gitService.gitflowUndo(repoPath, snapshot).catch(() => {
        /* the original failure is the one worth reporting */
      })
      throw err
    }

    // End where the work continues: develop for a feature or release, main for
    // a hotfix that has just shipped.
    await runGit(repoPath, ['checkout', kind === 'hotfix' ? main : develop])
    return snapshot
  },

  /** Put every ref a finish moved back where it was, drop the tag, restore the branch. */
  async gitflowUndo(repoPath: string, snapshot: GitflowSnapshot): Promise<void> {
    const git = gitFor(repoPath)
    // Move off anything about to be rewound so the reset below cannot fail.
    await runGit(repoPath, ['checkout', '--detach']).catch(() => undefined)
    for (const ref of snapshot.refs) {
      await git.raw(['update-ref', `refs/heads/${ref.name}`, ref.sha])
    }
    if (snapshot.tag) await git.raw(['tag', '-d', snapshot.tag]).catch(() => undefined)
    const locals = await localBranches(repoPath)
    if (!locals.includes(snapshot.branch.name)) {
      await git.raw(['branch', snapshot.branch.name, snapshot.branch.sha])
    }
    await runGit(repoPath, ['checkout', snapshot.branch.name])
  },

  /** Tracked files only (in the index) — for the push-time secret guard. */
  async listTrackedFiles(repoPath: string): Promise<string[]> {
    const raw = await gitFor(repoPath).raw(['ls-files', '--cached', '-z']).catch(() => '')
    return raw.split('\0').filter(Boolean)
  },

  /**
   * Tracked paths that are also matched by an ignore rule. Git normally keeps
   * tracking these files, but AI context deliberately honours the rule as a
   * privacy boundary. `--no-index` makes check-ignore consider tracked paths.
   */
  async ignoredTrackedFiles(repoPath: string, paths: string[]): Promise<string[]> {
    const ignored: string[] = []
    for (let i = 0; i < paths.length; i += 200) {
      const chunk = paths.slice(i, i + 200)
      if (!chunk.length) continue
      // `check-ignore` exits 1 when nothing matched — success, not failure.
      // Any other non-zero code has to propagate: swallowing it would report
      // "nothing is ignored" and hand ignored files to the caller.
      const stdout = await pexecFile(
        'git',
        ['-C', repoPath, 'check-ignore', '--no-index', '--', ...chunk],
        { env: noPromptEnv(), maxBuffer: 16 * 1024 * 1024 }
      )
        .then((res) => res.stdout)
        .catch((err: { code?: number | string; stdout?: string; message?: string }) => {
          if (err.code === 1) return err.stdout ?? ''
          throw new Error(`Could not determine ignored files: ${err.message}`)
        })
      ignored.push(...stdout.split('\n').map((line) => line.trim()).filter(Boolean))
    }
    return ignored
  },

  /** Apply a validated repository-chat file batch under the Git IPC write lock. */
  async applyRepoFileActions(
    repoPath: string,
    actions: PreparedRepoChatFileAction[]
  ): Promise<RepoFileBatchResult> {
    const paths = [...new Set(actions.map((action) => action.path))]
    const ignored = new Set(await gitService.ignoredTrackedFiles(repoPath, paths))
    try {
      const result = await applyPreparedRepoFileActions(repoPath, actions, ignored)
      return { ok: true, applied: result.applied }
    } catch (error) {
      if (error instanceof RepoFileActionError) {
        return {
          ok: false,
          error: { code: error.code, detail: error.message, paths: error.paths }
        }
      }
      throw error
    }
  },

  /** Author, date and message of one commit — for pinned chat context. */
  async commitSummary(
    repoPath: string,
    hash: string
  ): Promise<{ hash: string; author: string; date: string; subject: string; body: string }> {
    const raw = await gitFor(repoPath).raw([
      'show',
      '-s',
      '--format=%H%x00%an%x00%aI%x00%s%x00%b',
      hash
    ])
    const [full = '', author = '', date = '', subject = '', body = ''] = raw.split('\0')
    return { hash: full.trim(), author, date, subject, body: body.trim() }
  },

  /**
   * Files that this push would actually publish: the ones changed in the
   * commits ahead of the upstream. Used by the secret-push guard so it only
   * warns about credentials introduced by the unpushed commits, not every
   * secret already tracked (and long since pushed) in the repo.
   *
   * With no upstream (branch never pushed), the whole history publishes, so
   * fall back to every tracked file.
   */
  async filesToPush(repoPath: string, branch: string): Promise<string[]> {
    const git = gitFor(repoPath)
    const upstream = await git
      .raw(['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branch}@{upstream}`])
      .then((s) => s.trim())
      .catch(() => '')
    if (!upstream) return this.listTrackedFiles(repoPath)
    const raw = await git.raw(['diff', '--name-only', '-z', `${upstream}..${branch}`]).catch(() => '')
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
          // Sniff the first 8KB for a NUL byte → treat as binary. Read only
          // that window — reading whole files here would buffer every staged
          // file at once, OOMing on the very large files this guard exists for.
          let binary = false
          try {
            const fh = await open(abs, 'r')
            try {
              const buf = Buffer.alloc(8192)
              const { bytesRead } = await fh.read(buf, 0, 8192, 0)
              binary = buf.subarray(0, bytesRead).includes(0)
            } finally {
              await fh.close()
            }
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

  /** Base names of `names` that already exist in `destDir` — the renderer asks
   *  this before a drop so it can offer "Replace" / "Keep both". */
  async fsExisting(repoPath: string, destDir: string, names: string[]): Promise<string[]> {
    const destAbs = join(repoPath, destDir.replace(/^\/+|\/+$/g, ''))
    return names.filter((n) => existsSync(join(destAbs, basename(n))))
  },

  /** Move repo-relative paths into `destDir` ('' = repo root), keeping their base
   *  names. Refuses to move a folder into itself or one of its descendants.
   *  `mode` decides what an existing name at the destination means: fail (default),
   *  trash it first, or land next to it under a free name. */
  async fsMove(repoPath: string, froms: string[], destDir: string, mode: FsDropMode = 'error'): Promise<void> {
    const dir = destDir.replace(/^\/+|\/+$/g, '')
    for (const from of froms) {
      const src = from.replace(/^\/+|\/+$/g, '')
      if (dir === src || dir.startsWith(`${src}/`)) throw new Error(`Cannot move ${src} into itself`)
      const name = await resolveDrop(repoPath, dir, basename(src), mode)
      await gitService.fsRename(repoPath, src, dir ? `${dir}/${name}` : name)
    }
  },

  /** Copy absolute paths dropped from the OS into `destDir` ('' = repo root).
   *  Sources that already live inside this repo are moved instead of duplicated. */
  async fsImport(
    repoPath: string,
    srcPaths: string[],
    destDir: string,
    mode: FsDropMode = 'error'
  ): Promise<void> {
    const dir = destDir.replace(/^\/+|\/+$/g, '')
    const destAbs = join(repoPath, dir)
    if (!destAbs.startsWith(repoPath)) throw new Error(`Refusing to write outside repo: ${destDir}`)
    await mkdir(destAbs, { recursive: true })
    for (const src of srcPaths) {
      if (src === join(destAbs, basename(src))) continue
      if (src.startsWith(`${repoPath}/`)) {
        // Dropped from inside this repo (e.g. Finder) — a move keeps git history.
        await gitService.fsMove(repoPath, [src.slice(repoPath.length + 1)], dir, mode)
      } else {
        const name = await resolveDrop(repoPath, dir, basename(src), mode)
        await cp(src, join(destAbs, name), { recursive: true })
      }
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
    await withRerereCapture(repoPath, () => gitFor(repoPath).raw(args))
  },

  // Cherry-pick several commits in one go. Hashes are applied in the given
  // order, so callers should pass them oldest-first to preserve history order.
  async cherryPickMany(repoPath: string, hashes: string[], noCommit = false): Promise<void> {
    if (!hashes.length) return
    const args = ['cherry-pick']
    if (noCommit) args.push('-n')
    args.push(...hashes)
    await withRerereCapture(repoPath, () => gitFor(repoPath).raw(args))
  },

  async revertCommit(repoPath: string, hash: string): Promise<void> {
    await gitFor(repoPath).raw(['revert', '--no-edit', hash])
  },

  async reset(repoPath: string, ref: string, mode: 'soft' | 'mixed' | 'hard' | 'keep'): Promise<void> {
    // Only --hard destroys working-tree content; soft/mixed move refs/index and
    // --keep carries local changes over or aborts.
    if (mode === 'hard') await guardSnapshot(repoPath)
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
    return memo(commitFilesCache, `${repoPath}\0${hash}`, async () => {
      const git = gitFor(repoPath)
      // -M: detect renames so moved files report R (with old→new paths) instead
      // of an unrelated A/D pair. diff-tree is plumbing and ignores diff.renames.
      const out = await git.raw(['diff-tree', '--no-commit-id', '--name-status', '-M', '-r', '--root', '-m', '--first-parent', hash])
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
    })
  },

  async commitFileDiff(repoPath: string, hash: string, file: string, ignoreWs = false): Promise<string> {
    // `--first-parent` so merge commits diff against their first parent (matching
    // `commitFiles`). Without it, `git show` falls back to a combined diff (--cc)
    // that's empty for files which only changed on the merged-in branch — the
    // "No changes to display" bug.
    return memo(commitDiffCache, `f\0${repoPath}\0${hash}\0${ignoreWs ? 1 : 0}\0${file}`, () =>
      gitFor(repoPath).raw(['show', '--format=', '--first-parent', ...(ignoreWs ? ['-w'] : []), hash, '--', file])
    )
  },

  /**
   * Semantic diff of one file between two versions — renames, signature
   * changes, moves and per-symbol edits instead of raw +/- lines. Read-only:
   * both sides come out of the object database (or the working tree copy).
   */
  async semanticDiff(repoPath: string, file: string, oldSide: BlobSpec, newSide: BlobSpec): Promise<SemanticDiff> {
    const read = async (spec: BlobSpec): Promise<string> => {
      if (spec.kind === 'empty') return ''
      if (spec.kind === 'worktree') return readFile(join(repoPath, file), 'utf-8').catch(() => '')
      // `:file` is the staged copy; `<ref>:file` any committed one. A path that
      // doesn't exist on that side (added/deleted file) reads as empty.
      const rev = spec.kind === 'index' ? `:${file}` : `${spec.ref}:${file}`
      return gitFor(repoPath)
        .raw(['show', rev])
        .catch(() => '')
    }
    const [oldText, newText] = await Promise.all([read(oldSide), read(newSide)])
    if (!oldText && !newText) return { language: null, changes: [] }
    return semanticCompare(file, oldText, newText)
  },

  /**
   * The whole history as one flat stream of "commit + the files it touched",
   * oldest first — the input for the timelapse animation.
   *
   * One `git log` does the lot: asking per commit would be hundreds of
   * processes for a repo worth watching.
   */
  async timelapseData(repoPath: string, max = 2000): Promise<TimelapseCommit[]> {
    const out = await runGit(repoPath, [
      'log',
      '--reverse',
      '--first-parent',
      `--max-count=${max}`,
      '--name-status',
      '-M',
      '--date=unix',
      `--format=${REC}%H${SEP}%an${SEP}%ct${SEP}%s`
    ]).catch(() => '')

    const commits: TimelapseCommit[] = []
    for (const chunk of out.split(REC)) {
      if (!chunk.trim()) continue
      const [head, ...rest] = chunk.split('\n')
      const [hash, author, date, subject] = head.split(SEP)
      if (!hash) continue
      const files: { path: string; status: FileChangeKind }[] = []
      for (const line of rest) {
        if (!line.trim()) continue
        const parts = line.split('\t')
        const path = parts[parts.length - 1]
        if (!path) continue
        files.push({ path, status: mapStatusCode(parts[0][0]) })
      }
      commits.push({ hash, author: author ?? '', date: Number(date) || 0, subject: subject ?? '', files })
    }
    return commits
  },

  async stashFiles(repoPath: string, sha: string, untrackedSha?: string | null): Promise<FileEntry[]> {
    const git = gitFor(repoPath)
    const out = await git.raw(['diff', '--name-status', '-M', `${sha}^1`, sha])
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
    return memo(commitDiffCache, `d\0${repoPath}\0${hash}`, () =>
      gitFor(repoPath).raw(['show', '--format=', '--first-parent', hash])
    )
  },

  /** Branches whose history contains this commit, grouped like the graph's ref
   *  badges: a local branch and its remote-tracking counterpart collapse into
   *  one entry so `main` + `origin/main` render as a single badge. */
  async commitBranches(repoPath: string, hash: string): Promise<CommitBranchInfo[]> {
    const git = gitFor(repoPath)
    const remoteNames = new Set((await git.getRemotes()).map((r) => r.name))
    // Full refname (not :short) so a remote's symbolic HEAD — refs/remotes/origin/HEAD,
    // which :short collapses to the bare string "origin" — can be told apart from an
    // actual local branch literally named "origin".
    const out = await git.raw(['branch', '-a', '--contains', hash, '--format=%(refname)']).catch(() => '')
    const map = new Map<string, CommitBranchInfo>()
    const entry = (name: string): CommitBranchInfo => {
      let g = map.get(name)
      if (!g) {
        g = { name, isLocal: false, remotes: [] }
        map.set(name, g)
      }
      return g
    }
    for (const line of out.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (line.startsWith('refs/heads/')) {
        entry(line.slice('refs/heads/'.length)).isLocal = true
      } else if (line.startsWith('refs/remotes/')) {
        const rest = line.slice('refs/remotes/'.length)
        const slash = rest.indexOf('/')
        if (slash <= 0) continue
        const remote = rest.slice(0, slash)
        const name = rest.slice(slash + 1)
        if (name === 'HEAD' || !remoteNames.has(remote)) continue // origin's symbolic default-branch pointer, not a real branch
        const g = entry(name)
        if (!g.remotes.includes(remote)) g.remotes.push(remote)
      }
    }
    return [...map.values()].sort((a, b) => Number(b.isLocal) - Number(a.isLocal) || a.name.localeCompare(b.name))
  },

  /** Tags that point exactly at this commit. */
  async commitTags(repoPath: string, hash: string): Promise<string[]> {
    const out = await gitFor(repoPath).raw(['tag', '--points-at', hash]).catch(() => '')
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  },

  // ─── File inspection (file view / blame / history) ──────────────────────

  async fileContent(repoPath: string, file: string, ref?: string, force = false): Promise<string> {
    if (!force) await assertUnderCap(repoPath, file, ref, TEXT_MAX_BYTES)
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
   * Like `searchFileContents`, but returns every matching LINE (file/line/text)
   * instead of only the file paths — the data a VSCode-style expandable results
   * tree needs. Reads the working-tree copy of each candidate, so it covers
   * tracked, staged and untracked files alike.
   *
   * Capped twice: `maxPerFile` keeps one huge file from burying the rest, `max`
   * bounds the whole payload crossing IPC.
   */
  async searchFileMatches(
    repoPath: string,
    files: string[],
    query: string,
    opts?: {
      caseSensitive?: boolean
      wholeWord?: boolean
      regex?: boolean
      max?: number
      maxPerFile?: number
    }
  ): Promise<CodeSearchHit[]> {
    if (!query.trim()) return []
    const max = opts?.max ?? 2000
    const maxPerFile = opts?.maxPerFile ?? 100
    let pattern: RegExp
    try {
      const src = opts?.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const body = opts?.wholeWord ? `\\b${src}\\b` : src
      pattern = new RegExp(body, opts?.caseSensitive ? '' : 'i')
    } catch {
      return []
    }
    const perFile = await Promise.all(
      files.map(async (f) => {
        let content: string
        try {
          content = await readFile(join(repoPath, f), 'utf-8')
        } catch {
          return [] // binary, deleted, or unreadable
        }
        if (content.includes('\0')) return [] // binary
        const hits: CodeSearchHit[] = []
        const lines = content.split('\n')
        for (let i = 0; i < lines.length && hits.length < maxPerFile; i++) {
          if (pattern.test(lines[i])) hits.push({ file: f, line: i + 1, text: lines[i].slice(0, 400) })
        }
        return hits
      })
    )
    return perFile.flat().slice(0, max)
  },

  /**
   * Same line-level search, but against the tree of a commit/stash (`rev`)
   * instead of the working tree — `git grep <pattern> <rev> -- <paths>`.
   * Output rows are `rev:path:line:text`, so the rev prefix is stripped off.
   */
  async searchCommitMatches(
    repoPath: string,
    rev: string,
    query: string,
    opts?: {
      paths?: string[]
      caseSensitive?: boolean
      wholeWord?: boolean
      regex?: boolean
      max?: number
      maxPerFile?: number
    }
  ): Promise<CodeSearchHit[]> {
    if (!query.trim()) return []
    const max = opts?.max ?? 2000
    const maxPerFile = opts?.maxPerFile ?? 100
    const args = ['grep', '-n', '-I', '--no-color', '--full-name']
    if (!opts?.caseSensitive) args.push('-i')
    if (opts?.wholeWord) args.push('-w')
    args.push(opts?.regex ? '-E' : '-F')
    args.push('-e', query, rev, '--', ...(opts?.paths ?? []))
    let raw = ''
    try {
      raw = await gitFor(repoPath).raw(args)
    } catch {
      return [] // no matches (exit 1) or invalid pattern
    }
    const hits: CodeSearchHit[] = []
    const perFile = new Map<string, number>()
    const prefix = `${rev}:`
    for (const line of raw.split('\n')) {
      if (!line || hits.length >= max) break
      const body = line.startsWith(prefix) ? line.slice(prefix.length) : line
      const m = /^(.*?):(\d+):(.*)$/.exec(body)
      if (!m) continue
      const file = m[1]
      const seen = perFile.get(file) ?? 0
      if (seen >= maxPerFile) continue
      perFile.set(file, seen + 1)
      hits.push({ file, line: Number(m[2]), text: m[3].slice(0, 400) })
    }
    return hits
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

  async fileDataUrl(repoPath: string, file: string, ref?: string, force = false): Promise<string> {
    if (!force) await assertUnderCap(repoPath, file, ref, PREVIEW_MAX_BYTES)
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

  async worktreeAdd(
    repoPath: string,
    path: string,
    branch: string,
    newBranch: boolean,
    startPoint?: string
  ): Promise<void> {
    const args = ['worktree', 'add']
    if (newBranch) {
      args.push('-b', branch, path)
      if (startPoint) args.push(startPoint)
    } else {
      args.push(path, branch)
    }
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

  /** Branch names a remote advertises, for the clone dialog's branch picker.
   *  Never touches disk — `ls-remote` is a network read with no local repo. */
  async remoteBranches(url: string, host?: string, token?: string): Promise<string[]> {
    const authed = authedCloneUrl(url, host, token)
    try {
      const { stdout } = await pexecFile('git', ['ls-remote', '--heads', authed], { env: noPromptEnv() })
      return stdout
        .split('\n')
        .map((line) => line.split('\t')[1]?.replace(/^refs\/heads\//, '') ?? '')
        .filter(Boolean)
        .sort()
    } catch (err) {
      const e = err as { stderr?: string; message?: string }
      throw new Error(redactCredentials((e.stderr || e.message || 'git ls-remote failed').trim()))
    }
  },

  async clone(
    parentDir: string,
    url: string,
    name: string,
    opts: CloneOptions = {},
    onProgress?: (p: CloneProgress) => void
  ): Promise<string> {
    const folder = name.trim() || basename(url).replace(/\.git$/, '') || 'repository'
    const target = join(parentDir, folder)
    if (existsSync(target)) throw new Error(`A folder named "${folder}" already exists here.`)
    // `git clone --depth` is silently ignored for a local path — a local clone
    // hardlinks the object store instead of fetching — so a shallow request on
    // a local repository only takes effect through a file:// URL.
    const localShallow = !!opts.depth && !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.includes('@') && existsSync(url)
    const cloneUrl = localShallow
      ? pathToFileURL(resolvePath(url)).href
      : authedCloneUrl(url, opts.host, opts.token)
    // Streaming the underlying `git clone --progress` so the UI can show real progress;
    // simpleGit auto-appends --progress when a progress handler is configured.
    const git = simpleGit({
      baseDir: parentDir,
      progress: onProgress
        ? ({ stage, progress, processed, total }) => onProgress({ stage, progress, processed, total })
        : undefined
    })
    const args: string[] = []
    // A blob filter (e.g. "blob:none") makes this a partial clone — history without
    // file blobs, fetched on demand. Great for very large repos.
    if (opts.filter) args.push(`--filter=${opts.filter}`)
    // `--depth` implies --single-branch in git, so the flag pair below is not
    // contradictory: asking for full branches back is the case worth spelling out.
    if (opts.depth && opts.depth > 0) args.push(`--depth=${Math.floor(opts.depth)}`)
    if (opts.singleBranch === true) args.push('--single-branch')
    else if (opts.singleBranch === false && opts.depth) args.push('--no-single-branch')
    if (opts.branch?.trim()) args.push('--branch', opts.branch.trim())
    if (opts.recurseSubmodules) args.push('--recurse-submodules')
    await git.clone(cloneUrl, folder, args.length ? args : undefined)
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

  /** `git init` in an existing folder the user already opened. */
  async initHere(repoPath: string): Promise<void> {
    await simpleGit(repoPath).init()
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

  // ─── Absorb (staged hunks → fixup! commits) ───────────────────────────────

  /**
   * Work out which of your own recent commits each staged hunk belongs to.
   *
   * This is `git absorb`: instead of one lumpy "review fixes" commit, blame
   * tells you the commit that introduced the lines you just touched, and each
   * hunk becomes a `fixup!` for it. Only unpublished commits are candidates —
   * rewriting anything already pushed is not ours to offer.
   */
  async absorbPlan(repoPath: string): Promise<AbsorbPlan> {
    const empty = (reason: AbsorbPlan['reason']): AbsorbPlan => ({
      base: '',
      rangeLabel: '',
      targets: [],
      unmatched: [],
      reason
    })

    // A rebase/merge/cherry-pick in flight owns the index; stay out of it.
    if (await gitService.mergeState(repoPath)) return empty('in-progress')

    const diff = await runGit(repoPath, ['diff', '--cached'])
    if (!diff.trim()) return empty('no-staged')

    const range = await absorbCandidates(repoPath)
    if (!range.commits.length) return empty('no-commits')

    const { targets, unmatched } = await attributeHunks(repoPath, diff, range.commits)
    return { base: range.base, rangeLabel: range.label, targets, unmatched }
  },

  /**
   * Turn the plan into real `fixup!` commits, optionally folding them in with
   * an autosquash rebase.
   *
   * The working tree is never touched: only the index and the commits this
   * creates. If any step fails, HEAD and the index are put back exactly as they
   * were, so a half-absorbed state cannot survive.
   */
  async absorbApply(repoPath: string, opts: { rebase?: boolean } = {}): Promise<{ created: number; rebased: boolean }> {
    const plan = await gitService.absorbPlan(repoPath)
    if (!plan.targets.length) return { created: 0, rebased: false }

    const originalHead = (await runGit(repoPath, ['rev-parse', 'HEAD'])).trim()
    const originalDiff = await runGit(repoPath, ['diff', '--cached'])
    const files = parsePatch(originalDiff)

    // Oldest target first: each fixup shifts the lines below it, and applying in
    // history order keeps every later patch's context where git expects it.
    const order = [...plan.targets].reverse()

    try {
      // Clear the index (working tree untouched) so each fixup can be staged on
      // its own.
      await runGit(repoPath, ['reset', '-q'])

      for (const target of order) {
        const wanted = new Set(target.hunks.map((h) => `${h.file} ${h.header}`))
        for (const file of files) {
          const hunks = file.hunks.filter((h) => wanted.has(`${file.newPath} ${h.header}`))
          if (!hunks.length) continue
          await gitService.stagePatch(repoPath, buildPatch(file, hunks))
        }
        await pexecFile('git', ['-C', repoPath, 'commit', `--fixup=${target.sha}`], { env: noPromptEnv() })
      }

    } catch (err) {
      // Undo our commits and put the original staged set back. `reset --mixed`
      // never touches the working tree, so the user's edits are safe throughout.
      await runGit(repoPath, ['reset', '-q', '--mixed', originalHead]).catch(() => undefined)
      if (originalDiff.trim()) await gitService.stagePatch(repoPath, originalDiff).catch(() => undefined)
      throw err
    }

    // The rebase runs with a clean index (git refuses otherwise), so whatever
    // blame could not place is re-staged only once the fixups are folded in.
    if (opts.rebase) await gitService.autosquash(repoPath, plan.base, true)

    for (const file of files) {
      const claimed = new Set(
        plan.targets.flatMap((t) => t.hunks.filter((h) => h.file === file.newPath).map((h) => h.header))
      )
      const rest = file.hunks.filter((h) => !claimed.has(h.header))
      // Best effort: the change itself is still in the working tree, so a patch
      // that no longer applies costs the user nothing but a re-stage.
      if (rest.length) await gitService.stagePatch(repoPath, buildPatch(file, rest)).catch(() => undefined)
    }

    return { created: plan.targets.length, rebased: !!opts.rebase }
  },

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

  /**
   * Hand the whole search to a command: `git bisect run`.
   *
   * git checks out each candidate, runs the command, and reads its **exit
   * code**: 0 means good, 125 means "cannot test this one, skip it", anything
   * else (bar 128+) means bad. That contract is the entire feature — a test
   * suite already speaks it, which is why `git bisect run npm test` finds a
   * regression while you make coffee.
   *
   * Output is streamed to `onOutput` as it arrives, because a bisect that takes
   * ten minutes with a silent window is indistinguishable from a hung one.
   */
  async bisectRunScript(
    repoPath: string,
    command: string,
    onOutput?: (chunk: string) => void
  ): Promise<BisectStatus> {
    const script = command.trim()
    if (!script) throw new Error('Give a command to run at each step.')
    const status = await buildBisectStatus(repoPath)
    if (!status.inProgress) throw new Error('Start a bisect and mark a good and a bad commit first.')

    const shell = process.platform === 'win32' ? 'cmd' : 'sh'
    const shellArgs = process.platform === 'win32' ? ['/c', script] : ['-c', script]
    const child = spawn('git', ['-C', repoPath, 'bisect', 'run', shell, ...shellArgs], { env: noPromptEnv() })
    bisectRuns.set(repoPath, child)

    let out = ''
    const collect = (buf: Buffer): void => {
      const chunk = buf.toString()
      out += chunk
      onOutput?.(chunk)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)

    try {
      await new Promise<void>((resolve) => {
        child.on('error', () => resolve())
        // A non-zero exit is not a failure to report: `bisect run` exits non-zero
        // when the script never returned a usable verdict, and the status built
        // from the repository afterwards says so better than a thrown error.
        child.on('close', () => resolve())
      })
    } finally {
      bisectRuns.delete(repoPath)
    }
    return buildBisectStatus(repoPath, out)
  },

  /** Stop a running `bisect run`. The session itself stays open. */
  async bisectCancel(repoPath: string): Promise<boolean> {
    const child = bisectRuns.get(repoPath)
    if (!child) return false
    child.kill()
    bisectRuns.delete(repoPath)
    return true
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
   * Per-commit history with touched files, for the "RepoCosmos" 3D visualization
   * easter egg. Same single `git log --numstat` pass as `repoInsights`, but
   * returns per-commit records instead of aggregating — capped to the most
   * recent `limit` commits for render performance.
   */
  async cosmosData(repoPath: string, limit = 2000): Promise<CosmosCommit[]> {
    const git = gitFor(repoPath)
    const args = ['log', '-M', `-${limit}`, `--pretty=format:\x01%H${SEP}%P${SEP}%an${SEP}%ae${SEP}%at${SEP}%s`, '--numstat']
    const out = await git.raw(args).catch(() => '')

    const commits: CosmosCommit[] = []
    let cur: CosmosCommit | null = null

    for (const line of out.split('\n')) {
      if (line.startsWith('\x01')) {
        const [hash, parents, authorName, authorEmail, at, subject] = line.slice(1).split(SEP)
        cur = {
          hash,
          parents: parents ? parents.split(' ').filter(Boolean) : [],
          authorName: (authorName ?? '').trim() || 'Unknown',
          authorEmail: (authorEmail ?? '').trim(),
          timestamp: +at || 0,
          subject: subject ?? '',
          files: []
        }
        commits.push(cur)
        continue
      }
      if (!cur || !line.trim()) continue
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
      cur.files.push({ path, added, removed })
    }

    return commits
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

  // ─── Commit editing ─────────────────────────────────────────────────────
  // "Edit any commit like a document": rewrite a historical commit's files or
  // message and replay everything above it — previewed in memory first, so the
  // user sees the whole cascade (including conflicts) before a single ref
  // moves. Linear, merge-free ranges only.

  /** Can this commit be edited in place, and what would a rewrite drag along? */
  async commitEditInfo(repoPath: string, sha: string): Promise<CommitEditInfo> {
    const linear = await isLinearToHead(repoPath, sha)
    const descendants = linear
      ? Number((await runGit(repoPath, ['rev-list', '--count', `${sha}..HEAD`])).trim())
      : 0
    const pushed = Boolean((await runGit(repoPath, ['branch', '-r', '--contains', sha]).catch(() => '')).trim())
    const id = await commitIdentity(repoPath, sha)
    return { linear, descendants, pushed, message: id.message, authorName: id.name, authorDate: id.date }
  },

  /** A file's content at a commit, gated for the editor: binary and oversized
   *  blobs come back with `content: null` rather than garbage. */
  async blobAtCommit(repoPath: string, sha: string, file: string): Promise<BlobAtCommit> {
    const size = Number((await runGit(repoPath, ['cat-file', '-s', `${sha}:${file}`])).trim())
    if (size > 2_000_000) return { content: null, binary: false, size }
    const buf = await readBlobBuffer(repoPath, `${sha}:${file}`)
    const binary = buf.subarray(0, 8192).includes(0)
    return { content: binary ? null : buf.toString('utf-8'), binary, size }
  },

  /** Dry-run the rewrite: same engine as apply, no ref ever moves. */
  async commitEditPreview(
    repoPath: string,
    sha: string,
    edits: Record<string, string>,
    message: string
  ): Promise<CommitEditPreview> {
    if (!(await isLinearToHead(repoPath, sha))) throw new Error('Commit is not on a linear path to HEAD.')
    return rewriteWithEdits(repoPath, sha, edits, message)
  },

  /**
   * Rewrite for real: guard-snapshot the working tree, rebuild the chain, then
   * `reset --keep` the current branch onto the new tip — index and worktree
   * follow, local uncommitted changes are carried over (or the reset aborts
   * and nothing has moved). Refuses detached HEAD and conflicted cascades.
   */
  async commitEditApply(
    repoPath: string,
    sha: string,
    edits: Record<string, string>,
    message: string
  ): Promise<CommitEditResult> {
    if (!(await isLinearToHead(repoPath, sha))) throw new Error('Commit is not on a linear path to HEAD.')
    await runGit(repoPath, ['symbolic-ref', '-q', 'HEAD']).catch(() => {
      throw new Error('HEAD is detached — check out a branch first.')
    })
    await guardSnapshot(repoPath)
    const oldHead = (await runGit(repoPath, ['rev-parse', 'HEAD'])).trim()
    const { newTip, steps } = await rewriteWithEdits(repoPath, sha, edits, message)
    if (!newTip) throw new Error('The rewrite would conflict — see the preview.')
    await runGit(repoPath, ['reset', '--keep', newTip])
    return { oldHead, newTip, rewritten: steps.length }
  },

  // ─── WIP snapshots ─────────────────────────────────────────────────────
  // A safety net for uncommitted work: the whole working tree — modified,
  // staged AND untracked files — is committed through a throwaway index
  // (read-tree/add/write-tree/commit-tree, so neither the real index nor the
  // stash list is touched) and pinned under refs/gitcito/wip/ where gc cannot
  // reach it. Taken on a timer, by hand, or as a guard right before a
  // destructive operation (see guardSnapshot). `git stash create` was the old
  // mechanism; it cannot capture untracked files, which is exactly what a
  // `clean` destroys — old stash-shaped refs are still listed and restorable.

  /** Take a snapshot of the current working tree. Returns null when nothing changed. */
  async createSnapshot(repoPath: string, kind: SnapshotKind = 'manual', max = 50): Promise<SnapshotInfo | null> {
    const git = gitFor(repoPath)
    const status = await git.status().catch(() => null)
    if (!status || status.isClean()) return null

    const gitDir = (await runGit(repoPath, ['rev-parse', '--absolute-git-dir'])).trim()
    const tmpIndex = join(gitDir, `gitcito-snap-${process.pid}-${Date.now()}`)
    const env = { GIT_INDEX_FILE: tmpIndex }
    try {
      const head = (await runGit(repoPath, ['rev-parse', '--verify', 'HEAD']).catch(() => '')).trim()
      // Seed from HEAD so unchanged entries reuse existing blobs, then stage
      // everything — `add -A` in the throwaway index is what pulls untracked
      // files in, the one thing `git stash create` cannot do.
      await runGit(repoPath, ['read-tree', head || '--empty'], env)
      await runGit(repoPath, ['add', '-A'], env)
      const tree = (await runGit(repoPath, ['write-tree'], env)).trim()

      // Nothing effectively changed (e.g. only ignored files were touched).
      const headTree = head ? (await runGit(repoPath, [`rev-parse`, `${head}^{tree}`])).trim() : ''
      if (tree === headTree) return null
      // Timer/guard ticks dedupe against the latest snapshot; a manual
      // "snapshot now" always records, because the user asked for a receipt.
      if (kind !== 'manual') {
        const latest = (await listSnapshotRefs(repoPath))[0]
        const latestTree = latest
          ? (await runGit(repoPath, ['rev-parse', `${latest.sha}^{tree}`]).catch(() => '')).trim()
          : ''
        if (tree === latestTree) return null
      }

      const ts = Math.floor(Date.now() / 1000)
      const label = `gitcito-wip ${new Date(ts * 1000).toISOString()} (${kind})`
      const sha = (await runGit(repoPath, ['commit-tree', tree, '-m', label, ...(head ? ['-p', head] : [])])).trim()
      // Millisecond ref names keep a guard and a timer tick within the same
      // second from colliding; displayed time comes from the commit, not the name.
      const ref = `refs/gitcito/wip/${Date.now()}${SNAPSHOT_SUFFIX[kind]}`
      await git.raw(['update-ref', ref, sha])
      // Prune oldest beyond `max`.
      const all = await listSnapshotRefs(repoPath)
      for (const old of all.slice(max)) await git.raw(['update-ref', '-d', old.ref]).catch(() => {})
      const files = (await gitService.commitFiles(repoPath, sha)).length
      return { ref, sha, time: ts, files, kind }
    } finally {
      await unlink(tmpIndex).catch(() => {})
    }
  },

  /** All saved snapshots, newest first. */
  async listSnapshots(repoPath: string): Promise<SnapshotInfo[]> {
    const refs = await listSnapshotRefs(repoPath)
    const out: SnapshotInfo[] = []
    for (const r of refs) {
      const files = (await gitService.commitFiles(repoPath, r.sha).catch(() => [])).length
      out.push({ ...r, files, kind: kindForSnapshotRef(r.ref) })
    }
    return out
  },

  /**
   * Copy files out of a snapshot back into the working tree (the snapshot is
   * kept). With no `files`, the snapshot's entire tree is restored. Files
   * created after the snapshot are left alone — restore overwrites and
   * recreates, it never deletes.
   */
  async restoreSnapshot(repoPath: string, sha: string, files?: string[]): Promise<void> {
    await gitFor(repoPath).raw(['restore', '--source', sha, '--worktree', '--', ...(files?.length ? files : ['.'])])
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

/** True for git's "Unable to create '.../index.lock': File exists" — thrown when
 *  another process (this app's own queue is already serialized, but an IDE's
 *  git integration, a terminal, or another Git GUI open on the same repo) held
 *  the lock for the instant this command tried to start. The lock is almost
 *  always released within milliseconds, so a short retry clears it without
 *  bothering the user — only a genuinely stuck/crashed lock survives all retries. */
function isIndexLockError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /index\.lock['"]?:\s*File exists/i.test(msg)
}

async function withLockRetry<T>(op: () => Promise<T>): Promise<T> {
  const maxAttempts = 5
  for (let attempt = 1; ; attempt++) {
    try {
      return await op()
    } catch (err) {
      if (attempt >= maxAttempts || !isIndexLockError(err)) throw err
      await new Promise((r) => setTimeout(r, 150 * attempt))
    }
  }
}

// ─── Per-repo read/write lock ──────────────────────────────────────────────
//
// Writes on a repo run exclusively; reads run concurrently with other reads but
// wait for any in-progress or queued write. This closes the race where a raw
// `git log`/diff read (which bypasses simple-git's per-instance task queue)
// observes the repo mid-checkout/mid-commit and returns an inconsistent commit
// set — the root cause of the graph "bugging itself" after an action.
//
// Grants are FIFO: a run of consecutive readers starts together, but a queued
// writer blocks the readers behind it, so a steady stream of status polls can't
// starve a checkout.
class RwLock {
  private readers = 0
  private writer = false
  private waiters: Array<{ write: boolean; resolve: () => void }> = []

  private canRun(write: boolean): boolean {
    return write ? this.readers === 0 && !this.writer : !this.writer
  }

  private enter(write: boolean): void {
    if (write) this.writer = true
    else this.readers++
  }

  async acquire(write: boolean): Promise<() => void> {
    if (this.waiters.length === 0 && this.canRun(write)) {
      this.enter(write)
    } else {
      await new Promise<void>((resolve) => this.waiters.push({ write, resolve }))
    }
    let released = false
    return () => {
      if (released) return
      released = true
      if (write) this.writer = false
      else this.readers--
      this.pump()
    }
  }

  private pump(): void {
    while (this.waiters.length) {
      const head = this.waiters[0]
      if (!this.canRun(head.write)) break
      this.waiters.shift()
      this.enter(head.write)
      head.resolve()
      if (head.write) break // exclusive writer — stop granting
    }
  }
}

const repoLocks = new Map<string, RwLock>()
function lockFor(repoPath: string): RwLock {
  let l = repoLocks.get(repoPath)
  if (!l) {
    l = new RwLock()
    repoLocks.set(repoPath, l)
  }
  return l
}

// Pure reads — safe to run concurrently with each other. Anything NOT listed is
// treated as a write (exclusive), so an unmapped/new method serializes rather
// than risking a concurrent mutation. Only add a method here if it never
// touches the index, working tree, refs, config, or hook files.
/** Methods whose first argument is not a repository path: they run before a
 *  repo exists locally, or against a remote URL. No lock, no repo-scoped log. */
const APP_LEVEL_METHODS = new Set<string>(['clone', 'init', 'remoteBranches'])

const READ_METHODS = new Set<string>([
  'open',
  'log',
  'branches',
  'status',
  'stashes',
  'remotes',
  'stackInfo',
  'listDir',
  'listDirAt',
  'timelapseData',
  'repoPulse',
  'repoDetail',
  'listFiles',
  'listTrackedFiles',
  'ignoredTrackedFiles',
  'commitSummary',
  'filesToPush',
  'commitsTouchingPath',
  'protectedBranches',
  'fileSizes',
  'treeStatus',
  'getCommitMessage',
  'commitTemplate',
  'reflog',
  'bisectStatus',
  'getRemoteTags',
  'remoteBranches',
  'gitflowStatus',
  'rerereStatus',
  'subtrees',
  'cleanPreview',
  // Writing a bundle or an archive reads the object database and touches
  // nothing in the repository — the file it produces lives outside it.
  'bundleCreate',
  'bundleInspect',
  'archiveCreate',
  'maintenanceStats',
  'fsck',
  'objectRefs',
  'gitObject',
  'attributeFiles',
  'checkAttributes',
  'credentialStatus',
  'replacements',
  'diffDrivers',
  'diffDriverSuggestions',
  'conflictCommits',
  'note',
  'notedCommits',
  'historyPaths',
  'historyPurgePreview',
  'historyPurgeBackups',
  'diffFile',
  'commitFiles',
  'stashFiles',
  'stashFileDiff',
  'commitFileDiff',
  'formatPatch',
  'stagedDiff',
  'commitDiff',
  'commitBranches',
  'commitTags',
  'fileContent',
  'searchFileContents',
  'searchFileMatches',
  'searchCommitMatches',
  'grepWorkingTree',
  'searchHistory',
  'fileDataUrl',
  'imageDiff',
  'blameFile',
  'fileHistory',
  'worktrees',
  'submodules',
  'signingConfig',
  'hooksInfo',
  'readHook',
  'lfsInfo',
  'sparseCheckoutInfo',
  'getUser',
  'mergeState',
  'mergeMessage',
  'conflictContext',
  'conflictVersions',
  'interactiveRebaseSteps',
  'compareBranches',
  'mergePreview',
  'teammateRadar',
  'commitEditInfo',
  'blobAtCommit',
  'semanticDiff',
  'rangeDiff',
  'refTips',
  'absorbPlan',
  'repoStats',
  'repoInsights',
  'cosmosData',
  'generateChangelog',
  'listSnapshots',
  'contributors',
  'version'
])

export function gitMethodIsRead(method: string): boolean {
  return READ_METHODS.has(method)
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
    // Same shape for a scripted bisect: it runs for minutes and its output is
    // the only sign it is alive.
    if (method === 'bisectRunScript') {
      args = [
        ...args,
        (chunk: string) => {
          if (!_e.sender.isDestroyed()) _e.sender.send('bisect:output', chunk)
        }
      ]
    }
    // First positional arg is the repo path for almost every method; the
    // app-level ones take a URL or a parent folder instead.
    const repoScoped = typeof args[0] === 'string' && !APP_LEVEL_METHODS.has(method)
    const repoPath = event && repoScoped ? (args[0] as string) : ''

    // Serialize this call under the repo's read/write lock. The lock key is the
    // repo path for every repo-scoped method (not just logged ones); the
    // app-level ones run before (or without) a local repo, so they take no lock.
    const lockKey = repoScoped ? (args[0] as string) : null
    const isWrite = !gitMethodIsRead(method)
    const release = lockKey ? await lockFor(lockKey).acquire(isWrite) : null

    try {
      const result = await withLockRetry(() => (fn as (...a: unknown[]) => Promise<unknown>)(...args))
      if (event) {
        void recordEvent(event)
        void recordLog({ event, repoPath, ok: true })
      }
      return result
    } catch (err) {
      // Redact at the boundary as well as in `runGit`: simple-git and any other
      // path can surface a URL we transiently injected a token into, and this is
      // the last point before the message reaches the log and the renderer.
      const message = redactCredentials(err instanceof Error ? err.message : String(err))
      if (event) void recordLog({ event, repoPath, ok: false, error: message })
      throw err instanceof Error ? Object.assign(err, { message }) : new Error(message)
    } finally {
      release?.()
    }
  })
}
