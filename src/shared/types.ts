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

/** One working-tree match from a `git grep` content search. */
export interface CodeSearchHit {
  file: string
  line: number
  text: string
}

/** One commit from a history pickaxe search (`git log -S` / `-G`). */
export interface HistorySearchHit {
  hash: string
  author: string
  date: number // unix seconds
  subject: string
}

/** One GitHub notification thread (token-level, across all repos). */
export interface GitHubNotification {
  id: string // thread id (used to mark read)
  reason: string // e.g. review_requested, mention, assign, ci_activity
  title: string
  type: string // PullRequest | Issue | Release | Commit | Discussion | …
  repoFullName: string // owner/repo
  repoUrl: string // repository html_url
  number: number | null // PR / issue number when derivable
  unread: boolean
  updatedAt: number // unix seconds
  url: string // best-effort web URL to open
}

/** One branch within a stack (chain of dependent branches). */
export interface StackBranch {
  name: string
  parent: string | null // tracked parent branch, null for the trunk base
  isCurrent: boolean
  ahead: number // own commits not in parent
  needsRestack: boolean // parent tip moved — branch must be rebased onto it
}

/** A stack: ordered bottom (closest to trunk) → top (leaf). */
export interface StackInfo {
  trunk: string // base branch the stack sits on ('' if unknown)
  branches: StackBranch[]
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

/** Working-tree status of a tree node, derived from `git status --ignored`.
 *  Directories report the most "interesting" status of their descendants. */
export type TreeStatusKind = 'modified' | 'added' | 'untracked' | 'ignored' | 'deleted' | 'renamed' | 'conflicted'

/** One immediate child of a directory in the project tree. */
export interface TreeEntry {
  /** Base name (no path). */
  name: string
  /** Repo-relative POSIX path. */
  path: string
  /** True for directories. */
  dir: boolean
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

export type HostingProvider = 'github' | 'azure' | 'gitlab' | 'bitbucket' | null

/** A comment on a pull request's conversation. */
export interface PrComment {
  author: string
  body: string
  createdAt: string
}

/** A submitted review on a pull request. */
export interface PrReview {
  author: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
}

/** One comment within an inline review thread. */
export interface PrReviewComment {
  id: number
  author: string
  body: string
  createdAt: string
}

/** An inline review thread anchored to a file/line in the PR diff. */
export interface PrReviewThread {
  path: string
  line: number | null
  diffHunk: string // the surrounding diff context GitHub returns
  rootId: number // id of the first comment (reply target)
  comments: PrReviewComment[]
}

/** One CI check-run on a PR's head commit. */
export interface PrCheck {
  name: string
  /** queued | in_progress | completed */
  status: string
  /** success | failure | neutral | cancelled | skipped | timed_out | action_required | null (while running) */
  conclusion: string | null
  url: string // details/logs URL
}

/** A changed file in a pull request (file-by-file review checklist). */
export interface PrFile {
  filename: string
  /** added | modified | removed | renamed */
  status: string
  additions: number
  deletions: number
}

/** Full detail for one pull request (conversation + review state). */
export interface PrDetail {
  number: number
  title: string
  body: string
  author: string
  source: string
  target: string
  draft: boolean
  state: 'open' | 'closed'
  merged: boolean
  mergeable: boolean | null
  url: string
  comments: PrComment[]
  reviews: PrReview[]
  reviewThreads: PrReviewThread[]
}

/** A repository issue (not a PR). */
export interface IssueInfo {
  number: number
  title: string
  author: string
  state: 'open' | 'closed'
  url: string
  comments: number
}

/** A repository milestone. */
export interface MilestoneInfo {
  number: number
  title: string
  description: string
  state: 'open' | 'closed'
  dueOn: string | null
  openIssues: number
  closedIssues: number
  url: string
}

/** A Projects v2 custom-field value on an issue (GraphQL-only). */
export interface ProjectFieldGroup {
  project: string
  fields: { name: string; value: string }[]
}

/** A pull request linked to an issue (via cross-reference). */
export interface LinkedPr {
  number: number
  title: string
  url: string
  state: string
}

/** Full detail for one issue (all fields + conversation + linked PRs). */
export interface IssueDetail {
  number: number
  title: string
  body: string
  author: string
  state: 'open' | 'closed'
  url: string
  labels: string[]
  assignees: string[]
  milestone: string | null
  createdAt: string
  comments: PrComment[]
  linkedPrs: LinkedPr[]
  projectFields: ProjectFieldGroup[]
}

export type PrReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
export type PrMergeMethod = 'merge' | 'squash' | 'rebase'

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
  action: 'pick' | 'squash' | 'fixup' | 'drop' | 'reword' | 'edit'
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

/** A single repo mutation produced by the AI "Ask" feature, ready to execute. */
export type AskAction =
  | { type: 'gitignore'; patterns: string[]; description: string }
  | { type: 'stage'; files: string[]; description: string }
  | { type: 'unstage'; files: string[]; description: string }
  | { type: 'commit'; message: string; files?: string[]; description: string }
  | { type: 'stash'; files?: string[]; message?: string; description: string }
  | { type: 'discard'; files: string[]; description: string }
  | { type: 'branch'; name: string; at?: string; checkout?: boolean; description: string }
  | { type: 'checkout'; ref: string; description: string }
  | { type: 'tag'; name: string; message?: string; description: string }

// ─── Launch configurations (VS Code-style .vscode/launch.json) ──────────────

/** One entry from a `.vscode/launch.json` `configurations` array. Only the
 *  fields Gitcito actually runs are typed; the rest is preserved opaquely. */
export interface LaunchConfig {
  name: string
  type?: string
  request?: string
  program?: string
  cwd?: string
  args?: string[]
  env?: Record<string, string>
  /** Path to a dotenv file whose KEY=VALUE pairs are added to the environment. */
  envFile?: string
  runtimeExecutable?: string
  runtimeArgs?: string[]
  /** Label of a task in the sibling tasks.json to run before launching. */
  preLaunchTask?: string
  /** Label of a task to run after the program exits. */
  postDebugTask?: string
  /** Controls visibility / ordering of the entry in the picker. */
  presentation?: { hidden?: boolean; group?: string; order?: number }
  /** Synthetic field (set during discovery) for a `compounds` entry: the member
   *  configuration names to run, in order. */
  compound?: string[]
  [key: string]: unknown
}

/** One entry from a `.vscode/tasks.json` `tasks` array (subset Gitcito runs). */
export interface LaunchTask {
  label: string
  type?: string
  command?: string
  args?: string[]
  /** npm-task script name (`"type": "npm"`, `"script": "build"`). */
  script?: string
  options?: { cwd?: string; env?: Record<string, string> }
  /** Other task label(s) to run first. */
  dependsOn?: string | string[]
  /** "sequence" runs dependsOn one-by-one; otherwise they're independent. */
  dependsOrder?: 'sequence' | 'parallel'
  /** A watch/server task that never exits — Gitcito won't block the launch on it. */
  isBackground?: boolean
  [key: string]: unknown
}

/** One `${input:id}` definition from the `inputs` array of a launch.json. We
 *  support the editor-free kinds: a free-text `promptString` and a static
 *  `pickString`. (`command`-backed inputs need the VS Code command palette.) */
export interface LaunchInput {
  id: string
  type: 'promptString' | 'pickString' | string
  description?: string
  default?: string
  /** Options for a `pickString`. Each is either a raw value or {label,value}. */
  options?: (string | { label?: string; value: string })[]
  password?: boolean
}

/** All launch configs discovered under one `.vscode/` folder. The root folder's
 *  group renders first; deeper folders follow after a divider. */
export interface LaunchGroup {
  /** Stable id — the absolute workspace-folder path (parent of `.vscode`). */
  id: string
  /** Absolute workspace folder (the directory that contains `.vscode/`). */
  dir: string
  /** Display label: "Workspace" for the repo root, else the relative path. */
  label: string
  isRoot: boolean
  configs: LaunchConfig[]
  tasks: LaunchTask[]
  /** `inputs` definitions, used to prompt for `${input:id}` before launching. */
  inputs: LaunchInput[]
}

export type LaunchStatus = 'running' | 'paused' | 'exited'

/** A full app backup: settings plus the separate info & vault stores. Written
 *  by Settings → Data → Export. `vault` and the profile API tokens are only
 *  present when the user opts into "include secrets"; `info` is always included
 *  (non-secret). Analytics/usage live in their own machine-local store and are
 *  never exported. */
export interface SettingsBundle {
  __gitcito: 'settings-export'
  version: 1
  settings: AppSettings
  info?: InfoExport
  vault?: VaultExport
}

/** Result of interpreting a free-form instruction against the repo's current state. */
export interface AskPlan {
  /** One-line, human-readable summary of what will happen. */
  summary: string
  /** Ordered actions to apply. Empty if the instruction can't be fulfilled. */
  actions: AskAction[]
  /** Set when the instruction is unsupported/ambiguous; actions is then empty. */
  note?: string
}

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

/** Per-file change frequency + line churn — the "hotspots" of a repo. */
export interface FileHotspot {
  path: string
  commits: number // number of commits that touched this file
  added: number
  removed: number
}

/** Per-author contribution totals. */
export interface AuthorStat {
  name: string
  commits: number
  added: number
  removed: number
}

/** A weekly churn bucket (lines added/removed, commit count). */
export interface ChurnPoint {
  week: string // ISO date of the week's Monday
  added: number
  removed: number
  commits: number
}

/** Aggregated repository insights from a single `git log --numstat` pass. */
export interface RepoInsights {
  totalCommits: number
  first: number // unix seconds of oldest commit in range
  last: number // unix seconds of newest commit
  filesTouched: number
  authors: AuthorStat[]
  hotspots: FileHotspot[]
  churn: ChurnPoint[]
}

/** Output of the conventional-commit changelog generator. */
export interface ChangelogResult {
  markdown: string
  count: number // commits included
}

/** One secret stored in the local, OS-keychain-encrypted vault. */
export interface VaultEntry {
  id: string
  key: string
  value: string
  note?: string
  updatedAt: number
}

/** Vault contents for a repo: its own entries plus the cross-repo global ones. */
export interface VaultListResult {
  available: boolean // OS encryption (safeStorage) usable on this machine
  repo: VaultEntry[]
  global: VaultEntry[]
}

/** Whole-vault payload for backup/transfer (all repos + global). */
export interface VaultExport {
  repos: Record<string, VaultEntry[]>
  global: VaultEntry[]
}

/** Whole-info payload for backup/transfer (all repos). */
export interface InfoExport {
  repos: Record<string, InfoEntry[]>
}

/** A non-private, per-repo info field (App ID, website, social links…). Stored
 *  in plaintext — unlike the vault, this is reference metadata, not secrets. */
export interface InfoEntry {
  id: string
  /** Display label, e.g. "Bundle ID". */
  label: string
  /** The value itself, e.g. "com.acme.app" or a URL/handle. */
  value: string
  /** Key into the field-preset catalog (chooses the icon + link behaviour). */
  field: string
  updatedAt: number
}

/** A saved WIP snapshot (a `git stash create` commit kept under refs/gitcito/wip). */
export interface SnapshotInfo {
  ref: string // full ref name (refs/gitcito/wip/<ts>)
  sha: string
  time: number // unix seconds
  files: number // changed files captured
  auto: boolean // created by the timer vs. manually
}

/** Progress event streamed from `git clone --progress` while a clone runs. */
export interface CloneProgress {
  stage: string // 'counting' | 'compressing' | 'receiving' | 'resolving' | 'checking out' | ...
  progress: number // 0–100 for the current stage
  processed: number
  total: number
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
  | { type: 'notifications' }
  | { type: 'insights'; repoPath: string }
  | { type: 'vault' }
  | { type: 'release'; release: ReleaseInfo; repoPath: string }
  | { type: 'issue'; issue: IssueInfo; repoPath: string; remoteUrl: string }
  | { type: 'milestone'; milestone: MilestoneInfo; repoPath: string; remoteUrl: string }

/** A published GitHub release, as surfaced to the changelog page. */
export interface AppRelease {
  tag: string
  name: string | null
  body: string | null
  publishedAt: string
  url: string
  prerelease: boolean
}

/** Lifecycle of an in-app update, mirrored from electron-updater into the UI. */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

/** The update that is available / downloaded. */
export interface UpdateInfo {
  version: string
  notes: string | null
  releaseDate?: string
  /** GitHub release page, used as the manual-download fallback. */
  url?: string
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdateState {
  status: UpdateStatus
  info: UpdateInfo | null
  progress: UpdateProgress | null
  error: string | null
  /** False in dev / unpackaged builds where electron-updater can't install.
   *  The renderer still surfaces "new version available" and falls back to
   *  opening the release page for the download. */
  supported: boolean
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
  /** Per-repository profile binding, keyed by repo path. When a repo with a
   *  binding becomes the active repo, its profile is auto-activated. Path-keyed
   *  (not stored on RepoRef) so the same repo across tabs/groups can't diverge. */
  repoProfiles: Record<string, string>
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
  /** Group local branches into collapsible folders by their `/`-separated
   *  prefix (feature/*, release/*, …). A prefix with a single branch stays flat. */
  groupBranches: boolean
  graphColumns: GraphColumns
  graphColumnOrder: GraphFlowColumnId[]
  /** Visual style of the commit graph (palette, line corners, density, width). */
  graphStyle: GraphStyle
  /** User-defined graph palettes, shown alongside the built-in ones. */
  customGraphPalettes: GraphPalette[]
  autoFetchMinutes: number
  /** Raise an OS notification for new review-requested / CI inbox items. */
  desktopNotifications?: boolean
  confirmForcePush: boolean
  /** Force a merge commit even when a fast-forward is possible. */
  mergeCommit: boolean
  sidebarOrder: string[]
  /** Sidebar section ids the user has hidden via the visibility toggle. */
  sidebarHidden: string[]
  onboardingCompleted: boolean
  /** Auto-open the changelog page tab after the app updates to a new version. */
  autoOpenChangelog: boolean
  /** Minutes between automatic WIP snapshots (0 = off). */
  wipSnapshotMinutes: number
  /** Mask secret values (KEY=••••) in .env/key files in the diff & file viewer. */
  maskSecrets: boolean
  /** Surface a Run/Launch picker in the sidebar when a `.vscode/launch.json`
   *  exists. Off → the launch UI is hidden entirely. */
  enableLaunchJson: boolean
  /** Custom keyboard-shortcut overrides: shortcut id → combo (e.g. "mod+k"). */
  shortcuts: Record<string, string>
  /** Warn before committing files larger than this many KB (0 = off). */
  largeFileKb: number
  /** Parent folder of the last clone, used to pre-fill the clone dialog. */
  lastClonePath?: string
  /** Last app version the user has seen the changelog for. Undefined until the
   *  first run that records it; used to detect upgrades. */
  lastSeenVersion?: string
  /** Version the user chose to skip via "don't show again". The new-version
   *  banner stays hidden for exactly this version; a later one shows again. */
  skippedUpdateVersion?: string
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
 * Visual style of the commit graph (palette + how the rails are drawn). Lives
 * in AppSettings so it persists per-machine and applies to every repo.
 */
export type GraphEdgeStyle = 'rounded' | 'sharp' | 'curved' | 'straight'
export type GraphDensity = 'compact' | 'comfortable' | 'spacious'
export type GraphLineWidth = 'thin' | 'normal' | 'thick'

/** A named set of lane colours for the graph rails. */
export interface GraphPalette {
  id: string
  name: string
  builtin?: boolean
  /** Lane colours, used round-robin. At least 6; more is better for wide graphs. */
  colors: string[]
}

export interface GraphStyle {
  /** Id into the built-in + custom palette list. */
  paletteId: string
  edgeStyle: GraphEdgeStyle
  density: GraphDensity
  lineWidth: GraphLineWidth
}

export function defaultGraphStyle(): GraphStyle {
  return { paletteId: 'classic', edgeStyle: 'rounded', density: 'comfortable', lineWidth: 'normal' }
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
    repoProfiles: {},
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
    groupBranches: true,
    graphColumns: defaultGraphColumns(),
    graphColumnOrder: defaultGraphColumnOrder(),
    graphStyle: defaultGraphStyle(),
    customGraphPalettes: [],
    autoFetchMinutes: 5,
    desktopNotifications: false,
    confirmForcePush: true,
    mergeCommit: true,
    sidebarOrder: ['local', 'remotes', 'stashes', 'tags', 'prs', 'issues', 'milestones', 'releases', 'worktrees', 'submodules'],
    sidebarHidden: [],
    onboardingCompleted: false,
    autoOpenChangelog: true,
    wipSnapshotMinutes: 0,
    maskSecrets: true,
    enableLaunchJson: true,
    shortcuts: {},
    largeFileKb: 5120
  }
}
