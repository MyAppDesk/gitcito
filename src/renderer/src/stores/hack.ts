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
import { contractAudience, contractHits, contractsForRepo, wipBranchName, wipBranchPrefix } from '../lib/hackSession'
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
}

interface HackStore {
  alerts: HackAlert[]
  stats: HackStats
  /** CODEOWNERS index per repo, loaded when the session starts. */
  owners: Record<string, OwnerIndex>
  /** Last contract sweep per repo, so a warning fires once per push. */
  contractSeen: Record<string, string>
  /** One celebration at a time; the banner clears it when the animation ends. */
  celebration: { kind: 'push' | 'merge' | 'commit'; at: number } | null

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
  stats: { pushes: 0, commits: 0, caught: 0, wipPushes: 0 },
  owners: {},
  contractSeen: {},
  celebration: null,

  session: () => useSettingsStore.getState().settings.hackSession,
  active: () => useSettingsStore.getState().settings.hackSession !== null,

  start: async (session) => {
    useSettingsStore.getState().update((s) => ({ ...s, hackSession: session }))
    set({ alerts: [], stats: { pushes: 0, commits: 0, caught: 0, wipPushes: 0 }, contractSeen: {} })
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
    useSettingsStore.getState().update((s) => ({ ...s, hackSession: null }))
    set({ alerts: [], owners: {}, contractSeen: {}, celebration: null })
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
    set({ celebration: { kind, at: Date.now() } })
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
    const entry = overlapping[0]
    const { local: localDiff, incoming: incomingDiff } = await gitApi
      .collisionDiffs(repoPath, entry.ref, entry.overlap)
      .catch(() => ({ local: '', incoming: '' }))
    if (!localDiff.trim() || !incomingDiff.trim()) return

    const collisions: SemanticCollision[] = await aiApi
      .semanticCollision(localDiff, incomingDiff, cfg)
      .catch(() => [] as SemanticCollision[])
    if (collisions.length === 0) return

    for (const c of collisions) {
      const message = interp(t('hack.semanticToast'), { file: c.path, line: String(c.line), claim: c.claim })
      get().alert({ kind: 'semantic', repoPath, message, files: [c.path] })
    }
    get().bump('caught', collisions.length)
    notify(t('hack.semanticTitle'), collisions[0].claim, repoPath)
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
