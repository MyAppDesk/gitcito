import { create } from 'zustand'
import type {
  ContractChange,
  HackSession,
  HackTemplate,
  OwnerRule,
  SemanticCollision,
  TeammateRadarEntry
} from '../../../shared/types'
import { buildOwnerIndex, ownedByMe, type OwnerIndex } from '../../../shared/codeowners'
import { gitApi, aiApi } from '../infrastructure/api'
import { useSettingsStore } from './settings'
import { useUIStore } from './ui'
import { useFetchStore } from './fetch'
import {
  AI_CALL_BUDGET,
  aiBudget,
  collisionKey,
  contractAudience,
  contractHits,
  contractsForRepo,
  wipBranchName,
  wipBranchPrefix
} from '../lib/hackSession'
import { HACK_APP_THEME, HACK_CODE_THEME, HACK_GRAPH_STYLE } from '../theme/hackTheme'
import { t, interp } from '../i18n'

/** A live warning the session raised. Kept in memory only — a session's alerts
 *  are about right now, and persisting them would resurrect stale ones. */
export interface HackAlert {
  id: string
  kind: 'overlap' | 'contract' | 'semantic' | 'freeze' | 'wip'
  repoPath: string
  /** Already-translated, ready to render. */
  message: string
  at: number
  /** Files the alert is about, for the detail line. */
  files: string[]
}

/** Counters the banner shows. Nothing here leaves the machine. */
export interface HackStats {
  /** Successful pushes since the session started — the thing worth celebrating. */
  pushes: number
  commits: number
  /** Collisions caught before they became conflicts. */
  caught: number
  /** WIP snapshots published. */
  wipPushes: number
  /** Consecutive good events inside the combo window. Resets when it lapses. */
  combo: number
  /** Highest combo the session has seen — the number worth bragging about. */
  bestCombo: number
  /** AI judgements spent this session. Shown, because the user pays for them. */
  aiCalls: number
}

/** How long one good event keeps the combo alive. Long enough to chain a
 *  commit into its push, short enough that a quiet hour resets it. */
const COMBO_WINDOW_MS = 90_000

interface HackStore {
  alerts: HackAlert[]
  stats: HackStats
  /** CODEOWNERS index per repo, loaded when the session starts. */
  owners: Record<string, OwnerIndex>
  /** Last contract sweep per repo, so a warning fires once per push. */
  contractSeen: Record<string, string>
  /** Judgements already paid for, keyed by what determines the answer. */
  judged: string[]
  /** Whether the "budget spent" notice has already been shown. */
  budgetAnnounced: boolean
  /** One celebration at a time; the overlay clears it when the animation ends. */
  celebration: { kind: 'push' | 'merge' | 'commit'; at: number; combo: number } | null
  /** When the current combo lapses. Read by `celebrate`, never rendered. */
  comboUntil: number

  session(): HackSession | null
  active(): boolean

  start(session: HackSession): Promise<void>
  end(opts: { cleanWip: boolean }): Promise<void>
  update(patch: Partial<HackSession>): void

  loadOwners(repoPath: string): Promise<void>
  /** Files in `paths` that CODEOWNERS says belong to someone else. */
  notMine(repoPath: string, paths: string[]): string[]

  alert(alert: Omit<HackAlert, 'id' | 'at'>): void
  dismissAlert(id: string): void
  clearAlerts(): void

  celebrate(kind: 'push' | 'merge' | 'commit'): void
  clearCelebration(): void
  bump(stat: keyof HackStats, by?: number): void

  /** Cross-repo contract sweep, run after a repo's background fetch. */
  contractSweep(repoPath: string): Promise<void>
  /** Optional AI second pass over a path overlap the radar already found. */
  semanticSweep(repoPath: string, entries: TeammateRadarEntry[]): Promise<void>
  /** Optional AI pass over a contract change that crossed a repo boundary. */
  crossRepoSemantic(sourceRepo: string, changes: ContractChange[], audience: string[]): Promise<void>
  /** Take one unit of the session's AI budget. False when it is spent. */
  spendAiCall(): boolean
  /** Publish a WIP snapshot for one repo. */
  wipPush(repoPath: string): Promise<void>
}

const uid = (): string => Math.random().toString(36).slice(2, 10)

/** Raise an OS notification for a session alert, when the user asked for them. */
function notify(title: string, body: string, repoPath: string): void {
  const s = useSettingsStore.getState().settings
  if (!s.desktopNotifications || !s.hackSession?.radarNotify) return
  try {
    const note = new Notification(title, { body })
    note.onclick = () => {
      void window.api?.focusWindow?.()
      useUIStore.getState().openModal({ kind: 'teammate-radar', repoPath })
    }
  } catch {
    // Denied or unavailable — the in-app alert already landed.
  }
}

export const useHackStore = create<HackStore>((set, get) => ({
  alerts: [],
  stats: { pushes: 0, commits: 0, caught: 0, wipPushes: 0, combo: 0, bestCombo: 0, aiCalls: 0 },
  owners: {},
  contractSeen: {},
  judged: [],
  budgetAnnounced: false,
  celebration: null,
  comboUntil: 0,

  session: () => useSettingsStore.getState().settings.hackSession,
  active: () => useSettingsStore.getState().settings.hackSession !== null,

  start: async (session) => {
    // Take the whole look over, and remember exactly what was there — including
    // a custom theme the user built themselves — so ending the session is a
    // restore rather than a reset to the shipped defaults.
    const before = useSettingsStore.getState().settings
    const withRestore: HackSession = {
      ...session,
      restore: {
        appThemeId: before.appThemeId,
        codeThemeId: before.codeThemeId,
        graphStyle: before.graphStyle
      }
    }
    useSettingsStore.getState().update((s) => ({
      ...s,
      hackSession: withRestore,
      appThemeId: HACK_APP_THEME.id,
      codeThemeId: HACK_CODE_THEME.id,
      graphStyle: HACK_GRAPH_STYLE
    }))
    set({
      alerts: [],
      stats: { pushes: 0, commits: 0, caught: 0, wipPushes: 0, combo: 0, bestCombo: 0, aiCalls: 0 },
      contractSeen: {},
      judged: [],
      budgetAnnounced: false,
      comboUntil: 0
    })
    // Ownership hints are only meaningful once we know who owns what.
    await Promise.all(session.repos.map((p) => get().loadOwners(p)))
    // Re-arm any repo the ordinary scheduler had parked: the session raises the
    // cadence, and starting one is exactly the moment to try a dead remote again.
    for (const p of session.repos) useFetchStore.getState().reset(p)
  },

  end: async ({ cleanWip }) => {
    const session = get().session()
    if (!session) return
    if (cleanWip) {
      const prefix = wipBranchPrefix(session.me)
      for (const repoPath of session.repos) {
        const removed = await gitApi.deleteWipBranches(repoPath, prefix).catch(() => [] as string[])
        if (removed.length) {
          useUIStore.getState().toast('success', interp(t('hack.wipCleaned'), { n: removed.length }))
        }
      }
    }
    const restore = session.restore
    useSettingsStore.getState().update((s) => ({
      ...s,
      hackSession: null,
      ...(restore
        ? { appThemeId: restore.appThemeId, codeThemeId: restore.codeThemeId, graphStyle: restore.graphStyle }
        : {})
    }))
    set({ alerts: [], owners: {}, contractSeen: {}, judged: [], celebration: null, comboUntil: 0 })
  },

  update: (patch) =>
    useSettingsStore
      .getState()
      .update((s) => (s.hackSession ? { ...s, hackSession: { ...s.hackSession, ...patch } } : s)),

  loadOwners: async (repoPath) => {
    const rules: OwnerRule[] = await gitApi.readCodeowners(repoPath).catch(() => [])
    if (rules.length === 0) return
    set((s) => ({ owners: { ...s.owners, [repoPath]: buildOwnerIndex(rules) } }))
  },

  notMine: (repoPath, paths) => {
    const session = get().session()
    const index = get().owners[repoPath]
    if (!session || !session.me || !index) return []
    return paths.filter((p) => !ownedByMe(index, p, session.me))
  },

  alert: (alert) =>
    set((s) => {
      // Same kind, same repo, same files → the same alert. Re-raising it would
      // be the firehose the radar's own dedupe exists to prevent.
      const key = `${alert.kind}:${alert.repoPath}:${alert.files.join(',')}`
      if (s.alerts.some((a) => `${a.kind}:${a.repoPath}:${a.files.join(',')}` === key)) return s
      return { alerts: [{ ...alert, id: uid(), at: Date.now() }, ...s.alerts].slice(0, 30) }
    }),

  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  clearAlerts: () => set({ alerts: [] }),

  celebrate: (kind) => {
    if (!get().active()) return
    const now = Date.now()
    // Chain anything good that lands inside the window. A commit followed by
    // its push is a 2 — which is the point: the counter rewards finishing a
    // thing rather than starting five.
    const combo = now < get().comboUntil ? get().stats.combo + 1 : 1
    set((s) => ({
      celebration: { kind, at: now, combo },
      comboUntil: now + COMBO_WINDOW_MS,
      stats: { ...s.stats, combo, bestCombo: Math.max(s.stats.bestCombo, combo) }
    }))
  },
  clearCelebration: () => set({ celebration: null }),

  bump: (stat, by = 1) => set((s) => ({ stats: { ...s.stats, [stat]: s.stats[stat] + by } })),

  contractSweep: async (repoPath) => {
    const session = get().session()
    if (!session || !session.repos.includes(repoPath)) return
    const globs = contractsForRepo(session, repoPath)
    if (globs.length === 0) return

    const changes: ContractChange[] = await gitApi.contractRadar(repoPath, globs).catch(() => [])
    if (changes.length === 0) return

    // One warning per (branch, sha): a contract that moved once is one event,
    // however many times the scheduler sweeps afterwards.
    const signature = changes.map((c) => `${c.ref}@${c.sha}`).join(',')
    if (get().contractSeen[repoPath] === signature) return
    set((s) => ({ contractSeen: { ...s.contractSeen, [repoPath]: signature } }))

    // Who hears about it: everyone else in the session with uncommitted work.
    // No inferred dependency graph — between repos there is no exact signal, and
    // a guessed edge dressed as a fact is worse than telling four people the
    // schema moved.
    const audience = contractAudience(session, repoPath)
    const dirtyElsewhere = audience.filter((p) => {
      const st = useHackDirty.getState().dirty[p]
      return (st ?? 0) > 0
    })
    if (dirtyElsewhere.length === 0) return

    const files = [...new Set(changes.flatMap((c) => c.files))]
    const authors = [...new Set(changes.map((c) => c.author).filter(Boolean))]
    const repoName = repoPath.split('/').pop() ?? repoPath
    const message = interp(t('hack.contractToast'), {
      repo: repoName,
      files: files.slice(0, 3).join(', '),
      who: authors[0] ?? '—'
    })
    get().alert({ kind: 'contract', repoPath, message, files })
    get().bump('caught')
    useUIStore.getState().toast('info', message)
    notify(t('hack.contractTitle'), message, repoPath)

    // The exact signal has fired. Now — and only now — it is worth paying a
    // model to say what the change actually did to the people downstream.
    void get().crossRepoSemantic(repoPath, changes, dirtyElsewhere)
  },

  semanticSweep: async (repoPath, entries) => {
    const session = get().session()
    if (!session?.semanticCollisions) return
    const overlapping = entries.filter((e) => e.overlap.length > 0)
    if (overlapping.length === 0) return

    const cfg = useSettingsStore.getState().activeProfile().ai
    if (!cfg?.enabled) return

    // Strictly a second pass: the free, exact, offline path comparison has
    // already said these two changes touch the same files. Running the model
    // first would spend money and latency on the 99% of fetches that collide
    // with nothing.
    //
    // Judge every overlapping branch, not just the first — with three people
    // pushing, "the first one the radar happened to sort highest" is an
    // arbitrary choice, and the branch that actually breaks you may be second.
    for (const entry of overlapping.slice(0, 3)) {
      const key = collisionKey(repoPath, entry.sha, entry.overlap)
      if (get().judged.includes(key)) continue
      if (!get().spendAiCall()) return

      set((st) => ({ judged: [...st.judged, key].slice(-200) }))
      const { local: localDiff, incoming: incomingDiff } = await gitApi
        .collisionDiffs(repoPath, entry.ref, entry.overlap)
        .catch(() => ({ local: '', incoming: '' }))
      if (!localDiff.trim() || !incomingDiff.trim()) continue

      const collisions: SemanticCollision[] = await aiApi
        .semanticCollision(localDiff, incomingDiff, cfg)
        .catch(() => [] as SemanticCollision[])
      if (collisions.length === 0) continue

      for (const c of collisions) {
        const message = interp(t('hack.semanticToast'), { file: c.path, line: String(c.line), claim: c.claim })
        get().alert({ kind: 'semantic', repoPath, message, files: [c.path] })
      }
      get().bump('caught', collisions.length)
      notify(t('hack.semanticTitle'), collisions[0].claim, repoPath)
    }
  },

  /**
   * The judgement that actually crosses a repository boundary.
   *
   * This is the case the path comparison genuinely cannot answer. Inside one
   * repo, "we both touched api.ts" is exact and free. Between repos there is no
   * shared path at all: the backend changed `openapi.yaml`, and whether that
   * breaks the half-written client in another checkout is a question about
   * meaning, not about filenames.
   *
   * So it runs second here too — the contract declaration has already fired,
   * and this only asks what that change *did*. Grounding is on the consumer's
   * own uncommitted hunks, so every claim points at a line in code that person
   * is actually editing rather than at a file they have never opened.
   */
  crossRepoSemantic: async (sourceRepo, changes, audience) => {
    const session = get().session()
    if (!session?.semanticCollisions || changes.length === 0) return
    const cfg = useSettingsStore.getState().activeProfile().ai
    if (!cfg?.enabled) return

    const files = [...new Set(changes.flatMap((c) => c.files))]
    const incoming = await gitApi
      .collisionDiffs(sourceRepo, changes[0].ref, files)
      .then((d) => d.incoming)
      .catch(() => '')
    if (!incoming.trim()) return

    const sourceName = sourceRepo.split('/').pop() ?? sourceRepo
    for (const target of audience.slice(0, 4)) {
      const key = collisionKey(target, changes[0].sha, files)
      if (get().judged.includes(key)) continue
      // Only ask about a repo that has work to break. A clean checkout cannot
      // be wrong about a schema it has not started consuming yet.
      if ((useHackDirty.getState().dirty[target] ?? 0) === 0) continue
      if (!get().spendAiCall()) return

      set((st) => ({ judged: [...st.judged, key].slice(-200) }))
      const local = await gitApi.worktreeDiff(target).catch(() => '')
      if (!local.trim()) continue

      const collisions: SemanticCollision[] = await aiApi
        .semanticCollision(local, incoming, cfg)
        .catch(() => [] as SemanticCollision[])
      if (collisions.length === 0) continue

      for (const c of collisions) {
        const message = interp(t('hack.crossToast'), {
          repo: sourceName,
          file: c.path,
          line: String(c.line),
          claim: c.claim
        })
        get().alert({ kind: 'semantic', repoPath: target, message, files: [c.path] })
      }
      get().bump('caught', collisions.length)
      notify(t('hack.crossTitle'), collisions[0].claim, target)
    }
  },

  /**
   * Take one unit of the session's AI budget, or refuse and say so once.
   *
   * A ceiling rather than a warning: a 36-hour event sweeping every 45 seconds
   * has thousands of opportunities to ask, and the person paying is the user.
   */
  spendAiCall: () => {
    const { left, allowed } = aiBudget(get().stats.aiCalls)
    if (!allowed) {
      if (!get().budgetAnnounced) {
        set({ budgetAnnounced: true })
        useUIStore.getState().toast('info', interp(t('hack.aiBudgetSpent'), { n: String(AI_CALL_BUDGET) }))
      }
      return false
    }
    set((st) => ({ stats: { ...st.stats, aiCalls: st.stats.aiCalls + 1 } }))
    void left
    return true
  },

  wipPush: async (repoPath) => {
    const session = get().session()
    if (!session?.wipPush) return
    const branch = useHackDirty.getState().branch[repoPath] || 'HEAD'
    const name = wipBranchName(session.me, branch)
    try {
      const result = await gitApi.pushWipSnapshot(repoPath, name)
      if (!result) return
      get().bump('wipPushes')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const secrets = /WIP_PUSH_SECRETS:(.*)$/.exec(message)?.[1]
      if (secrets) {
        // Refusing is the whole point: this runs on a timer, so the interactive
        // secret confirmation cannot gate it. Say so loudly rather than
        // silently not backing anything up.
        const files = secrets.split(',').filter(Boolean)
        const warning = interp(t('hack.wipSecrets'), { files: files.slice(0, 3).join(', ') })
        get().alert({ kind: 'wip', repoPath, message: warning, files })
        useUIStore.getState().toast('error', warning)
        notify(t('hack.wipSecretsTitle'), warning, repoPath)
        return
      }
      // Any other failure is the network or the remote; the next tick retries.
    }
  }
}))

/**
 * A tiny mirror of "is this repo dirty, and on what branch".
 *
 * The cross-repo warning has to answer "does anyone else have uncommitted work"
 * for repositories that are not the active tab, and reaching into the repo
 * store for that would couple hack mode to a shape that exists for the graph.
 * Kept as its own store so the repo store pushes into it and nothing reads
 * upward.
 */
interface HackDirtyStore {
  dirty: Record<string, number>
  branch: Record<string, string>
  note(repoPath: string, dirtyCount: number, branch: string): void
}

export const useHackDirty = create<HackDirtyStore>((set) => ({
  dirty: {},
  branch: {},
  note: (repoPath, dirtyCount, branch) =>
    set((s) => ({
      dirty: { ...s.dirty, [repoPath]: dirtyCount },
      branch: { ...s.branch, [repoPath]: branch }
    }))
}))

export const hackActions = {
  /** Built-ins plus whatever the user saved. */
  templates(): HackTemplate[] {
    return useSettingsStore.getState().settings.hackTemplates ?? []
  }
}
