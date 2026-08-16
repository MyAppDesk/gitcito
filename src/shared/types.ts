// ─── Shared domain types (used by main, preload and renderer) ───────────────

import type { EditorSetting } from './editors'

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

/** A branch that contains a given commit, grouped like the graph's ref
 *  badges: a local branch and its remote-tracking counterpart (e.g. `main` +
 *  `origin/main`) collapse into one entry instead of two separate rows. */
export interface CommitBranchInfo {
  name: string
  isLocal: boolean
  remotes: string[]
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

/**
 * How a ref would land if it were merged into the base right now.
 * `merged` means the merge would be a no-op (the ref is already contained).
 */
export type MergeRiskKind = 'merged' | 'clean' | 'conflict' | 'error'

/** One branch's forecast in the Conflict Radar. */
export interface MergePreviewEntry {
  ref: string
  status: MergeRiskKind
  /** Paths that would conflict (only for `conflict`). */
  files: string[]
  /** Error text from git, when `status` is `error`. */
  message?: string
}

export interface MergePreviewResult {
  base: string
  baseSha: string
  entries: MergePreviewEntry[]
  /** Unix ms of the scan, so the UI can show "scanned 2m ago". */
  scannedAt: number
}

/** How one commit fared between two versions of a branch (`git range-diff`). */
export type RangeDiffKind = 'unchanged' | 'modified' | 'removed' | 'added'

/** One commit pair from a range-diff. */
export interface RangeDiffEntry {
  kind: RangeDiffKind
  /** Position in the old range, null when the commit is new. */
  oldIndex: number | null
  oldSha: string | null
  /** Position in the new range, null when the commit was dropped. */
  newIndex: number | null
  newSha: string | null
  subject: string
  /** Interdiff — how the commit itself was rewritten. Only for `modified`. */
  body: string
}

/** One staged hunk in an absorb plan. */
export interface AbsorbHunk {
  file: string
  /** The `@@ …` header, shown so the user can tell two hunks apart. */
  header: string
  added: number
  removed: number
}

/** A commit that some of the staged hunks belong to. */
export interface AbsorbTarget {
  sha: string
  subject: string
  hunks: AbsorbHunk[]
}

export interface AbsorbPlan {
  /** The commit the fixups will be squashed onto (parent of the oldest candidate). */
  base: string
  /** How the candidate range was decided, for the UI to explain itself. */
  rangeLabel: string
  targets: AbsorbTarget[]
  /** Hunks blame could not pin on an absorbable commit — left staged as they are. */
  unmatched: AbsorbHunk[]
  /** Why there is nothing to do, when there is nothing to do. */
  reason?: 'no-staged' | 'no-commits' | 'in-progress'
}

/** One repository's local health, as shown in Mission Control. */
export interface RepoPulse {
  path: string
  name: string
  /** Empty when HEAD is detached. */
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  staged: number
  unstaged: number
  untracked: number
  conflicted: number
  stashes: number
  /** Unix seconds of the last commit, 0 for an empty repo. */
  lastCommitAt: number
  /** A merge/rebase/cherry-pick left in progress, if any. */
  operation: ConflictOpKind | null
  /** Commits per day over the last fortnight, oldest first (row sparkline). */
  activity: number[]
  /** Set when the repo could not be read at all (moved, deleted, not a repo). */
  error: string | null
}

/** What an expanded Mission Control row shows: the work in flight. */
export interface RepoDetail {
  files: { path: string; status: FileChangeKind }[]
  commits: { hash: string; subject: string }[]
}

/** One commit in the timelapse stream: who, when, and what it touched. */
export interface TimelapseCommit {
  hash: string
  author: string
  date: number // unix seconds
  subject: string
  files: { path: string; status: FileChangeKind }[]
}

/** A remote-tracking ref that was rewritten under us (history was force-pushed). */
export interface ForcedRefUpdate {
  /** Short form, e.g. `origin/feature`. */
  ref: string
  oldSha: string
  newSha: string
}

/** One past position of a ref, read from its reflog. */
export interface RefTip {
  sha: string
  /** Reflog selector, e.g. `origin/feature@{2}`. */
  selector: string
  /** What moved it: 'fetch: forced-update', 'rebase (finish)', 'commit'… */
  reason: string
  date: number // unix seconds
  subject: string
}

/** Whether the user has let Gitcito use the OS keychain (safeStorage). */
export type KeychainConsent = 'granted' | 'declined' | 'unset'

/** What Gitcito is about to encrypt, so the explainer can say why it asks. */
export type KeychainReason = 'tokens' | 'vault' | 'settings'

/** What a declaration is, for the semantic-diff labels. */
export type SemanticSymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'struct'
  | 'enum'
  | 'type'
  | 'module'
  | 'property'

/** One structural difference between two versions of a file. */
export interface SemanticChange {
  kind: 'added' | 'removed' | 'renamed' | 'signature' | 'moved' | 'changed'
  /** Qualified name in the new file (`Class.method`). */
  symbol: string
  /** Previous qualified name, for renames. */
  oldName?: string
  symbolKind: SemanticSymbolKind
  /** 1-based line in the new file (the old file, for removals). */
  line?: number
  /** Rename: how many times the identifier appears. Move: line delta. */
  detail?: string
  oldSignature?: string
  newSignature?: string
  /** A rename or signature change that also rewrote the body. */
  bodyChanged?: boolean
}

export interface SemanticDiff {
  /** Grammar used, or null when the file's language has none (UI stays on lines). */
  language: string | null
  changes: SemanticChange[]
  /** File too big to parse twice — no changes were computed. */
  truncated?: boolean
}

/** Which version of a file to read: a git ref, the index, or the working tree. */
export type BlobSpec = { kind: 'ref'; ref: string } | { kind: 'index' } | { kind: 'worktree' } | { kind: 'empty' }

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

/** What a drag & drop in the project tree does when the destination already has
 *  an entry with the same name: fail, trash the old one, or keep both. */
export type FsDropMode = 'error' | 'replace' | 'keepBoth'

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

/** Identity of the commit behind one side of an in-progress conflict. */
export interface ConflictRefInfo {
  /** Short sha the side points at. */
  sha: string
  /** Branch the commit belongs to, '' when it resolves to no name. */
  branch: string
  subject: string
  author: string
  /** ISO timestamp. */
  date: string
}

/** Who is being merged into whom, for the "merging X into Y" header and the
 *  per-side commit labels in the conflict editor. */
export interface ConflictContext {
  kind: ConflictOpKind
  /** Incoming side — the branch/commit being merged, rebased or picked. */
  source: string
  /** Receiving side — the branch the operation lands on. */
  target: string
  /** Stage 2 (`--ours`) commit: HEAD, i.e. the branch you are on. */
  ours: ConflictRefInfo | null
  /** Stage 3 (`--theirs`) commit: MERGE_HEAD / REBASE_HEAD / CHERRY_PICK_HEAD. */
  theirs: ConflictRefInfo | null
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

/** The ref-naming convention a forge uses to publish pull request heads. */
export type PrRefFlavor = 'github' | 'gitlab' | 'bitbucket' | 'azure'

/** One ref a pull request's head might live under on a given remote. */
export interface PrRefCandidate {
  flavor: PrRefFlavor
  ref: string
}

/** A pull request ref that actually exists on the remote, found by `ls-remote`. */
export interface PrRefProbe extends PrRefCandidate {
  sha: string
}

/**
 * How a previewed ref is applied locally. Neither mode writes a commit:
 * `checkout` parks the ref on a local branch, `merge` leaves the merged tree
 * staged but uncommitted so it can be tested and then thrown away.
 */
export type PrPreviewMode = 'checkout' | 'merge'

export interface PrPreviewResult {
  ref: string
  sha: string
  mode: PrPreviewMode
  /** Set for `checkout` — the local branch the ref was fetched into. */
  localBranch?: string
  /** Paths left conflicted by a `merge` preview; empty when it applied cleanly. */
  conflicts: string[]
}

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

/** The authenticated identity behind a connected integration token. */
/** An organization/group/workspace the connected account belongs to. */
export interface ConnectedOrg {
  login: string
  avatarUrl?: string
  url?: string
}

export interface ConnectedAccount {
  login: string // username/handle
  name?: string // display name, if different from login
  avatarUrl?: string
  profileUrl?: string // link to the provider's profile page
  orgs?: ConnectedOrg[] // organizations/workspaces/groups the account belongs to
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
  /** Explain the token under the cursor in the file viewer. Defaults to on. */
  hoverExplain?: boolean
  /** Key held while pointing to trigger it. Defaults to Shift. */
  hoverExplainKey?: HoverModifier
}

/** One source excerpt used to ground an answer in the repository. */
export interface RepoChatSource {
  /** Opaque identifier assigned by the main process (for example, E1). */
  id: string
  /** Repo-relative path selected from Git's tracked-file allow-list. */
  path: string
  startLine: number
  endLine: number
}

/** A serializable chat turn. The renderer keeps UI-only ids outside this type. */
export interface RepoChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Present only on grounded assistant replies. */
  sources?: RepoChatSource[]
}

/** Read-only answer returned by the repository-chat IPC handler. */
export interface RepoChatReply {
  content: string
  sources: RepoChatSource[]
}

/** Co-author trailer appended when AIConfig.coAuthor is enabled (default on). */
export const MYAPPDESK_COAUTHOR = 'MyAppDesk <team@myappdesk.dev>'

// ─── Generated repo wiki ────────────────────────────────────────────────────

/** Share of the codebase written in one language, counted by bytes. */
export interface LanguageStat {
  language: string
  bytes: number
  files: number
  /** 0–1, of the code counted (config and docs excluded). */
  share: number
}

/** A dependency exactly as a manifest declares it. */
export interface DependencyRef {
  name: string
  version: string
  dev: boolean
}

/** Counted facts about a repo — no model involved. */
export interface RepoFacts {
  languages: LanguageStat[]
  totalBytes: number
  manifests: string[]
  dependencies: DependencyRef[]
}

/** One folder in the import graph. */
export interface ImportNode {
  id: string
  files: number
  /** Imports this folder makes into other folders. */
  out: number
  /** Imports other folders make into this one. */
  in: number
}

export interface ImportEdge {
  from: string
  to: string
  count: number
}

/** Folder-level import graph, read from the source with no model involved. */
export interface ImportGraph {
  nodes: ImportNode[]
  edges: ImportEdge[]
  depth: number
  /** Imports that pointed at a file in this repo. */
  resolved: number
  /** Imports that pointed outside it (packages, stdlib). */
  external: number
  omittedEdges: number
}

/** One dependency, placed and explained by the model. */
export interface TechItem {
  dep: string
  role: string
}

export interface TechGroup {
  name: string
  items: TechItem[]
}

/** The model's reading of the declared dependencies. */
export interface TechStack {
  summary: string
  groups: TechGroup[]
}

export type WikiArchetype = 'overview' | 'module' | 'workflow' | 'reference'

/** One planned page: what it covers, before anything has been written. */
export interface WikiPagePlan {
  slug: string
  title: string
  archetype: WikiArchetype
  /** Repo-relative files this page is about. */
  scopePaths: string[]
}

export interface WikiPlan {
  pages: WikiPagePlan[]
}

/** One statement, with the files that back it up. */
export interface WikiClaim {
  text: string
  sourcePaths: string[]
}

export interface WikiSection {
  heading: string
  claims: WikiClaim[]
}

export interface WikiPage {
  slug: string
  title: string
  archetype: WikiArchetype
  summary: string
  sections: WikiSection[]
  /** Slugs of other pages in the same wiki. */
  related: string[]
  /** Rendered by the app from the sections above. */
  markdown: string
}

/** A generated wiki for one repository, as stored on disk. */
export interface RepoWiki {
  headSha: string
  generatedAt: number
  model: string
  promptVersion: string
  pages: WikiPage[]
  /** The model's grouping of the dependencies the manifests declare. */
  stack: TechStack | null
}

/** Progress pushed while a wiki is being generated. */
export type WikiProgress =
  | { phase: 'planning' }
  | { phase: 'page'; slug: string; title: string; done: number; total: number }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

/** Key that must be held for hover-to-explain to fire. */
export type HoverModifier = 'shift' | 'alt' | 'ctrl' | 'meta' | 'none'

/** One line of source as the viewer shows it, with its real file line number. */
export interface NumberedLine {
  no: number
  text: string
}

/** What the hover explainer needs to answer about one token. */
export interface HoverExplainRequest {
  path: string
  lang: string
  token: string
  line: number
  lines: NumberedLine[]
}

/** A short explanation of a hovered token, citing lines from the window it saw. */
export interface HoverExplainResult {
  summary: string
  bullets: string[]
  lines: number[]
  startLine: number
  endLine: number
}

/** One AI PR-review finding, anchored to a real hunk of the reviewed diff. */
export interface PRReviewFinding {
  kind: 'risk' | 'suggestion'
  severity: 'high' | 'medium' | 'low'
  path: string
  line: number
  claim: string
  suggestion: string
}

export interface PRReviewResult {
  summary: string
  /** Findings rendered as markdown, kept for plain-text consumers. */
  risks: string
  suggestions: string
  findings: PRReviewFinding[]
}

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

/** One file touched by a commit, with numstat line counts ("-" for binary counted as 0). */
export interface CosmosFileTouch {
  path: string
  added: number
  removed: number
}

/** Per-commit record for the 3D repo-history visualization ("RepoCosmos" easter egg). */
export interface CosmosCommit {
  hash: string
  parents: string[]
  authorName: string
  authorEmail: string
  timestamp: number // unix seconds
  subject: string
  files: CosmosFileTouch[] // empty for merge commits
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

// ─── Secure share (.gitcito bundles) ─────────────────────────────────────────

/** A repo file offered in the secure-share export picker. */
export interface SecureShareCandidate {
  path: string // relative to the repo root, forward slashes
  size: number
  secret: boolean // matches the secret-file heuristics — preselected in the UI
}

/** Plaintext envelope of a .gitcito bundle, readable without the password. A v1
 *  bundle carries a single repo's files (project/fileCount only); a v2 bundle
 *  carries N sections (repos + the global vault) summarised in `sections`. */
export interface SecureBundleHeader {
  project: string
  createdAt: number
  fileCount: number // total repo files across all sections (0 for a vault-only bundle)
  version?: number // 1 = legacy single-repo, 2 = multi-section
  sections?: SecureBundleSectionSummary[] // present on v2 — one entry per tab
}

/** Per-section summary in a v2 envelope, readable before the password is entered
 *  (so the import UI can show tabs and match repos). No secret values here. */
export type SecureBundleSectionSummary =
  | { kind: 'repo'; project: string; folder: string; remote?: string; fileCount: number }
  | { kind: 'vault'; entryCount: number }

/** A decrypted v2 bundle, sanitised for the renderer: file lists and vault keys,
 *  but never file contents or secret values (those stay in the main process). */
export interface SecureBundleOpened {
  version: number
  sections: SecureOpenedSection[]
}

export type SecureOpenedSection =
  | {
      kind: 'repo'
      project: string
      folder: string
      remote?: string
      files: { path: string; size: number; executable?: boolean }[]
    }
  | { kind: 'vault'; entries: { key: string; note?: string }[] }

/** What the export UI asks the main process to pack. Repo file contents and
 *  vault values are read in main — the renderer only names what to include. */
export type SecureExportSpec =
  | { kind: 'repo'; repoPath: string; project: string; folder: string; remote?: string; paths: string[] }
  | { kind: 'vault' }

/** How the import UI wants each section applied. Repo sections target a chosen
 *  local repo; the vault section merges into the global vault. */
export type SecureApplyPlan =
  | { kind: 'repo'; sectionIndex: number; targetRepoPath: string; paths: string[] }
  | { kind: 'vault'; sectionIndex: number; keys: string[] }

export interface SecureApplyResult {
  filesWritten: number
  secretsWritten: number
}

/** One decrypted bundle entry, previewed before writing into the repo. */
export interface SecureSharePreviewEntry {
  path: string
  size: number
  exists: boolean // a file already sits at this path in the target repo
  safe: boolean // path cannot escape the repo (unsafe entries are never written)
}

export type SecureShareError =
  | 'invalid' // not a .gitcito bundle / malformed
  | 'bad-password' // wrong password or tampered payload (GCM auth failed)
  | 'unsupported-version' // bundle written by a newer gitcito
  | 'read-failed'
  | 'write-failed'

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

/**
 * Everything the clone dialog can ask `git clone` for beyond the URL. All of it
 * is optional: an empty object is a plain full clone of the remote's default
 * branch.
 */
export interface CloneOptions {
  /** Host the URL belongs to, for credential injection. */
  host?: RepoHost
  /** Token for that host — used for this clone only, never written to config. */
  token?: string
  /** Partial clone spec for `--filter`, e.g. `blob:none`. */
  filter?: string
  /** Shallow clone: keep only this many commits of history. */
  depth?: number
  /** Fetch only the checked-out branch. `false` alongside `depth` restores the
   *  other branches that `--depth` would otherwise drop. */
  singleBranch?: boolean
  /** Branch or tag to check out instead of the remote's default HEAD. */
  branch?: string
  /** Also clone submodules, recursively. */
  recurseSubmodules?: boolean
}

/** The three git-flow branch kinds Gitcito automates. */
export type GitflowKind = 'feature' | 'release' | 'hotfix'

/**
 * A repository's git-flow layout. Read from — and written to — the same
 * `gitflow.*` git config keys the `git flow` CLI uses, so a repo initialised by
 * either tool is understood by the other.
 */
export interface GitflowConfig {
  /** The released branch: `gitflow.branch.master`. */
  main: string
  /** The integration branch: `gitflow.branch.develop`. */
  develop: string
  featurePrefix: string
  releasePrefix: string
  hotfixPrefix: string
  /** Prepended to a release/hotfix name to form its tag, e.g. `v`. */
  versionTagPrefix: string
}

/** What the dialog needs to know about the repository right now. */
export interface GitflowStatus {
  config: GitflowConfig
  /** True when `gitflow.*` config exists — i.e. the layout is set up. */
  initialized: boolean
  /** Whether the configured branches actually exist locally. */
  hasMain: boolean
  hasDevelop: boolean
  current: string
  /** Set when the current branch is a flow branch: its kind and bare name. */
  currentFlow: { kind: GitflowKind; name: string } | null
}

/** Refs as they stood before a finish, so the whole thing can be undone. */
export interface GitflowSnapshot {
  refs: { name: string; sha: string }[]
  /** Tag created by the finish, if any. */
  tag: string | null
  /** The finished branch, recreated by an undo at this sha. */
  branch: { name: string; sha: string }
}

/** What removing a path from history would cost, measured before agreeing to it. */
export interface HistoryPurgePreview {
  /** Paths as given, echoed back. */
  paths: string[]
  /** Commits anywhere in the repository that touch them. */
  commits: number
  /** Oldest touching commit — everything after it gets a new hash. */
  firstCommit: { sha: string; subject: string; date: number } | null
  /** Branches and tags that would be rewritten. */
  branches: string[]
  tags: string[]
  /** Bytes held by the blobs at those paths, across all history. */
  bytes: number
  /** Why the rewrite cannot start right now — empty when it can. */
  blocked: string
}

/** A path that exists somewhere in history, with what it costs to keep it. */
export interface HistoryPathEntry {
  path: string
  /** Bytes held by every version of it, across all history. */
  bytes: number
  /** How many distinct blobs — i.e. how often it changed. */
  versions: number
  /** True when the path is no longer in the working tree's index. */
  deleted: boolean
}

/** A safety copy of every ref as it stood before a purge. */
export interface HistoryPurgeBackup {
  /** `refs/gitcito/pre-purge/<timestamp>`. */
  prefix: string
  /** Epoch seconds, the timestamp in the prefix. */
  at: number
  /** How many refs it holds. */
  refs: number
  /** The paths that were purged, recorded alongside for the UI. */
  paths: string[]
}

export interface HistoryPurgeResult {
  backup: HistoryPurgeBackup
  /** Refs the rewrite actually changed. */
  rewritten: number
}

/** Outcome of pushing to one remote, when several were asked for at once. */
export interface PushRemoteResult {
  remote: string
  ok: boolean
  /** git's message when `ok` is false. */
  error: string
}

/**
 * A directory in this repository whose contents came from another repository via
 * `git subtree`. Unlike a submodule there is no `.gitmodules` to read: git
 * records only a `git-subtree-dir:` trailer on the commit that did the import,
 * so the url and ref are remembered by Gitcito unless the user supplies them.
 */
export interface SubtreeInfo {
  /** Directory inside this repo, e.g. `vendor/parser`. */
  prefix: string
  /** Source repository, when known. */
  url: string
  /** Branch or tag pulled from, when known. */
  ref: string
  /** True when the prefix still exists in the working tree. */
  present: boolean
  /** Sha of the upstream commit last imported, from the subtree trailer. */
  lastSplit: string
}

/** One `refs/replace/*` entry: git shows the replacement wherever the original is asked for. */
export interface ReplaceRef {
  original: string
  originalSubject: string
  replacement: string
  replacementSubject: string
  /** Parents of the replacement commit — a graft's whole point is changing these. */
  replacementParents: string[]
}

/** The state of object replacement in a repository. */
export interface ReplaceStatus {
  refs: ReplaceRef[]
  /** `core.useReplaceRefs` — false means git ignores every replacement here. */
  enabled: boolean
}

/** One configured `credential.helper`, and whether it can actually run. */
export interface CredentialHelperInfo {
  /** The value as git stores it: `osxkeychain`, `store`, `!gh auth git-credential`… */
  value: string
  scope: 'system' | 'global' | 'repo'
  /** True when the helper program exists — a typo here is invisible until a push fails. */
  available: boolean
  /** The `store` helper: passwords in a plain file, readable by anything you run. */
  plaintext: boolean
}

/** A `credential.<url>.*` section: rules that apply to one host or repository. */
export interface CredentialUrlRule {
  url: string
  helper: string
  username: string
  scope: 'system' | 'global' | 'repo'
}

/** A helper this platform could use, and whether it is installed. */
export interface CredentialCandidate {
  name: string
  available: boolean
  /** True for the one that fits this OS best. */
  recommended: boolean
}

/** Everything about how git will answer the next password prompt. */
export interface CredentialStatus {
  helpers: CredentialHelperInfo[]
  urlRules: CredentialUrlRule[]
  candidates: CredentialCandidate[]
  /** `~/.git-credentials`, counted and never read out — it holds live passwords. */
  plaintextFile: { path: string; exists: boolean; entries: number }
  /** Hosts this repository would ask about: its `https://` remotes. */
  httpsHosts: string[]
}

/** One `.gitattributes` file found in the repository, with its raw text. */
export interface AttributeFile {
  /** Repo-relative path, or `.git/info/attributes` for the private one. */
  path: string
  content: string
  /** True for `.git/info/attributes`: local-only, never committed, never shared. */
  local: boolean
}

/** What git says actually applies to a path, after every file has had its say. */
export interface AttributeCheck {
  path: string
  /** Attribute name → value: `set`, `unset`, `unspecified`, or a string. */
  attrs: Record<string, string>
}

/** A configured `diff.<name>` driver, and whether its converter really exists. */
export interface DiffDriverInfo {
  name: string
  /** The `textconv` command, which turns a binary into text git can diff. */
  textconv: string
  /** True when the first word of the command is on PATH. */
  available: boolean
  /** Where the setting lives, so the UI can say what it would change. */
  scope: 'repo' | 'global'
}

/** A converter Gitcito knows how to wire up, if it is installed. */
export interface DiffDriverSuggestion {
  /** Driver name, used as `diff=<name>` in .gitattributes. */
  name: string
  /** File patterns it is for, e.g. `*.docx`. */
  patterns: string[]
  /** The textconv command line. */
  textconv: string
  /** The binary it needs. */
  binary: string
  available: boolean
}

/** The four kinds of thing git stores. Everything else is built from these. */
export type GitObjectKind = 'commit' | 'tree' | 'blob' | 'tag'

/** One entry of a tree object, as `git ls-tree -l` prints it. */
export interface TreeChild {
  /** Six-digit mode: 100644 file, 100755 executable, 040000 tree, 120000 symlink, 160000 gitlink. */
  mode: string
  kind: GitObjectKind
  sha: string
  name: string
  /** Blob size in bytes; null for trees and submodule gitlinks. */
  size: number | null
}

/** A raw object from the database, decoded enough to be walkable. */
export interface GitObject {
  sha: string
  kind: GitObjectKind
  /** Size of the object's content, as `git cat-file -s` reports it. */
  size: number
  /** What the caller asked for, e.g. `HEAD`, `main^{tree}`, a path. */
  rev: string
  commit?: {
    tree: string
    parents: string[]
    author: string
    committer: string
    message: string
  }
  tag?: { object: string; type: string; name: string; tagger: string; message: string }
  tree?: TreeChild[]
  blob?: {
    /** Decoded text, or null when the blob is binary. */
    text: string | null
    /** True when only the head of the blob is here. */
    truncated: boolean
  }
}

/** A ref and what it points at, for the object explorer's starting points. */
export interface RefObject {
  /** Full ref name, e.g. `refs/heads/main`, or `HEAD`. */
  name: string
  sha: string
  /** The kind of object the ref names — annotated tags point at a `tag`. */
  kind: GitObjectKind
}

/**
 * The switches that turn a painful merge into a routine one.
 *
 * Everything here maps to a documented `git merge` flag; nothing is invented.
 * The defaults (all absent) are a plain merge, which is what every existing
 * caller gets.
 */
export interface MergeOptions {
  /** `--no-ff` — always record a merge commit, even when a fast-forward would do. */
  noFf?: boolean
  /** `--ff-only` — refuse anything that is not a fast-forward. */
  ffOnly?: boolean
  /** `--squash` — take the changes, leave the history and the commit to you. */
  squash?: boolean
  /** `--no-commit` — merge and stage, but stop before committing. */
  noCommit?: boolean
  /** `-s <strategy>` — `subtree` is the one people actually need. */
  strategy?: 'ort' | 'resolve' | 'subtree' | 'octopus'
  /** `-X ours` / `-X theirs` — resolve *conflicting hunks* one way automatically. */
  favour?: 'ours' | 'theirs'
  /** `-X ignore-space-change` and friends — whitespace-only clashes stop being clashes. */
  ignoreSpace?: 'change' | 'all' | 'eol'
}

/** A commit from one side of the merge that touched the conflicted file. */
export interface ConflictCommit {
  sha: string
  subject: string
  author: string
  /** ISO date. */
  date: string
  /** Which side of the merge it came from. */
  side: 'ours' | 'theirs'
}

/**
 * What a repository is spending disk on, and what maintenance could reclaim.
 * Everything here comes from `git count-objects -v` plus a reachability walk;
 * nothing is estimated.
 */
export interface MaintenanceStats {
  /** Objects sitting on their own, one file each — how git writes them first. */
  looseObjects: number
  looseBytes: number
  /** Objects inside packfiles, where they are compressed and deltified. */
  packedObjects: number
  packs: number
  packBytes: number
  /** Loose objects already inside a pack: pure duplication until gc runs. */
  prunePackable: number
  /** Files git does not recognise under .git/objects — leftovers from a crash. */
  garbageFiles: number
  garbageBytes: number
  /** Unreachable loose objects `git prune` would drop. */
  prunable: number
  prunableBytes: number
  /** Everything under .git, which is the number people actually notice. */
  gitBytes: number
  /** When the newest packfile was written — the last time gc did real work. */
  lastPack: string | null
  /** True when `git maintenance` has this repository registered. */
  scheduled: boolean
  /** Whatever git left in .git/gc.log — an automatic gc that gave up. */
  gcLog: string
}

/** The maintenance jobs Gitcito will run, in the order they cost. */
export type MaintenanceTask = 'gc' | 'aggressive' | 'commitGraph' | 'prune'

/** Size on disk before and after a maintenance run. */
export interface MaintenanceResult {
  before: number
  after: number
  /** git's own output, so a refusal is readable rather than silent. */
  output: string
}

/** `git fsck` — is the object database internally consistent? */
export interface FsckReport {
  ok: boolean
  /** Objects nothing points at. Normal after a rebase; not damage. */
  dangling: number
  /** Objects something points at and git cannot find. This is damage. */
  missing: number
  output: string
}

/** What a bundle should hold: everything, one ref, or the commits in a range. */
export type BundleScope =
  | { kind: 'all' }
  | { kind: 'ref'; ref: string }
  | { kind: 'range'; from: string; to: string }

/** A written bundle file. */
export interface BundleResult {
  path: string
  bytes: number
  /** Refs the bundle carries — 0 would mean git wrote an empty one. */
  refs: number
}

/** One ref inside a bundle, as `git bundle list-heads` prints it. */
export interface BundleRef {
  /** Full ref name, e.g. `refs/heads/main`. */
  name: string
  sha: string
}

/** What a bundle file holds, and whether this repository can unbundle it. */
export interface BundleInfo {
  refs: BundleRef[]
  /** Commits the bundle expects the receiving repository to already have. A
   *  range bundle is worthless without them; a full one lists none. */
  prerequisites: string[]
  /** True when every prerequisite is present here. */
  usable: boolean
  /** git's own verify output — the explanation when `usable` is false. */
  message: string
}

export type ArchiveFormat = 'zip' | 'tar.gz' | 'tar'

/** A written archive file. */
export interface ArchiveResult {
  path: string
  bytes: number
}

/**
 * One removable path in a `git clean` preview — a file or a wholly untracked
 * directory, exactly as `git ls-files --others --directory` collapses it.
 */
export interface CleanEntry {
  /** Repo-relative path; a directory keeps git's trailing slash. */
  path: string
  kind: 'file' | 'dir'
  /** Matched by .gitignore. Never selected by default: usually build output,
   *  sometimes the only copy of a local .env. */
  ignored: boolean
  /** Bytes on disk — a directory is the sum of what it holds. */
  bytes: number
  /** A directory with its own .git. `git clean` refuses these; the trash does not. */
  nested: boolean
}

/** What removing untracked files would take away, before agreeing to it. */
export interface CleanPreview {
  entries: CleanEntry[]
  /** True when the scan hit its entry cap and the list is partial. */
  truncated: boolean
}

/** What a clean actually removed. */
export interface CleanResult {
  removed: number
  bytes: number
  /** True when the paths went to the OS trash rather than being deleted. */
  trashed: boolean
}

/** Whether git is memorising conflict resolutions, and how many it holds. */
export interface RerereStatus {
  /** `rerere.enabled` — resolutions are recorded and replayed. */
  enabled: boolean
  /** `rerere.autoUpdate` — a replayed resolution is staged, not just written. */
  autoUpdate: boolean
  /** True when the setting comes from this repository rather than global config. */
  perRepo: boolean
  /** Resolutions currently memorised, i.e. entries in `.git/rr-cache`. */
  recorded: number
  /** Files in the current conflict that git resolved from memory. */
  replayed: string[]
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
  /** Azure DevOps organization, used to validate the PAT and scope repo/PR lookups. */
  azureOrg?: string
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

/** A folder inside a group tab. Holds repositories (by path, referencing the
 *  group's flat `repos` list) and further folders, nested to any depth.
 *  Purely an organisation layer: membership, status and batch actions all keep
 *  reading the group's flat `repos`, so a repo filed into a folder is still an
 *  ordinary member of the group. */
export interface RepoFolder {
  id: string
  name: string
  color?: string
  collapsed?: boolean
  /** Repos held directly by this folder, in display order. */
  paths: string[]
  /** Nested folders, in display order. */
  folders: RepoFolder[]
}

/** A collection of repositories shown under one collapsible chip. Repos not
 *  claimed by any folder in `folders` render at the group root. */
export interface GroupTab extends TabBase {
  kind: 'group'
  repos: RepoRef[]
  folders?: RepoFolder[]
  activeRepoPath: string | null
  collapsed?: boolean
}

/** A non-repository "page" tab (changelog today; docs/others later).
 *  The discriminant lives on `page.type` so new page kinds slot in here
 *  without touching repo/group plumbing. */
export interface PageTab extends TabBase {
  kind: 'page'
  page: PageContent
  /**
   * The user renamed this tab, so `name` wins over the derived label.
   * Without it the label is translated at render time — otherwise a tab opened
   * in English would keep reading "Vault" after switching to Spanish.
   */
  renamed?: boolean
}

export type PageContent =
  | { type: 'changelog' }
  | { type: 'logs' }
  | { type: 'notifications' }
  | { type: 'insights'; repoPath: string }
  | { type: 'wiki'; repoPath: string }
  | { type: 'vault' }
  | { type: 'help'; page?: string }
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

/** A named saved tab layout. The active workspace mirrors the live
 *  `tabs`/`activeTabId`; switching swaps the whole tab strip in one move so
 *  users can keep separate sets (e.g. "work" vs "personal") without juggling
 *  every tab by hand. */
export interface Workspace {
  id: string
  name: string
  tabs: TabState[]
  activeTabId: string | null
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
  /** Saved tab layouts. Always has at least one ("Default"); the active one's
   *  tabs are kept in sync with the live `tabs`/`activeTabId` above. */
  workspaces: Workspace[]
  activeWorkspaceId: string
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
  /** Per-repository layout overrides (graph columns + sidebar sections), keyed
   *  by repo path. A repo with no entry inherits the global defaults. */
  repoLayouts: Record<string, RepoLayout>
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
  /** When to show a confirmation dialog before closing a repo tab, group, or
   *  repo-within-group. 'always' = every close; 'wip' = only when there are
   *  uncommitted changes or merge conflicts; 'never' = close silently. */
  warnOnClose: 'always' | 'wip' | 'never'
  /** Where the integrated terminal pane docks: full-width along the bottom
   *  (default), under the center graph column only (sidebars stay full height),
   *  or as its own right-hand column. */
  terminalPlacement: 'bottom' | 'center' | 'right'
  /** Which side the branches/files sidebar docks on. */
  sidebarSide: 'left' | 'right'
  /** Let the right details panel span the full window height instead of
   *  stopping above a full-width bottom terminal. Only affects 'bottom'
   *  terminal placement. */
  rightPanelFullHeight: boolean
  /** Parent folder of the last clone, used to pre-fill the clone dialog. */
  lastClonePath?: string
  /** User-chosen external application (e.g. VS Code) used by the "Open with <App>"
   *  action on files, folders and repositories — analogous to running `code <path>`.
   *  Undefined until the user picks one via Settings → General or onboarding. */
  defaultOpenApp?: { name: string; path: string }
  /** External editor for the "Open in <editor>" actions on repositories, files
   *  and single lines. Undefined until the user picks one in Settings → General;
   *  the menu entries stay hidden until then. */
  editor?: EditorSetting
  /** Last app version the user has seen the changelog for. Undefined until the
   *  first run that records it; used to detect upgrades. */
  lastSeenVersion?: string
  /** Version the user chose to skip via "don't show again". The new-version
   *  banner stays hidden for exactly this version; a later one shows again. */
  skippedUpdateVersion?: string
}

export type Language =
  | 'en'
  | 'es'
  | 'de'
  | 'fr'
  | 'pt-BR'
  | 'it'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'ru'
  | 'uk'
  | 'zh-CN'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'he'

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
/** How commit nodes are drawn: `normal` shows author avatars; `compact`
 *  replaces them with small dots (and stashes with a small cube). */
export type GraphNodeStyle = 'normal' | 'compact'
/**
 * How much rail topology the graph draws, chiefly how stashes are laid out:
 *   full    — each stash gets its own lane; nothing ever overlaps (richest).
 *   simple  — the previous behaviour; stashes may share lanes (more compact).
 *   minimal — stashes sit inline on their parent's lane; no extra lanes.
 */
export type GraphTopology = 'full' | 'simple' | 'minimal'

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
  /** Commit node rendering — avatars (`normal`) or dots (`compact`). */
  nodeStyle: GraphNodeStyle
  /** How much rail topology to draw (mainly stash lane strategy). */
  topology: GraphTopology
}

export function defaultGraphStyle(): GraphStyle {
  return { paletteId: 'classic', edgeStyle: 'rounded', density: 'comfortable', lineWidth: 'normal', nodeStyle: 'normal', topology: 'full' }
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

/**
 * Per-repository overrides for layout that is otherwise global. Stored in
 * AppSettings.repoLayouts keyed by repo path; any absent field falls back to
 * the corresponding global default, so a repo only stores what it customises.
 */
export interface RepoLayout {
  graphColumns?: GraphColumns
  graphColumnOrder?: GraphFlowColumnId[]
  sidebarOrder?: string[]
  sidebarHidden?: string[]
  /** Local branch names starred by the user, in the order they were pinned. */
  pinnedBranches?: string[]
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
    azureOrg: '',
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
      coAuthor: true,
      hoverExplain: true,
      hoverExplainKey: 'shift'
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
    workspaces: [{ id: 'default', name: 'Default', tabs: [], activeTabId: null }],
    activeWorkspaceId: 'default',
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
    repoLayouts: {},
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
    largeFileKb: 5120,
    warnOnClose: 'always',
    terminalPlacement: 'bottom',
    sidebarSide: 'left',
    rightPanelFullHeight: false
  }
}
