import { create } from 'zustand'

/**
 * Auto-detected foreground process name per panel (e.g. zsh, claude, vim).
 * Kept separate from the terminals store and keyed by panelId so the
 * terminalRegistry can update it without threading repo/group ids around.
 * Manual aliases always win over these values at render time.
 */
interface TermTitlesState {
  byPanel: Record<string, string>
  set(panelId: string, name: string): void
  clear(panelId: string): void
}

export const useTermTitlesStore = create<TermTitlesState>((set) => ({
  byPanel: {},
  set: (panelId, name) =>
    set((s) =>
      s.byPanel[panelId] === name ? s : { byPanel: { ...s.byPanel, [panelId]: name } }
    ),
  clear: (panelId) =>
    set((s) => {
      if (!(panelId in s.byPanel)) return s
      const next = { ...s.byPanel }
      delete next[panelId]
      return { byPanel: next }
    })
}))
