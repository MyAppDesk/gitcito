import { create } from 'zustand'
import type { LaunchConfig, LaunchGroup, LaunchStatus } from '../../../shared/types'
import { useTerminalsStore } from './terminals'
import { useUIStore } from './ui'
import { disposeTerm } from '../components/terminalRegistry'

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
}

/** Collect, in first-seen order, the `${input:id}` ids referenced by the config
 *  we're about to run (compound members included) and the tasks it triggers,
 *  limited to ids that actually have a definition in the group's `inputs`. */
function collectInputRefs(group: LaunchGroup, config: LaunchConfig): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const scan = (v: unknown): void => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\$\{input:([^}]+)\}/g)) {
        const id = m[1]
        if (!seen.has(id) && group.inputs.some((i) => i.id === id)) {
          seen.add(id)
          ids.push(id)
        }
      }
    } else if (Array.isArray(v)) {
      v.forEach(scan)
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(scan)
    }
  }
  const configsToScan = Array.isArray(config.compound)
    ? config.compound.map((n) => group.configs.find((c) => c.name === n)).filter(Boolean)
    : [config]
  configsToScan.forEach(scan)
  // Tasks reachable via preLaunchTask / postDebugTask (and their dependsOn).
  const taskLabels = new Set<string>()
  const addTask = (label?: string): void => {
    if (!label || taskLabels.has(label)) return
    taskLabels.add(label)
    const task = group.tasks.find((t) => t.label === label)
    const deps = task?.dependsOn ? (Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]) : []
    deps.forEach(addTask)
  }
  configsToScan.forEach((c) => {
    addTask(c?.preLaunchTask)
    addTask(c?.postDebugTask)
  })
  group.tasks.filter((t) => taskLabels.has(t.label)).forEach(scan)
  return ids
}

/** Prompt the user (one modal per input, in order) for the referenced inputs.
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
    const opts = (def.options ?? []).map((o) => (typeof o === 'string' ? o : o.value))
    useUIStore.getState().openModal({
      kind: 'input',
      title: def.description || `Input: ${def.id}`,
      label: opts.length ? `${def.description ?? def.id} — options: ${opts.join(', ')}` : def.description ?? def.id,
      placeholder: opts[0] ?? '',
      initial: def.default ?? '',
      allowEmpty: true,
      submitLabel: 'OK',
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
  _launch(repoPath: string, group: LaunchGroup, config: LaunchConfig, inputValues: Record<string, string>): Promise<void>
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
    // If the config (or its tasks) reference `${input:id}`, prompt the user for
    // each before launching; cancelling any prompt aborts the launch.
    const refs = collectInputRefs(group, config)
    if (refs.length > 0) {
      promptForInputs(group, refs, (values) => {
        void get()._launch(repoPath, group, config, values)
      })
      return
    }
    await get()._launch(repoPath, group, config, {})
  },

  _launch: async (repoPath, group, config, inputValues) => {
    const res = await window.api.launch.run({
      dir: group.dir,
      config,
      configs: group.configs,
      tasks: group.tasks,
      inputValues,
      cols: 120,
      rows: 30
    })
    if ('error' in res) {
      useUIStore.getState().toast('error', res.error)
      return
    }
    const launchId = res.id

    // Surface the output in the bottom panel, like VS Code's debug terminal.
    if (!useUIStore.getState().terminalOpen) useUIStore.getState().toggleTerminal()
    const { groupId, panelId } = useTerminalsStore
      .getState()
      .addLaunchGroup(repoPath, group.dir, launchId, config.name)

    const session: LaunchSession = {
      launchId,
      repoPath,
      dir: group.dir,
      configName: config.name,
      config,
      groupId,
      panelId,
      status: 'running',
      inputValues
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
    window.api.launch.stop(launchId)
    set((s) => ({
      sessions: s.sessions.map((x) => (x.launchId === launchId ? { ...x, status: 'exited' } : x))
    }))
  },

  restart: async (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (!session) return
    const groups = get().groupsByRepo[session.repoPath] ?? []
    const group = groups.find((g) => g.dir === session.dir)
    if (!group) return
    // Tear down the old session + its terminal group, then run fresh.
    window.api.launch.stop(launchId)
    disposeTerm(session.panelId)
    useTerminalsStore.getState().removeGroup(session.repoPath, session.groupId)
    set((s) => ({ sessions: s.sessions.filter((x) => x.launchId !== launchId) }))
    // Reuse the original `${input:id}` answers so restart doesn't re-prompt.
    await get()._launch(session.repoPath, group, session.config, session.inputValues)
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
    if (session) useTerminalsStore.getState().setActiveGroup(session.repoPath, session.groupId)
    set({ activeId: launchId })
  },

  clearExited: (launchId) => {
    const session = get().sessions.find((x) => x.launchId === launchId)
    if (session) {
      disposeTerm(session.panelId)
      useTerminalsStore.getState().removeGroup(session.repoPath, session.groupId)
    }
    set((s) => {
      const sessions = s.sessions.filter((x) => x.launchId !== launchId)
      return { sessions, activeId: s.activeId === launchId ? (sessions[sessions.length - 1]?.launchId ?? null) : s.activeId }
    })
  },

  sessionsFor: (repoPath) => get().sessions.filter((x) => x.repoPath === repoPath).slice().reverse()
}))
