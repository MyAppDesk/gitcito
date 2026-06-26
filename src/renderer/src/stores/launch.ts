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
}

interface LaunchState {
  /** Discovered launch groups, keyed by repo path. */
  groupsByRepo: Record<string, LaunchGroup[]>
  sessions: LaunchSession[]
  activeId: number | null

  discover(repoPath: string): Promise<void>
  run(repoPath: string, group: LaunchGroup, config: LaunchConfig): Promise<void>
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
    const res = await window.api.launch.run({
      dir: group.dir,
      config,
      configs: group.configs,
      tasks: group.tasks,
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
      status: 'running'
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
    await get().run(session.repoPath, group, session.config)
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
