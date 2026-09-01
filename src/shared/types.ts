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

/**
 * What `checkoutRemote` found when a local branch of the same name already
 * exists. `diverged` means both sides have unique commits; `aheadOnly` means
 * the local branch has commits the remote lacks and nothing was checked out —
 * the renderer asks the user which side they meant.
 */
export interface CheckoutRemoteResult {
  diverged: boolean
  aheadOnly: boolean
  ahead: number
  behind: number
}

/** Which of git's reset modes to use when moving a branch onto another tip. */
export type ResetStrategy = 'reset-soft' | 'reset-mixed' | 'reset-hard'

/** How to reconcile a local branch with its remote tip. */
export type DivergedStrategy = 'rebase' | 'merge' | ResetStrategy

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
  mergedIntoCurrent: boolean
}

export interface RemoteBranchInfo {
  remote: string
  name: string
  fullName: string
  sha: string
  mergedIntoCurrent: boolean
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

/** Validation + metadata for editing a historical commit in place. */
export interface CommitEditInfo {
  /** Merge-free path to HEAD. Kept for UI copy — editing no longer requires it. */
  linear: boolean
  /** The commit is an ancestor of HEAD — the only hard requirement for editing. */
  ancestor: boolean
  /** Merge commits in the range, each replayed with its recorded resolutions. */
  merges: number
  /** Commits between it and HEAD that a rewrite would replay. */
  descendants: number
  /** Reachable from a remote ref — rewriting means a force push later. */
  pushed: boolean
  message: string
  authorName: string
  authorDate: string // ISO
}

/** A historical blob, loaded for in-place editing. */
export interface BlobAtCommit {
  /** null when binary or too large to edit. */
  content: string | null
  binary: boolean
  size: number
}

/** One replayed descendant in a commit-edit cascade. */
export interface CommitEditStep {
  sha: string
  subject: string
  /** blocked = never attempted because an earlier step conflicted. */
  status: 'clean' | 'conflict' | 'blocked'
  /** Conflicting paths (conflict only). */
  files: string[]
  /** A merge commit, replayed with its recorded conflict resolutions. */
  merge?: boolean
}

/** Dry-run result of rewriting a commit: the cascade forecast. */
export interface CommitEditPreview {
  /** The would-be new HEAD; null when the cascade conflicts. */
  newTip: string | null
  steps: CommitEditStep[]
}

export interface CommitEditResult {
  oldHead: string
  newTip: string
  rewritten: number
}

/** Batched git facts for the single-commit context menu (amend / undo / reset / GitHub). */
export interface CommitMenuProbe {
  isHead: boolean
  isOnLocalBranch: boolean
  /** Reachable from at least one remote-tracking branch — not tags. */
  isPublished: boolean
  isAncestorOfHead: boolean
  /** Local (unpushed) ancestor, or the first published/base ancestor of HEAD. */
  isWithinResetBoundary: boolean
  isRoot: boolean
  parentSha: string | null
  operationInProgress: boolean
  message: string
  headSha: string
  branch: string
}

/** Result of undoing HEAD — enough for the composer prefill and an undo entry. */
export interface UndoCommitResult {
  previousSha: string
  parentSha: string | null
  wasRoot: boolean
  message: string
  branch: string
}

/** One remote branch's activity as seen by the teammate radar. */
export interface TeammateRadarEntry {
  ref: string // short remote ref, e.g. origin/feature-x
  sha: string
  author: string // last committer on the branch
  time: number // unix seconds of that commit
  ahead: number // commits this branch has that HEAD does not
  filesTouched: number // files those commits change
  /** Of those files, the ones currently dirty in the local working tree. */
  overlap: string[]
  /** Predicted result of merging this branch into HEAD (merge-tree, in-memory). */
  risk: MergeRiskKind
  conflictFiles: string[]
}

/** Remote awareness computed from the last fetch — no server, no network. */
export interface TeammateRadarResult {
  entries: TeammateRadarEntry[]
  /** How many files were dirty locally when the scan ran. */
  dirtyCount: number
  scannedAt: number // unix ms
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

/**
 * Why a plain `git pull` had nothing to merge into, and which repair fits.
 * `remoteRefExists` splits the two cases apart: a branch already on the remote
 * only needs the tracking config, one that is not there yet needs a push.
 */
export interface UpstreamSuggestion {
  /** The checked-out branch that tracks nothing. */
  branch: string
  /** The remote it would track — `origin` when present, else the first one. */
  remote: string
  remoteRefExists: boolean
}

/**
 * A `*.lock` file still sitting inside the git directory. Git takes one for the
 * duration of a write and removes it on the way out; one that outlives the
 * process that made it (a crash, a killed terminal, a network share that lost
 * the file handle) blocks every later write with "File exists" until someone
 * deletes it by hand.
 */
export interface GitLockFile {
  /** Path relative to the git directory: `index.lock`, `refs/remotes/origin/x.lock`. */
  path: string
  /** Seconds since the file was last touched — a young lock is a live git process. */
  ageSeconds: number
  /** What the lock guards, for copy that does not require reading git internals. */
  kind: 'index' | 'ref' | 'config' | 'other'
}

/**
 * A native GitHub stack, once the chain has been registered as one. Chaining
 * the bases is what every host understands; this is the extra GitHub gives on
 * top — the stack map in its UI, the server-side cascading rebase, and one
 * merge that lands the levels below.
 */
export interface GithubStackInfo {
  /** The stack's own number on GitHub. */
  number: number
  url?: string
  /** How many levels this submit put into it. */
  added: number
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
  /** GitHub's own stack number, when this PR belongs to a native stack. */
  stackNumber?: number
  /** Where it stands. Absent means open — the state a plain list implies. */
  state?: 'open' | 'closed' | 'merged'
  /** The head commit, so its checks can be looked up. */
  headSha?: string
  /** Rolled-up state of the head commit's checks, when they were read. */
  ci?: CiState
  /** "2 passed · 1 failing", for the row's tooltip. */
  ciSummary?: string
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
  diffHunk: string // the surrounding diff context (GitHub only; empty on GitLab)
  /** Reply target: GitHub root comment id, or GitLab discussion id. */
  rootId: number | string
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

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'ollama'
  | 'cli'
  | 'custom'

/**
 * The wire protocol a provider speaks. Most vendors expose an OpenAI-compatible
 * surface — Google's `/v1beta/openai` and Ollama's `/v1` included — so they all
 * share one client. Anthropic does not: it serves `POST /v1/messages` with a
 * separate system field and a required `max_tokens`, which is why pointing the
 * OpenAI client at api.anthropic.com never worked.
 */
export type AITransport = 'openai' | 'anthropic' | 'cli'

/** A locally installed agent CLI that answers using its own signed-in session. */
export type AICliBinary = 'claude' | 'gemini' | 'codex'

export interface AIProviderPreset {
  id: AIProvider
  label: string
  endpoint: string
  defaultModel: string
  needsKey: boolean
  transport: AITransport
  /** Offline fallback, used only until a live model list has been fetched. */
  models: string[]
  /** Where this provider's key is issued, shown next to the key field. */
  keyUrl?: string
}

/**
 * Built-in providers. `models` here is a *fallback* only — the live catalogue
 * (main/aiModels.ts) is what the pickers show once a list has been fetched, so
 * a stale entry below never strands a user on an outdated model.
 */
export const AI_PROVIDERS: AIProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    transport: 'openai',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com',
    defaultModel: 'claude-haiku-4-5-20251001',
    needsKey: true,
    transport: 'anthropic',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5']
  },
  {
    id: 'google',
    label: 'Google Gemini',
    // Google's OpenAI-compatible surface, so it shares the OpenAI client.
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    needsKey: true,
    transport: 'openai',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    needsKey: true,
    transport: 'openai',
    keyUrl: 'https://openrouter.ai/keys',
    models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-haiku', 'anthropic/claude-3.5-sonnet']
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    needsKey: true,
    transport: 'openai',
    keyUrl: 'https://console.groq.com/keys',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  {
    id: 'mistral',
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    needsKey: true,
    transport: 'openai',
    keyUrl: 'https://console.mistral.ai/api-keys',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'codestral-latest']
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    needsKey: false,
    transport: 'openai',
    models: ['llama3.2', 'llama3.1', 'qwen2.5-coder', 'codellama', 'mistral']
  },
  {
    id: 'cli',
    label: 'Local CLI (subscription)',
    endpoint: '',
    defaultModel: '',
    needsKey: false,
    transport: 'cli',
    models: []
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    endpoint: '',
    defaultModel: '',
    needsKey: false,
    transport: 'openai',
    models: []
  }
]

export function aiProviderPreset(id: AIProvider): AIProviderPreset {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[AI_PROVIDERS.length - 1]
}

/**
 * One configured way of reaching a model: a provider, where to reach it, and
 * how it authenticates. Several can coexist — an OpenAI key for work, a
 * personal Anthropic key, a local Ollama, a signed-in CLI — and each AI feature
 * points at whichever one the user chose.
 *
 * `apiKey` is stripped from the settings JSON and stored encrypted, exactly as
 * the single key used to be (shared/secrets.ts).
 */
export interface AIAccount {
  id: string
  /** User-chosen name. Falls back to the provider label when left empty. */
  label: string
  provider: AIProvider
  /** Overrides the preset endpoint. Empty means "use the preset". */
  endpoint: string
  apiKey: string
  /** `cli` accounts only: which installed binary answers. */
  cli?: AICliBinary
  /** `cli` accounts only: an explicit path, when the binary is not on PATH. */
  cliPath?: string
  /** Used by any feature that has no assignment of its own. */
  model: string
}

/**
 * The AI surfaces a user can point at a different account or model. Coarser
 * than the internal call sites on purpose: nobody wants to configure sixteen
 * dropdowns, but "cheap model for commit messages, strong one for chat" is a
 * real need.
 */
export type AIFeature = 'commit' | 'chat' | 'explain' | 'review' | 'conflict' | 'wiki' | 'theme'

export const AI_FEATURES: AIFeature[] = ['commit', 'chat', 'explain', 'review', 'conflict', 'wiki', 'theme']

/** Which account and model serve one feature. An absent model means "the account's default". */
export interface AIAssignment {
  accountId: string
  model: string
}

/**
 * A model list as the app currently knows it. `source` is what lets the UI be
 * honest: a fallback list is the bundled guess, not what the provider offers.
 */
export interface ModelCatalog {
  /** What a picker shows: chat-capable, snapshots collapsed, newest first. */
  models: string[]
  /** Every id the provider listed, for the picker's "show all" escape. */
  allModels?: string[]
  source: 'live' | 'cache' | 'fallback'
  /** Epoch ms of the fetch behind this list, or null when it never happened. */
  fetchedAt: number | null
  /** Why the list is not live. Present with `cache` and `fallback`. */
  error?: string
}

/** One agent CLI found on the machine, offered when configuring a CLI account. */
export interface DetectedCli {
  binary: AICliBinary
  label: string
  path: string
}

export interface AIConfig {
  enabled: boolean
  /**
   * Every configured account. Populated by `migrateAIConfig` for installs that
   * predate accounts, so it is never empty in practice.
   */
  accounts: AIAccount[]
  /** The account used by any feature without its own assignment. */
  defaultAccountId: string
  /** Per-feature account + model overrides. */
  assignments: Partial<Record<AIFeature, AIAssignment>>
  /**
   * The four fields below are the *resolved* connection for one call. They stay
   * on `AIConfig` because every main-process feature function already reads
   * them: the renderer picks an account with `resolveAI(ai, feature)` and hands
   * the result over IPC, so nothing downstream had to learn about accounts.
   * On a stored config they mirror the default account.
   */
  provider: AIProvider
  endpoint: string
  apiKey: string
  model: string
  /** Which account `provider`/`endpoint`/`apiKey`/`model` came from. */
  accountId?: string
  /** Resolved from the provider preset; lets main pick a client without a lookup. */
  transport?: AITransport
  /** `cli` transport only. */
  cli?: AICliBinary
  cliPath?: string
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
  /** Repository chat. Defaults to on — but the whole surface hides with `enabled`. */
  repoChat?: boolean
  /** Model for chat only. Empty falls back to `model`. */
  repoChatModel?: string
  /** Answer from committed content only — no working-tree edits leave the
   *  machine, and uncommitted diffs are never sent. Defaults to off. */
  repoChatCommittedOnly?: boolean
  /** Chat may propose repo actions (the "Ask" action set) for the user to run.
   *  Defaults to on — proposals still never execute without the rules below. */
  repoChatActions?: boolean
  /** Prevent chat from proposing file creation, edits, replacement, or deletion.
   *  Git actions remain available. Defaults to on. */
  repoChatReadOnly?: boolean
  /** Chat may propose actions that leave the machine — fetch, pull, push,
   *  opening a pull request, submitting a stack. Defaults to off: publishing
   *  work is a decision the user opts into, not a default of the assistant. */
  repoChatRemoteActions?: boolean
  /** How chat-proposed actions run. Destructive actions always confirm,
   *  whatever the mode says. Defaults to 'ask'. */
  repoChatApproval?: ChatActionApproval
}

/**
 * Approval policy for actions proposed in repository chat, mirroring the
 * "always ask / pre-approved / allow all" ladder of editor AI assistants:
 * - 'ask': every proposal waits for a click on the card.
 * - 'auto-safe': proposals run on arrival when every action is reversible
 *   bookkeeping (stage, unstage, gitignore, branch, tag); anything else asks.
 * - 'auto-all': proposals run on arrival unless one is destructive — a
 *   destructive action always falls back to an explicit confirm.
 */
export type ChatActionApproval = 'ask' | 'auto-safe' | 'auto-all'

/** One source excerpt used to ground an answer in the repository. */
export interface RepoChatSource {
  /** Opaque identifier assigned by the main process (for example, E1). */
  id: string
  /** Repo-relative path selected from Git's tracked-file allow-list. */
  path: string
  startLine: number
  endLine: number
  /** A file pinned from outside the repository — `path` is absolute and the
   *  repository file viewer cannot open it. */
  external?: boolean
}

/** A serializable chat turn. The renderer keeps UI-only ids outside this type. */
export interface RepoChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Present only on grounded assistant replies. */
  sources?: RepoChatSource[]
}

/**
 * A context item the user pinned to a chat turn — a file, a commit, or a file
 * from outside the repository. Pinned context is read before the model gets to
 * pick anything, so an explicit choice always survives the context budget.
 */
export type RepoChatAttachment =
  | { kind: 'file'; path: string }
  | { kind: 'commit'; hash: string }
  | { kind: 'external'; path: string }

/** Why a pinned item never reached the provider. Rendered from a key, not text. */
export type RepoChatSkipReason = 'secret' | 'binary' | 'tooLarge' | 'unreadable'

export interface RepoChatSkipped {
  /** What the user pinned, as they saw it in the chip. */
  label: string
  reason: RepoChatSkipReason
}

/** Answer returned by the repository-chat IPC handler. */
export interface RepoChatReply {
  content: string
  sources: RepoChatSource[]
  /** Pinned context that was refused, so the panel can say so instead of lying. */
  skipped: RepoChatSkipped[]
  /** Validated repo actions the model proposed. Never executed in main — the
   *  renderer renders them as a card and runs them only under the approval
   *  policy. Absent when the chat-actions setting is off. */
  actions?: RepoChatAction[]
}

/** Co-author trailer appended when AIConfig.coAuthor is enabled (default on). */
export const MYAPPDESK_COAUTHOR = 'MyAppDesk <team@myappdesk.dev>'

/** Error-message marker thrown by `fileContent`/`fileDataUrl` when a file
 *  exceeds the in-memory size cap. The byte count follows the colon; the
 *  renderer parses it to show the size and offer "load anyway" (force=true). */
export const FILE_TOO_LARGE_PREFIX = 'GITCITO_FILE_TOO_LARGE:'

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
  | { type: 'fetch'; remote?: string; description: string }
  | { type: 'pull'; mode?: 'default' | 'ff-only' | 'rebase'; description: string }
  /** Never carries a force flag — a rewrite of published history is not
   *  something a model may propose. */
  | { type: 'push'; branch?: string; remote?: string; description: string }
  | { type: 'merge'; ref: string; noFf?: boolean; description: string }
  | { type: 'rebase'; onto: string; description: string }
  | { type: 'revert'; hashes: string[]; description: string }
  | { type: 'cherry_pick'; hashes: string[]; description: string }
  | {
      type: 'open_pr'
      title: string
      body?: string
      /** Defaults to the checked-out branch. */
      source?: string
      target: string
      draft?: boolean
      description: string
    }
  /** Push every level of a stack and open or retarget one pull request each,
   *  the same run the Stack modal's Submit performs. GitHub only. */
  | { type: 'stack_submit'; leaf?: string; description: string }

/** A provider-portable repository file mutation proposed by repository chat. */
export type RepoChatFileAction =
  | {
      type: 'edit_file'
      path: string
      oldText: string
      newText: string
      replaceAll?: boolean
      description: string
    }
  | {
      type: 'write_file'
      path: string
      content: string
      mode: 'create' | 'replace'
      description: string
    }
  | { type: 'delete_file'; path: string; description: string }

/** A file mutation after the main process has verified it and built its diff. */
export type PreparedRepoChatFileAction = RepoChatFileAction & {
  expectedHash: string | null
  expectedOccurrences?: number
  preview: string
}

/** Repository chat can mutate files first and then run the existing Git actions. */
export type RepoChatAction = AskAction | PreparedRepoChatFileAction

export type RepoChatActionErrorCode =
  | 'unsafe_path'
  | 'git_internal_path'
  | 'symlink_path'
  | 'secret_file'
  | 'ignored_path'
  | 'generated_path'
  | 'binary_file'
  | 'file_too_large'
  | 'batch_too_large'
  | 'evidence_required'
  | 'incomplete_evidence'
  | 'not_found'
  | 'already_exists'
  | 'stale_file'
  | 'old_text_missing'
  | 'ambiguous_edit'
  | 'no_staged_changes'
  | 'hook_failed'
  | 'rollback_failed'
  | 'unknown'

export type RepoFileBatchResult =
  | { ok: true; applied: number }
  | {
      ok: false
      error: { code: RepoChatActionErrorCode; detail?: string; paths?: string[] }
    }

export interface RepoChatExecutionResult {
  applied: number
  failedIndex?: number
  failedType?: RepoChatAction['type']
  error?: { code: RepoChatActionErrorCode; detail?: string; paths?: string[] }
  remaining: number
  actionResults: Array<{
    index: number
    type: RepoChatAction['type']
    status: 'done' | 'failed' | 'skipped'
  }>
  /** Guard snapshot taken before the plan ran, when it could touch the working
   *  tree. What the card's "Undo" restores. */
  snapshot?: { sha: string; head: string }
  /** Pull requests the plan opened or retargeted — the card links them, because
   *  a PR that appears silently is indistinguishable from none. */
  prs?: Array<{ number: number; url: string; branch?: string; base?: string; action?: 'create' | 'retarget' | 'ok' }>
}

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
  /** Synthetic field (set during discovery): the compound's `stopAll` — stopping
   *  one member session stops all of them, like VS Code. */
  compoundStopAll?: boolean
  /** Watch the session's output and open a URL once the server announces it. */
  serverReadyAction?: { pattern?: string; uriFormat?: string; action?: string }
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
  /** The folder's `package.json` scripts — how the renderer sees through an
   *  `npm run dev` to the dev server it actually starts. Empty when there is
   *  no package.json. */
  scripts: Record<string, string>
}

export type LaunchStatus = 'running' | 'paused' | 'exited'

/** How eagerly the Problems dock runs the project's analyzers. */
export type AnalyzerMode = 'onOpen' | 'manual' | 'off'

/** One diagnostic from a project's own analyzer, normalised across tools. */
export type ProblemSeverity = 'error' | 'warning' | 'info'

export interface Problem {
  /** Repo-relative, forward slashes — the key the UI groups and filters on. */
  file: string
  line: number
  col: number
  severity: ProblemSeverity
  message: string
  /** The tool's own code (`TS2304`, `unused_import`, an ESLint rule id). */
  code?: string
  /** Which analyzer said so (`dart`, `tsc`, `eslint`, …). */
  source: string
}

export interface AnalyzeResult {
  problems: Problem[]
  /** Analyzers that ran, in the order they finished. */
  ran: string[]
  /** Analyzers the project asks for but the machine could not run. */
  missing: string[]
  /** True when the problem list hit its cap and was cut short. */
  truncated: boolean
  /** Wall-clock of the whole sweep, for the panel's footer. */
  ms: number
}

/**
 * One TODO-style marker found in the repository's own source, the way an editor's
 * todo tree shows them — the tag, who it was addressed to, and where it lives.
 */
export interface CodeTodo {
  /** Repo-relative, forward slashes. */
  file: string
  line: number
  /** 1-based column of the tag itself, so opening the file lands on the marker. */
  col: number
  /** Normalised upper-case tag — `todo`, `Todo` and `TODO` are one bucket. */
  tag: string
  /** Owner from `TODO(cgm)`, `TODO (cgm)` or `TODO: @cgm`, lower-cased. Absent means unassigned. */
  owner?: string
  /** The note itself, with the tag, the owner and any separator removed. */
  message: string
  /** The whole source line, trimmed — the tooltip, and what the row falls back to. */
  text: string
}

export interface TodoScanResult {
  todos: CodeTodo[]
  /** True when the scan hit its cap and was cut short. */
  truncated: boolean
  /** Wall-clock of the sweep, for the panel's footer. */
  ms: number
}

/** Where a launch config can be pointed: a handset, a simulator, this desktop. */
export type DevicePlatform = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'web' | 'other'

/** Which SDK tool reported a device — it also decides how the device is booted. */
export type DeviceSource = 'flutter' | 'flutter-emulator' | 'simctl' | 'adb' | 'avd'

export interface RunDevice {
  /** The value the runtime wants (`flutter run -d <id>`, `--udid`, `--target`). */
  id: string
  name: string
  platform: DevicePlatform
  kind: 'device' | 'simulator' | 'desktop' | 'web'
  /** Booted and able to take a run right now. */
  running: boolean
  source: DeviceSource
  /** Secondary line for the picker — an OS version, a serial. */
  detail?: string
}

export interface RunDeviceSnapshot {
  devices: RunDevice[]
  /** SDK tools that answered nothing, so the UI can explain a short list. */
  missing: string[]
}

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

/** A repo reference inside a portable workspace: matched on the receiving
 *  machine by remote URL first, folder name second — never by absolute path. */
export interface SecureWorkspaceRepo {
  name: string
  remote?: string
  folder: string
}

/** One tab of a portable workspace: a bare repo, or a group carrying repos. */
export type SecureWorkspaceTab =
  | { kind: 'repo'; repo: SecureWorkspaceRepo }
  | { kind: 'group'; name: string; color?: string; repos: SecureWorkspaceRepo[] }

/** Per-section summary in a v2 envelope, readable before the password is entered
 *  (so the import UI can show tabs and match repos). No secret values here. */
export type SecureBundleSectionSummary =
  | { kind: 'repo'; project: string; folder: string; remote?: string; fileCount: number }
  | { kind: 'vault'; entryCount: number }
  | { kind: 'workspace'; name: string; tabCount: number; repoCount: number }
  | { kind: 'notes'; folder: string; remote?: string; ref: string; noteCount: number }

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
  | { kind: 'workspace'; name: string; tabs: SecureWorkspaceTab[] }
  | { kind: 'notes'; folder: string; remote?: string; ref: string; noteCount: number }

/** What the export UI asks the main process to pack. Repo file contents, vault
 *  values and note bodies are read in main — the renderer only names what to
 *  include (and, for a workspace, hands over the already-portable tab shape). */
export type SecureExportSpec =
  | { kind: 'repo'; repoPath: string; project: string; folder: string; remote?: string; paths: string[] }
  | { kind: 'vault' }
  | { kind: 'workspace'; name: string; tabs: SecureWorkspaceTab[] }
  | { kind: 'notes'; repoPath: string; folder: string; remote?: string }

/** How the import UI wants each section applied. Repo and notes sections target
 *  a chosen local repo; the vault section merges into the global vault. A
 *  workspace section is applied by the renderer (it owns the settings store). */
export type SecureApplyPlan =
  | { kind: 'repo'; sectionIndex: number; targetRepoPath: string; paths: string[] }
  | { kind: 'vault'; sectionIndex: number; keys: string[] }
  | { kind: 'notes'; sectionIndex: number; targetRepoPath: string; overwrite: boolean }

export interface SecureApplyResult {
  filesWritten: number
  secretsWritten: number
  notesWritten: number
  /** Notes not applied: the commit is absent locally, or a differing note existed and overwrite was off. */
  notesSkipped: number
}

/** Preview of one bundled note against a chosen target repo. */
export interface SecureNotePreviewEntry {
  sha: string
  /** The annotated commit exists in the target repo. */
  commitExists: boolean
  /** 'new' = no local note; 'same' = identical note; 'different' = would need overwrite. */
  state: 'new' | 'same' | 'different'
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

/** What triggered a WIP snapshot. */
export type SnapshotKind = 'auto' | 'manual' | 'guard'

/** A saved WIP snapshot (a commit of the whole working tree kept under refs/gitcito/wip). */
export interface SnapshotInfo {
  ref: string // full ref name (refs/gitcito/wip/<ts>-<a|m|g>)
  sha: string
  time: number // unix seconds
  files: number // changed files captured
  kind: SnapshotKind // timer, user action, or pre-destructive guard
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
  /** The binary it needs ('' when Gitcito ships the converter itself). */
  binary: string
  /** True when the converter is the one Gitcito ships — nothing to install. */
  bundled?: boolean
  available: boolean
}

/** A configured `filter.<name>` clean/smudge driver. */
export interface FilterDriverInfo {
  name: string
  /** Command run on staging (working tree → repository). '' when unset. */
  clean: string
  /** Command run on checkout (repository → working tree). '' when unset. */
  smudge: string
  /** With `required`, a failing filter aborts the operation instead of passing bytes through. */
  required: boolean
  scope: 'repo' | 'global'
  cleanAvailable: boolean
  smudgeAvailable: boolean
}

/** One file's outcome in a filter dry run. */
export interface FilterDryRunFile {
  file: string
  /** The clean command ran and exited 0. */
  ok: boolean
  error?: string
  /** Whether smudge(clean(file)) reproduced the original bytes. */
  roundtrip: 'ok' | 'different' | 'skipped'
  /** The first bytes of the cleaned output, so the user sees what git would store. */
  preview: string
}

/** A filter dry run: how many files the pattern matches, and what happened to the sample. */
export interface FilterDryRunResult {
  matched: number
  tested: FilterDryRunFile[]
}

/** What `filter.<name>` held before setFilterDriver overwrote it — the undo payload. */
export interface FilterDriverPrevious {
  clean: string
  smudge: string
  required: boolean
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
  /**
   * Repo-scoped pages opened *inside* this tab — DevTools, the wiki, insights.
   * They ride on the tab as small icons instead of claiming a tab of their own:
   * they belong to this repository and are meaningless without it.
   */
  pages?: PageContent[]
  /** Index into `pages` that is showing, or null for the repository itself. */
  activePage?: number | null
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
  /** Same as `RepoTab.pages`: repo-scoped pages opened inside this tab. They
   *  are drawn on the chip of the repository they belong to, and only while
   *  that repository is the selected one. */
  pages?: PageContent[]
  activePage?: number | null
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
  | { type: 'licenses' }
  // Flutter DevTools, embedded. `url` is the address at the time the tab was
  // opened; while the session lives, the live one from the store wins, so a
  // hot restart's new address follows without reopening the tab.
  | { type: 'devtools'; repoPath: string; launchId: number; url: string; label: string; tool: string }
  | { type: 'release'; release: ReleaseInfo; repoPath: string }
  | { type: 'issue'; issue: IssueInfo; repoPath: string; remoteUrl: string }
  | { type: 'milestone'; milestone: MilestoneInfo; repoPath: string; remoteUrl: string }

/** One dependency's licence, collected at build time by scripts/gen-licenses.mjs.
 *  `text` is null when the package ships an SPDX id but no licence file. */
export interface DependencyLicense {
  name: string
  version: string
  license: string
  homepage: string | null
  text: string | null
}

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
  /** Version already downloaded and staged on disk, if any. Survives a later
   *  check finding something newer — that is what lets the UI say "restart
   *  installs v1, but v2 is out" instead of silently installing the old one. */
  staged: string | null
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
  /**
   * Display aliases keyed by canonical repository path. An alias changes only
   * the name Gitcito shows — it never renames or moves the directory on disk.
   * Path-keyed (not stored on RepoRef) so the same repo across tabs, groups and
   * workspaces cannot diverge.
   */
  repoAliases: Record<string, string>
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
  /** Idle motion on the title-bar profile avatar. The pose it holds still
   *  follows the working tree either way; this only stops it moving. */
  avatarMotion: boolean
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
  /** Per-repository todo lists, keyed by canonical repo path. Absent for a
   *  repository nobody has written a todo for. */
  repoTodos?: Record<string, RepoTodo[]>
  /** Bookmarked places in the code, per repository. */
  repoBookmarks?: Record<string, RepoBookmark[]>
  /**
   * When the Problems dock is allowed to run the project's analyzers. They are
   * the repository's own toolchain — `tsc`, `eslint`, `cargo clippy` — so this
   * is about how much of your machine Gitcito may spend without being asked.
   *
   * `onOpen` sweeps when the dock is opened with nothing to show (the default),
   * `manual` only ever sweeps on the refresh button, and `off` hides the
   * analyzer half of the dock altogether.
   */
  analyzerMode?: AnalyzerMode
  /** Hide ticked todos in the sidebar section and the todo list. The entries
   *  are kept — only the display drops them. */
  todosHideDone: boolean
  /** Order todos by hand — the list keeps the order the user dragged or
   *  arrowed it into, instead of sorting by priority then age. Flipped on by
   *  the first reorder, so nobody has to find the switch first. */
  todosManualOrder?: boolean
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
  /**
   * Whether the one-time "AI settings moved to accounts" notice has been shown.
   * Set once the user dismisses it, so an upgrade explains itself exactly once.
   */
  aiAccountsNoticeSeen?: boolean
  /** Auto-open the changelog page tab after the app updates to a new version. */
  autoOpenChangelog: boolean
  /** Minutes between automatic WIP snapshots (0 = off). */
  wipSnapshotMinutes: number
  /** Take a WIP snapshot automatically before destructive operations
   *  (discard, clean, hard reset, restore from commit). */
  snapshotGuard: boolean
  /** Local CI via `act` (optional integration; needs act + Docker installed). */
  localCiEnabled: boolean
  /** Mask secret values (KEY=••••) in .env/key files in the diff & file viewer. */
  maskSecrets: boolean
  /** File view (working-tree files only): a colored bar next to lines changed
   *  since HEAD/the index, click to see the change. */
  showChangeGutter: boolean
  /** File view: a VS Code-style scaled overview of the whole file, floating
   *  at the right edge of the viewer. */
  showMinimap: boolean
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
/**
 * Which slice of history the graph draws. Orthogonal to topology — this drops
 * rows, topology only changes how the remaining ones are railed.
 *   all        — every commit the log returned.
 *   linear     — HEAD's first-parent chain only; merged-in work disappears.
 *   hideMerged — the trunk plus branches that are still unmerged; anything
 *                that only exists on the far side of a finished merge goes.
 *   solo       — the first-parent chains of HEAD, the starred branches and the
 *                default branch. "My branch and the ones that matter."
 */
export type GraphFocus = 'all' | 'linear' | 'hideMerged' | 'solo'

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
  /** Which commits the graph keeps. See GraphFocus. */
  focus: GraphFocus
}

export function defaultGraphStyle(): GraphStyle {
  return { paletteId: 'classic', edgeStyle: 'rounded', density: 'comfortable', lineWidth: 'normal', nodeStyle: 'normal', topology: 'full', focus: 'all' }
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

/** How loud a todo is in the list. `normal` is the unmarked default. */
export type TodoPriority = 'low' | 'normal' | 'high'

/**
 * Which board column a todo sits in. `done` is the same state as the ticked
 * checkbox — the two are kept in lockstep, so a todo can never be ticked and
 * sitting in `qa` at once.
 */
export type TodoStatus = 'todo' | 'progress' | 'blocked' | 'qa' | 'done'

/**
 * One checklist entry attached to a repository. Stored in app settings keyed by
 * canonical repo path — never written into the repository itself, so a todo
 * cannot leak into a commit, a diff or a colleague's clone.
 */
/**
 * A remembered place in the code: a file, a line, and enough of that line to
 * find it again after the file has moved on. Private to this machine and this
 * repository, like a todo — never written into the repo.
 */
export interface RepoBookmark {
  id: string
  /** Repo-relative, forward slashes. */
  file: string
  line: number
  /** Why it is worth coming back to. Optional — a place can speak for itself. */
  note?: string
  /** The line's text when it was marked. What makes relocation possible. */
  snippet: string
  /** Epoch ms. */
  createdAt: number
  /** Branch it was taken on — context, not a filter. */
  branch?: string
}

export interface RepoTodo {
  id: string
  title: string
  done: boolean
  /** Free-form detail shown when the todo is opened. */
  notes?: string
  priority: TodoPriority
  /** Epoch ms. Ordering key for todos of equal priority. */
  createdAt: number
  /** Epoch ms the box was ticked; cleared when it is unticked again. */
  doneAt?: number
  /** Branch that was checked out when it was written — context, not a filter. */
  branch?: string
  /** Board column. Absent on todos written before the board existed; read it
   *  through `todoStatus()`, which falls back to `done`. */
  status?: TodoStatus
  /** Parent todo when this is a subtask. One level only — a subtask never has
   *  children of its own, because a checklist that nests without limit is a
   *  project plan, and that belongs in an issue tracker. */
  parentId?: string
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
  /** Explicit expand/collapse choices for sidebar sections and branch folders,
   *  keyed by section id (`local`, `prs`, …) or folder key (`grp:feature`,
   *  `rgrp:origin/feature`, `tgrp:release`, `remote:origin`, `pinned`).
   *  Absent keys fall back to the section's default. */
  sidebarExpanded?: Record<string, boolean>
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

/** The account a fresh install starts with: OpenAI, no key yet. */
export function defaultAIAccount(): AIAccount {
  return {
    id: 'default',
    label: 'OpenAI',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini'
  }
}

export function defaultAIConfig(): AIConfig {
  const account = defaultAIAccount()
  return {
    enabled: true,
    accounts: [account],
    defaultAccountId: account.id,
    assignments: {},
    provider: account.provider,
    endpoint: account.endpoint,
    apiKey: '',
    model: account.model,
    accountId: account.id,
    transport: 'openai',
    commitStyle: 'auto',
    explainStyle: 'normal',
    conflictStyle: 'clean',
    branchNamingStyle: 'prefix/description',
    customInstructions: '',
    generateDescription: true,
    coAuthor: true,
    hoverExplain: true,
    hoverExplainKey: 'shift',
    repoChat: true,
    repoChatModel: '',
    repoChatCommittedOnly: false,
    repoChatActions: true,
    repoChatReadOnly: true,
    repoChatApproval: 'ask'
  }
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
    ai: defaultAIConfig()
  }
}

export function defaultSettings(): AppSettings {
  return {
    profiles: [defaultProfile()],
    activeProfileId: 'default',
    repoProfiles: {},
    repoAliases: {},
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
    avatarMotion: true,
    fileListView: 'path',
    groupBranches: true,
    graphColumns: defaultGraphColumns(),
    graphColumnOrder: defaultGraphColumnOrder(),
    graphStyle: defaultGraphStyle(),
    customGraphPalettes: [],
    repoLayouts: {},
    repoTodos: {},
    repoBookmarks: {},
    analyzerMode: 'onOpen',
    todosHideDone: true,
    todosManualOrder: false,
    autoFetchMinutes: 5,
    desktopNotifications: false,
    confirmForcePush: true,
    mergeCommit: true,
    sidebarOrder: ['local', 'todos', 'bookmarks', 'remotes', 'stashes', 'tags', 'prs', 'issues', 'milestones', 'releases', 'worktrees', 'submodules'],
    sidebarHidden: [],
    onboardingCompleted: false,
    aiAccountsNoticeSeen: false,
    autoOpenChangelog: true,
    wipSnapshotMinutes: 15,
    snapshotGuard: true,
    localCiEnabled: false,
    maskSecrets: true,
    showChangeGutter: true,
    showMinimap: true,
    enableLaunchJson: true,
    shortcuts: {},
    largeFileKb: 5120,
    warnOnClose: 'always',
    terminalPlacement: 'bottom',
    sidebarSide: 'left',
    rightPanelFullHeight: false
  }
}

// ─── .gitcito.json — the repository's own house rules ────────────────────────
//
// An optional file committed at the root of a repository. Unlike everything in
// AppSettings, it travels with the clone: whoever opens the repo inherits it.
// That is exactly why nothing in this schema can *execute* anything or *relax*
// a guard — every field is either inert data or an extra restriction. See
// docs/help/repo-config.md for the reasoning.

/** A pattern that turns a token in commit text (`ABC-123`) into a tracker link. */
export interface RepoConfigLink {
  /** JavaScript regular expression source, matched against commit text. */
  match: string
  /** Target URL. `$0` is the whole match, `$1`… the capture groups. */
  url: string
  /** Optional name of the tracker, shown in the link's tooltip. */
  label?: string
}

/** A file the repository needs but cannot track — typically a local `.env`. */
export interface RepoConfigFileReq {
  /** Repo-relative path that must exist. */
  path: string
  /** Repo-relative template to copy it from, enabling the one-click fix. */
  from?: string
  /** Why it is needed — shown verbatim in the doctor row. */
  why?: string
}

export interface RepoConfig {
  version: number
  /** Branch names or `glob*` patterns that are protected on top of the local list. */
  protect?: string[]
  links?: {
    tickets?: RepoConfigLink[]
  }
  commit?: {
    /** Allowed Conventional-Commit scopes, offered in the composer's picker. */
    scopes?: string[]
    /** Prefill the ticket key parsed out of the current branch name. */
    ticketFromBranch?: boolean
    /** Trailer lines appended on commit. `{ticket}` and `{branch}` interpolate. */
    trailers?: string[]
  }
  /** Preconditions the doctor checks when the repository is opened. */
  requires?: {
    /** Node major version or range: `20`, `20.x`, `>=20`. */
    node?: string
    submodules?: boolean
    lfs?: boolean
    /** Expected value of `core.hooksPath`, e.g. `.husky`. */
    hooksPath?: string
    files?: RepoConfigFileReq[]
  }
  checklist?: {
    /** Reminders shown once per session before the first push. */
    push?: string[]
  }
}

/** Why a field of `.gitcito.json` was rejected. Rendered from the dictionary. */
export type RepoConfigIssueCode =
  | 'json'
  | 'version'
  | 'type'
  | 'unknown'
  | 'unsafe'
  | 'regex'
  | 'url'
  | 'limit'

export interface RepoConfigIssue {
  /** Dotted path of the offending field, e.g. `links.tickets[0].url`. */
  field: string
  code: RepoConfigIssueCode
}

export interface RepoConfigResult {
  /** Absolute path of the config file, whether or not it is there. */
  path: string
  exists: boolean
  /** The validated config — null when the file is absent or unparseable. */
  config: RepoConfig | null
  /** Everything that was rejected. A file with issues still yields a config:
   *  bad fields are dropped, the rest applies. */
  issues: RepoConfigIssue[]
}

export type DoctorStatus = 'ok' | 'warn' | 'fail'

/**
 * A repair the doctor can perform. Deliberately a closed union: the config
 * supplies *data* (a path, a config value), never a command. Nothing a
 * repository ships can make Gitcito run something of its choosing.
 */
export type DoctorFix =
  | { kind: 'submodules' }
  | { kind: 'lfsPull' }
  | { kind: 'hooksPath'; value: string }
  | { kind: 'copyFile'; from: string; to: string }

export interface DoctorCheck {
  /** Stable identity for the row: `node`, `lfs`, `file:.env`… */
  id: string
  kind: 'node' | 'submodules' | 'lfs' | 'hooks' | 'file'
  status: DoctorStatus
  /** What the config asked for. */
  expected?: string
  /** What the machine actually has — absent when nothing was found at all. */
  actual?: string
  /** The repo's own explanation, from `requires.files[].why`. Untranslated. */
  why?: string
  fix?: DoctorFix
}
