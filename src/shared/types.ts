// ─── Shared domain types (used by main, preload and renderer) ───────────────

export interface CommitAuthor {
  name: string
  email: string
}

/**
 * Verification state of a commit's signature, normalised from git's `%G?`:
 * good = valid; unverified = signed but key/validity unknown; bad = invalid or
 * revoked; expired = signature/key expired; none = unsigned.
 */
export type CommitSignature = 'good' | 'unverified' | 'bad' | 'expired' | 'none'

export interface GraphCommit {
  hash: string
  parents: string[]
  author: string
  email: string
  date: number // unix seconds
  refs: string[]
  subject: string
  coAuthors?: CommitAuthor[]
  signature?: CommitSignature // omitted when unsigned
  signer?: string // signing identity (%GS), when known
}

/** Per-repo commit-signing configuration. */
export interface SigningConfig {
  sign: boolean // commit.gpgsign
  format: string // gpg.format: openpgp | ssh | x509
  key: string // user.signingkey ('' if unset)
}

/** State of one git hook file in the repo's hooks directory. */
export interface HookInfo {
  name: string // e.g. 'pre-commit'
  exists: boolean // a real (non-.sample) hook file is present
  executable: boolean // exec bit set — git only runs executable hooks
  sample: boolean // only the shipped `<name>.sample` template exists
  size: number // bytes of the real hook (0 when absent)
}

/** Snapshot of a repo's hooks directory + framework detection. */
export interface HooksInfo {
  hooksDir: string // resolved hooks directory (honours core.hooksPath)
  customHooksPath: boolean // core.hooksPath is set (custom/framework-managed)
  preCommitFramework: boolean // a .pre-commit-config.yaml(.yml) is present
  hooks: HookInfo[]
}

/** One file tracked by Git LFS (from `git lfs ls-files`). */
export interface LfsFile {
  path: string
  oid: string // short object id
  downloaded: boolean // true = real content present, false = pointer only
}

/** Cone-mode sparse-checkout state for a repo. */
export interface SparseCheckoutInfo {
  enabled: boolean // core.sparseCheckout is on
  cone: boolean // cone mode (directory-based)
  dirs: string[] // currently-included top-level directories
  topLevelDirs: string[] // all top-level directories in HEAD (toggle candidates)
}

/** Git LFS state for a repo. */
export interface LfsInfo {
  installed: boolean // the git-lfs binary is available
  enabled: boolean // the repo tracks anything via LFS
  patterns: string[] // tracked glob patterns from .gitattributes
  files: LfsFile[]
}

export interface BranchInfo {
  name: string
  sha: string
  upstream: string | null
  ahead: number
  behind: number
  isCurrent: boolean
}

export interface RemoteBranchInfo {
  remote: string
  name: string
  fullName: string
  sha: string
}

export interface TagInfo {
  name: string
  sha: string
}

export interface BranchesPayload {
  current: string
  locals: BranchInfo[]
  remotes: RemoteBranchInfo[]
  tags: TagInfo[]
}

export type FileChangeKind = 'A' | 'M' | 'D' | 'R' | 'C' | 'U' | '?'

export interface FileEntry {
  path: string
  status: FileChangeKind
  untracked?: boolean
}

export interface RepoStatus {
  current: string
  tracking: string | null
  ahead: number
  behind: number
  staged: FileEntry[]
  unstaged: FileEntry[]
  conflicted: FileEntry[]
}

export type ConflictOpKind = 'merge' | 'cherry-pick' | 'rebase' | 'revert'
export type ConflictSide = 'ours' | 'theirs' | 'delete'

export interface ConflictVersions {
  content: string
  ours: string | null
  theirs: string | null
  base: string | null
}

export interface StashInfo {
  index: number
  sha: string
  parentSha: string
  untrackedSha: string | null
  message: string
  branch: string | null
  date: number
}

export interface RemoteInfo {
  name: string
  url: string
}

export interface RepoSummary {
  path: string
  name: string
  current: string
}

export interface PullRequest {
  id: number
  title: string
  author: string
  sourceBranch: string
  targetBranch: string
  url: string
  isDraft: boolean
}

export type HostingProvider = 'github' | 'azure' | null

/** A release published on the hosting platform (GitHub). Most map 1:1 to a
 *  tag; only draft releases can be tagless until they are published. */
export interface ReleaseInfo {
  id: number
  /** Tag the release points at. Null for unpublished drafts with no tag yet. */
  tag: string | null
  name: string | null
  body: string | null
  /** ISO date; null for drafts that were never published. */
  publishedAt: string | null
  url: string
  prerelease: boolean
  draft: boolean
}

export type RepoHost = 'github' | 'gitlab' | 'bitbucket' | 'azure'

export interface RemoteRepo {
  name: string // display name, e.g. owner/repo
  url: string // https clone url
  private?: boolean
  description?: string
  avatarUrl?: string // owner/namespace avatar from the provider
}

/** An account or organization/workspace a new repo can be created under. */
export interface RemoteOwner {
  id: string // login/slug (gh/bb), numeric namespace id (gitlab)
  login: string // display name and path segment
  avatarUrl?: string
  type: 'user' | 'org'
}

export interface CreateRepoOpts {
  owner: string // user login / org / workspace slug
  ownerType: 'user' | 'org'
  ownerId?: string // gitlab namespace id
  project?: string // azure project
  name: string
  description?: string
  private: boolean
}

/** Options for opening a pull/merge request from the app. */
export interface CreatePrOpts {
  title: string
  body: string
  source: string // head branch
  target: string // base branch
  draft: boolean
}

/** Result of a created PR/MR. */
export interface CreatePrResult {
  url: string
  number: number
}

export interface BlameLine {
  sha: string
  author: string
  date: number
  lineNo: number
  text: string
}

export interface FileHistoryEntry {
  hash: string
  author: string
  date: number
  subject: string
}

export interface RebaseStep {
  action: 'pick' | 'squash' | 'fixup' | 'drop' | 'reword'
  hash: string
  subject: string
  newMessage?: string
}

export type CiState = 'success' | 'failure' | 'pending' | 'neutral'

export interface CiJob {
  name: string
  state: CiState
  url?: string
}

export interface CiStatus {
  state: CiState
  jobs: CiJob[]
}

export interface BranchCompareResult {
  aheadCommits: GraphCommit[]
  behindCommits: GraphCommit[]
  diff: string
}

export interface WorktreeInfo {
  path: string
  branch: string | null
  head: string
  isMain: boolean
  isCurrent: boolean
  locked: boolean
  detached: boolean
}

/**
 * State of a submodule, derived from `git submodule status`:
 * - `initialized`: checked out at the commit recorded by the superproject.
 * - `modified`: checked out at a different commit than recorded ('+').
 * - `uninitialized`: registered in `.gitmodules` but not checked out ('-').
 * - `conflict`: has a merge conflict ('U').
 */
export type SubmoduleStatus = 'initialized' | 'modified' | 'uninitialized' | 'conflict'

export interface SubmoduleInfo {
  /** Logical name from `.gitmodules` (the `[submodule "<name>"]` key). */
  name: string
  /** Path of the submodule within the superproject working tree. */
  path: string
  /** Configured remote URL from `.gitmodules`, if any. */
  url: string
  /** Currently checked-out commit (or recorded commit when uninitialized). */
  sha: string
  /** Commit the superproject pins this submodule to (gitlink in HEAD tree). */
  recordedSha: string
  /** Branch the submodule tracks, from `.gitmodules`, if pinned to one. */
  branch: string | null
  /** Human-readable ref shown by git, e.g. `heads/main` or `v1.0-3-gabc`. */
  describe: string | null
  status: SubmoduleStatus
  /** Commits the checkout is ahead of the recorded pointer (only when modified). */
  ahead: number
  /** Commits the checkout is behind the recorded pointer (only when modified). */
  behind: number
}

// ─── Settings / profiles ─────────────────────────────────────────────────────

export type CommitStyle = 'auto' | 'conventional' | 'gitmoji' | 'ticket' | 'plain' | 'caveman' | 'haiku'

/** Tone/persona used when the AI explains code. */
export type ExplainStyle = 'normal' | 'concise' | 'detailed' | 'eli5' | 'caveman' | 'pirate' | 'formal'

/** How the AI shapes the output when resolving merge conflicts. */
export type ConflictStyle = 'clean' | 'commented' | 'conservative'

/** Branch naming convention used when generating branch names with AI. */
export type BranchNamingStyle = 'prefix/description' | 'prefix/ticket-description' | 'username/prefix/description' | 'plain'

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'mistral' | 'ollama' | 'custom'

export interface AIProviderPreset {
  id: AIProvider
  label: string
  endpoint: string
  defaultModel: string
  needsKey: boolean
  models: string[]
}

export const AI_PROVIDERS: AIProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-latest',
    needsKey: true,
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    needsKey: true,
    models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-haiku', 'anthropic/claude-3.5-sonnet']
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    needsKey: true,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  {
    id: 'mistral',
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    needsKey: true,
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'codestral-latest']
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    needsKey: false,
    models: ['llama3.2', 'llama3.1', 'qwen2.5-coder', 'codellama', 'mistral']
  },
  { id: 'custom', label: 'Custom (OpenAI-compatible)', endpoint: '', defaultModel: '', needsKey: false, models: [] }
]

export interface AIConfig {
  enabled: boolean
  provider: AIProvider
  endpoint: string
  apiKey: string
  model: string
  commitStyle: CommitStyle
  explainStyle: ExplainStyle
  conflictStyle: ConflictStyle
  branchNamingStyle: BranchNamingStyle
  customInstructions: string
  generateDescription: boolean
  coAuthor: boolean
}

/** Co-author trailer appended when AIConfig.coAuthor is enabled (default on). */
export const MYAPPDESK_COAUTHOR = 'MyAppDesk <team@myappdesk.dev>'

// ─── Analytics & instrumentation ─────────────────────────────────────────────

/** Accumulated token counts (and estimated cost) for a slice of AI usage. */
export interface AIUsageStat {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** Estimated USD, computed from a built-in price table. 0 if model unknown. */
  cost: number
}

export function emptyAIUsageStat(): AIUsageStat {
  return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 }
}

/** Activity events recorded as the user drives gitcito. */
export type ActivityEvent =
  | 'commit'
  | 'amend'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'branchCreate'
  | 'branchDelete'
  | 'merge'
  | 'rebase'
  | 'stash'
  | 'stashPop'
  | 'conflictResolved'
  | 'tagCreate'
  | 'cherryPick'
  | 'revert'
  | 'repoOpen'
  | 'clone'
  | 'init'

/** One local calendar day of recorded activity. */
export interface DayBucket {
  date: string // 'YYYY-MM-DD' (local time)
  events: Partial<Record<ActivityEvent, number>>
  ai: AIUsageStat
}

/**
 * Persisted, machine-local activity ledger. Holds a per-day timeline plus
 * lifetime AI token totals (broken down by feature and model).
 */
export interface Analytics {
  /** Unix ms of the first recorded entry, 0 when nothing recorded yet. */
  since: number
  /** Days of history to keep; 0 = keep forever. Older buckets are pruned. */
  retentionDays: number
  days: DayBucket[]
  aiTotal: AIUsageStat
  aiByFeature: Record<string, AIUsageStat>
  aiByModel: Record<string, AIUsageStat>
}

export function emptyAnalytics(): Analytics {
  return { since: 0, retentionDays: 0, days: [], aiTotal: emptyAIUsageStat(), aiByFeature: {}, aiByModel: {} }
}

/** One recorded git operation, kept as a machine-local, append-only log. */
export interface LogEntry {
  /** Unix ms when the operation finished. */
  ts: number
  /** Filesystem path of the repository the operation ran against ('' for app-level ops). */
  repoPath: string
  /** Display name (basename of repoPath), '' for app-level ops. */
  repoName: string
  /** Which activity the operation maps to. */
  event: ActivityEvent
  /** Whether the operation completed successfully. */
  ok: boolean
  /** Truncated error message when `ok` is false. */
  error?: string
}

/** Aggregated commit history for a single repository, read from `git log`. */
export interface RepoStats {
  totalCommits: number
  first: number // unix seconds of oldest commit in range, 0 if none
  last: number // unix seconds of newest commit, 0 if none
  perDay: { date: string; count: number }[]
  authors: { name: string; commits: number }[]
}

/** One entry from `git reflog` — the recovery net for lost/rewound commits. */
export interface ReflogEntry {
  sha: string
  selector: string // e.g. "HEAD@{0}"
  action: string // full reflog subject, e.g. "commit: …" or "reset: moving to HEAD~1"
  date: number // unix seconds
}

/** Snapshot of an in-progress (or just-finished) `git bisect` session. */
export interface BisectStatus {
  inProgress: boolean
  needGood: boolean // still needs an initial good commit before narrowing starts
  needBad: boolean // still needs an initial bad commit
  currentSha: string // commit to test now (HEAD); '' when finished or not started
  currentSubject: string
  remainingSteps: number // git's "roughly N steps" estimate; -1 when unknown
  finished: boolean // the first bad commit has been identified
  firstBadSha: string
  firstBadSubject: string
}

export interface Profile {
  id: string
  name: string
  gitName: string
  gitEmail: string
  githubToken: string
  azureToken: string
  gitlabToken: string
  bitbucketToken: string
  ai: AIConfig
}

export interface RepoRef {
  path: string
  name: string
}

/** Fields shared by every tab regardless of kind. */
interface TabBase {
  id: string
  name: string
  color?: string
}

/** A standalone single-repository tab. */
export interface RepoTab extends TabBase {
  kind: 'repo'
  repos: RepoRef[]
  activeRepoPath: string | null
}

/** A collection of repositories shown under one collapsible chip. */
export interface GroupTab extends TabBase {
  kind: 'group'
  repos: RepoRef[]
  activeRepoPath: string | null
  collapsed?: boolean
}

/** A non-repository "page" tab (changelog today; docs/others later).
 *  The discriminant lives on `page.type` so new page kinds slot in here
 *  without touching repo/group plumbing. */
export interface PageTab extends TabBase {
  kind: 'page'
  page: PageContent
}

export type PageContent =
  | { type: 'changelog' }
  | { type: 'logs' }
  | { type: 'release'; release: ReleaseInfo; repoPath: string }

/** A published GitHub release, as surfaced to the changelog page. */
export interface AppRelease {
  tag: string
  name: string | null
  body: string | null
  publishedAt: string
  url: string
  prerelease: boolean
}

export type TabState = RepoTab | GroupTab | PageTab

/** Tabs that carry repositories (everything except page tabs). */
export type RepoBearingTab = RepoTab | GroupTab

/** Repos for any tab — empty for page tabs. Lets callers iterate tabs
 *  without narrowing the union by hand. */
export function tabRepos(tab: TabState): RepoRef[] {
  return tab.kind === 'page' ? [] : tab.repos
}

/** Active repo path for any tab — null for page tabs. */
export function tabActiveRepoPath(tab: TabState): string | null {
  return tab.kind === 'page' ? null : tab.activeRepoPath
}

export interface AppSettings {
  profiles: Profile[]
  activeProfileId: string
  tabs: TabState[]
  activeTabId: string | null
  recentRepos: RepoRef[]
  appThemeId: string
  codeThemeId: string
  themeMode: ThemeMode
  codeFontSize: number
  customAppThemes: AppTheme[]
  customCodeThemes: CodeTheme[]
  language: Language
  initialCommitCount: number
  loadMoreCount: number
  autoLoadOnScroll: boolean
  relativeDates: boolean
  commitAvatars: boolean
  fileListView: 'path' | 'tree'
  graphColumns: GraphColumns
  graphColumnOrder: GraphFlowColumnId[]
  autoFetchMinutes: number
  confirmForcePush: boolean
  /** Force a merge commit even when a fast-forward is possible. */
  mergeCommit: boolean
  sidebarOrder: string[]
  /** Sidebar section ids the user has hidden via the visibility toggle. */
  sidebarHidden: string[]
  onboardingCompleted: boolean
  /** Auto-open the changelog page tab after the app updates to a new version. */
  autoOpenChangelog: boolean
  /** Last app version the user has seen the changelog for. Undefined until the
   *  first run that records it; used to detect upgrades. */
  lastSeenVersion?: string
}

export type Language = 'en' | 'es'

/** App appearance: a fixed mode or follow the operating system. */
export type ThemeMode = 'light' | 'dark' | 'auto'

export type GraphColumnId =
  | 'branch'
  | 'graph'
  | 'message'
  | 'deployment'
  | 'author'
  | 'date'
  | 'sha'
  | 'signature'

export interface GraphColumn {
  width: number // px; for 'message' it is a flex column and width is ignored; for 'graph' 0 = auto
  visible: boolean
}

export type GraphColumns = Record<GraphColumnId, GraphColumn>

export function defaultGraphColumns(): GraphColumns {
  return {
    branch: { width: 168, visible: true },
    graph: { width: 0, visible: true },
    message: { width: 0, visible: true },
    deployment: { width: 90, visible: true },
    author: { width: 160, visible: true },
    date: { width: 80, visible: true },
    sha: { width: 74, visible: true },
    signature: { width: 96, visible: true }
  }
}

/**
 * Left-to-right order of the data columns that flow after the graph. `branch`
 * and `graph` are the fixed structural area on the left and are never part of
 * this list — they always render first.
 */
export type GraphFlowColumnId = Exclude<GraphColumnId, 'branch' | 'graph'>

export function defaultGraphColumnOrder(): GraphFlowColumnId[] {
  return ['message', 'author', 'date', 'sha', 'signature', 'deployment']
}

export interface AppThemeColors {
  bg0: string
  bg1: string
  bg2: string
  bg3: string
  bg4: string
  border: string
  borderSoft: string
  text0: string
  text1: string
  text2: string
  accent: string
  green: string
  red: string
  yellow: string
  purple: string
}

export interface AppTheme {
  id: string
  name: string
  builtin?: boolean
  light: AppThemeColors
  dark: AppThemeColors
}

export interface CodeThemeColors {
  bg: string
  text: string
  comment: string
  keyword: string
  string: string
  number: string
  function: string
  title: string
  variable: string
  type: string
  builtin: string
  attr: string
  tag: string
  operator: string
  meta: string
}

export interface CodeTheme {
  id: string
  name: string
  builtin?: boolean
  light: CodeThemeColors
  dark: CodeThemeColors
}

export function defaultProfile(): Profile {
  return {
    id: 'default',
    name: 'Default',
    gitName: '',
    gitEmail: '',
    githubToken: '',
    azureToken: '',
    gitlabToken: '',
    bitbucketToken: '',
    ai: {
      enabled: true,
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      commitStyle: 'auto',
      explainStyle: 'normal',
      conflictStyle: 'clean',
      branchNamingStyle: 'prefix/description',
      customInstructions: '',
      generateDescription: true,
      coAuthor: true
    }
  }
}

export function defaultSettings(): AppSettings {
  return {
    profiles: [defaultProfile()],
    activeProfileId: 'default',
    tabs: [],
    activeTabId: null,
    recentRepos: [],
    appThemeId: 'gitcito',
    codeThemeId: 'gitcito',
    themeMode: 'auto',
    codeFontSize: 12,
    customAppThemes: [],
    customCodeThemes: [],
    language: 'en',
    initialCommitCount: 400,
    loadMoreCount: 400,
    autoLoadOnScroll: true,
    relativeDates: true,
    commitAvatars: true,
    fileListView: 'path',
    graphColumns: defaultGraphColumns(),
    graphColumnOrder: defaultGraphColumnOrder(),
    autoFetchMinutes: 5,
    confirmForcePush: true,
    mergeCommit: true,
    sidebarOrder: ['local', 'remotes', 'stashes', 'tags', 'prs', 'releases', 'worktrees', 'submodules'],
    sidebarHidden: [],
    onboardingCompleted: false,
    autoOpenChangelog: true
  }
}
