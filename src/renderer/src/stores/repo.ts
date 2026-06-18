import { create } from 'zustand'
import type {
  BranchesPayload,
  CiStatus,
  ConflictOpKind,
  ConflictSide,
  GraphCommit,
  PullRequest,
  IssueInfo,
  ReleaseInfo,
  RemoteInfo,
  RepoStatus,
  StashInfo,
  HostingProvider,
  WorktreeInfo,
  SubmoduleInfo
} from '../../../shared/types'
import { gitApi, hostingApi } from '../infrastructure/api'
import { useUIStore } from './ui'
import { useSettingsStore } from './settings'

export type Selection =
  | { type: 'commit'; hash: string }
  | { type: 'wip' }
  | { type: 'stash'; index: number; sha: string }

export interface UndoEntry {
  label: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

export interface RepoData {
  path: string
  name: string
  commits: GraphCommit[]
  branches: BranchesPayload
  status: RepoStatus | null
  stashes: StashInfo[]
  remotes: RemoteInfo[]
  worktrees: WorktreeInfo[]
  submodules: SubmoduleInfo[]
  prs: PullRequest[]
  prProvider: HostingProvider
  issues: IssueInfo[]
  releases: ReleaseInfo[]
  releaseProvider: HostingProvider
  mergeState: ConflictOpKind | null
  selected: Selection | null
  loading: boolean
  maxCount: number
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]
  remoteTagNames: string[]
  /** Epoch ms of the last successful view refresh (local read of repo state). */
  lastRefreshAt: number | null
  /** Epoch ms of the last successful network fetch/pull of remotes. */
  lastFetchAt: number | null
  ciStatuses: Record<string, CiStatus>
}

const emptyRepo = (path: string): RepoData => ({
  path,
  name: path.split('/').pop() ?? path,
  commits: [],
  branches: { current: '', locals: [], remotes: [], tags: [] },
  status: null,
  stashes: [],
  remotes: [],
  worktrees: [],
  submodules: [],
  prs: [],
  prProvider: null,
  issues: [],
  releases: [],
  releaseProvider: null,
  mergeState: null,
  selected: null,
  loading: true,
  maxCount: useSettingsStore.getState().settings.initialCommitCount ?? 400,
  undoStack: [],
  redoStack: [],
  remoteTagNames: [],
  lastRefreshAt: null,
  lastFetchAt: null,
  ciStatuses: {}
})

interface RepoStoreState {
  repos: Record<string, RepoData>
  /** Per-repo commit summary draft, shared between the WIP graph row and the composer. */
  drafts: Record<string, string>

  ensure(path: string): Promise<void>
  refresh(path: string, opts?: { light?: boolean }): Promise<void>
  patch(path: string, partial: Partial<RepoData>): void
  select(path: string, sel: Selection | null): void
  setDraft(path: string, value: string): void
  loadMore(path: string): void
  refreshPRs(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshIssues(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshReleases(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshRemoteTags(path: string): Promise<void>
  refreshCiStatuses(path: string): Promise<void>

  run(path: string, label: string, fn: () => Promise<void>, undoEntry?: UndoEntry): Promise<boolean>
  undo(path: string): Promise<void>
  redo(path: string): Promise<void>
}

const toast = (kind: 'success' | 'error' | 'info', msg: string): void => useUIStore.getState().toast(kind, msg)

function isConflictErrorMessage(msg: string): boolean {
  return /\bCONFLICT(S)?\b|Automatic merge failed|after resolving the conflicts|CHERRY_PICK_HEAD/i.test(msg)
}

function isNonFastForwardError(msg: string): boolean {
  return /\[rejected\]|non-fast-forward|fetch first|tip of your current branch is behind|Updates were rejected/i.test(msg)
}

function conflictHint(msg: string): string {
  if (/CHERRY_PICK_HEAD/i.test(msg)) return 'Cherry-pick paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  if (/rebase/i.test(msg)) return 'Rebase paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  if (/revert/i.test(msg)) return 'Revert paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  return 'Merge has conflicts. Resolve files in the Conflicted files panel, then Continue.'
}

export const useRepoStore = create<RepoStoreState>((set, get) => ({
  repos: {},
  drafts: {},

  patch: (path, partial) =>
    set((s) => ({ repos: { ...s.repos, [path]: { ...(s.repos[path] ?? emptyRepo(path)), ...partial } } })),

  setDraft: (path, value) => set((s) => ({ drafts: { ...s.drafts, [path]: value } })),

  ensure: async (path) => {
    if (get().repos[path]) return
    get().patch(path, {})
    await get().refresh(path)
    // Hosting data (PRs, releases) lives behind the network, so it is fetched
    // after the local refresh and kept silent — a missing token or offline box
    // should not spam error toasts every time a repo is opened.
    void get().refreshPRs(path, { silent: true })
    void get().refreshIssues(path, { silent: true })
    void get().refreshReleases(path, { silent: true })
  },

  refresh: async (path, opts) => {
    const { patch } = get()
    const maxCount = get().repos[path]?.maxCount ?? 400
    // A "light" refresh skips the (potentially large) commit-log query and only
    // re-reads cheap local state. Used by the periodic poll and on window focus.
    const light = opts?.light ?? false
    try {
      const [commits, branches, status, stashes, remotes, mergeState, worktrees, submodules] = await Promise.all([
        light ? Promise.resolve(get().repos[path]?.commits ?? []) : gitApi.log(path, maxCount),
        gitApi.branches(path),
        gitApi.status(path),
        gitApi.stashes(path),
        gitApi.remotes(path),
        gitApi.mergeState(path),
        gitApi.worktrees(path).catch(() => []),
        gitApi.submodules(path).catch(() => [])
      ])
      patch(path, {
        commits,
        branches,
        status,
        stashes,
        remotes,
        mergeState,
        worktrees,
        submodules,
        loading: false,
        lastRefreshAt: Date.now()
      })
    } catch (err) {
      patch(path, { loading: false })
      toast('error', err instanceof Error ? err.message : String(err))
    }
  },

  select: (path, selected) => get().patch(path, { selected }),

  loadMore: (path) => {
    const repo = get().repos[path]
    if (!repo) return
    const step = useSettingsStore.getState().settings.loadMoreCount ?? 400
    get().patch(path, { maxCount: repo.maxCount + step })
    void get().refresh(path)
  },

  refreshRemoteTags: async (path) => {
    const repo = get().repos[path]
    const remote = repo?.remotes[0]?.name
    if (!remote) return
    const names = await gitApi.getRemoteTags(path, remote).catch(() => [])
    get().patch(path, { remoteTagNames: names })
  },

  refreshCiStatuses: async (path) => {
    const repo = get().repos[path]
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) return
    const profile = useSettingsStore.getState().activeProfile()
    const token = profile.githubToken
    if (!token) return
    const shas = (repo?.commits ?? []).slice(0, 40).map((c) => c.hash)
    if (!shas.length) return
    const existing = repo?.ciStatuses ?? {}
    // Refetch shas we have never seen AND ones still pending — a pending entry
    // would otherwise stay cached forever, leaving the badge stuck on the clock
    // icon even after the CI/deploy completed.
    const toFetch = shas.filter((sha) => {
      const cur = existing[sha]
      return !cur || cur.state === 'pending'
    })
    if (!toFetch.length) return
    const fresh = await hostingApi.ciStatuses(origin.url, toFetch, token).catch(() => ({}))
    get().patch(path, { ciStatuses: { ...existing, ...fresh } })
  },

  refreshPRs: async (path, opts) => {
    const repo = get().repos[path]
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) return
    const profile = useSettingsStore.getState().activeProfile()
    try {
      const { provider, prs } = await hostingApi.listPRs(origin.url, {
        github: profile.githubToken || undefined,
        azure: profile.azureToken || undefined
      })
      get().patch(path, { prs, prProvider: provider })
    } catch (err) {
      if (!opts?.silent) toast('error', err instanceof Error ? err.message : String(err))
    }
  },

  refreshIssues: async (path, opts) => {
    const repo = get().repos[path]
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) return
    const profile = useSettingsStore.getState().activeProfile()
    try {
      const { issues } = await hostingApi.listIssues(origin.url, { github: profile.githubToken || undefined })
      get().patch(path, { issues })
    } catch (err) {
      if (!opts?.silent) toast('error', err instanceof Error ? err.message : String(err))
    }
  },

  refreshReleases: async (path, opts) => {
    const repo = get().repos[path]
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) return
    const profile = useSettingsStore.getState().activeProfile()
    try {
      const { provider, releases } = await hostingApi.listReleases(origin.url, {
        github: profile.githubToken || undefined
      })
      get().patch(path, { releases, releaseProvider: provider })
    } catch (err) {
      if (!opts?.silent) toast('error', err instanceof Error ? err.message : String(err))
    }
  },

  run: async (path, label, fn, undoEntry) => {
    const ui = useUIStore.getState()
    ui.setBusy(label)
    try {
      await fn()
      toast('success', label)
      if (undoEntry) {
        const repo = get().repos[path]
        if (repo) {
          get().patch(path, {
            undoStack: [...repo.undoStack, undoEntry].slice(-30),
            redoStack: []
          })
        }
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isConflictErrorMessage(message)) toast('info', conflictHint(message))
      else toast('error', message)
      return false
    } finally {
      useUIStore.getState().setBusy(null)
      await get().refresh(path)
    }
  },

  undo: async (path) => {
    const repo = get().repos[path]
    const entry = repo?.undoStack[repo.undoStack.length - 1]
    if (!repo || !entry) {
      toast('info', 'Nothing to undo')
      return
    }
    useUIStore.getState().setBusy(`Undo: ${entry.label}`)
    try {
      await entry.undo()
      get().patch(path, {
        undoStack: repo.undoStack.slice(0, -1),
        redoStack: [...repo.redoStack, entry]
      })
      toast('success', `Undone: ${entry.label}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      useUIStore.getState().setBusy(null)
      await get().refresh(path)
    }
  },

  redo: async (path) => {
    const repo = get().repos[path]
    const entry = repo?.redoStack[repo.redoStack.length - 1]
    if (!repo || !entry) {
      toast('info', 'Nothing to redo')
      return
    }
    useUIStore.getState().setBusy(`Redo: ${entry.label}`)
    try {
      await entry.redo()
      get().patch(path, {
        redoStack: repo.redoStack.slice(0, -1),
        undoStack: [...repo.undoStack, entry]
      })
      toast('success', `Redone: ${entry.label}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      useUIStore.getState().setBusy(null)
      await get().refresh(path)
    }
  }
}))

// ─── Use-cases (application layer) ─────────────────────────────────────────

// Push the branch, surfacing a helpful recovery dialog when the remote rejects
// a non-force push because it has commits we don't have locally.
async function runPush(path: string, branch: string, force: boolean): Promise<boolean> {
  const ui = useUIStore.getState()
  const label = force ? `Force pushed ${branch}` : `Pushed ${branch}`
  ui.setBusy(force ? `Force pushing ${branch}` : `Pushing ${branch}`)
  try {
    await gitApi.push(path, branch, { force })
    toast('success', label)
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!force && isNonFastForwardError(message)) {
      useUIStore.getState().openModal({
        kind: 'confirm',
        title: 'Push rejected',
        message: `The remote "${branch}" has commits that you don't have locally, so the push was rejected.\n\nPull the remote changes first (recommended) — this keeps both sets of commits. Force pushing instead overwrites the remote with your local history and can discard others' work.`,
        confirmLabel: 'Pull (rebase) & push',
        onConfirm: () => {
          void repoActions.pull(path, 'rebase').then((ok) => {
            if (ok) void runPush(path, branch, false)
          })
        },
        secondaryLabel: 'Force push',
        secondaryDanger: true,
        onSecondary: () => void runPush(path, branch, true)
      })
      return false
    }
    toast('error', message)
    return false
  } finally {
    useUIStore.getState().setBusy(null)
    await useRepoStore.getState().refresh(path)
  }
}

export const repoActions = {
  checkout: (path: string, ref: string) => {
    const prev = useRepoStore.getState().repos[path]?.branches.current
    return useRepoStore.getState().run(path, `Checked out ${ref}`, () => gitApi.checkout(path, ref), {
      label: `checkout ${ref}`,
      undo: () => gitApi.checkout(path, prev ?? '-'),
      redo: () => gitApi.checkout(path, ref)
    })
  },

  checkoutRemote: (path: string, fullName: string, localName: string) =>
    useRepoStore
      .getState()
      .run(path, `Checked out ${localName}`, () => gitApi.checkoutRemote(path, fullName, localName)),

  createBranch: (path: string, name: string, at?: string) => {
    const prev = useRepoStore.getState().repos[path]?.branches.current
    return useRepoStore.getState().run(path, `Created branch ${name}`, () => gitApi.createBranch(path, name, at), {
      label: `create branch ${name}`,
      undo: async () => {
        await gitApi.checkout(path, prev ?? '-')
        await gitApi.deleteBranch(path, name, true)
      },
      redo: () => gitApi.createBranch(path, name, at)
    })
  },

  deleteBranch: (path: string, name: string, sha: string) =>
    useRepoStore.getState().run(path, `Deleted branch ${name}`, () => gitApi.deleteBranch(path, name, true), {
      label: `delete branch ${name}`,
      undo: () => gitApi.createBranch(path, name, sha, false),
      redo: () => gitApi.deleteBranch(path, name, true)
    }),

  deleteRemoteBranch: (path: string, remote: string, name: string) =>
    useRepoStore
      .getState()
      .run(path, `Deleted ${remote}/${name}`, () => gitApi.deleteRemoteBranch(path, remote, name)),

  addRemote: (path: string, name: string, url: string, pushUrl?: string) =>
    useRepoStore.getState().run(path, `Added remote ${name}`, async () => {
      await gitApi.addRemote(path, name, url, pushUrl)
      await gitApi.fetchAll(path)
    }),

  removeRemote: (path: string, name: string) =>
    useRepoStore.getState().run(path, `Removed remote ${name}`, () => gitApi.removeRemote(path, name)),

  editRemote: (path: string, oldName: string, newName: string, url: string, pushUrl?: string) =>
    useRepoStore
      .getState()
      .run(path, `Updated remote ${newName || oldName}`, () =>
        gitApi.editRemote(path, oldName, newName, url, pushUrl)
      ),

  fetchRemote: (path: string, name: string) =>
    useRepoStore.getState().run(path, `Fetched ${name}`, () => gitApi.fetchRemote(path, name)),

  // Add a remote, then push the current branch to it (used by the "create remote & push" flow).
  addRemoteAndPush: (path: string, name: string, url: string, pushUrl?: string) =>
    useRepoStore.getState().run(path, `Pushed to ${name}`, async () => {
      await gitApi.addRemote(path, name, url, pushUrl)
      const branch = useRepoStore.getState().repos[path]?.branches.current
      if (branch) await gitApi.push(path, branch, { remote: name })
      await gitApi.fetchAll(path)
    }),

  renameBranch: (path: string, oldName: string, newName: string) =>
    useRepoStore.getState().run(path, `Renamed ${oldName} → ${newName}`, () => gitApi.renameBranch(path, oldName, newName), {
      label: `rename branch`,
      undo: () => gitApi.renameBranch(path, newName, oldName),
      redo: () => gitApi.renameBranch(path, oldName, newName)
    }),

  merge: (path: string, ref: string) => {
    const noFf = useSettingsStore.getState().settings.mergeCommit
    return useRepoStore.getState().run(path, `Merged ${ref}`, () => gitApi.merge(path, ref, noFf), {
      label: `merge ${ref}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.merge(path, ref, noFf)
    })
  },

  mergeInto: (path: string, source: string, target: string) => {
    const noFf = useSettingsStore.getState().settings.mergeCommit
    return useRepoStore
      .getState()
      .run(path, `Merged ${source} into ${target}`, () => gitApi.mergeInto(path, source, target, noFf), {
        label: `merge ${source} into ${target}`,
        undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
        redo: () => gitApi.mergeInto(path, source, target, noFf)
      })
  },

  rebase: (path: string, onto: string) =>
    useRepoStore.getState().run(path, `Rebased onto ${onto}`, () => gitApi.rebase(path, onto), {
      label: `rebase onto ${onto}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.rebase(path, onto)
    }),

  fetchAll: async (path: string) => {
    const ok = await useRepoStore.getState().run(path, 'Fetched all remotes', () => gitApi.fetchAll(path))
    if (ok) useRepoStore.getState().patch(path, { lastFetchAt: Date.now() })
    return ok
  },

  pull: async (path: string, mode: 'default' | 'ff-only' | 'rebase') => {
    const ok = await useRepoStore.getState().run(path, `Pulled (${mode})`, () => gitApi.pull(path, mode), {
      label: `pull ${mode}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.pull(path, mode)
    })
    if (ok) useRepoStore.getState().patch(path, { lastFetchAt: Date.now() })
    return ok
  },

  push: (path: string, force = false) => {
    const repo = useRepoStore.getState().repos[path]
    const branch = repo?.branches.current
    if (!branch) return Promise.resolve(false)
    if (!repo?.remotes.length) {
      useUIStore.getState().openModal({
        kind: 'confirm',
        title: 'No remote',
        message: 'There are no remotes to push to, would you like to add one?',
        confirmLabel: 'Yes',
        onConfirm: () =>
          useUIStore.getState().openModal({
            kind: 'addRemote',
            path,
            defaultName: 'origin',
            existingNames: [],
            matchName: path.split(/[/\\]/).filter(Boolean).pop()
          })
      })
      return Promise.resolve(false)
    }
    return runPush(path, branch, force)
  },

  stash: (path: string, message?: string) =>
    useRepoStore.getState().run(path, 'Stashed changes', () => gitApi.stash(path, message), {
      label: 'stash',
      undo: () => gitApi.stashPop(path, 0),
      redo: () => gitApi.stash(path, message)
    }),

  stashPop: (path: string, index = 0) =>
    useRepoStore.getState().run(path, 'Popped stash', () => gitApi.stashPop(path, index), {
      label: 'stash pop',
      undo: () => gitApi.stash(path),
      redo: () => gitApi.stashPop(path, 0)
    }),

  stashApply: (path: string, index = 0) =>
    useRepoStore.getState().run(path, 'Applied stash', () => gitApi.stashApply(path, index)),

  stashApplyFiles: (path: string, sha: string, tracked: string[], untracked: string[]) =>
    useRepoStore
      .getState()
      .run(path, `Restored ${tracked.length + untracked.length} file(s) from stash`, () =>
        gitApi.stashApplyFiles(path, sha, tracked, untracked)
      ),

  stashDrop: (path: string, index = 0) =>
    useRepoStore.getState().run(path, 'Dropped stash', () => gitApi.stashDrop(path, index)),

  commit: (path: string, message: string, amend = false) =>
    useRepoStore.getState().run(path, amend ? 'Amended commit' : 'Committed', () => gitApi.commit(path, message, amend), {
      label: 'commit',
      undo: () => gitApi.reset(path, 'HEAD~1', 'soft'),
      redo: () => gitApi.commit(path, message)
    }),

  amendCommitMessage: (path: string, message: string, previousMessage?: string) =>
    useRepoStore
      .getState()
      .run(path, 'Updated last commit message', () => gitApi.amendCommitMessage(path, message), previousMessage
        ? {
            label: 'amend commit message',
            undo: () => gitApi.amendCommitMessage(path, previousMessage),
            redo: () => gitApi.amendCommitMessage(path, message)
          }
        : undefined),

  cherryPick: (path: string, hash: string, noCommit = false) =>
    noCommit
      ? useRepoStore
          .getState()
          .run(path, `Applied changes from ${hash.slice(0, 7)} (no commit)`, () => gitApi.cherryPick(path, hash, true))
      : useRepoStore.getState().run(path, `Cherry-picked ${hash.slice(0, 7)}`, () => gitApi.cherryPick(path, hash), {
          label: 'cherry-pick',
          undo: () => gitApi.reset(path, 'HEAD~1', 'hard'),
          redo: () => gitApi.cherryPick(path, hash)
        }),

  conflictContinue: (path: string, kind: ConflictOpKind) =>
    useRepoStore.getState().run(path, `Continued ${kind}`, () => gitApi.conflictOpContinue(path, kind)),

  conflictAbort: (path: string, kind: ConflictOpKind) =>
    useRepoStore.getState().run(path, `Aborted ${kind}`, () => gitApi.conflictOpAbort(path, kind)),

  conflictTakeSide: (path: string, file: string, side: ConflictSide) => {
    const verb = side === 'delete' ? 'Deleted' : side === 'ours' ? 'Kept ours for' : 'Kept theirs for'
    return useRepoStore.getState().run(path, `${verb} ${file}`, () => gitApi.conflictTakeSide(path, file, side))
  },

  revertCommit: (path: string, hash: string) =>
    useRepoStore.getState().run(path, `Reverted ${hash.slice(0, 7)}`, () => gitApi.revertCommit(path, hash), {
      label: 'revert',
      undo: () => gitApi.reset(path, 'HEAD~1', 'hard'),
      redo: () => gitApi.revertCommit(path, hash)
    }),

  reset: (path: string, ref: string, mode: 'soft' | 'mixed' | 'hard') =>
    useRepoStore.getState().run(path, `Reset (${mode}) to ${ref.slice(0, 7)}`, () => gitApi.reset(path, ref, mode)),

  applyPatch: (path: string, content: string, am: boolean) =>
    useRepoStore
      .getState()
      .run(path, am ? 'Applied patch (git am)' : 'Applied patch', () => gitApi.applyPatch(path, content, am)),

  createTag: (path: string, name: string, hash?: string) =>
    useRepoStore.getState().run(path, `Created tag ${name}`, () => gitApi.createTag(path, name, hash), {
      label: `tag ${name}`,
      undo: () => gitApi.deleteTag(path, name),
      redo: () => gitApi.createTag(path, name, hash)
    }),

  deleteTag: (path: string, name: string) =>
    useRepoStore.getState().run(path, `Deleted tag ${name}`, () => gitApi.deleteTag(path, name)),

  pushTag: (path: string, name: string, remote = 'origin') =>
    useRepoStore.getState().run(path, `Pushed tag ${name} to ${remote}`, () => gitApi.pushTag(path, name, remote)),

  deleteRemoteTag: (path: string, name: string, remote = 'origin') =>
    useRepoStore.getState().run(path, `Deleted tag ${name} from ${remote}`, () => gitApi.deleteRemoteTag(path, name, remote)),

  refreshRemoteTags: (path: string) => useRepoStore.getState().refreshRemoteTags(path),
  refreshCiStatuses: (path: string) => useRepoStore.getState().refreshCiStatuses(path),

  stage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, `Staged ${files.length} file(s)`, () => gitApi.stage(path, files)),
  stageAll: (path: string) => useRepoStore.getState().run(path, 'Staged all', () => gitApi.stageAll(path)),
  unstage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, `Unstaged ${files.length} file(s)`, () => gitApi.unstage(path, files)),
  unstageAll: (path: string) => useRepoStore.getState().run(path, 'Unstaged all', () => gitApi.unstageAll(path)),
  discard: (path: string, files: string[], untracked: boolean) =>
    useRepoStore.getState().run(path, `Discarded ${files.length} file(s)`, () => gitApi.discard(path, files, untracked)),

  addToGitignore: (path: string, patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, `Added ${label ?? `${patterns.length} entr${patterns.length === 1 ? 'y' : 'ies'}`} to .gitignore`, async () => {
      const added = await gitApi.addToGitignore(path, patterns)
      if (added.length === 0) useUIStore.getState().toast('info', 'Already in .gitignore')
    }),

  addToGitignoreAt: (path: string, dir: string, patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, `Added ${label ?? patterns.join(', ')} to .gitignore`, async () => {
      const added = await gitApi.addToGitignoreAt(path, dir, patterns)
      if (added.length === 0) useUIStore.getState().toast('info', 'Already in .gitignore')
    }),

  untrack: (path: string, files: string[], deleteFromDisk: boolean, label?: string) =>
    useRepoStore.getState().run(
      path,
      deleteFromDisk
        ? `Removed ${label ?? `${files.length} file(s)`} from Git and disk`
        : `Untracked ${label ?? `${files.length} file(s)`}`,
      () => gitApi.untrack(path, files, deleteFromDisk)
    ),

  ignoreAndUntrack: (path: string, files: string[], patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, `Ignored ${label ?? `${files.length} file(s)`}`, async () => {
      await gitApi.untrack(path, files, false)
      await gitApi.addToGitignore(path, patterns)
    }),

  worktreeAdd: (path: string, dir: string, branch: string, newBranch: boolean) =>
    useRepoStore.getState().run(path, `Added worktree ${dir}`, () => gitApi.worktreeAdd(path, dir, branch, newBranch)),

  worktreeRemove: (path: string, dir: string, force = false) =>
    useRepoStore.getState().run(path, `Removed worktree ${dir}`, () => gitApi.worktreeRemove(path, dir, force)),

  submoduleAdd: (path: string, url: string, dir: string, branch?: string) =>
    useRepoStore.getState().run(path, `Added submodule ${dir}`, () => gitApi.submoduleAdd(path, url, dir, branch)),

  submoduleUpdate: (path: string, dir?: string) =>
    useRepoStore
      .getState()
      .run(path, dir ? `Updated submodule ${dir}` : 'Updated submodules', () => gitApi.submoduleUpdate(path, dir, true)),

  submoduleSync: (path: string, dir?: string) =>
    useRepoStore
      .getState()
      .run(path, dir ? `Synced submodule ${dir}` : 'Synced submodules', () => gitApi.submoduleSync(path, dir)),

  submoduleSetUrl: (path: string, name: string, url: string) =>
    useRepoStore.getState().run(path, `Updated URL for ${name}`, () => gitApi.submoduleSetUrl(path, name, url)),

  submoduleRemove: (path: string, dir: string) =>
    useRepoStore.getState().run(path, `Removed submodule ${dir}`, () => gitApi.submoduleRemove(path, dir))
}
