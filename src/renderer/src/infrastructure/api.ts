import type {
  AskPlan,
  BlameLine,
  BranchCompareResult,
  BranchesPayload,
  BlobSpec,
  MergePreviewResult,
  SemanticDiff,
  RangeDiffEntry,
  RefTip,
  ForcedRefUpdate,
  AbsorbPlan,
  TimelapseCommit,
  RepoPulse,
  RepoDetail,
  CiStatus,
  CloneOptions,
  GitflowConfig,
  GitflowKind,
  GitflowSnapshot,
  GitflowStatus,
  HistoryPathEntry,
  HistoryPurgePreview,
  HistoryPurgeResult,
  HistoryPurgeBackup,
  CommitBranchInfo,
  ConflictContext,
  ConflictOpKind,
  ConflictSide,
  ConflictVersions,
  FileEntry,
  FileHistoryEntry,
  FsDropMode,
  GraphCommit,
  RebaseStep,
  RemoteInfo,
  PushRemoteResult,
  RepoStatus,
  RerereStatus,
  RepoSummary,
  StashInfo,
  AIConfig,
  AppSettings,
  PrPreviewMode,
  PrPreviewResult,
  PrRefProbe,
  PullRequest,
  PrDetail,
  PrReviewEvent,
  PrMergeMethod,
  IssueInfo,
  IssueDetail,
  MilestoneInfo,
  ReleaseInfo,
  HostingProvider,
  RepoHost,
  RemoteRepo,
  RemoteOwner,
  ConnectedAccount,
  CreateRepoOpts,
  CreatePrOpts,
  CreatePrResult,
  WorktreeInfo,
  SubmoduleInfo,
  SubtreeInfo,
  CleanPreview,
  CleanResult,
  ArchiveFormat,
  ArchiveResult,
  AttributeCheck,
  CredentialStatus,
  ReplaceStatus,
  AttributeFile,
  DiffDriverInfo,
  DiffDriverSuggestion,
  ConflictCommit,
  GitObject,
  RefObject,
  MergeOptions,
  FsckReport,
  MaintenanceResult,
  MaintenanceStats,
  MaintenanceTask,
  BundleInfo,
  BundleResult,
  BundleScope,
  AppThemeColors,
  CodeThemeColors,
  Analytics,
  LogEntry,
  RepoStats,
  ReflogEntry,
  BisectStatus,
  SigningConfig,
  HooksInfo,
  LfsInfo,
  SparseCheckoutInfo,
  TreeEntry,
  TreeStatusKind,
  CodeSearchHit,
  HistorySearchHit,
  GitHubNotification,
  StackInfo,
  RepoInsights,
  CosmosCommit,
  ChangelogResult,
  SnapshotInfo,
  VaultEntry,
  VaultListResult,
  VaultExport,
  InfoEntry,
  InfoExport,
  SecureShareCandidate,
  SecureBundleHeader,
  SecureSharePreviewEntry,
  SecureShareError,
  SecureExportSpec,
  SecureBundleOpened,
  SecureApplyPlan,
  SecureApplyResult,
  PRReviewResult,
  HoverExplainRequest,
  HoverExplainResult,
  ImportGraph,
  KeychainConsent,
  KeychainReason,
  RepoFacts,
  RepoWiki,
  WikiProgress
} from '../../../shared/types'
import type { EditorSetting, EditorTarget } from '../../../shared/editors'

// Typed adapter over the IPC bridge — the only place that talks to window.api.
const call = <T>(method: string, ...args: unknown[]): Promise<T> => window.api.git(method, ...args) as Promise<T>

export const gitApi = {
  open: (path: string) => call<RepoSummary>('open', path),
  log: (path: string, max?: number) => call<GraphCommit[]>('log', path, max),
  branches: (path: string) => call<BranchesPayload>('branches', path),
  status: (path: string) => call<RepoStatus>('status', path),
  stashes: (path: string) => call<StashInfo[]>('stashes', path),
  remotes: (path: string) => call<RemoteInfo[]>('remotes', path),
  addRemote: (path: string, name: string, url: string, pushUrl?: string) =>
    call<void>('addRemote', path, name, url, pushUrl),
  removeRemote: (path: string, name: string) => call<void>('removeRemote', path, name),
  editRemote: (path: string, oldName: string, newName: string, url: string, pushUrl?: string) =>
    call<void>('editRemote', path, oldName, newName, url, pushUrl),
  fetchRemote: (path: string, name: string) => call<void>('fetchRemote', path, name),
  resolvePrRef: (path: string, remote: string, number: number) =>
    call<PrRefProbe | null>('resolvePrRef', path, remote, number),
  previewRef: (path: string, remote: string, ref: string, mode: PrPreviewMode, localBranch?: string) =>
    call<PrPreviewResult>('previewRef', path, remote, ref, mode, localBranch),

  checkout: (path: string, ref: string) => call<void>('checkout', path, ref),
  checkoutRemote: (path: string, fullName: string, localName: string, remote?: string) =>
    call<{ diverged: boolean; ahead: number; behind: number }>('checkoutRemote', path, fullName, localName, remote),
  resolveDivergedCheckout: (
    path: string,
    fullName: string,
    localName: string,
    strategy: 'rebase' | 'merge' | 'reset',
    backup: boolean
  ) => call<{ backupRef?: string }>('resolveDivergedCheckout', path, fullName, localName, strategy, backup),
  createBranch: (path: string, name: string, at?: string, checkout?: boolean) =>
    call<void>('createBranch', path, name, at, checkout),
  deleteBranch: (path: string, name: string, force?: boolean) => call<void>('deleteBranch', path, name, force),
  deleteRemoteBranch: (path: string, remote: string, name: string) =>
    call<void>('deleteRemoteBranch', path, remote, name),
  stackInfo: (path: string, leaf?: string) => call<StackInfo>('stackInfo', path, leaf),
  stackSetParent: (path: string, branch: string, parent: string) =>
    call<void>('stackSetParent', path, branch, parent),
  stackClearParent: (path: string, branch: string) => call<void>('stackClearParent', path, branch),
  stackRestack: (path: string, leaf: string) => call<void>('stackRestack', path, leaf),
  renameBranch: (path: string, oldName: string, newName: string) => call<void>('renameBranch', path, oldName, newName),
  renameBranchRemote: (path: string, oldName: string, newName: string, remote: string) =>
    call<void>('renameBranchRemote', path, oldName, newName, remote),
  merge: (path: string, ref: string, options?: MergeOptions) => call<void>('merge', path, ref, options),
  /** The commits from each side that touched a conflicted file (`git log --merge`). */
  conflictCommits: (path: string, file: string) => call<ConflictCommit[]>('conflictCommits', path, file),
  mergeInto: (path: string, source: string, target: string, noFf?: boolean) =>
    call<void>('mergeInto', path, source, target, noFf),
  rebase: (path: string, onto: string) => call<void>('rebase', path, onto),
  rebaseOnto: (path: string, branch: string, onto: string) => call<void>('rebaseOnto', path, branch, onto),
  commitFixup: (path: string, targetSha: string) => call<void>('commitFixup', path, targetSha),
  autosquash: (path: string, base: string) => call<void>('autosquash', path, base),

  fetchAll: (path: string) => call<ForcedRefUpdate[]>('fetchAll', path),
  pull: (path: string, mode: 'default' | 'ff-only' | 'rebase') => call<void>('pull', path, mode),
  push: (path: string, branch: string, opts?: { force?: boolean; remote?: string }) =>
    call<void>('push', path, branch, opts),
  /** One push per remote, reported separately — one rejection does not cancel
   *  the rest. */
  pushToRemotes: (path: string, branch: string, remotes: string[], opts?: { force?: boolean; tags?: boolean }) =>
    call<PushRemoteResult[]>('pushToRemotes', path, branch, remotes, opts),
  pushAllTags: (path: string, remote?: string) => call<void>('pushAllTags', path, remote),

  cherryPickMany: (path: string, hashes: string[], noCommit?: boolean) =>
    call<void>('cherryPickMany', path, hashes, noCommit),
  squashCommits: (path: string, oldestSha: string, message: string) =>
    call<void>('squashCommits', path, oldestSha, message),
  contributors: (path: string, max?: number) =>
    call<{ name: string; email: string }[]>('contributors', path, max),
  stash: (path: string, message?: string) => call<void>('stash', path, message),
  stashPush: (path: string, message?: string, paths?: string[], keepIndex?: boolean) =>
    call<void>('stashPush', path, message, paths, keepIndex),
  stashPop: (path: string, index?: number) => call<void>('stashPop', path, index),
  stashToBranch: (path: string, branch: string, index?: number) =>
    call<void>('stashToBranch', path, branch, index),
  stashApply: (path: string, index?: number) => call<void>('stashApply', path, index),
  stashApplyOverwrite: (path: string, index?: number, pop?: boolean) =>
    call<void>('stashApplyOverwrite', path, index, pop),
  stashDrop: (path: string, index?: number) => call<void>('stashDrop', path, index),
  renameStash: (path: string, index: number, message: string) => call<void>('renameStash', path, index, message),
  stashApplyFiles: (path: string, sha: string, tracked: string[], untracked: string[]) =>
    call<void>('stashApplyFiles', path, sha, tracked, untracked),

  stage: (path: string, files: string[]) => call<void>('stage', path, files),
  stageAll: (path: string) => call<void>('stageAll', path),
  unstage: (path: string, files: string[]) => call<void>('unstage', path, files),
  unstageAll: (path: string) => call<void>('unstageAll', path),
  discard: (path: string, files: string[], untracked: boolean) => call<void>('discard', path, files, untracked),
  addToGitignore: (path: string, patterns: string[]) => call<string[]>('addToGitignore', path, patterns),
  addToGitignoreAt: (path: string, dir: string, patterns: string[]) =>
    call<string[]>('addToGitignoreAt', path, dir, patterns),
  untrack: (path: string, files: string[], deleteFromDisk?: boolean) =>
    call<void>('untrack', path, files, deleteFromDisk),

  listDir: (path: string, relDir?: string) => call<TreeEntry[]>('listDir', path, relDir),
  listDirAt: (path: string, ref: string, relDir?: string) => call<TreeEntry[]>('listDirAt', path, ref, relDir),
  timelapseData: (path: string, max?: number) => call<TimelapseCommit[]>('timelapseData', path, max),
  repoPulse: (path: string) => call<RepoPulse>('repoPulse', path),
  repoDetail: (path: string, max?: number) => call<RepoDetail>('repoDetail', path, max),
  listFiles: (path: string) => call<string[]>('listFiles', path),
  listTrackedFiles: (path: string) => call<string[]>('listTrackedFiles', path),
  filesToPush: (path: string, branch: string) => call<string[]>('filesToPush', path, branch),
  commitsTouchingPath: (path: string, target: string) =>
    call<string[]>('commitsTouchingPath', path, target),
  protectedBranches: (path: string) => call<string[]>('protectedBranches', path),
  setProtectedBranches: (path: string, branches: string[]) =>
    call<void>('setProtectedBranches', path, branches),

  /** Every path ever committed, heaviest first — the purge dialog's picker. */
  /** Whether git is memorising conflict resolutions, and what it replayed here. */
  rerereStatus: (path: string) => call<RerereStatus>('rerereStatus', path),
  setRerere: (path: string, values: { enabled?: boolean; autoUpdate?: boolean }, scope?: 'global' | 'repo') =>
    call<void>('setRerere', path, values, scope),
  rerereForget: (path: string, file: string) => call<void>('rerereForget', path, file),
  rerereClear: (path: string) => call<void>('rerereClear', path),

  /** Directories vendored in with `git subtree`, discovered from history. */
  subtrees: (path: string) => call<SubtreeInfo[]>('subtrees', path),
  subtreeAdd: (path: string, prefix: string, url: string, ref: string, squash?: boolean) =>
    call<void>('subtreeAdd', path, prefix, url, ref, squash),
  subtreePull: (path: string, prefix: string, url: string, ref: string, squash?: boolean) =>
    call<void>('subtreePull', path, prefix, url, ref, squash),
  subtreePush: (path: string, prefix: string, url: string, ref: string) =>
    call<void>('subtreePush', path, prefix, url, ref),
  subtreeSplit: (path: string, prefix: string, branch: string) =>
    call<string>('subtreeSplit', path, prefix, branch),
  subtreeForget: (path: string, prefix: string) => call<void>('subtreeForget', path, prefix),

  /** Replacement refs, and whether git is honouring them here. */
  replacements: (path: string) => call<ReplaceStatus>('replacements', path),
  replaceGraft: (path: string, commit: string, parents: string[]) =>
    call<string>('replaceGraft', path, commit, parents),
  replaceObject: (path: string, original: string, replacement: string) =>
    call<void>('replaceObject', path, original, replacement),
  replaceDelete: (path: string, original: string) => call<void>('replaceDelete', path, original),
  setUseReplaceRefs: (path: string, enabled: boolean) => call<void>('setUseReplaceRefs', path, enabled),

  /** How git will answer the next password prompt. Reads config only — never a secret. */
  credentialStatus: (path: string) => call<CredentialStatus>('credentialStatus', path),
  setCredentialHelper: (path: string, value: string, scope: 'global' | 'repo') =>
    call<void>('setCredentialHelper', path, value, scope),
  forgetCredential: (path: string, host: string) => call<void>('forgetCredential', path, host),

  /** Every .gitattributes in the repository, plus the private local one. */
  attributeFiles: (path: string) => call<AttributeFile[]>('attributeFiles', path),
  attributeWrite: (path: string, file: string, content: string) =>
    call<void>('attributeWrite', path, file, content),
  /** What git says applies to these paths, after every attributes file. */
  checkAttributes: (path: string, paths: string[]) => call<AttributeCheck[]>('checkAttributes', path, paths),
  diffDrivers: (path: string) => call<DiffDriverInfo[]>('diffDrivers', path),
  diffDriverSuggestions: (path: string) => call<DiffDriverSuggestion[]>('diffDriverSuggestions', path),
  setDiffDriver: (path: string, name: string, textconv: string, global?: boolean) =>
    call<void>('setDiffDriver', path, name, textconv, global),

  /** Every ref, plus HEAD, with the object it names — the explorer's roots. */
  objectRefs: (path: string) => call<RefObject[]>('objectRefs', path),
  /** Any revision expression, resolved and decoded. Pure inspection. */
  gitObject: (path: string, rev: string) => call<GitObject>('gitObject', path, rev),

  /** Disk usage and what maintenance could reclaim. Walks reachability — slow. */
  maintenanceStats: (path: string) => call<MaintenanceStats>('maintenanceStats', path),
  maintenanceRun: (path: string, task: MaintenanceTask) =>
    call<MaintenanceResult>('maintenanceRun', path, task),
  maintenanceSchedule: (path: string, on: boolean) => call<boolean>('maintenanceSchedule', path, on),
  fsck: (path: string) => call<FsckReport>('fsck', path),

  /** A repository, a branch or a range of commits as one file. */
  bundleCreate: (path: string, file: string, scope: BundleScope) =>
    call<BundleResult>('bundleCreate', path, file, scope),
  bundleInspect: (path: string, file: string) => call<BundleInfo>('bundleInspect', path, file),
  bundleFetch: (path: string, file: string, refs: string[]) => call<string[]>('bundleFetch', path, file, refs),
  /** One tree as a zip or tarball, honouring export-ignore. */
  archiveCreate: (
    path: string,
    file: string,
    ref: string,
    format: ArchiveFormat,
    prefix: string,
    subdir: string
  ) => call<ArchiveResult>('archiveCreate', path, file, ref, format, prefix, subdir),

  /** Untracked and ignored paths `git clean` would remove, with their sizes. */
  cleanPreview: (path: string) => call<CleanPreview>('cleanPreview', path),
  clean: (path: string, paths: string[], trash: boolean) => call<CleanResult>('clean', path, paths, trash),

  note: (path: string, sha: string) => call<string>('note', path, sha),
  /** Shas carrying a note — one cheap call, so the graph can mark them. */
  notedCommits: (path: string) => call<string[]>('notedCommits', path),
  setNote: (path: string, sha: string, text: string) => call<void>('setNote', path, sha, text),
  removeNote: (path: string, sha: string) => call<void>('removeNote', path, sha),
  fetchNotes: (path: string, remote?: string) => call<void>('fetchNotes', path, remote),
  pushNotes: (path: string, remote?: string) => call<void>('pushNotes', path, remote),

  historyPaths: (path: string, max?: number) => call<HistoryPathEntry[]>('historyPaths', path, max),
  historyPurgePreview: (path: string, paths: string[]) =>
    call<HistoryPurgePreview>('historyPurgePreview', path, paths),
  historyPurge: (path: string, paths: string[]) => call<HistoryPurgeResult>('historyPurge', path, paths),
  historyPurgeBackups: (path: string) => call<HistoryPurgeBackup[]>('historyPurgeBackups', path),
  historyPurgeRestore: (path: string, prefix: string) => call<void>('historyPurgeRestore', path, prefix),
  historyPurgeDropBackup: (path: string, prefix: string) => call<void>('historyPurgeDropBackup', path, prefix),

  gitflowStatus: (path: string) => call<GitflowStatus>('gitflowStatus', path),
  gitflowInit: (path: string, config: GitflowConfig) => call<void>('gitflowInit', path, config),
  gitflowStart: (path: string, kind: GitflowKind, name: string) =>
    call<string>('gitflowStart', path, kind, name),
  gitflowFinish: (
    path: string,
    kind: GitflowKind,
    name: string,
    opts?: { tag?: boolean; deleteBranch?: boolean; message?: string }
  ) => call<GitflowSnapshot>('gitflowFinish', path, kind, name, opts),
  gitflowUndo: (path: string, snapshot: GitflowSnapshot) => call<void>('gitflowUndo', path, snapshot),
  fileSizes: (path: string, files: string[]) =>
    call<Record<string, { size: number; binary: boolean }>>('fileSizes', path, files),
  treeStatus: (path: string) => call<Record<string, TreeStatusKind>>('treeStatus', path),
  fsCreate: (path: string, relPath: string, isDir: boolean) => call<void>('fsCreate', path, relPath, isDir),
  fsRename: (path: string, from: string, to: string) => call<void>('fsRename', path, from, to),
  fsDelete: (path: string, relPaths: string[]) => call<void>('fsDelete', path, relPaths),
  fsExisting: (path: string, destDir: string, names: string[]) =>
    call<string[]>('fsExisting', path, destDir, names),
  fsMove: (path: string, froms: string[], destDir: string, mode?: FsDropMode) =>
    call<void>('fsMove', path, froms, destDir, mode),
  fsImport: (path: string, srcPaths: string[], destDir: string, mode?: FsDropMode) =>
    call<void>('fsImport', path, srcPaths, destDir, mode),
  commit: (path: string, message: string, amend?: boolean) => call<void>('commit', path, message, amend),
  getCommitMessage: (path: string, hash: string) => call<string>('getCommitMessage', path, hash),
  commitTemplate: (path: string) => call<string>('commitTemplate', path),
  amendCommitMessage: (path: string, message: string) => call<void>('amendCommitMessage', path, message),

  cherryPick: (path: string, hash: string, noCommit?: boolean) => call<void>('cherryPick', path, hash, noCommit),
  revertCommit: (path: string, hash: string) => call<void>('revertCommit', path, hash),
  reset: (path: string, ref: string, mode: 'soft' | 'mixed' | 'hard') => call<void>('reset', path, ref, mode),
  reflog: (path: string, ref?: string, max?: number) => call<ReflogEntry[]>('reflog', path, ref, max),
  bisectStatus: (path: string) => call<BisectStatus>('bisectStatus', path),
  bisectStart: (path: string) => call<BisectStatus>('bisectStart', path),
  bisectMark: (path: string, term: 'good' | 'bad' | 'skip', rev?: string) =>
    call<BisectStatus>('bisectMark', path, term, rev),
  bisectReset: (path: string) => call<void>('bisectReset', path),
  /** Hand the search to a command — output streams via `window.api.onBisectOutput`. */
  bisectRunScript: (path: string, command: string) =>
    call<BisectStatus>('bisectRunScript', path, command),
  bisectCancel: (path: string) => call<boolean>('bisectCancel', path),
  createTag: (path: string, name: string, hash?: string, opts?: { message?: string; sign?: boolean }) =>
    call<void>('createTag', path, name, hash, opts),
  deleteTag: (path: string, name: string) => call<void>('deleteTag', path, name),
  pushTag: (path: string, name: string, remote?: string) => call<void>('pushTag', path, name, remote),
  deleteRemoteTag: (path: string, name: string, remote?: string) => call<void>('deleteRemoteTag', path, name, remote),
  getRemoteTags: (path: string, remote?: string) => call<string[]>('getRemoteTags', path, remote),

  diffFile: (path: string, file: string, staged: boolean, untracked: boolean, ignoreWs?: boolean) =>
    call<string>('diffFile', path, file, staged, untracked, ignoreWs),
  commitFiles: (path: string, hash: string) => call<FileEntry[]>('commitFiles', path, hash),
  stashFiles: (path: string, sha: string, untrackedSha?: string | null) =>
    call<FileEntry[]>('stashFiles', path, sha, untrackedSha),
  stashFileDiff: (path: string, sha: string, file: string, untracked?: boolean, ignoreWs?: boolean) =>
    call<string>('stashFileDiff', path, sha, file, untracked, ignoreWs),
  commitFileDiff: (path: string, hash: string, file: string, ignoreWs?: boolean) =>
    call<string>('commitFileDiff', path, hash, file, ignoreWs),
  formatPatch: (path: string, ref: string, count?: number) => call<string>('formatPatch', path, ref, count),
  applyPatch: (path: string, content: string, am?: boolean) => call<void>('applyPatch', path, content, am),
  stagedDiff: (path: string) => call<string>('stagedDiff', path),
  commitDiff: (path: string, hash: string) => call<string>('commitDiff', path, hash),
  commitBranches: (path: string, hash: string) => call<CommitBranchInfo[]>('commitBranches', path, hash),
  commitTags: (path: string, hash: string) => call<string[]>('commitTags', path, hash),

  fileContent: (path: string, file: string, ref?: string) => call<string>('fileContent', path, file, ref),
  searchFileContents: (
    path: string,
    files: string[],
    query: string,
    opts?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean }
  ) => call<string[]>('searchFileContents', path, files, query, opts),
  searchFileMatches: (
    path: string,
    files: string[],
    query: string,
    opts?: {
      caseSensitive?: boolean
      wholeWord?: boolean
      regex?: boolean
      max?: number
      maxPerFile?: number
    }
  ) => call<CodeSearchHit[]>('searchFileMatches', path, files, query, opts),
  searchCommitMatches: (
    path: string,
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
  ) => call<CodeSearchHit[]>('searchCommitMatches', path, rev, query, opts),
  grepWorkingTree: (
    path: string,
    query: string,
    opts?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean; max?: number }
  ) => call<CodeSearchHit[]>('grepWorkingTree', path, query, opts),
  searchHistory: (
    path: string,
    query: string,
    opts?: { caseSensitive?: boolean; regex?: boolean; max?: number }
  ) => call<HistorySearchHit[]>('searchHistory', path, query, opts),
  fileDataUrl: (path: string, file: string, ref?: string) => call<string>('fileDataUrl', path, file, ref),
  imageDiff: (path: string, file: string, beforeRef: string | null, afterRef?: string) =>
    call<{ before: string | null; after: string | null }>('imageDiff', path, file, beforeRef, afterRef),
  blameFile: (path: string, file: string, ref?: string) => call<BlameLine[]>('blameFile', path, file, ref),
  fileHistory: (path: string, file: string) => call<FileHistoryEntry[]>('fileHistory', path, file),

  worktrees: (path: string) => call<WorktreeInfo[]>('worktrees', path),
  worktreeAdd: (path: string, dir: string, branch: string, newBranch: boolean) =>
    call<void>('worktreeAdd', path, dir, branch, newBranch),
  worktreeRemove: (path: string, dir: string, force?: boolean) => call<void>('worktreeRemove', path, dir, force),

  submodules: (path: string) => call<SubmoduleInfo[]>('submodules', path),
  submoduleAdd: (path: string, url: string, dir: string, branch?: string) =>
    call<void>('submoduleAdd', path, url, dir, branch),
  submoduleUpdate: (path: string, dir?: string, init?: boolean) => call<void>('submoduleUpdate', path, dir, init),
  submoduleSync: (path: string, dir?: string) => call<void>('submoduleSync', path, dir),
  submoduleSetUrl: (path: string, name: string, url: string) => call<void>('submoduleSetUrl', path, name, url),
  submoduleDeinit: (path: string, dir: string, force?: boolean) => call<void>('submoduleDeinit', path, dir, force),
  submoduleRemove: (path: string, dir: string) => call<void>('submoduleRemove', path, dir),

  signingConfig: (path: string) => call<SigningConfig>('signingConfig', path),
  setSigningConfig: (path: string, opts: { sign?: boolean; format?: string; key?: string }) =>
    call<void>('setSigningConfig', path, opts),

  hooksInfo: (path: string) => call<HooksInfo>('hooksInfo', path),
  readHook: (path: string, name: string) => call<string>('readHook', path, name),
  writeHook: (path: string, name: string, content: string) => call<void>('writeHook', path, name, content),
  setHookEnabled: (path: string, name: string, enabled: boolean) =>
    call<void>('setHookEnabled', path, name, enabled),
  deleteHook: (path: string, name: string) => call<void>('deleteHook', path, name),

  lfsInfo: (path: string) => call<LfsInfo>('lfsInfo', path),
  lfsTrack: (path: string, pattern: string) => call<void>('lfsTrack', path, pattern),
  lfsUntrack: (path: string, pattern: string) => call<void>('lfsUntrack', path, pattern),
  lfsPull: (path: string) => call<void>('lfsPull', path),
  lfsPrune: (path: string) => call<void>('lfsPrune', path),

  sparseCheckoutInfo: (path: string) => call<SparseCheckoutInfo>('sparseCheckoutInfo', path),
  sparseCheckoutSet: (path: string, dirs: string[]) => call<void>('sparseCheckoutSet', path, dirs),
  sparseCheckoutDisable: (path: string) => call<void>('sparseCheckoutDisable', path),

  getUser: (path: string) => call<{ name: string; email: string }>('getUser', path),
  setUser: (path: string, name: string, email: string) => call<void>('setUser', path, name, email),

  clone: (parentDir: string, url: string, name: string, opts?: CloneOptions) =>
    call<string>('clone', parentDir, url, name, opts ?? {}),
  /** Branch names a remote advertises — the clone dialog's branch picker. */
  remoteBranches: (url: string, host?: RepoHost, token?: string) =>
    call<string[]>('remoteBranches', url, host, token),
  init: (parentDir: string, name: string) => call<string>('init', parentDir, name),
  initHere: (path: string) => call<void>('initHere', path),

  mergeState: (path: string) => call<ConflictOpKind | null>('mergeState', path),
  mergeMessage: (path: string) => call<string>('mergeMessage', path),
  conflictContext: (path: string) => call<ConflictContext | null>('conflictContext', path),
  conflictVersions: (path: string, file: string) => call<ConflictVersions>('conflictVersions', path, file),
  resolveConflict: (path: string, file: string, content: string) => call<void>('resolveConflict', path, file, content),
  conflictTakeSide: (path: string, file: string, side: ConflictSide) => call<void>('conflictTakeSide', path, file, side),
  conflictOpContinue: (path: string, kind: ConflictOpKind) => call<void>('conflictOpContinue', path, kind),
  conflictOpAbort: (path: string, kind: ConflictOpKind) => call<void>('conflictOpAbort', path, kind),

  interactiveRebaseSteps: (path: string, base: string) =>
    call<{ hash: string; subject: string }[]>('interactiveRebaseSteps', path, base),
  runInteractiveRebase: (path: string, base: string, steps: RebaseStep[]) =>
    call<void>('runInteractiveRebase', path, base, steps),
  stagePatch: (path: string, patch: string) => call<void>('stagePatch', path, patch),
  compareBranches: (path: string, a: string, b: string) =>
    call<BranchCompareResult>('compareBranches', path, a, b),
  mergePreview: (path: string, base: string, refs: string[]) =>
    call<MergePreviewResult>('mergePreview', path, base, refs),
  semanticDiff: (path: string, file: string, oldSide: BlobSpec, newSide: BlobSpec) =>
    call<SemanticDiff>('semanticDiff', path, file, oldSide, newSide),
  rangeDiff: (path: string, oldRev: string, newRev: string, base?: string) =>
    call<RangeDiffEntry[]>('rangeDiff', path, oldRev, newRev, base),
  refTips: (path: string, ref: string, max?: number) => call<RefTip[]>('refTips', path, ref, max),
  absorbPlan: (path: string) => call<AbsorbPlan>('absorbPlan', path),
  absorbApply: (path: string, opts?: { rebase?: boolean }) =>
    call<{ created: number; rebased: boolean }>('absorbApply', path, opts),
  repoStats: (path: string, sinceDays?: number) => call<RepoStats>('repoStats', path, sinceDays),
  repoInsights: (path: string, sinceDays?: number) => call<RepoInsights>('repoInsights', path, sinceDays),
  cosmosData: (path: string, limit?: number) => call<CosmosCommit[]>('cosmosData', path, limit),
  generateChangelog: (path: string, opts?: { from?: string; to?: string; version?: string }) =>
    call<ChangelogResult>('generateChangelog', path, opts),
  writeChangelogFile: (path: string, markdown: string) => call<void>('writeChangelogFile', path, markdown),
  createSnapshot: (path: string, auto?: boolean) => call<SnapshotInfo | null>('createSnapshot', path, auto),
  listSnapshots: (path: string) => call<SnapshotInfo[]>('listSnapshots', path),
  restoreSnapshot: (path: string, sha: string) => call<void>('restoreSnapshot', path, sha),
  deleteSnapshot: (path: string, ref: string) => call<void>('deleteSnapshot', path, ref)
}

export const settingsApi = {
  get: () => window.api.settings.get() as Promise<AppSettings>,
  // Decrypts the stored tokens (asking for keychain access if needed) and
  // returns the settings with them filled in. Only call it from an explicit
  // user action — never on start-up.
  unlock: () => window.api.settings.unlock() as Promise<AppSettings>,
  set: (s: AppSettings) => window.api.settings.set(s),
  importFile: () => window.api.settings.importFile() as Promise<unknown>,
  exportFile: (data: unknown) => window.api.settings.exportFile(data)
}

export interface ArtifactRequest {
  path: string
  description: string
}

export interface GeneratedFile {
  path: string
  content: string
}

export interface ArtifactSuggestion {
  path: string
  description: string
  reason: string
}

export const aiApi = {
  commitMessage: (diff: string, cfg: AIConfig, ctx: { branch: string }) =>
    window.api.ai.commitMessage(diff, cfg, ctx) as Promise<{ summary: string; description: string }>,
  listModels: (cfg: AIConfig) => window.api.ai.listModels(cfg) as Promise<string[]>,
  explainCode: (code: string, lang: string, cfg: AIConfig) =>
    window.api.ai.explainCode(code, lang, cfg) as Promise<string>,
  hoverExplain: (req: HoverExplainRequest, cfg: AIConfig) =>
    window.api.ai.hoverExplain(req, cfg) as Promise<HoverExplainResult>,
  resolveConflict: (file: string, content: string, cfg: AIConfig) =>
    window.api.ai.resolveConflict(file, content, cfg) as Promise<string>,
  generateConfig: (repoName: string, artifacts: ArtifactRequest[], context: string, cfg: AIConfig) =>
    window.api.ai.generateConfig(repoName, artifacts, context, cfg) as Promise<{ files: GeneratedFile[] }>,
  suggestArtifacts: (repoName: string, selectedTools: string[], context: string, alreadySelected: ArtifactRequest[], cfg: AIConfig) =>
    window.api.ai.suggestArtifacts(repoName, selectedTools, context, alreadySelected, cfg) as Promise<{ suggestions: ArtifactSuggestion[] }>,
  smartStage: (files: { path: string; status: string }[], cfg: AIConfig) =>
    window.api.ai.smartStage(files, cfg) as Promise<{ toStage: string[]; reason: string }>,
  generateAppTheme: (prompt: string, cfg: AIConfig) =>
    window.api.ai.generateAppTheme(prompt, cfg) as Promise<{ name: string; light: AppThemeColors; dark: AppThemeColors }>,
  generateCodeTheme: (prompt: string, cfg: AIConfig) =>
    window.api.ai.generateCodeTheme(prompt, cfg) as Promise<{ name: string; light: CodeThemeColors; dark: CodeThemeColors }>,
  generateGraphPalette: (prompt: string, cfg: AIConfig) =>
    window.api.ai.generateGraphPalette(prompt, cfg) as Promise<{ name: string; colors: string[] }>,
  generateBranchName: (description: string, cfg: AIConfig, ctx: { username?: string }) =>
    window.api.ai.generateBranchName(description, cfg, ctx) as Promise<string>,
  reviewPR: (diff: string, cfg: AIConfig) =>
    window.api.ai.reviewPR(diff, cfg) as Promise<PRReviewResult>,
  prDescription: (commits: string, diff: string, cfg: AIConfig) =>
    window.api.ai.prDescription(commits, diff, cfg) as Promise<{ title: string; body: string }>,
  planActions: (prompt: string, status: RepoStatus, cfg: AIConfig) =>
    window.api.ai.planActions(prompt, status, cfg) as Promise<AskPlan>
}

export const wikiApi = {
  facts: (repoPath: string) => window.api.wiki.facts(repoPath) as Promise<RepoFacts>,
  imports: (repoPath: string, depth: number) => window.api.wiki.imports(repoPath, depth) as Promise<ImportGraph>,
  get: (repoPath: string, model: string) =>
    window.api.wiki.get(repoPath, model) as Promise<{
      wiki: RepoWiki | null
      freshness: 'current' | 'behind' | 'outdated'
      headSha: string
    }>,
  generate: (repoPath: string, cfg: AIConfig) => window.api.wiki.generate(repoPath, cfg) as Promise<RepoWiki>,
  export: (repoPath: string) => window.api.wiki.export(repoPath) as Promise<string[]>,
  clear: (repoPath: string) => window.api.wiki.clear(repoPath) as Promise<void>,
  onProgress: (cb: (payload: { repoPath: string; progress: WikiProgress }) => void) =>
    window.api.wiki.onProgress(cb as (payload: unknown) => void)
}

export const analyticsApi = {
  get: () => window.api.analytics.get() as Promise<Analytics>,
  clear: () => window.api.analytics.clear() as Promise<Analytics>,
  setRetention: (days: number) => window.api.analytics.setRetention(days) as Promise<Analytics>
}

export const logApi = {
  get: () => window.api.log.get() as Promise<LogEntry[]>,
  clear: () => window.api.log.clear() as Promise<LogEntry[]>
}

export const vaultApi = {
  list: (repoPath: string) => window.api.vault.list(repoPath) as Promise<VaultListResult>,
  upsert: (scope: 'repo' | 'global', repoPath: string, entry: Partial<VaultEntry>) =>
    window.api.vault.upsert(scope, repoPath, entry) as Promise<VaultListResult>,
  remove: (scope: 'repo' | 'global', repoPath: string, id: string) =>
    window.api.vault.remove(scope, repoPath, id) as Promise<VaultListResult>,
  exportAll: () => window.api.vault.exportAll() as Promise<VaultExport>,
  importAll: (data: VaultExport) => window.api.vault.importAll(data) as Promise<void>
}

export const secureShareApi = {
  candidates: (repoPath: string) =>
    window.api.secureShare.candidates(repoPath) as Promise<SecureShareCandidate[]>,
  export: (repoPath: string, project: string, paths: string[], password: string) =>
    window.api.secureShare.export(repoPath, project, paths, password) as Promise<
      { path: string } | { canceled: true } | { error: SecureShareError }
    >,
  pick: () =>
    window.api.secureShare.pick() as Promise<
      { path: string; header: SecureBundleHeader } | { error: SecureShareError } | null
    >,
  preview: (bundlePath: string, password: string, repoPath: string) =>
    window.api.secureShare.preview(bundlePath, password, repoPath) as Promise<
      { files: SecureSharePreviewEntry[] } | { error: SecureShareError }
    >,
  apply: (bundlePath: string, password: string, repoPath: string, selected: string[]) =>
    window.api.secureShare.apply(bundlePath, password, repoPath, selected) as Promise<
      { written: string[] } | { error: SecureShareError }
    >,
  exportV2: (specs: SecureExportSpec[], project: string, password: string) =>
    window.api.secureShare.exportV2(specs, project, password) as Promise<
      { path: string } | { canceled: true } | { error: SecureShareError }
    >,
  openV2: (bundlePath: string, password: string) =>
    window.api.secureShare.openV2(bundlePath, password) as Promise<
      SecureBundleOpened | { error: SecureShareError }
    >,
  previewRepoV2: (bundlePath: string, password: string, sectionIndex: number, repoPath: string) =>
    window.api.secureShare.previewRepoV2(bundlePath, password, sectionIndex, repoPath) as Promise<
      { files: SecureSharePreviewEntry[] } | { error: SecureShareError }
    >,
  applyV2: (bundlePath: string, password: string, plan: SecureApplyPlan[]) =>
    window.api.secureShare.applyV2(bundlePath, password, plan) as Promise<
      SecureApplyResult | { error: SecureShareError }
    >
}

export const infoApi = {
  list: (repoPath: string) => window.api.info.list(repoPath) as Promise<InfoEntry[]>,
  upsert: (repoPath: string, entry: Partial<InfoEntry>) =>
    window.api.info.upsert(repoPath, entry) as Promise<InfoEntry[]>,
  remove: (repoPath: string, id: string) =>
    window.api.info.remove(repoPath, id) as Promise<InfoEntry[]>,
  reorder: (repoPath: string, ids: string[]) =>
    window.api.info.reorder(repoPath, ids) as Promise<InfoEntry[]>,
  exportAll: () => window.api.info.exportAll() as Promise<InfoExport>,
  importAll: (data: InfoExport) => window.api.info.importAll(data) as Promise<void>
}

export const shellApi = {
  revealInFolder: (fullPath: string) => window.api.shell.showItemInFolder(fullPath),
  openPath: (fullPath: string) => window.api.shell.openPath(fullPath),
  openWithPicker: (fullPath: string) => window.api.shell.openWithPicker(fullPath),
  pickApplication: () => window.api.shell.pickApplication(),
  /** Launches a specific app (e.g. VS Code) with the given file/folder path —
   *  the equivalent of running `code <path>` from a terminal. */
  openWithApp: (targetPath: string, appPath: string) => window.api.shell.openWithApp(targetPath, appPath),
  openExternal: (url: string) => window.api.openExternal(url),
  writeFiles: (repoPath: string, files: GeneratedFile[]) =>
    window.api.shell.writeFiles(repoPath, files) as Promise<void>,
  revealLabel:
    window.api.platform === 'darwin'
      ? 'Reveal in Finder'
      : window.api.platform === 'win32'
        ? 'Reveal in File Explorer'
        : 'Reveal in file manager'
}

export const diffToolApi = {
  /** Tools git knows about here, plus the currently configured choices. */
  config: (repoPath: string) => window.api.difftool.config(repoPath),
  set: (
    repoPath: string,
    values: { diffTool?: string; mergeTool?: string; keepBackup?: boolean },
    scope: 'global' | 'repo' = 'global'
  ) => window.api.difftool.set(repoPath, values, scope),
  /** Resolves when the tool exits — '' on success, else git's complaint. */
  diff: (repoPath: string, file: string, rev?: string, tool?: string) =>
    window.api.difftool.diff(repoPath, file, rev, tool),
  merge: (repoPath: string, file: string, tool?: string) => window.api.difftool.merge(repoPath, file, tool)
}

export const sshApi = {
  /** Keys in ~/.ssh, with whether the agent is holding each one. Public halves
   *  and fingerprints only — a private key never crosses this boundary. */
  status: () => window.api.ssh.status(),
  generate: (name: string, comment: string, passphrase: string) =>
    window.api.ssh.generate(name, comment, passphrase),
  /** Resolves to '' on success, or to ssh-add's own complaint. */
  addToAgent: (publicKeyPath: string, passphrase: string) =>
    window.api.ssh.addToAgent(publicKeyPath, passphrase),
  test: (host: string) => window.api.ssh.test(host)
}

export const editorApi = {
  /** Editors installed on this machine, CLI installs first (only those can jump
   *  to a line). Re-probed on demand — an editor installed after launch shows up
   *  without restarting Gitcito. */
  detect: () => window.api.editor.detect(),
  /** Opens `target` in the configured editor. Resolves to '' on success, or to
   *  the failure message. */
  open: (setting: EditorSetting, target: EditorTarget) => window.api.editor.open(setting, target)
}

export const hostingApi = {
  listRepos: (provider: RepoHost, token: string, org?: string) =>
    window.api.hosting.listRepos(provider, token, org) as Promise<RemoteRepo[]>,
  listOwners: (provider: RepoHost, token: string, org?: string) =>
    window.api.hosting.listOwners(provider, token, org) as Promise<RemoteOwner[]>,
  whoAmI: (provider: RepoHost, token: string, org?: string, interactive?: boolean) =>
    window.api.hosting.whoAmI(provider, token, org, interactive) as Promise<ConnectedAccount>,
  createRepo: (provider: RepoHost, token: string, opts: CreateRepoOpts, org?: string) =>
    window.api.hosting.createRepo(provider, token, opts, org) as Promise<RemoteRepo>,
  listPRs: (remoteUrl: string, tokens: { github?: string; azure?: string; gitlab?: string; bitbucket?: string }) =>
    window.api.hosting.listPRs(remoteUrl, tokens) as Promise<{ provider: HostingProvider; prs: PullRequest[] }>,
  listReleases: (remoteUrl: string, tokens: { github?: string }) =>
    window.api.hosting.listReleases(remoteUrl, tokens) as Promise<{ provider: HostingProvider; releases: ReleaseInfo[] }>,
  ciStatuses: (remoteUrl: string, shas: string[], token: string) =>
    window.api.hosting.ciStatuses(remoteUrl, shas, token) as Promise<Record<string, CiStatus>>,
  openCreatePR: (remoteUrl: string, source: string, target: string) =>
    window.api.hosting.openCreatePR(remoteUrl, source, target),
  createPR: (remoteUrl: string, tokens: { github?: string; azure?: string; gitlab?: string; bitbucket?: string }, opts: CreatePrOpts) =>
    window.api.hosting.createPR(remoteUrl, tokens, opts) as Promise<CreatePrResult>,
  prDetail: (remoteUrl: string, tokens: { github?: string }, number: number) =>
    window.api.hosting.prDetail(remoteUrl, tokens, number) as Promise<PrDetail>,
  prComment: (remoteUrl: string, tokens: { github?: string }, number: number, body: string) =>
    window.api.hosting.prComment(remoteUrl, tokens, number, body) as Promise<void>,
  prReplyReviewComment: (remoteUrl: string, tokens: { github?: string }, number: number, inReplyTo: number, body: string) =>
    window.api.hosting.prReplyReviewComment(remoteUrl, tokens, number, inReplyTo, body) as Promise<void>,
  prChecks: (remoteUrl: string, tokens: { github?: string }, number: number) =>
    window.api.hosting.prChecks(remoteUrl, tokens, number) as Promise<import('../../../shared/types').PrCheck[]>,
  prFiles: (remoteUrl: string, tokens: { github?: string }, number: number) =>
    window.api.hosting.prFiles(remoteUrl, tokens, number) as Promise<import('../../../shared/types').PrFile[]>,
  prReview: (remoteUrl: string, tokens: { github?: string }, number: number, event: PrReviewEvent, body: string) =>
    window.api.hosting.prReview(remoteUrl, tokens, number, event, body) as Promise<void>,
  prMerge: (remoteUrl: string, tokens: { github?: string }, number: number, method: PrMergeMethod) =>
    window.api.hosting.prMerge(remoteUrl, tokens, number, method) as Promise<void>,
  listNotifications: (token: string, all?: boolean) =>
    window.api.hosting.listNotifications(token, all) as Promise<GitHubNotification[]>,
  markNotificationRead: (token: string, id: string) =>
    window.api.hosting.markNotificationRead(token, id) as Promise<void>,
  markAllNotificationsRead: (token: string) =>
    window.api.hosting.markAllNotificationsRead(token) as Promise<void>,
  listIssues: (remoteUrl: string, tokens: { github?: string }) =>
    window.api.hosting.listIssues(remoteUrl, tokens) as Promise<{ provider: HostingProvider; issues: IssueInfo[] }>,
  /** Register a public key on the user's GitHub account (GitHub only). */
  uploadSshKey: (token: string, title: string, publicKey: string) =>
    window.api.hosting.uploadSshKey(token, title, publicKey) as Promise<{ id: number }>,
  issueDetail: (remoteUrl: string, tokens: { github?: string }, number: number) =>
    window.api.hosting.issueDetail(remoteUrl, tokens, number) as Promise<IssueDetail>,
  setIssueState: (remoteUrl: string, tokens: { github?: string }, number: number, state: 'open' | 'closed') =>
    window.api.hosting.setIssueState(remoteUrl, tokens, number, state) as Promise<void>,
  createIssue: (remoteUrl: string, tokens: { github?: string }, opts: { title: string; body?: string }) =>
    window.api.hosting.createIssue(remoteUrl, tokens, opts) as Promise<{ number: number; url: string }>,
  applyPrMeta: (
    remoteUrl: string,
    tokens: { github?: string },
    number: number,
    meta: { reviewers?: string[]; labels?: string[]; assignees?: string[] }
  ) => window.api.hosting.applyPrMeta(remoteUrl, tokens, number, meta) as Promise<void>,
  listMilestones: (remoteUrl: string, tokens: { github?: string }) =>
    window.api.hosting.listMilestones(remoteUrl, tokens) as Promise<{
      provider: HostingProvider
      milestones: MilestoneInfo[]
    }>,
  milestoneIssues: (remoteUrl: string, tokens: { github?: string }, number: number) =>
    window.api.hosting.milestoneIssues(remoteUrl, tokens, number) as Promise<IssueInfo[]>
}

// OS keychain consent. Nothing in the app touches safeStorage until the user
// has answered the explainer this drives.
export const keychainApi = {
  onAsk: (cb: (payload: { reason: KeychainReason; adopted: boolean }) => void) =>
    window.api.keychain.onAsk((p) => cb({ reason: p.reason as KeychainReason, adopted: p.adopted })),
  answer: (granted: boolean) => window.api.keychain.answer(granted),
  status: () =>
    window.api.keychain.status() as Promise<{
      consent: KeychainConsent
      explained: boolean
      available: boolean | null
    }>,
  set: (granted: boolean) => window.api.keychain.set(granted)
}

// Installs/checks the `gitcito` shell command (macOS only), the equivalent of
// VS Code's "Shell Command: Install 'code' in PATH".
export const cliApi = {
  isInstalled: () => window.api.cli.isInstalled(),
  install: () => window.api.cli.install(),
  uninstall: () => window.api.cli.uninstall(),
  onOpenPath: (cb: (payload: { path: string; name?: string; group?: string }) => void) =>
    window.api.cli.onOpenPath(cb)
}
