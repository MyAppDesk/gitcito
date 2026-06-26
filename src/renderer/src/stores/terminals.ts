import { create } from 'zustand'
import { disposeTerm } from '../components/terminalRegistry'

export interface TermPanel {
  id: string
  cwd: string
  /** Flex weight within its group; controls split width. Defaults to 1. */
  flex: number
  /** Manual alias for this panel. Overrides the auto-detected process name. */
  title?: string
  /** When set, this panel renders a launch (Run/Debug) session bound to this
   *  main-process pty id instead of spawning an interactive shell. */
  launchId?: number
}

export interface TermGroup {
  id: string
  /** Stable display number → default label "zsh N". Never changes with the process. */
  num: number
  /** Manual alias for the group. Empty = fall back to the numbered default. */
  title: string
  panels: TermPanel[]
  activePanelId: string
}

interface RepoTerms {
  groups: TermGroup[]
  activeGroupId: string | null
}

let _seq = 0
function uid(prefix: string): string {
  return `${prefix}-${++_seq}`
}

/** Next stable group number for a repo: one past the highest existing, so it
 *  never reuses a number and stays put when other groups are closed. */
function nextNum(groups: TermGroup[]): number {
  return groups.reduce((m, g) => Math.max(m, g.num), 0) + 1
}

function mkGroup(cwd: string, num: number): TermGroup {
  const panel: TermPanel = { id: uid('panel'), cwd, flex: 1 }
  return { id: uid('group'), num, title: '', panels: [panel], activePanelId: panel.id }
}

function emptyRepo(): RepoTerms {
  return { groups: [], activeGroupId: null }
}

interface TerminalsState {
  byRepo: Record<string, RepoTerms>

  ensureRepo(repoPath: string, cwd: string): void
  addGroup(repoPath: string, cwd: string): void
  /** Add a Run/Debug launch session as its own group, backed by an existing
   *  main-process pty. Returns the new group + panel ids. */
  addLaunchGroup(repoPath: string, cwd: string, launchId: number, title: string): { groupId: string; panelId: string }
  removeGroup(repoPath: string, groupId: string): void
  setActiveGroup(repoPath: string, groupId: string): void
  splitGroup(repoPath: string, groupId: string, cwd: string): void
  removePanel(repoPath: string, groupId: string, panelId: string): void
  setActivePanel(repoPath: string, groupId: string, panelId: string): void
  setGroupTitle(repoPath: string, groupId: string, title: string): void
  setPanelTitle(repoPath: string, groupId: string, panelId: string, title: string): void
  resizePanels(repoPath: string, groupId: string, aId: string, aFlex: number, bId: string, bFlex: number): void
}

export const useTerminalsStore = create<TerminalsState>((set, get) => ({
  byRepo: {},

  ensureRepo: (repoPath, cwd) => {
    const cur = get().byRepo[repoPath]
    if (cur && cur.groups.length > 0) return
    const group = mkGroup(cwd, 1)
    set((s) => ({
      byRepo: { ...s.byRepo, [repoPath]: { groups: [group], activeGroupId: group.id } }
    }))
  },

  addGroup: (repoPath, cwd) => {
    set((s) => {
      const repo = s.byRepo[repoPath] ?? emptyRepo()
      const group = mkGroup(cwd, nextNum(repo.groups))
      return {
        byRepo: {
          ...s.byRepo,
          [repoPath]: { groups: [...repo.groups, group], activeGroupId: group.id }
        }
      }
    })
  },

  addLaunchGroup: (repoPath, cwd, launchId, title) => {
    const panel: TermPanel = { id: uid('panel'), cwd, flex: 1, launchId }
    const group: TermGroup = { id: uid('group'), num: 0, title, panels: [panel], activePanelId: panel.id }
    set((s) => {
      const repo = s.byRepo[repoPath] ?? emptyRepo()
      return {
        byRepo: {
          ...s.byRepo,
          [repoPath]: { groups: [...repo.groups, group], activeGroupId: group.id }
        }
      }
    })
    return { groupId: group.id, panelId: panel.id }
  },

  removeGroup: (repoPath, groupId) => {
    const repo = get().byRepo[repoPath]
    if (!repo) return
    const target = repo.groups.find((g) => g.id === groupId)
    target?.panels.forEach((p) => disposeTerm(p.id))
    const groups = repo.groups.filter((g) => g.id !== groupId)
    const activeGroupId =
      repo.activeGroupId === groupId ? (groups[groups.length - 1]?.id ?? null) : repo.activeGroupId
    set((s) => ({ byRepo: { ...s.byRepo, [repoPath]: { groups, activeGroupId } } }))
  },

  setActiveGroup: (repoPath, groupId) => {
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, activeGroupId: groupId } } }
    })
  },

  splitGroup: (repoPath, groupId, cwd) => {
    const panel: TermPanel = { id: uid('panel'), cwd, flex: 1 }
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      const groups = repo.groups.map((g) =>
        g.id === groupId
          ? { ...g, panels: [...g.panels, panel], activePanelId: panel.id }
          : g
      )
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, groups } } }
    })
  },

  removePanel: (repoPath, groupId, panelId) => {
    const repo = get().byRepo[repoPath]
    if (!repo) return
    const group = repo.groups.find((g) => g.id === groupId)
    if (!group) return
    // Last panel in group → remove whole group.
    if (group.panels.length <= 1) {
      get().removeGroup(repoPath, groupId)
      return
    }
    disposeTerm(panelId)
    const panels = group.panels.filter((p) => p.id !== panelId)
    const activePanelId =
      group.activePanelId === panelId ? panels[panels.length - 1].id : group.activePanelId
    set((s) => {
      const r = s.byRepo[repoPath]
      if (!r) return s
      const groups = r.groups.map((g) =>
        g.id === groupId ? { ...g, panels, activePanelId } : g
      )
      return { byRepo: { ...s.byRepo, [repoPath]: { ...r, groups } } }
    })
  },

  setActivePanel: (repoPath, groupId, panelId) => {
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      const groups = repo.groups.map((g) =>
        g.id === groupId ? { ...g, activePanelId: panelId } : g
      )
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, groups } } }
    })
  },

  setGroupTitle: (repoPath, groupId, title) => {
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      const groups = repo.groups.map((g) => (g.id === groupId ? { ...g, title } : g))
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, groups } } }
    })
  },

  setPanelTitle: (repoPath, groupId, panelId, title) => {
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      const groups = repo.groups.map((g) =>
        g.id === groupId
          ? { ...g, panels: g.panels.map((p) => (p.id === panelId ? { ...p, title } : p)) }
          : g
      )
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, groups } } }
    })
  },

  resizePanels: (repoPath, groupId, aId, aFlex, bId, bFlex) => {
    set((s) => {
      const repo = s.byRepo[repoPath]
      if (!repo) return s
      const groups = repo.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              panels: g.panels.map((p) =>
                p.id === aId ? { ...p, flex: aFlex } : p.id === bId ? { ...p, flex: bFlex } : p
              )
            }
          : g
      )
      return { byRepo: { ...s.byRepo, [repoPath]: { ...repo, groups } } }
    })
  }
}))
