import { create } from 'zustand'
import type {
  BranchesPayload,
  ConflictOpKind,
  ConflictSide,
  GraphCommit,
  PullRequest,
  RemoteInfo,
  RepoStatus,
  StashInfo,
  HostingProvider,
  WorktreeInfo
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
  prs: PullRequest[]
  prProvider: HostingProvider
  mergeState: ConflictOpKind | null
  selected: Selection | null
  loading: boolean
  maxCount: number
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]
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
  prs: [],
  prProvider: null,
  mergeState: null,
  selected: null,
  loading: true,
  maxCount: useSettingsStore.getState().settings.initialCommitCount ?? 400,
  undoStack: [],
  redoStack: []
})

interface RepoStoreState {
  repos: Record<string, RepoData>

  ensure(path: string): Promise<void>
  refresh(path: string): Promise<void>
  patch(path: string, partial: Partial<RepoData>): void
  select(path: string, sel: Selection | null): void
  loadMore(path: string): void
  refreshPRs(path: string): Promise<void>

  run(path: string, label: string, fn: () => Promise<void>, undoEntry?: UndoEntry): Promise<boolean>
  undo(path: string): Promise<void>
  redo(path: string): Promise<void>
}

const toast = (kind: 'success' | 'error' | 'info', msg: string): void => useUIStore.getState().toast(kind, msg)

function isConflictErrorMessage(msg: string): boolean {
  return /\bCONFLICT(S)?\b|Automatic merge failed|after resolving the conflicts|CHERRY_PICK_HEAD/i.test(msg)
}

function conflictHint(msg: string): string {
  if (/CHERRY_PICK_HEAD/i.test(msg)) return 'Cherry-pick paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  if (/rebase/i.test(msg)) return 'Rebase paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  if (/revert/i.test(msg)) return 'Revert paused due to conflicts. Resolve files in the Conflicted files panel, then Continue.'
  return 'Merge has conflicts. Resolve files in the Conflicted files panel, then Continue.'
}

export const useRepoStore = create<RepoStoreState>((set, get) => ({
  repos: {},

  patch: (path, partial) =>
    set((s) => ({ repos: { ...s.repos, [path]: { ...(s.repos[path] ?? emptyRepo(path)), ...partial } } })),

  ensure: async (path) => {
    if (get().repos[path]) return
    get().patch(path, {})
    await get().refresh(path)
  },

  refresh: async (path) => {
    const { patch } = get()
    const maxCount = get().repos[path]?.maxCount ?? 400
    try {
      const [commits, branches, status, stashes, remotes, mergeState, worktrees] = await Promise.all([
        gitApi.log(path, maxCount),
        gitApi.branches(path),
        gitApi.status(path),
        gitApi.stashes(path),
        gitApi.remotes(path),
        gitApi.mergeState(path),
        gitApi.worktrees(path).catch(() => [])
      ])
      patch(path, { commits, branches, status, stashes, remotes, mergeState, worktrees, loading: false })
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

  refreshPRs: async (path) => {
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
      toast('error', err instanceof Error ? err.message : String(err))
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

  addRemote: (path: string, name: string, url: string) =>
    useRepoStore.getState().run(path, `Added remote ${name}`, async () => {
      await gitApi.addRemote(path, name, url)
      await gitApi.fetchAll(path)
    }),

  removeRemote: (path: string, name: string) =>
    useRepoStore.getState().run(path, `Removed remote ${name}`, () => gitApi.removeRemote(path, name)),

  renameBranch: (path: string, oldName: string, newName: string) =>
    useRepoStore.getState().run(path, `Renamed ${oldName} → ${newName}`, () => gitApi.renameBranch(path, oldName, newName), {
      label: `rename branch`,
      undo: () => gitApi.renameBranch(path, newName, oldName),
      redo: () => gitApi.renameBranch(path, oldName, newName)
    }),

  merge: (path: string, ref: string) =>
    useRepoStore.getState().run(path, `Merged ${ref}`, () => gitApi.merge(path, ref), {
      label: `merge ${ref}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.merge(path, ref)
    }),

  mergeInto: (path: string, source: string, target: string) =>
    useRepoStore.getState().run(path, `Merged ${source} into ${target}`, () => gitApi.mergeInto(path, source, target), {
      label: `merge ${source} into ${target}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.mergeInto(path, source, target)
    }),

  rebase: (path: string, onto: string) =>
    useRepoStore.getState().run(path, `Rebased onto ${onto}`, () => gitApi.rebase(path, onto), {
      label: `rebase onto ${onto}`,
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.rebase(path, onto)
    }),

  fetchAll: (path: string) => useRepoStore.getState().run(path, 'Fetched all remotes', () => gitApi.fetchAll(path)),

  pull: (path: string, mode: 'default' | 'ff-only' | 'rebase') =>
    useRepoStore
      .getState()
      .run(path, `Pulled (${mode})`, () => gitApi.pull(path, mode), {
        label: `pull ${mode}`,
        undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
        redo: () => gitApi.pull(path, mode)
      }),

  push: (path: string, force = false) => {
    const branch = useRepoStore.getState().repos[path]?.branches.current
    if (!branch) return Promise.resolve(false)
    return useRepoStore
      .getState()
      .run(path, force ? `Force pushed ${branch}` : `Pushed ${branch}`, () => gitApi.push(path, branch, { force }))
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

  stage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, `Staged ${files.length} file(s)`, () => gitApi.stage(path, files)),
  stageAll: (path: string) => useRepoStore.getState().run(path, 'Staged all', () => gitApi.stageAll(path)),
  unstage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, `Unstaged ${files.length} file(s)`, () => gitApi.unstage(path, files)),
  unstageAll: (path: string) => useRepoStore.getState().run(path, 'Unstaged all', () => gitApi.unstageAll(path)),
  discard: (path: string, files: string[], untracked: boolean) =>
    useRepoStore.getState().run(path, `Discarded ${files.length} file(s)`, () => gitApi.discard(path, files, untracked)),

  worktreeAdd: (path: string, dir: string, branch: string, newBranch: boolean) =>
    useRepoStore.getState().run(path, `Added worktree ${dir}`, () => gitApi.worktreeAdd(path, dir, branch, newBranch)),

  worktreeRemove: (path: string, dir: string, force = false) =>
    useRepoStore.getState().run(path, `Removed worktree ${dir}`, () => gitApi.worktreeRemove(path, dir, force))
}
