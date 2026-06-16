import type {
  BlameLine,
  BranchesPayload,
  ConflictOpKind,
  ConflictSide,
  ConflictVersions,
  FileEntry,
  FileHistoryEntry,
  GraphCommit,
  RemoteInfo,
  RepoStatus,
  RepoSummary,
  StashInfo,
  AIConfig,
  AppSettings,
  PullRequest,
  HostingProvider,
  RepoHost,
  RemoteRepo,
  RemoteOwner,
  CreateRepoOpts,
  WorktreeInfo
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
  commit: (path: string, message: string, amend?: boolean) => call<void>('commit', path, message, amend),
  getCommitMessage: (path: string, hash: string) => call<string>('getCommitMessage', path, hash),
  amendCommitMessage: (path: string, message: string) => call<void>('amendCommitMessage', path, message),

  cherryPick: (path: string, hash: string, noCommit?: boolean) => call<void>('cherryPick', path, hash, noCommit),
  revertCommit: (path: string, hash: string) => call<void>('revertCommit', path, hash),
  reset: (path: string, ref: string, mode: 'soft' | 'mixed' | 'hard') => call<void>('reset', path, ref, mode),
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
  fileDataUrl: (path: string, file: string, ref?: string) => call<string>('fileDataUrl', path, file, ref),
  imageDiff: (path: string, file: string, beforeRef: string | null, afterRef?: string) =>
    call<{ before: string | null; after: string | null }>('imageDiff', path, file, beforeRef, afterRef),
  blameFile: (path: string, file: string, ref?: string) => call<BlameLine[]>('blameFile', path, file, ref),
  fileHistory: (path: string, file: string) => call<FileHistoryEntry[]>('fileHistory', path, file),

  worktrees: (path: string) => call<WorktreeInfo[]>('worktrees', path),
  worktreeAdd: (path: string, dir: string, branch: string, newBranch: boolean) =>
    call<void>('worktreeAdd', path, dir, branch, newBranch),
  worktreeRemove: (path: string, dir: string, force?: boolean) => call<void>('worktreeRemove', path, dir, force),

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
  conflictOpAbort: (path: string, kind: ConflictOpKind) => call<void>('conflictOpAbort', path, kind)
}

export const settingsApi = {
  get: () => window.api.settings.get() as Promise<AppSettings>,
  set: (s: AppSettings) => window.api.settings.set(s)
}

export const aiApi = {
  commitMessage: (diff: string, cfg: AIConfig, ctx: { branch: string }) =>
    window.api.ai.commitMessage(diff, cfg, ctx) as Promise<{ summary: string; description: string }>,
  listModels: (cfg: AIConfig) => window.api.ai.listModels(cfg) as Promise<string[]>,
  explainCode: (code: string, lang: string, cfg: AIConfig) =>
    window.api.ai.explainCode(code, lang, cfg) as Promise<string>,
  resolveConflict: (file: string, content: string, cfg: AIConfig) =>
    window.api.ai.resolveConflict(file, content, cfg) as Promise<string>
}

export const shellApi = {
  revealInFolder: (fullPath: string) => window.api.shell.showItemInFolder(fullPath),
  openPath: (fullPath: string) => window.api.shell.openPath(fullPath),
  openExternal: (url: string) => window.api.openExternal(url),
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
  openCreatePR: (remoteUrl: string, source: string, target: string) =>
    window.api.hosting.openCreatePR(remoteUrl, source, target)
}
