// Central registry for the app's global keyboard shortcuts. The actual handlers
// live in App.tsx and dispatch by id; bindings come from defaults overridden by
// the user's custom map (settings.shortcuts). Combos are stored normalized like
// "mod+shift+f" where `mod` = ⌘ on macOS / Ctrl elsewhere.

export interface ShortcutDef {
  id: string
  label: string
  category: string
  defaultCombo: string
}

/** Rebindable global shortcuts. */
export const SHORTCUTS: ShortcutDef[] = [
  { id: 'command-palette', label: 'Command palette', category: 'Navigation', defaultCombo: 'mod+k' },
  { id: 'code-search', label: 'Search code', category: 'Navigation', defaultCombo: 'mod+shift+f' },
  { id: 'vault', label: 'Open vault', category: 'Navigation', defaultCombo: 'mod+shift+v' }
]

/** Fixed (non-rebindable) shortcuts, shown in the cheatsheet for reference. */
export const FIXED_SHORTCUTS: { label: string; combo: string; category: string }[] = [
  { label: 'Keyboard shortcuts', combo: '?', category: 'Help' },
  { label: 'Navigate commits', combo: '↑ ↓ / j k', category: 'Navigation' },
  { label: 'Reopen closed tab', combo: 'mod+shift+t', category: 'Navigation' },
  { label: 'Save file', combo: 'mod+s', category: 'Editing' },
  { label: 'Undo', combo: 'mod+z', category: 'Editing' },
  { label: 'Redo', combo: 'mod+shift+z', category: 'Editing' },
  { label: 'Find in file', combo: 'mod+f', category: 'Editing' },
  { label: 'Close dialog / panel', combo: 'Escape', category: 'General' }
]

const isMac = (): boolean => typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** Normalize a keydown event to a combo string, or null for a modifier-only press. */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const k = e.key
  if (k === 'Shift' || k === 'Meta' || k === 'Control' || k === 'Alt') return null
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(k.length === 1 ? k.toLowerCase() : k)
  return parts.join('+')
}

/** Pretty-print a combo for display, e.g. "mod+shift+f" → "⌘⇧F" (mac) / "Ctrl+Shift+F". */
export function formatCombo(combo: string): string {
  const mac = isMac()
  return combo
    .split('+')
    .map((p) => {
      if (p === 'mod') return mac ? '⌘' : 'Ctrl'
      if (p === 'shift') return mac ? '⇧' : 'Shift'
      if (p === 'alt') return mac ? '⌥' : 'Alt'
      if (p.length === 1) return p.toUpperCase()
      return p
    })
    .join(mac ? '' : '+')
}

/** Effective bindings: defaults with the user's overrides applied. */
export function effectiveBindings(custom: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of SHORTCUTS) out[s.id] = custom?.[s.id] || s.defaultCombo
  return out
}

/** Which shortcut id (if any) a keydown event triggers, given effective bindings. */
export function matchShortcut(e: KeyboardEvent, bindings: Record<string, string>): string | null {
  const combo = comboFromEvent(e)
  if (!combo) return null
  for (const id in bindings) if (bindings[id] === combo) return id
  return null
}
