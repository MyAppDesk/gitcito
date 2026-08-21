import { create } from 'zustand'

/**
 * Auto-detected titles per panel, from two sources: the polled foreground
 * process name (e.g. zsh, claude, vim) and the title the program itself
 * pushed via OSC 0/2. Kept separate from the terminals store and keyed by
 * panelId so the terminalRegistry can update it without threading
 * repo/group ids around. Manual aliases always win over these at render time.
 */
interface TermTitlesState {
  byPanel: Record<string, string>
  oscByPanel: Record<string, string>
  set(panelId: string, name: string): void
  /** Empty title = the program reset it; drop back to the process name. */
  setOsc(panelId: string, title: string): void
  clear(panelId: string): void
}

function without(map: Record<string, string>, key: string): Record<string, string> {
  const next = { ...map }
  delete next[key]
  return next
}

export const useTermTitlesStore = create<TermTitlesState>((set) => ({
  byPanel: {},
  oscByPanel: {},
  set: (panelId, name) =>
    set((s) =>
      s.byPanel[panelId] === name ? s : { byPanel: { ...s.byPanel, [panelId]: name } }
    ),
  setOsc: (panelId, title) =>
    set((s) => {
      if (!title) {
        if (!(panelId in s.oscByPanel)) return s
        return { oscByPanel: without(s.oscByPanel, panelId) }
      }
      if (s.oscByPanel[panelId] === title) return s
      return { oscByPanel: { ...s.oscByPanel, [panelId]: title } }
    }),
  clear: (panelId) =>
    set((s) => {
      if (!(panelId in s.byPanel) && !(panelId in s.oscByPanel)) return s
      return { byPanel: without(s.byPanel, panelId), oscByPanel: without(s.oscByPanel, panelId) }
    })
}))
