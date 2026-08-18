import { create } from 'zustand'
import type { LaunchConfig, LaunchGroup, LaunchStatus } from '../../../shared/types'
import { useTerminalsStore } from './terminals'
import { useUIStore } from './ui'
import { disposeTerm } from '../components/terminalRegistry'
import { t, interp } from '../i18n'
import { memberFullyCovered, sharedTaskLabels } from '../lib/launchTasks'
import { collectInputRefs } from '../lib/launchInputs'

/** Monotonic id source for compound runs (unique per app session is enough). */
let compoundSeq = 0

/** Remove one session's terminal. A compound member is a pane of a shared
 *  split group — remove just its panel so sibling sessions stay alive; only
 *  the last panel (or a plain config's group) takes the group with it. */
function removeSessionTerminal(session: LaunchSession): void {
  const terms = useTerminalsStore.getState()
  const group = terms.byRepo[session.repoPath]?.groups.find((g) => g.id === session.groupId)
  if (group && group.panels.length > 1) {
    terms.removePanel(session.repoPath, session.groupId, session.panelId)
  } else if (group) {
    terms.removeGroup(session.repoPath, session.groupId)
  } else {
    // Group already gone (user killed it from the terminal list).
    disposeTerm(session.panelId)
  }
}

/** Ties the member sessions of one compound run together (stopAll, display). */
export interface CompoundMeta {
  /** Shared by all sessions spawned from the same compound run. */
  compoundId: string
  /** The compound's name, shown alongside the member config's name. */
  compoundName: string
  /** The compound's `stopAll`: stopping one member stops all of them. */
  stopAll: boolean
  /** The shared split terminal group. Set by the first member to launch; the
   *  meta object is shared, so later members join the same group as panels. */
  groupId?: string
}

/** One running (or finished) launch session, mapped to a terminal group. */
export interface LaunchSession {
  /** Main-process pty id (also the registry binding key). */
  launchId: number
  repoPath: string
  /** Workspace folder the config belongs to (for restart). */
  dir: string
  configName: string
  config: LaunchConfig
  groupId: string
  panelId: string
  status: LaunchStatus
  exitCode?: number
  /** `${input:id}` answers, reused on restart so we don't re-prompt. */
  inputValues: Record<string, string>
  /** Set when this session is one member of a compound run. */
  compound?: CompoundMeta
  /** Tasks the compound already ran once up front — skipped on (re)launch. */
  skipTasks?: string[]
  /** Set when this session IS the compound's shared-tasks pane (no config of
   *  its own — it runs these task labels and exits). */
  taskLabels?: string[]
}

/** Prompt the user (one modal per input, in order) for the referenced inputs —
 *  a real picker for `pickString`, a maskable text field for `promptString`.
 *  Calls `done(values)` when all are answered, or never (launch aborted) if the
 *  user cancels a prompt. */
function promptForInputs(
  group: LaunchGroup,
  refs: string[],
  done: (values: Record<string, string>) => void
): void {
  const values: Record<string, string> = {}
  const step = (i: number): void => {
    if (i >= refs.length) {
      done(values)
      return
    }
    const def = group.inputs.find((d) => d.id === refs[i])!
    useUIStore.getState().openModal({
      kind: 'launch-input',
      input: def,
      step: i + 1,
      total: refs.length,
      onSubmit: (v) => {
        values[def.id] = v
        step(i + 1)
      }
    })
  }
  step(0)
}

interface LaunchState {
  /** Discovered launch groups, keyed by repo path. */
  groupsByRepo: Record<string, LaunchGroup[]>
  sessions: LaunchSession[]
  activeId: number | null

  discover(repoPath: string): Promise<void>
  run(repoPath: string, group: LaunchGroup, config: LaunchConfig): Promise<void>
  /** Internal: spawn with already-resolved `${input:id}` answers. */
  _launch(
    repoPath: string,
    group: LaunchGroup,
    config: LaunchConfig,
    inputValues: Record<string, string>,
    compound?: CompoundMeta,
    skipTasks?: string[]
  ): Promise<void>
  /** Internal: run a compound's shared task chain once, in its own pane, and
   *  wait for it. Resolves the pane's launch id on success, or null when the
   *  launch must abort (spawn error or a non-zero exit — the pane stays so the
   *  failure can be read). */
  _runSharedTasks(
    repoPath: string,
    group: LaunchGroup,
    compoundName: string,
    labels: string[],
    inputValues: Record<string, string>,
    meta: CompoundMeta
  ): Promise<number | null>
  stop(launchId: number): void
  restart(launchId: number): Promise<void>
  togglePause(launchId: number): void
  setActive(launchId: number): void
  clearExited(launchId: number): void
  /** Sessions for one repo (newest first). */
  sessionsFor(repoPath: string): LaunchSession[]
}

export const useLaunchStore = create<LaunchState>((set, get) => ({
  groupsByRepo: {},
  sessions: [],
  activeId: null,

  discover: async (repoPath) => {
    try {
      const groups = await window.api.launch.discover(repoPath)
      set((s) => ({ groupsByRepo: { ...s.groupsByRepo, [repoPath]: groups } }))
    } catch {
      set((s) => ({ groupsByRepo: { ...s.groupsByRepo, [repoPath]: [] } }))
    }
  },

  run: async (repoPath, group, config) => {
    // A compound spawns one *parallel* session per member config — separate
    // terminals, separate lifecycles — exactly like VS Code's debug sessions.
    const proceed = async (values: Record<string, string>): Promise<void> => {
      if (Array.isArray(config.compound)) {
        const members = config.compound
          .map((n) => group.configs.find((c) => c.name === n && !Array.isArray(c.compound)))
          .filter((c): c is LaunchConfig => !!c)
        if (members.length === 0) {
          useUIStore.getState().toast('error', interp(t('launch.compoundEmpty'), { name: config.name }))
          return
        }
        const meta: CompoundMeta = {
          compoundId: `cmp-${++compoundSeq}`,
          compoundName: config.name,
          stopAll: config.compoundStopAll === true
        }
        // Tasks several members depend on run ONCE, up front, in their own
        // pane — VS Code parity. A version-bump prompt asks once, not once
        // per member; members then launch with those tasks skipped.
        const shared = sharedTaskLabels(members, group.tasks)
        let tasksPaneId: number | null = null
        if (shared.length > 0) {
          tasksPaneId = await get()._runSharedTasks(repoPath, group, config.name, shared, values, meta)
          if (tasksPaneId == null) return
        }
        // Sessions are created in the compound's declared order, but each pty
        // runs concurrently — a member never waits for the previous one.
        let launched = 0
        for (const m of members) {
          // An attach-only member whose whole chain was hoisted has nothing
          // left to run — spawning it would just produce an error pane.
          if (memberFullyCovered(m, group.tasks, shared)) continue
          await get()._launch(repoPath, group, m, values, meta, shared)
          launched++
        }
        // The tasks pane did its job — close it so only the members remain.
        // Kept when nothing else launched (it is the whole compound's output).
        if (tasksPaneId != null && launched > 0) get().clearExited(tasksPaneId)
        return
      }
      await get()._launch(repoPath, group, config, values)
    }
    // If the config (or its tasks) reference `${input:id}`, prompt the user for
    // each before launching; cancelling any prompt aborts the launch.
    const refs = collectInputRefs(group, config)
    if (refs.length > 0) {
      promptForInputs(group, refs, (values) => void proceed(values))
      return
    }
    await proceed({})
  },

  _runSharedTasks: async (repoPath, group, compoundName, labels, inputValues, meta) => {
    const res = await window.api.launch.runTasks({
      dir: group.dir,
      tasks: group.tasks,
      labels,
      inputValues,
      cols: 120,
      rows: 30
    })
    if ('error' in res) {
      useUIStore.getState().toast('error', res.error)
      return null
    }
    const launchId = res.id
    const title = labels.join(' + ')
    useUIStore.getState().setTerminalOpen(repoPath, true)
    // The tasks pane opens the compound's shared split group; members join it.
    const terms = useTerminalsStore.getState()
    let placement =
      meta.groupId != null ? terms.addLaunchPanel(repoPath, meta.groupId, group.dir, launchId, title) : null
    if (!placement) {
      placement = terms.addLaunchGroup(repoPath, group.dir, launchId, compoundName, title)
      meta.groupId = placement.groupId
    }
    const session: LaunchSession = {
      launchId,
      repoPath,
      dir: group.dir,
      configName: title,
      config: { name: title, type: 'tasks' },
      groupId: placement.groupId,
      panelId: placement.panelId,
      status: 'running',
      inputValues,
      compound: meta,
      taskLabels: labels
    }
    set((s) => ({ sessions: [...s.sessions, session], activeId: launchId }))
    // Gate the member launches on the chain finishing cleanly, and mirror the
    // usual exited bookkeeping.
    const code = await new Promise<number>((resolve) => {
      const off = window.api.launch.onExit(launchId, (c) => {
        off()
        resolve(c)
      })
    })
    set((s) => ({
      sessions: s.sessions.map((x) => (x.launchId === launchId ? { ...x, status: 'exited', exitCode: code } : x))
    }))
    if (code !== 0) {
      useUIStore
        .getState()
        .toast('error', interp(t('launch.sharedTasksFailed'), { name: compoundName, code: String(code) }))
      return null
    }
    return launchId
  },

  _launch: async (repoPath, group, config, inputValues, compound, skipTasks) => {
    const res = await window.api.launch.run({
      dir: group.dir,
      config,
      configs: group.configs,
      tasks: group.tasks,
      inputValues,
      skipTasks,
      cols: 120,
      rows: 30
    })
    if ('error' in res) {
      useUIStore.getState().toast('error', res.error)
      return
    }
    const launchId = res.id

    // Surface the output in the bottom panel, like VS Code's debug terminal.
    // Compound members share one split group named after the compound, one
    // pane per member; a plain config gets its own group as before.
    useUIStore.getState().setTerminalOpen(repoPath, true)
    const terms = useTerminalsStore.getState()
    let placement =
      compound?.groupId != null
        ? terms.addLaunchPanel(repoPath, compound.groupId, group.dir, launchId, config.name)
        : null
    if (!placement) {
      placement = terms.addLaunchGroup(
        repoPath,
        group.dir,
        launchId,
        compound ? compound.compoundName : config.name,
        compound ? config.name : undefined
      )
      if (compound) compound.groupId = placement.groupId
    }
    const { groupId, panelId } = placement

    const session: LaunchSession = {
      launchId,
      repoPath,
      dir: group.dir,
      configName: config.name,
      config,
      groupId,
      panelId,
      status: 'running',
      inputValues,
      ...(compound ? { compound } : {}),
      ...(skipTasks && skipTasks.length > 0 ? { skipTasks } : {})
    }
    set((s) => ({ sessions: [...s.sessions, session], activeId: launchId }))

    // Mark exited when the process ends (registry handles the visual notice).
    window.api.launch.onExit(launchId, (code) =>
      set((s) => ({
        sessions: s.sessions.map((x) => (x.launchId === launchId ? { ...x, status: 'exited', exitCode: code } : x))
      }))
    )
  },

  stop: (launchId) => {
    // A compound with `stopAll` takes its sibling sessions down together.
    const session = get().sessions.find((x) => x.launchId === launchId)
    const targets =
      session?.compound?.stopAll === true
        ? get()
            .sessions.filter((x) => x.compound?.compoundId === session.compound!.compoundId && x.status !== 'exited')
            .map((x) => x.launchId)
        : [launchId]
    for (const id of targets) window.api.launch.stop(id)
    set((s) => ({
      sessions: s.sessions.map((x) => (targets.includes(x.launchId) ? { ...x, status: 'exited' } : x))
    }))
  },

  restart: async (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (!session) return
    const groups = get().groupsByRepo[session.repoPath] ?? []
    const group = groups.find((g) => g.dir === session.dir)
    if (!group) return
    // Tear down the old session + its terminal, then run fresh.
    window.api.launch.stop(launchId)
    removeSessionTerminal(session)
    set((s) => ({ sessions: s.sessions.filter((x) => x.launchId !== launchId) }))
    // The shared-tasks pane has no config — restarting it re-runs its labels.
    if (session.taskLabels && session.compound) {
      await get()._runSharedTasks(
        session.repoPath,
        group,
        session.compound.compoundName,
        session.taskLabels,
        session.inputValues,
        session.compound
      )
      return
    }
    // Reuse the original `${input:id}` answers so restart doesn't re-prompt,
    // and keep the compound membership so stopAll still finds this session.
    await get()._launch(session.repoPath, group, session.config, session.inputValues, session.compound, session.skipTasks)
  },

  togglePause: (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (!session || session.status === 'exited') return
    const next = session.status === 'paused' ? 'running' : 'paused'
    window.api.launch.signal(launchId, next === 'paused' ? 'pause' : 'resume')
    set((s) => ({
      sessions: s.sessions.map((x) => (x.launchId === launchId ? { ...x, status: next } : x))
    }))
  },

  setActive: (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (session) {
      const terms = useTerminalsStore.getState()
      terms.setActiveGroup(session.repoPath, session.groupId)
      // A compound member is one pane of a shared split — focus its pane too.
      terms.setActivePanel(session.repoPath, session.groupId, session.panelId)
    }
    set({ activeId: launchId })
  },

  clearExited: (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (session) removeSessionTerminal(session)
    set((s) => {
      const sessions = s.sessions.filter((x) => x.launchId !== launchId)
      return { sessions, activeId: s.activeId === launchId ? (sessions[sessions.length - 1]?.launchId ?? null) : s.activeId }
    })
  },

  sessionsFor: (repoPath) => get().sessions.filter((x) => x.repoPath === repoPath).slice().reverse()
}))
