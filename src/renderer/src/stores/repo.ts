import { create } from 'zustand'
import type {
  BranchesPayload,
  CiStatus,
  ConflictContext,
  ConflictOpKind,
  ConflictSide,
  GraphCommit,
  PrPreviewMode,
  PullRequest,
  IssueInfo,
  MilestoneInfo,
  ReleaseInfo,
  RemoteInfo,
  RepoStatus,
  StashInfo,
  HostingProvider,
  WorktreeInfo,
  SubmoduleInfo,
  TreeStatusKind,
  FsDropMode,
  MergePreviewResult,
  ForcedRefUpdate,
  GitflowConfig,
  GitflowKind,
  GitflowSnapshot
} from '../../../shared/types'
import { gitApi, hostingApi } from '../infrastructure/api'
import { useUIStore } from './ui'
import { useSettingsStore } from './settings'
import { isSecretFile } from '../lib/secrets'
import { commitHookFailureHint } from '../lib/commitLint'
import { t, interp } from '../i18n'

/** Repos already warned this session about pushing tracked secrets (don't nag). */
const secretPushWarned = new Set<string>()

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
  /** Hashes that arrived in the last fetch/pull this session (graph "new" mark). */
  newCommits: string[]
  branches: BranchesPayload
  status: RepoStatus | null
  stashes: StashInfo[]
  remotes: RemoteInfo[]
  worktrees: WorktreeInfo[]
  submodules: SubmoduleInfo[]
  prs: PullRequest[]
  prProvider: HostingProvider
  issues: IssueInfo[]
  milestones: MilestoneInfo[]
  releases: ReleaseInfo[]
  releaseProvider: HostingProvider
  mergeState: ConflictOpKind | null
  /** Source/target branches + per-side commits of the in-progress conflict op. */
  conflictContext: ConflictContext | null
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
  /** Repo-relative path → working-tree status, for the project tree colors. */
  treeStatus: Record<string, TreeStatusKind>
  /** Shas carrying a git note. Notes are invisible in a normal log, so the
   *  graph marks them — otherwise nobody discovers they exist. */
  notedShas: string[]
  /** The opened folder is not a git repo yet — show the "initialize" prompt. */
  notGit: boolean
  /** Last Conflict Radar scan, kept so branch rows can wear their risk dot. */
  mergeRisk: MergePreviewResult | null
  /** Remote refs rewritten by the last fetch, keyed by short name
   *  (`origin/feature`). Feeds the "history was rewritten" marker and gives the
   *  range-diff the exact commit the branch used to point at. */
  forcedUpdates: Record<string, ForcedRefUpdate>
}

const emptyRepo = (path: string): RepoData => ({
  path,
  name: path.split('/').pop() ?? path,
  commits: [],
  newCommits: [],
  branches: { current: '', locals: [], remotes: [], tags: [] },
  status: null,
  stashes: [],
  remotes: [],
  worktrees: [],
  submodules: [],
  prs: [],
  prProvider: null,
  issues: [],
  milestones: [],
  releases: [],
  releaseProvider: null,
  mergeState: null,
  conflictContext: null,
  selected: null,
  loading: true,
  maxCount: useSettingsStore.getState().settings.initialCommitCount ?? 400,
  undoStack: [],
  redoStack: [],
  remoteTagNames: [],
  lastRefreshAt: null,
  lastFetchAt: null,
  ciStatuses: {},
  treeStatus: {},
  notedShas: [],
  notGit: false,
  mergeRisk: null,
  forcedUpdates: {}
})

interface RepoStoreState {
  repos: Record<string, RepoData>
  /** Per-repo commit summary draft, shared between the WIP graph row and the composer. */
  drafts: Record<string, string>

  ensure(path: string): Promise<void>
  refresh(path: string, opts?: { light?: boolean; only?: RefreshSlice[] }): Promise<void>
  patch(path: string, partial: Partial<RepoData>): void
  select(path: string, sel: Selection | null): void
  setDraft(path: string, value: string): void
  loadMore(path: string): void
  refreshPRs(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshIssues(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshMilestones(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshReleases(path: string, opts?: { silent?: boolean }): Promise<void>
  refreshRemoteTags(path: string): Promise<void>
  refreshCiStatuses(path: string): Promise<void>

  run(path: string, label: string, fn: () => Promise<void>, undoEntry?: UndoEntry, op?: 'push' | 'pull' | 'fetch' | null, onError?: (message: string) => boolean, refetch?: RefreshSlice[]): Promise<boolean>
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

function isUntrackedStashCollision(msg: string): boolean {
  return /could not restore untracked files from stash/i.test(msg)
}

/**
 * When a stash apply/pop aborts because its untracked files already exist,
 * offer to overwrite them and retry. Returns true if the error was handled
 * (so the caller suppresses the default error toast).
 */
function promptStashOverwrite(message: string, path: string, index: number, pop: boolean): boolean {
  if (!isUntrackedStashCollision(message)) return false
  useUIStore.getState().openModal({
    kind: 'confirm',
    danger: true,
    title: t('confirm.overwriteUntracked.title'),
    message: t('confirm.overwriteUntracked.message'),
    confirmLabel: t('confirm.overwriteUntracked.ok'),
    onConfirm: () => void repoActions.stashApplyOverwrite(path, index, pop)
  })
  return true
}

function conflictHint(msg: string): string {
  if (/CHERRY_PICK_HEAD/i.test(msg)) return t('conflictHint.cherryPick')
  if (/rebase/i.test(msg)) return t('conflictHint.rebase')
  if (/revert/i.test(msg)) return t('conflictHint.revert')
  return t('conflictHint.merge')
}

// ─── Command queue + refresh coalescing (perf/reliability) ─────────────────
//
// Which slices of repo state a refresh should re-read. Omitting a slice leaves
// its previous value (and, crucially, its array *identity*) untouched — so a
// stage/stash refresh that excludes 'log' does not hand the graph a fresh
// `commits` array, and the layout memo never invalidates.
export type RefreshSlice =
  | 'log'
  | 'branches'
  | 'status'
  | 'stashes'
  | 'remotes'
  | 'mergeState'
  | 'worktrees'
  | 'submodules'
  | 'treeStatus'

const ALL_SLICES: RefreshSlice[] = [
  'log',
  'branches',
  'status',
  'stashes',
  'remotes',
  'mergeState',
  'worktrees',
  'submodules',
  'treeStatus'
]

/** How long the FS watcher ignores its own repo after a local git write, so the
 *  app's own mutation doesn't trigger a second, redundant full refresh. */
const WATCH_MUTE_MS = 2000

function muteWatcher(path: string): void {
  // Optional-chained: window.api is absent under unit tests / headless stubs.
  try {
    ;(window as unknown as { api?: { watch?: { mute?: (p: string, ms: number) => void } } }).api?.watch?.mute?.(
      path,
      WATCH_MUTE_MS
    )
  } catch {
    /* ignore — muting is a best-effort optimisation */
  }
}

// Serialize every mutating op per repo. `next` chains onto the tail so the user
// cannot start action B until action A — *including its post-action refresh* —
// has fully settled. This is the core "can't act until the last action is good"
// guarantee; the simple-git instance already serializes at the process level,
// but this makes the whole app-level unit (op + refresh) atomic and ordered.
const cmdChains = new Map<string, Promise<unknown>>()
function enqueue<T>(path: string, task: () => Promise<T>): Promise<T> {
  const prev = cmdChains.get(path) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(task)
  cmdChains.set(path, next)
  void next.catch(() => {}).finally(() => {
    if (cmdChains.get(path) === next) cmdChains.delete(path)
  })
  return next
}

// Coalesce concurrent refreshes for a path into one run, merging the requested
// slices. A burst of (post-action refresh + watcher + poll + focus) collapses
// to a single execution; requests that arrive mid-flight are folded into a
// trailing run rather than each re-shelling 9 git processes.
type PendingRefresh = Set<RefreshSlice> | 'full'
const refreshRunning = new Map<string, Promise<void>>()
const refreshPending = new Map<string, PendingRefresh>()

function mergePending(path: string, req: PendingRefresh): void {
  const cur = refreshPending.get(path)
  if (cur === 'full' || req === 'full') {
    refreshPending.set(path, 'full')
    return
  }
  if (!cur) {
    refreshPending.set(path, new Set(req))
    return
  }
  for (const s of req) cur.add(s)
}

// Re-read only the requested slices of repo state. Slices left out keep their
// previous value AND array identity, so excluding 'log'/'stashes' means the
// graph's `commits`/`stashes` memos never invalidate → no relayout.
async function doRefresh(path: string, slices: RefreshSlice[]): Promise<void> {
  const store = useRepoStore.getState()
  const repo = store.repos[path]
  const maxCount = repo?.maxCount ?? 400
  const want = new Set(slices)
  const keep = <T>(cur: T | undefined, want: boolean, fetch: () => Promise<T>, fallback: T): Promise<T> =>
    want ? fetch() : Promise.resolve(cur ?? fallback)
  try {
    const [commits, branches, status, stashes, remotes, conflictContext, worktrees, submodules, treeStatus, notedShas] =
      await Promise.all([
        keep(repo?.commits, want.has('log'), () => gitApi.log(path, maxCount), []),
        keep(repo?.branches, want.has('branches'), () => gitApi.branches(path), {
          current: '',
          locals: [],
          remotes: [],
          tags: []
        }),
        keep(repo?.status, want.has('status'), () => gitApi.status(path), null),
        keep(repo?.stashes, want.has('stashes'), () => gitApi.stashes(path), []),
        keep(repo?.remotes, want.has('remotes'), () => gitApi.remotes(path), []),
        // One call covers both: `mergeState` is just this payload's `kind`.
        keep(repo?.conflictContext, want.has('mergeState'), () => gitApi.conflictContext(path), null),
        keep(repo?.worktrees, want.has('worktrees'), () => gitApi.worktrees(path).catch(() => []), []),
        keep(repo?.submodules, want.has('submodules'), () => gitApi.submodules(path).catch(() => []), []),
        keep(repo?.treeStatus, want.has('treeStatus'), () => gitApi.treeStatus(path).catch(() => ({})), {}),
        keep(repo?.notedShas, want.has('log'), () => gitApi.notedCommits(path).catch(() => []), [])
      ])
    store.patch(path, {
      commits,
      branches,
      status,
      stashes,
      remotes,
      conflictContext,
      mergeState: conflictContext?.kind ?? null,
      worktrees,
      submodules,
      treeStatus,
      notedShas,
      loading: false,
      notGit: false,
      lastRefreshAt: Date.now()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Opened a plain folder, not a repo — offer to `git init` instead of a toast.
    if (/not a git repository/i.test(message)) {
      store.patch(path, { loading: false, notGit: true })
      return
    }
    store.patch(path, { loading: false })
    toast('error', message)
  }
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
    void get().refreshMilestones(path, { silent: true })
    void get().refreshReleases(path, { silent: true })
  },

  // Public refresh: coalesces concurrent calls per path and merges their
  // requested slices, then runs `doRefresh` once (repeating only if new
  // requests arrived while it was in flight). `only` re-reads just those slices
  // (leaving other array identities stable so the graph won't relayout); `light`
  // is the preset "everything except the commit log".
  refresh: (path, opts) => {
    const req: PendingRefresh = opts?.only
      ? new Set(opts.only)
      : opts?.light
        ? new Set(ALL_SLICES.filter((s) => s !== 'log'))
        : 'full'
    mergePending(path, req)
    const running = refreshRunning.get(path)
    if (running) return running
    const p = (async () => {
      try {
        // No `await` between the `!pend` check and the finally that clears
        // `refreshRunning`, so a concurrent refresh() cannot lose its request:
        // it either merges into `pend` during an await, or starts a fresh run.
        while (true) {
          const pend = refreshPending.get(path)
          if (!pend) break
          refreshPending.delete(path)
          await doRefresh(path, pend === 'full' ? ALL_SLICES : [...pend])
        }
      } finally {
        refreshRunning.delete(path)
      }
    })()
    refreshRunning.set(path, p)
    return p
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
        azure: profile.azureToken || undefined,
        gitlab: profile.gitlabToken || undefined,
        bitbucket: profile.bitbucketToken || undefined
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

  refreshMilestones: async (path, opts) => {
    const repo = get().repos[path]
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) return
    const profile = useSettingsStore.getState().activeProfile()
    try {
      const { milestones } = await hostingApi.listMilestones(origin.url, { github: profile.githubToken || undefined })
      get().patch(path, { milestones })
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

  run: (path, label, fn, undoEntry, op = null, onError, refetch) =>
    enqueue(path, async () => {
      const ui = useUIStore.getState()
      ui.beginInflight()
      ui.setBusy(label, op)
      // Ignore the FS-watch event our own write is about to produce; the
      // targeted refresh below already reflects it.
      muteWatcher(path)
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
        if (onError?.(message)) return false
        if (isConflictErrorMessage(message)) toast('info', conflictHint(message))
        else toast('error', message)
        return false
      } finally {
        const uiEnd = useUIStore.getState()
        uiEnd.setBusy(null)
        // The action is only "settled" once its refresh has completed — this
        // await is what makes the next queued action wait for a good state.
        await get().refresh(path, refetch ? { only: refetch } : undefined)
        uiEnd.endInflight()
      }
    }),

  undo: (path) => {
    const repo = get().repos[path]
    const entry = repo?.undoStack[repo.undoStack.length - 1]
    if (!repo || !entry) {
      toast('info', t('undo.nothingToUndo'))
      return Promise.resolve()
    }
    return enqueue(path, async () => {
      const ui = useUIStore.getState()
      ui.beginInflight()
      ui.setBusy(interp(t('undo.busy'), { label: entry.label }))
      muteWatcher(path)
      try {
        await entry.undo()
        get().patch(path, {
          undoStack: repo.undoStack.slice(0, -1),
          redoStack: [...repo.redoStack, entry]
        })
        toast('success', interp(t('undo.done'), { label: entry.label }))
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        useUIStore.getState().setBusy(null)
        await get().refresh(path)
        useUIStore.getState().endInflight()
      }
    })
  },

  redo: (path) => {
    const repo = get().repos[path]
    const entry = repo?.redoStack[repo.redoStack.length - 1]
    if (!repo || !entry) {
      toast('info', t('undo.nothingToRedo'))
      return Promise.resolve()
    }
    return enqueue(path, async () => {
      const ui = useUIStore.getState()
      ui.beginInflight()
      ui.setBusy(interp(t('redo.busy'), { label: entry.label }))
      muteWatcher(path)
      try {
        await entry.redo()
        get().patch(path, {
          redoStack: repo.redoStack.slice(0, -1),
          undoStack: [...repo.undoStack, entry]
        })
        toast('success', interp(t('redo.done'), { label: entry.label }))
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        useUIStore.getState().setBusy(null)
        await get().refresh(path)
        useUIStore.getState().endInflight()
      }
    })
  }
}))

// ─── Use-cases (application layer) ─────────────────────────────────────────

// Push the branch, surfacing a helpful recovery dialog when the remote rejects
// a non-force push because it has commits we don't have locally.
/**
 * The checks that run before any push: force-pushing a protected branch, and
 * publishing credential-looking files. Returns false when one of them opened a
 * confirmation — `retry` is what that confirmation runs on approval.
 */
async function pushGuards(
  path: string,
  branch: string,
  force: boolean,
  retry: () => void,
  protectedConfirmed = false
): Promise<boolean> {
  // Force-pushing a protected branch rewrites shared history — confirm first.
  if (force && !protectedConfirmed) {
    const protectedBranches = await gitApi.protectedBranches(path).catch(() => [] as string[])
    if (protectedBranches.includes(branch)) {
      useUIStore.getState().openModal({
        kind: 'confirm',
        danger: true,
        title: t('confirm.protectedForcePush.title'),
        message: interp(t('confirm.protectedForcePush.message'), { branch }),
        confirmLabel: t('confirm.forcePush.ok'),
        onConfirm: retry
      })
      return false
    }
  }
  // Secret guard: if this push would publish credential-looking files, warn
  // once per session. Only the files in the commits actually being pushed
  // count — secrets already tracked and pushed long ago shouldn't nag.
  if (!secretPushWarned.has(path)) {
    const pushing = await gitApi.filesToPush(path, branch).catch(() => [] as string[])
    const secrets = pushing.filter(isSecretFile)
    if (secrets.length > 0) {
      secretPushWarned.add(path)
      useUIStore.getState().openModal({
        kind: 'confirm',
        danger: true,
        title: t('confirm.pushSecrets.title'),
        message: interp(t('confirm.pushSecrets.message'), {
          files: secrets.slice(0, 10).join('\n'),
          more: secrets.length > 10 ? interp(t('confirm.pushSecrets.more'), { n: secrets.length - 10 }) : ''
        }),
        confirmLabel: t('confirm.pushSecrets.ok'),
        onConfirm: retry
      })
      return false
    }
  }
  return true
}

function runPush(path: string, branch: string, force: boolean): Promise<boolean> {
  return enqueue(path, () => runPushInner(path, branch, force))
}

async function runPushInner(path: string, branch: string, force: boolean): Promise<boolean> {
  const ui = useUIStore.getState()
  ui.beginInflight()
  const label = interp(force ? t('act.forcePushed') : t('act.pushed'), { branch })
  ui.setBusy(
    interp(force ? t('busy.forcePushing') : t('busy.pushing'), { branch }),
    'push'
  )
  muteWatcher(path)
  try {
    await gitApi.push(path, branch, { force })
    toast('success', label)
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!force && isNonFastForwardError(message)) {
      useUIStore.getState().openModal({
        kind: 'confirm',
        title: t('confirm.pushRejected.title'),
        message: interp(t('confirm.pushRejected.message'), { branch }),
        confirmLabel: t('confirm.pushRejected.ok'),
        onConfirm: () => {
          void repoActions.pull(path, 'rebase').then((ok) => {
            if (ok) void runPush(path, branch, false)
          })
        },
        secondaryLabel: t('confirm.forcePush.ok'),
        secondaryDanger: true,
        onSecondary: () => void runPush(path, branch, true)
      })
      return false
    }
    toast('error', message)
    return false
  } finally {
    const ui2 = useUIStore.getState()
    ui2.setBusy(null)
    await useRepoStore.getState().refresh(path)
    ui2.endInflight()
  }
}

// Check out a remote branch as a local one. When the local branch already
// exists and has diverged from the remote, a fast-forward is impossible, so we
// surface a dialog letting the user rebase / merge / reset instead of failing.
function runCheckoutRemote(path: string, fullName: string, localName: string, remote?: string): Promise<boolean> {
  return enqueue(path, () => runCheckoutRemoteInner(path, fullName, localName, remote))
}

async function runCheckoutRemoteInner(
  path: string,
  fullName: string,
  localName: string,
  remote?: string
): Promise<boolean> {
  const ui = useUIStore.getState()
  ui.beginInflight()
  ui.setBusy(interp(t('busy.checkingOut'), { name: localName }))
  muteWatcher(path)
  try {
    const res = await gitApi.checkoutRemote(path, fullName, localName, remote)
    if (res.diverged) {
      ui.openModal({
        kind: 'diverged-checkout',
        localName,
        fullName,
        ahead: res.ahead,
        behind: res.behind,
        onResolve: (strategy, backup) =>
          void runResolveDivergedCheckout(path, fullName, localName, strategy, backup)
      })
      return false
    }
    toast('success', interp(t('act.checkedOut'), { ref: localName }))
    return true
  } catch (err) {
    toast('error', err instanceof Error ? err.message : String(err))
    return false
  } finally {
    const ui2 = useUIStore.getState()
    ui2.setBusy(null)
    await useRepoStore.getState().refresh(path)
    ui2.endInflight()
  }
}

function runResolveDivergedCheckout(
  path: string,
  fullName: string,
  localName: string,
  strategy: 'rebase' | 'merge' | 'reset',
  backup: boolean
): Promise<boolean> {
  return enqueue(path, async () => {
    const ui = useUIStore.getState()
    ui.beginInflight()
    const verb =
      strategy === 'rebase'
        ? t('busy.rebasing')
        : strategy === 'merge'
          ? t('busy.merging')
          : t('busy.resetting')
    ui.setBusy(`${verb} ${localName}`)
    muteWatcher(path)
    try {
      const { backupRef } = await gitApi.resolveDivergedCheckout(path, fullName, localName, strategy, backup)
      const done = strategy === 'rebase' ? 'Rebased' : strategy === 'merge' ? 'Merged' : 'Reset'
      toast('success', backupRef ? `${done} ${localName} — backup saved as ${backupRef}` : `${done} ${localName}`)
      return true
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      return false
    } finally {
      const ui2 = useUIStore.getState()
      ui2.setBusy(null)
      await useRepoStore.getState().refresh(path)
      ui2.endInflight()
    }
  })
}

/** True when the repository really is mid-merge/rebase/cherry-pick right now. */
async function stillInProgress(path: string): Promise<boolean> {
  const state = await gitApi.conflictContext(path).catch(() => null)
  if (state?.kind) return true
  // Nothing in progress: the banner was stale. Clear it quietly.
  toast('info', t('conflict.alreadyDone'))
  await useRepoStore.getState().refresh(path)
  return false
}

/**
 * An error handler for the two banner actions: git complaining that there is
 * nothing in progress means the operation finished between the check and the
 * command, which is not worth a red toast.
 */
function isNoOpConflictError(path: string): (message: string) => boolean {
  return (message: string) => {
    if (!/no (merge|cherry-pick|revert|rebase) in progress|MERGE_HEAD missing|not currently on any branch/i.test(message)) {
      return false
    }
    toast('info', t('conflict.alreadyDone'))
    void useRepoStore.getState().refresh(path)
    return true
  }
}

export const repoActions = {
  // Refreshes every slice on purpose: moving HEAD rewrites the `HEAD -> …`
  // decoration the graph reads off each commit, plus the per-directory tree
  // status and each worktree's HEAD. Refetching only branches/status left the
  // graph's head badge (and the file-tree markers) on the previous branch until
  // something else triggered a full refresh — e.g. switching repo tabs.
  checkout: (path: string, ref: string) => {
    const prev = useRepoStore.getState().repos[path]?.branches.current
    return useRepoStore.getState().run(path, interp(t('act.checkedOut'), { ref }), () => gitApi.checkout(path, ref), {
      label: interp(t('undoLabel.checkout'), { ref }),
      undo: () => gitApi.checkout(path, prev ?? '-'),
      redo: () => gitApi.checkout(path, ref)
    })
  },

  checkoutRemote: (path: string, fullName: string, localName: string, remote?: string) =>
    runCheckoutRemote(path, fullName, localName, remote),

  createBranch: (path: string, name: string, at?: string) => {
    const prev = useRepoStore.getState().repos[path]?.branches.current
    return useRepoStore.getState().run(path, interp(t('act.createdBranch'), { name }), () => gitApi.createBranch(path, name, at), {
      label: interp(t('undoLabel.createBranch'), { name }),
      undo: async () => {
        await gitApi.checkout(path, prev ?? '-')
        await gitApi.deleteBranch(path, name, true)
      },
      redo: () => gitApi.createBranch(path, name, at)
    })
  },

  deleteBranch: (path: string, name: string, sha: string) =>
    useRepoStore.getState().run(path, interp(t('act.deletedBranch'), { name }), () => gitApi.deleteBranch(path, name, true), {
      label: interp(t('undoLabel.deleteBranch'), { name }),
      undo: () => gitApi.createBranch(path, name, sha, false),
      redo: () => gitApi.deleteBranch(path, name, true)
    }),

  deleteRemoteBranch: (path: string, remote: string, name: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.deletedRemoteBranch'), { remote, name }), () => gitApi.deleteRemoteBranch(path, remote, name)),

  // ─── git-flow ───
  gitflowStart: (path: string, kind: GitflowKind, name: string) => {
    const prev = useRepoStore.getState().repos[path]?.branches.current
    let created = ''
    return useRepoStore.getState().run(
      path,
      interp(t('act.gitflowStarted'), { kind, name }),
      async () => {
        created = await gitApi.gitflowStart(path, kind, name)
      },
      {
        label: interp(t('undoLabel.gitflowStart'), { name }),
        undo: async () => {
          await gitApi.checkout(path, prev ?? '-')
          await gitApi.deleteBranch(path, created, true)
        },
        redo: async () => {
          created = await gitApi.gitflowStart(path, kind, name)
        }
      }
    )
  },

  /** Finishing moves two branches and may create a tag, so the undo entry
   *  replays the whole snapshot rather than reversing one command. */
  gitflowFinish: (path: string, kind: GitflowKind, name: string, opts?: { tag?: boolean; message?: string }) => {
    let snapshot: GitflowSnapshot | null = null
    return useRepoStore.getState().run(
      path,
      interp(t('act.gitflowFinished'), { kind, name }),
      async () => {
        snapshot = await gitApi.gitflowFinish(path, kind, name, opts)
      },
      {
        label: interp(t('undoLabel.gitflowFinish'), { name }),
        undo: async () => {
          if (snapshot) await gitApi.gitflowUndo(path, snapshot)
        },
        redo: async () => {
          snapshot = await gitApi.gitflowFinish(path, kind, name, opts)
        }
      }
    )
  },

  gitflowInit: (path: string, config: GitflowConfig) =>
    useRepoStore
      .getState()
      .run(path, t('act.gitflowInitialized'), () => gitApi.gitflowInit(path, config)),

  // ─── Stacked branches ───
  // Create a new branch on top of the current one and record the dependency.
  createStackedBranch: (path: string, name: string) => {
    const parent = useRepoStore.getState().repos[path]?.branches.current
    return useRepoStore.getState().run(path, interp(t('act.createdStackedBranch'), { name }), async () => {
      await gitApi.createBranch(path, name)
      if (parent) await gitApi.stackSetParent(path, name, parent)
    })
  },

  stackSetParent: (path: string, branch: string, parent: string) =>
    useRepoStore.getState().run(path, interp(t('act.stacked'), { branch, parent }), () => gitApi.stackSetParent(path, branch, parent)),

  stackClearParent: (path: string, branch: string) =>
    useRepoStore.getState().run(path, interp(t('act.unstacked'), { branch }), () => gitApi.stackClearParent(path, branch)),

  stackRestack: (path: string, leaf: string) =>
    useRepoStore.getState().run(path, interp(t('act.restacked'), { leaf }), () => gitApi.stackRestack(path, leaf)),

  addRemote: (path: string, name: string, url: string, pushUrl?: string) =>
    useRepoStore.getState().run(path, interp(t('act.addedRemote'), { name }), async () => {
      await gitApi.addRemote(path, name, url, pushUrl)
      await gitApi.fetchAll(path)
    }),

  removeRemote: (path: string, name: string) =>
    useRepoStore.getState().run(path, interp(t('act.removedRemote'), { name }), () => gitApi.removeRemote(path, name)),

  editRemote: (path: string, oldName: string, newName: string, url: string, pushUrl?: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.updatedRemote'), { name: newName || oldName }), () =>
        gitApi.editRemote(path, oldName, newName, url, pushUrl)
      ),

  fetchRemote: (path: string, name: string) =>
    useRepoStore.getState().run(path, interp(t('act.fetchedRemote'), { name }), () => gitApi.fetchRemote(path, name)),

  /**
   * Fetch a pull request head — or any ref on a remote — and apply it locally
   * without writing a commit. Undo is what makes this safe to try on a whim: a
   * checked-out preview is unwound by going back to the previous branch and
   * dropping the branch we created, a merge preview by aborting the merge that
   * is still in progress.
   */
  previewRef: (
    path: string,
    remote: string,
    ref: string,
    mode: PrPreviewMode,
    localBranch: string | undefined,
    label: string
  ) => {
    const repo = useRepoStore.getState().repos[path]
    const prev = repo?.branches.current
    // Only delete the branch on undo if the preview is what created it.
    const preexisting = !!localBranch && !!repo?.branches.locals.some((b) => b.name === localBranch)
    const apply = async (): Promise<void> => {
      const res = await gitApi.previewRef(path, remote, ref, mode, localBranch)
      if (res.conflicts.length > 0) toast('info', interp(t('prPreview.conflicted'), { n: String(res.conflicts.length) }))
    }
    const undoEntry: UndoEntry =
      mode === 'merge'
        ? {
            label: t('undoLabel.previewMerge'),
            undo: () => gitApi.conflictOpAbort(path, 'merge'),
            redo: apply
          }
        : {
            label: interp(t('undoLabel.previewCheckout'), { name: localBranch ?? '' }),
            undo: async () => {
              await gitApi.checkout(path, prev ?? '-')
              if (localBranch && !preexisting) await gitApi.deleteBranch(path, localBranch, true)
            },
            redo: apply
          }
    return useRepoStore.getState().run(path, label, apply, undoEntry)
  },

  // Add a remote, then push the current branch to it (used by the "create remote & push" flow).
  addRemoteAndPush: (path: string, name: string, url: string, pushUrl?: string) =>
    useRepoStore.getState().run(path, interp(t('act.pushedTo'), { name }), async () => {
      await gitApi.addRemote(path, name, url, pushUrl)
      const branch = useRepoStore.getState().repos[path]?.branches.current
      if (branch) await gitApi.push(path, branch, { remote: name })
      await gitApi.fetchAll(path)
    }),

  renameBranch: (path: string, oldName: string, newName: string) =>
    useRepoStore.getState().run(path, interp(t('act.renamedBranch'), { oldName, newName }), () => gitApi.renameBranch(path, oldName, newName), {
      label: t('undoLabel.renameBranch'),
      undo: () => gitApi.renameBranch(path, newName, oldName),
      redo: () => gitApi.renameBranch(path, oldName, newName)
    }),

  renameBranchRemote: (path: string, oldName: string, newName: string, remote: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.renamedBranchWithRemote'), { oldName, newName, remote }), () => gitApi.renameBranchRemote(path, oldName, newName, remote)),

  merge: (path: string, ref: string) => {
    const noFf = useSettingsStore.getState().settings.mergeCommit
    return useRepoStore.getState().run(path, interp(t('act.merged'), { ref }), () => gitApi.merge(path, ref, noFf), {
      label: interp(t('undoLabel.merge'), { ref }),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.merge(path, ref, noFf)
    })
  },

  mergeInto: (path: string, source: string, target: string) => {
    const noFf = useSettingsStore.getState().settings.mergeCommit
    return useRepoStore
      .getState()
      .run(path, interp(t('act.mergedInto'), { source, target }), () => gitApi.mergeInto(path, source, target, noFf), {
        label: interp(t('undoLabel.mergeInto'), { source, target }),
        undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
        redo: () => gitApi.mergeInto(path, source, target, noFf)
      })
  },

  rebase: (path: string, onto: string) =>
    useRepoStore.getState().run(path, interp(t('act.rebased'), { onto }), () => gitApi.rebase(path, onto), {
      label: interp(t('undoLabel.rebase'), { onto }),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.rebase(path, onto)
    }),

  rebaseOnto: (path: string, branch: string, onto: string) =>
    useRepoStore.getState().run(path, interp(t('act.rebasedOnto'), { branch, onto }), () => gitApi.rebaseOnto(path, branch, onto), {
      label: interp(t('undoLabel.rebaseOnto'), { branch, onto }),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.rebaseOnto(path, branch, onto)
    }),

  commitFixup: (path: string, targetSha: string) =>
    useRepoStore.getState().run(path, interp(t('act.createdFixup'), { sha: targetSha.slice(0, 7) }), () => gitApi.commitFixup(path, targetSha), {
      label: t('undoLabel.fixup'),
      undo: () => gitApi.reset(path, 'HEAD~1', 'soft'),
      redo: () => gitApi.commitFixup(path, targetSha)
    }),

  autosquash: (path: string, base: string) =>
    useRepoStore.getState().run(path, t('act.autosquashed'), () => gitApi.autosquash(path, base), {
      label: t('undoLabel.autosquash'),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.autosquash(path, base)
    }),

  fetchAll: async (path: string) => {
    const before = new Set((useRepoStore.getState().repos[path]?.commits ?? []).map((c) => c.hash))
    let forced: ForcedRefUpdate[] = []
    const ok = await useRepoStore.getState().run(
      path,
      'Fetched all remotes',
      async () => {
        forced = await gitApi.fetchAll(path)
      },
      undefined,
      'fetch'
    )
    if (ok) {
      const after = useRepoStore.getState().repos[path]?.commits ?? []
      const newCommits = before.size ? after.filter((c) => !before.has(c.hash)).map((c) => c.hash) : []
      // Keep earlier rewrites around: a branch you haven't looked at yet should
      // still be flagged after an unrelated fetch.
      const seen = { ...(useRepoStore.getState().repos[path]?.forcedUpdates ?? {}) }
      for (const f of forced) seen[f.ref] = f
      useRepoStore.getState().patch(path, { lastFetchAt: Date.now(), newCommits, forcedUpdates: seen })
      if (forced.length) {
        toast(
          'info',
          forced.length === 1
            ? `${forced[0].ref} was force-pushed — right-click it to see what changed`
            : `${forced.length} branches were force-pushed — right-click one to see what changed`
        )
      }
    }
    return ok
  },

  // ─── Multi-repo batch (group tabs) ───
  // Run fetch/pull across several repos with a single summary toast instead of
  // one per repo. Returns nothing; refreshes each affected repo afterwards.
  batch: async (paths: string[], op: 'fetch' | 'pull', mode: 'default' | 'ff-only' | 'rebase' = 'default') => {
    if (paths.length === 0) return
    const ui = useUIStore.getState()
    const verb = op === 'fetch' ? 'Fetching' : 'Pulling'
    let done = 0
    let failed = 0
    for (const path of paths) {
      ui.setBusy(
        `${verb} ${path.split('/').pop()} (${done + failed + 1}/${paths.length})`,
        op === 'fetch' ? 'fetch' : 'pull'
      )
      try {
        if (op === 'fetch') await gitApi.fetchAll(path)
        else await gitApi.pull(path, mode)
        useRepoStore.getState().patch(path, { lastFetchAt: Date.now() })
        done++
      } catch {
        failed++
      }
      // Refresh repos already in the store so their graph/badges update.
      if (useRepoStore.getState().repos[path]) await useRepoStore.getState().refresh(path)
    }
    ui.setBusy(null)
    const label = op === 'fetch' ? t('act.fetchedWord') : t('act.pulledWord')
    if (failed === 0)
      toast(
        'success',
        interp(t('batch.done'), {
          label,
          done,
          repoWord: done === 1 ? t('batch.repository') : t('batch.repositories')
        })
      )
    else
      toast(
        done ? 'info' : 'error',
        interp(t('batch.partial'), { label, done, total: paths.length, failed })
      )
  },

  pull: async (path: string, mode: 'default' | 'ff-only' | 'rebase') => {
    const before = new Set((useRepoStore.getState().repos[path]?.commits ?? []).map((c) => c.hash))
    const ok = await useRepoStore.getState().run(path, interp(t('act.pulledMode'), { mode }), () => gitApi.pull(path, mode), {
      label: interp(t('undoLabel.pull'), { mode }),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.pull(path, mode)
    }, 'pull')
    if (ok) {
      const after = useRepoStore.getState().repos[path]?.commits ?? []
      const newCommits = before.size ? after.filter((c) => !before.has(c.hash)).map((c) => c.hash) : []
      useRepoStore.getState().patch(path, { lastFetchAt: Date.now(), newCommits })
    }
    return ok
  },

  /**
   * Push the current branch to several remotes at once. Runs the same protected
   * branch and secret checks as a normal push — publishing to two remotes is
   * twice the exposure, not half the caution.
   */
  pushToRemotes: async (path: string, remotes: string[], opts: { force?: boolean; tags?: boolean } = {}) => {
    const repo = useRepoStore.getState().repos[path]
    const branch = repo?.branches.current
    if (!branch || !remotes.length) return false
    if (!(await pushGuards(path, branch, !!opts.force, () => void repoActions.pushToRemotes(path, remotes, opts)))) {
      return false
    }

    const ui = useUIStore.getState()
    ui.beginInflight()
    ui.setBusy(interp(t('busy.pushingRemotes'), { n: String(remotes.length) }), 'push')
    muteWatcher(path)
    try {
      const results = await gitApi.pushToRemotes(path, branch, remotes, opts)
      const failed = results.filter((r) => !r.ok)
      const ok = results.filter((r) => r.ok).map((r) => r.remote)
      if (ok.length) toast('success', interp(t('act.pushedRemotes'), { branch, remotes: ok.join(', ') }))
      // Each failure names its own remote: "it did not work" is useless when
      // half of them did.
      for (const failure of failed) {
        toast('error', interp(t('act.pushRemoteFailed'), { remote: failure.remote, error: failure.error }))
      }
      return failed.length === 0
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      return false
    } finally {
      ui.endInflight()
      ui.setBusy(null)
      void useRepoStore.getState().refresh(path, { only: ['branches', 'log'] })
    }
  },

  // ─── Subtrees ───
  // Each of these is a merge or a push under the hood, so they run through the
  // queue like any other mutation. None of them is reversible with a single
  // command, so none carries an undo entry.
  subtreeAdd: (path: string, prefix: string, url: string, ref: string, squash: boolean) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.subtreeAdded'), { prefix }), () => gitApi.subtreeAdd(path, prefix, url, ref, squash)),

  subtreePull: (path: string, prefix: string, url: string, ref: string, squash: boolean) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.subtreePulled'), { prefix }), () => gitApi.subtreePull(path, prefix, url, ref, squash)),

  subtreePush: (path: string, prefix: string, url: string, ref: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.subtreePushed'), { prefix, ref }), () => gitApi.subtreePush(path, prefix, url, ref), undefined, 'push'),

  subtreeSplit: (path: string, prefix: string, branch: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.subtreeSplit'), { branch }), () => gitApi.subtreeSplit(path, prefix, branch).then(() => undefined)),

  // ─── Untracked files ───
  // No undo entry: content that was never committed cannot be brought back by a
  // git command. The trash option is the only recovery, and it is the caller's
  // choice, so the label says which of the two happened.
  clean: (path: string, paths: string[], trash: boolean) =>
    useRepoStore
      .getState()
      .run(
        path,
        interp(trash ? t('act.cleanedToTrash') : t('act.cleaned'), { n: String(paths.length) }),
        () => gitApi.clean(path, paths, trash).then(() => undefined),
        undefined,
        null,
        undefined,
        ['status', 'treeStatus']
      ),

  // ─── Notes ───
  setNote: (path: string, sha: string, text: string, previous: string) =>
    useRepoStore.getState().run(
      path,
      text.trim() ? interp(t('act.noteSaved'), { sha: sha.slice(0, 7) }) : interp(t('act.noteRemoved'), { sha: sha.slice(0, 7) }),
      () => gitApi.setNote(path, sha, text),
      {
        label: interp(t('undoLabel.note'), { sha: sha.slice(0, 7) }),
        undo: () => gitApi.setNote(path, sha, previous),
        redo: () => gitApi.setNote(path, sha, text)
      },
      null,
      undefined,
      // A note changes nothing about the commits themselves, so only the noted
      // set needs re-reading — but that rides along with the log slice.
      ['log']
    ),

  fetchNotes: (path: string, remote = 'origin') =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.notesFetched'), { remote }), () => gitApi.fetchNotes(path, remote), undefined, 'fetch', undefined, ['log']),

  pushNotes: (path: string, remote = 'origin') =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.notesPushed'), { remote }), () => gitApi.pushNotes(path, remote), undefined, 'push'),

  pushAllTags: (path: string, remote = 'origin') =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.pushedTags'), { remote }), () => gitApi.pushAllTags(path, remote), undefined, 'push'),

  push: async (path: string, force = false, protectedConfirmed = false): Promise<boolean> => {
    const repo = useRepoStore.getState().repos[path]
    const branch = repo?.branches.current
    if (!branch) return false
    const cleared = await pushGuards(
      path,
      branch,
      force,
      () => void repoActions.push(path, force, true),
      protectedConfirmed
    )
    if (!cleared) return false
    if (!repo?.remotes.length) {
      useUIStore.getState().openModal({
        kind: 'confirm',
        title: t('confirm.noRemote.title'),
        message: t('confirm.noRemote.message'),
        confirmLabel: t('common.yes'),
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
    useRepoStore.getState().run(path, t('act.stashed'), () => gitApi.stash(path, message), {
      label: t('undoLabel.stash'),
      undo: () => gitApi.stashPop(path, 0),
      redo: () => gitApi.stash(path, message)
    }, null, undefined, ['status', 'stashes']),

  stashPush: (path: string, message: string | undefined, paths: string[], keepIndex: boolean) =>
    useRepoStore.getState().run(
      path,
      `Stashed ${paths.length} file${paths.length === 1 ? '' : 's'}`,
      () => gitApi.stashPush(path, message, paths, keepIndex),
      {
        label: t('undoLabel.stash'),
        undo: () => gitApi.stashPop(path, 0),
        redo: () => gitApi.stashPush(path, message, paths, keepIndex)
      },
      null,
      undefined,
      ['status', 'stashes']
    ),

  stashPop: (path: string, index = 0) =>
    useRepoStore.getState().run(
      path,
      'Popped stash',
      () => gitApi.stashPop(path, index),
      {
        label: t('undoLabel.stashPop'),
        undo: () => gitApi.stash(path),
        redo: () => gitApi.stashPop(path, 0)
      },
      null,
      (msg) => promptStashOverwrite(msg, path, index, true),
      ['status', 'stashes']
    ),

  stashToBranch: (path: string, branch: string, index = 0) =>
    useRepoStore.getState().run(path, interp(t('act.branchFromStash'), { branch }), () => gitApi.stashToBranch(path, branch, index), undefined, null, undefined, ['log', 'status', 'stashes', 'branches', 'treeStatus']),

  stashApply: (path: string, index = 0) =>
    useRepoStore
      .getState()
      .run(path, t('act.appliedStash'), () => gitApi.stashApply(path, index), undefined, null, (msg) =>
        promptStashOverwrite(msg, path, index, false)
      , ['status', 'stashes']),

  stashApplyOverwrite: (path: string, index = 0, pop = false) =>
    useRepoStore
      .getState()
      .run(
        path,
        pop ? 'Popped stash (overwrote untracked files)' : 'Applied stash (overwrote untracked files)',
        () => gitApi.stashApplyOverwrite(path, index, pop),
        undefined,
        null,
        undefined,
        ['status', 'stashes']
      ),

  stashApplyFiles: (path: string, sha: string, tracked: string[], untracked: string[]) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.restoredFromStash'), { n: tracked.length + untracked.length }), () =>
        gitApi.stashApplyFiles(path, sha, tracked, untracked)
      , undefined, null, undefined, ['status', 'stashes']),

  stashDrop: (path: string, index = 0) =>
    useRepoStore.getState().run(path, t('act.droppedStash'), () => gitApi.stashDrop(path, index), undefined, null, undefined, ['stashes']),

  renameStash: (path: string, index: number, message: string) =>
    useRepoStore.getState().run(path, t('act.renamedStash'), () => gitApi.renameStash(path, index, message), undefined, null, undefined, ['stashes']),

  commit: (path: string, message: string, amend = false) =>
    useRepoStore.getState().run(
      path,
      amend ? 'Amended commit' : 'Committed',
      () => gitApi.commit(path, message, amend),
      {
        label: t('undoLabel.commit'),
        undo: () => gitApi.reset(path, 'HEAD~1', 'soft'),
        redo: () => gitApi.commit(path, message)
      },
      null,
      (error) => {
        const hint = commitHookFailureHint(error)
        if (!hint) return false
        toast('error', t(hint))
        return true
      },
      ['log', 'status', 'branches']
    ),

  amendCommitMessage: (path: string, message: string, previousMessage?: string) =>
    useRepoStore
      .getState()
      .run(path, t('act.amendedMessage'), () => gitApi.amendCommitMessage(path, message), previousMessage
        ? {
            label: t('undoLabel.amendMessage'),
            undo: () => gitApi.amendCommitMessage(path, previousMessage),
            redo: () => gitApi.amendCommitMessage(path, message)
          }
        : undefined),

  cherryPick: (path: string, hash: string, noCommit = false) =>
    noCommit
      ? useRepoStore
          .getState()
          .run(path, interp(t('act.appliedNoCommit'), { sha: hash.slice(0, 7) }), () => gitApi.cherryPick(path, hash, true))
      : useRepoStore.getState().run(path, interp(t('act.cherryPicked'), { sha: hash.slice(0, 7) }), () => gitApi.cherryPick(path, hash), {
          label: t('undoLabel.cherryPick'),
          undo: () => gitApi.reset(path, 'HEAD~1', 'hard'),
          redo: () => gitApi.cherryPick(path, hash)
        }),

  // Squash a contiguous run of the newest commits into one.
  squashCommits: (path: string, oldestSha: string, message: string, count: number) =>
    useRepoStore.getState().run(path, interp(t('act.squashed'), { count }), () => gitApi.squashCommits(path, oldestSha, message), {
      label: t('undoLabel.squash'),
      undo: () => gitApi.reset(path, 'ORIG_HEAD', 'hard'),
      redo: () => gitApi.squashCommits(path, oldestSha, message)
    }),

  // Cherry-pick several commits (passed newest-first; applied oldest-first).
  cherryPickMany: (path: string, hashes: string[]) => {
    const ordered = [...hashes].reverse()
    return useRepoStore.getState().run(path, interp(t('act.cherryPickedMany'), { count: hashes.length }), () => gitApi.cherryPickMany(path, ordered), {
      label: t('undoLabel.cherryPick'),
      undo: () => gitApi.reset(path, `HEAD~${hashes.length}`, 'hard'),
      redo: () => gitApi.cherryPickMany(path, ordered)
    })
  },

  /**
   * Finish or abandon the operation the banner is showing.
   *
   * The banner is drawn from state read at the last refresh, and the repository
   * can move underneath it — the merge committed from the composer, or finished
   * in a terminal. Git then answers "there is no merge in progress", which is
   * true but reads as a failure. Both actions therefore re-check first, and
   * treat "already over" as the banner being stale rather than as an error.
   */
  conflictContinue: async (path: string, kind: ConflictOpKind) => {
    if (!(await stillInProgress(path))) return false
    return useRepoStore
      .getState()
      .run(path, interp(t('act.continued'), { kind }), () => gitApi.conflictOpContinue(path, kind), undefined, null, isNoOpConflictError(path))
  },

  conflictAbort: async (path: string, kind: ConflictOpKind) => {
    if (!(await stillInProgress(path))) return false
    return useRepoStore
      .getState()
      .run(path, interp(t('act.aborted'), { kind }), () => gitApi.conflictOpAbort(path, kind), undefined, null, isNoOpConflictError(path))
  },

  conflictTakeSide: (path: string, file: string, side: ConflictSide) => {
    const verb =
      side === 'delete'
        ? t('act.conflictDeleted')
        : side === 'ours'
          ? t('act.conflictKeptOurs')
          : t('act.conflictKeptTheirs')
    return useRepoStore.getState().run(path, `${verb} ${file}`, () => gitApi.conflictTakeSide(path, file, side))
  },

  revertCommit: (path: string, hash: string) =>
    useRepoStore.getState().run(path, interp(t('act.reverted'), { sha: hash.slice(0, 7) }), () => gitApi.revertCommit(path, hash), {
      label: t('undoLabel.revert'),
      undo: () => gitApi.reset(path, 'HEAD~1', 'hard'),
      redo: () => gitApi.revertCommit(path, hash)
    }),

  reset: (path: string, ref: string, mode: 'soft' | 'mixed' | 'hard') =>
    useRepoStore.getState().run(path, interp(t('act.reset'), { mode, sha: ref.slice(0, 7) }), () => gitApi.reset(path, ref, mode)),

  applyPatch: (path: string, content: string, am: boolean) =>
    useRepoStore
      .getState()
      .run(path, am ? 'Applied patch (git am)' : 'Applied patch', () => gitApi.applyPatch(path, content, am)),

  createTag: (path: string, name: string, hash?: string, opts?: { message?: string; sign?: boolean }) =>
    useRepoStore.getState().run(path, interp(t('act.createdTag'), { name }), () => gitApi.createTag(path, name, hash, opts), {
      label: interp(t('undoLabel.tag'), { name }),
      undo: () => gitApi.deleteTag(path, name),
      redo: () => gitApi.createTag(path, name, hash, opts)
    }),

  deleteTag: (path: string, name: string) =>
    useRepoStore.getState().run(path, interp(t('act.deletedTag'), { name }), () => gitApi.deleteTag(path, name)),

  pushTag: (path: string, name: string, remote = 'origin') =>
    useRepoStore.getState().run(path, interp(t('act.pushedTag'), { name, remote }), () => gitApi.pushTag(path, name, remote)),

  deleteRemoteTag: (path: string, name: string, remote = 'origin') =>
    useRepoStore.getState().run(path, interp(t('act.deletedRemoteTag'), { name, remote }), () => gitApi.deleteRemoteTag(path, name, remote)),

  refreshRemoteTags: (path: string) => useRepoStore.getState().refreshRemoteTags(path),
  refreshCiStatuses: (path: string) => useRepoStore.getState().refreshCiStatuses(path),

  stage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, interp(t('act.staged'), { n: files.length }), () => gitApi.stage(path, files), undefined, null, undefined, ['status', 'treeStatus']),
  stageAll: (path: string) => useRepoStore.getState().run(path, t('act.stagedAll'), () => gitApi.stageAll(path), undefined, null, undefined, ['status', 'treeStatus']),
  unstage: (path: string, files: string[]) =>
    useRepoStore.getState().run(path, interp(t('act.unstaged'), { n: files.length }), () => gitApi.unstage(path, files), undefined, null, undefined, ['status', 'treeStatus']),
  unstageAll: (path: string) => useRepoStore.getState().run(path, t('act.unstagedAll'), () => gitApi.unstageAll(path), undefined, null, undefined, ['status', 'treeStatus']),
  discard: (path: string, files: string[], untracked: boolean) =>
    useRepoStore.getState().run(path, interp(t('act.discarded'), { n: files.length }), () => gitApi.discard(path, files, untracked), undefined, null, undefined, ['status', 'treeStatus']),

  addToGitignore: (path: string, patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, interp(t('act.addedToGitignore'), { what: label ?? interp(t('act.nEntries'), { n: patterns.length }) }), async () => {
      const added = await gitApi.addToGitignore(path, patterns)
      if (added.length === 0) useUIStore.getState().toast('info', t('act.alreadyIgnored'))
    }),

  addToGitignoreAt: (path: string, dir: string, patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, interp(t('act.addedToGitignore'), { what: label ?? patterns.join(', ') }), async () => {
      const added = await gitApi.addToGitignoreAt(path, dir, patterns)
      if (added.length === 0) useUIStore.getState().toast('info', t('act.alreadyIgnored'))
    }),

  untrack: (path: string, files: string[], deleteFromDisk: boolean, label?: string) =>
    useRepoStore.getState().run(
      path,
      deleteFromDisk
        ? interp(t('act.untrackedAndDeleted'), { what: label ?? interp(t('act.nFiles'), { n: files.length }) })
        : interp(t('act.untracked'), { what: label ?? interp(t('act.nFiles'), { n: files.length }) }),
      () => gitApi.untrack(path, files, deleteFromDisk)
    ),

  ignoreAndUntrack: (path: string, files: string[], patterns: string[], label?: string) =>
    useRepoStore.getState().run(path, interp(t('act.ignored'), { what: label ?? interp(t('act.nFiles'), { n: files.length }) }), async () => {
      await gitApi.untrack(path, files, false)
      await gitApi.addToGitignore(path, patterns)
    }),

  // Like ignoreAndUntrack, but writes to the .gitignore in `dir` (matches the
  // Ignore modal's chosen location) and optionally deletes the file from disk.
  ignoreAndUntrackAt: (
    path: string,
    dir: string,
    patterns: string[],
    files: string[],
    deleteFromDisk: boolean,
    label?: string
  ) =>
    useRepoStore.getState().run(
      path,
      deleteFromDisk
        ? `Ignored & deleted ${label ?? `${files.length} file(s)`}`
        : `Ignored & stopped tracking ${label ?? `${files.length} file(s)`}`,
      async () => {
        await gitApi.addToGitignoreAt(path, dir, patterns)
        await gitApi.untrack(path, files, deleteFromDisk)
      }
    ),

  worktreeAdd: (path: string, dir: string, branch: string, newBranch: boolean) =>
    useRepoStore.getState().run(path, interp(t('act.addedWorktree'), { dir }), () => gitApi.worktreeAdd(path, dir, branch, newBranch)),

  worktreeRemove: (path: string, dir: string, force = false) =>
    useRepoStore.getState().run(path, interp(t('act.removedWorktree'), { dir }), () => gitApi.worktreeRemove(path, dir, force)),

  submoduleAdd: (path: string, url: string, dir: string, branch?: string) =>
    useRepoStore.getState().run(path, interp(t('act.addedSubmodule'), { dir }), () => gitApi.submoduleAdd(path, url, dir, branch)),

  submoduleUpdate: (path: string, dir?: string) =>
    useRepoStore
      .getState()
      .run(path, dir ? `Updated submodule ${dir}` : 'Updated submodules', () => gitApi.submoduleUpdate(path, dir, true)),

  submoduleSync: (path: string, dir?: string) =>
    useRepoStore
      .getState()
      .run(path, dir ? `Synced submodule ${dir}` : 'Synced submodules', () => gitApi.submoduleSync(path, dir)),

  submoduleSetUrl: (path: string, name: string, url: string) =>
    useRepoStore.getState().run(path, interp(t('act.updatedUrl'), { name }), () => gitApi.submoduleSetUrl(path, name, url)),

  submoduleRemove: (path: string, dir: string) =>
    useRepoStore.getState().run(path, interp(t('act.removedSubmodule'), { dir }), () => gitApi.submoduleRemove(path, dir)),

  // ─── Bulk operations (multi-select in the sidebar) ───
  deleteBranches: (path: string, names: string[]) =>
    useRepoStore.getState().run(path, interp(t('act.deletedBranches'), { n: names.length }), async () => {
      for (const n of names) await gitApi.deleteBranch(path, n, true)
    }),

  deleteRemoteBranches: (path: string, items: { remote: string; name: string }[]) =>
    useRepoStore.getState().run(path, interp(t('act.deletedRemoteBranches'), { n: items.length }), async () => {
      for (const it of items) await gitApi.deleteRemoteBranch(path, it.remote, it.name)
    }),

  stashDropMany: (path: string, indices: number[]) =>
    useRepoStore.getState().run(path, interp(t('act.droppedStashes'), { n: indices.length }), async () => {
      // Drop highest-index first — each drop renumbers the lower entries.
      for (const i of [...indices].sort((a, b) => b - a)) await gitApi.stashDrop(path, i)
    }),

  deleteTags: (path: string, names: string[]) =>
    useRepoStore.getState().run(path, interp(t('act.deletedTags'), { n: names.length }), async () => {
      for (const n of names) await gitApi.deleteTag(path, n)
    }),

  // ─── Project tree file operations ───
  fsCreate: (path: string, relPath: string, isDir: boolean) =>
    useRepoStore
      .getState()
      .run(path, interp(isDir ? t('act.createdFolder') : t('act.createdFile'), { path: relPath }), () => gitApi.fsCreate(path, relPath, isDir)),

  fsRename: (path: string, from: string, to: string) =>
    useRepoStore.getState().run(path, interp(t('act.renamedPath'), { from, to }), () => gitApi.fsRename(path, from, to)),

  fsDelete: (path: string, relPaths: string[], label?: string) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.movedToTrash'), { what: label ?? interp(t('act.nItems'), { n: relPaths.length }) }), () => gitApi.fsDelete(path, relPaths)),

  // Drag & drop in the project tree: moves within the repo, imports from the OS.
  fsMove: (path: string, froms: string[], destDir: string, mode?: FsDropMode) =>
    useRepoStore
      .getState()
      .run(path, interp(t('act.moved'), { what: froms.length === 1 ? froms[0] : interp(t('act.nItems'), { n: froms.length }), dest: destDir || '/' }), () =>
        gitApi.fsMove(path, froms, destDir, mode)
      ),

  fsImport: (path: string, srcPaths: string[], destDir: string, mode?: FsDropMode) =>
    useRepoStore
      .getState()
      .run(
        path,
        `Added ${srcPaths.length === 1 ? srcPaths[0].split('/').pop() : `${srcPaths.length} items`} → ${destDir || '/'}`,
        () => gitApi.fsImport(path, srcPaths, destDir, mode)
      )
}
