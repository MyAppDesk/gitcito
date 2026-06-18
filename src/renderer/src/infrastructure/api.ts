import type {
  BlameLine,
  BranchCompareResult,
  BranchesPayload,
  CiStatus,
  ConflictOpKind,
  ConflictSide,
  ConflictVersions,
  FileEntry,
  FileHistoryEntry,
  GraphCommit,
  RebaseStep,
  RemoteInfo,
  RepoStatus,
  RepoSummary,
  StashInfo,
  AIConfig,
  AppSettings,
  PullRequest,
  ReleaseInfo,
  HostingProvider,
  RepoHost,
  RemoteRepo,
  RemoteOwner,
  CreateRepoOpts,
  WorktreeInfo,
  SubmoduleInfo,
  AppThemeColors,
  CodeThemeColors,
  Analytics,
  LogEntry,
  RepoStats,
  ReflogEntry,
  BisectStatus,
  SigningConfig,
  HooksInfo
} from '../../../shared/types'

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

  checkout: (path: string, ref: string) => call<void>('checkout', path, ref),
  checkoutRemote: (path: string, fullName: string, localName: string) =>
    call<void>('checkoutRemote', path, fullName, localName),
  createBranch: (path: string, name: string, at?: string, checkout?: boolean) =>
    call<void>('createBranch', path, name, at, checkout),
  deleteBranch: (path: string, name: string, force?: boolean) => call<void>('deleteBranch', path, name, force),
  deleteRemoteBranch: (path: string, remote: string, name: string) =>
    call<void>('deleteRemoteBranch', path, remote, name),
  renameBranch: (path: string, oldName: string, newName: string) => call<void>('renameBranch', path, oldName, newName),
  merge: (path: string, ref: string, noFf?: boolean) => call<void>('merge', path, ref, noFf),
  mergeInto: (path: string, source: string, target: string, noFf?: boolean) =>
    call<void>('mergeInto', path, source, target, noFf),
  rebase: (path: string, onto: string) => call<void>('rebase', path, onto),

  fetchAll: (path: string) => call<void>('fetchAll', path),
  pull: (path: string, mode: 'default' | 'ff-only' | 'rebase') => call<void>('pull', path, mode),
  push: (path: string, branch: string, opts?: { force?: boolean; remote?: string }) =>
    call<void>('push', path, branch, opts),

  stash: (path: string, message?: string) => call<void>('stash', path, message),
  stashPop: (path: string, index?: number) => call<void>('stashPop', path, index),
  stashApply: (path: string, index?: number) => call<void>('stashApply', path, index),
  stashDrop: (path: string, index?: number) => call<void>('stashDrop', path, index),
  stashApplyFiles: (path: string, sha: string, tracked: string[], untracked: string[]) =>
    call<void>('stashApplyFiles', path, sha, tracked, untracked),

  stage: (path: string, files: string[]) => call<void>('stage', path, files),
  stageAll: (path: string) => call<void>('stageAll', path),
  unstage: (path: string, files: string[]) => call<void>('unstage', path, files),
  unstageAll: (path: string) => call<void>('unstageAll', path),
  discard: (path: string, files: string[], untracked: boolean) => call<void>('discard', path, files, untracked),
  addToGitignore: (path: string, patterns: string[]) => call<string[]>('addToGitignore', path, patterns),
  untrack: (path: string, files: string[], deleteFromDisk?: boolean) =>
    call<void>('untrack', path, files, deleteFromDisk),
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
  createTag: (path: string, name: string, hash?: string) => call<void>('createTag', path, name, hash),
  deleteTag: (path: string, name: string) => call<void>('deleteTag', path, name),
  pushTag: (path: string, name: string, remote?: string) => call<void>('pushTag', path, name, remote),
  deleteRemoteTag: (path: string, name: string, remote?: string) => call<void>('deleteRemoteTag', path, name, remote),
  getRemoteTags: (path: string, remote?: string) => call<string[]>('getRemoteTags', path, remote),

  diffFile: (path: string, file: string, staged: boolean, untracked: boolean) =>
    call<string>('diffFile', path, file, staged, untracked),
  commitFiles: (path: string, hash: string) => call<FileEntry[]>('commitFiles', path, hash),
  stashFiles: (path: string, sha: string, untrackedSha?: string | null) =>
    call<FileEntry[]>('stashFiles', path, sha, untrackedSha),
  stashFileDiff: (path: string, sha: string, file: string, untracked?: boolean) =>
    call<string>('stashFileDiff', path, sha, file, untracked),
  commitFileDiff: (path: string, hash: string, file: string) => call<string>('commitFileDiff', path, hash, file),
  stagedDiff: (path: string) => call<string>('stagedDiff', path),
  commitDiff: (path: string, hash: string) => call<string>('commitDiff', path, hash),

  fileContent: (path: string, file: string, ref?: string) => call<string>('fileContent', path, file, ref),
  searchFileContents: (
    path: string,
    files: string[],
    query: string,
    opts?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean }
  ) => call<string[]>('searchFileContents', path, files, query, opts),
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

  getUser: (path: string) => call<{ name: string; email: string }>('getUser', path),
  setUser: (path: string, name: string, email: string) => call<void>('setUser', path, name, email),

  clone: (parentDir: string, url: string, name: string, host?: RepoHost, token?: string) =>
    call<string>('clone', parentDir, url, name, host, token),
  init: (parentDir: string, name: string) => call<string>('init', parentDir, name),

  mergeState: (path: string) => call<ConflictOpKind | null>('mergeState', path),
  mergeMessage: (path: string) => call<string>('mergeMessage', path),
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
  repoStats: (path: string, sinceDays?: number) => call<RepoStats>('repoStats', path, sinceDays)
}

export const settingsApi = {
  get: () => window.api.settings.get() as Promise<AppSettings>,
  set: (s: AppSettings) => window.api.settings.set(s),
  importFile: () => window.api.settings.importFile() as Promise<AppSettings | null>,
  exportFile: (s: AppSettings) => window.api.settings.exportFile(s)
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
  generateBranchName: (description: string, cfg: AIConfig, ctx: { username?: string }) =>
    window.api.ai.generateBranchName(description, cfg, ctx) as Promise<string>,
  reviewPR: (diff: string, cfg: AIConfig) =>
    window.api.ai.reviewPR(diff, cfg) as Promise<{ summary: string; risks: string; suggestions: string }>
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

export const shellApi = {
  revealInFolder: (fullPath: string) => window.api.shell.showItemInFolder(fullPath),
  openPath: (fullPath: string) => window.api.shell.openPath(fullPath),
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

export const hostingApi = {
  listRepos: (provider: RepoHost, token: string, org?: string) =>
    window.api.hosting.listRepos(provider, token, org) as Promise<RemoteRepo[]>,
  listOwners: (provider: RepoHost, token: string, org?: string) =>
    window.api.hosting.listOwners(provider, token, org) as Promise<RemoteOwner[]>,
  createRepo: (provider: RepoHost, token: string, opts: CreateRepoOpts, org?: string) =>
    window.api.hosting.createRepo(provider, token, opts, org) as Promise<RemoteRepo>,
  listPRs: (remoteUrl: string, tokens: { github?: string; azure?: string }) =>
    window.api.hosting.listPRs(remoteUrl, tokens) as Promise<{ provider: HostingProvider; prs: PullRequest[] }>,
  listReleases: (remoteUrl: string, tokens: { github?: string }) =>
    window.api.hosting.listReleases(remoteUrl, tokens) as Promise<{ provider: HostingProvider; releases: ReleaseInfo[] }>,
  ciStatuses: (remoteUrl: string, shas: string[], token: string) =>
    window.api.hosting.ciStatuses(remoteUrl, shas, token) as Promise<Record<string, CiStatus>>,
  openCreatePR: (remoteUrl: string, source: string, target: string) =>
    window.api.hosting.openCreatePR(remoteUrl, source, target)
}
