// Central registry for the app's global keyboard shortcuts. The actual handlers
// live in App.tsx and dispatch by id; bindings come from defaults overridden by
// the user's custom map (settings.shortcuts). Combos are stored normalized like
// "mod+shift+f" where `mod` = ⌘ on macOS / Ctrl elsewhere.

import type { TranslationKey } from '../i18n'

export interface ShortcutDef {
  id: string
  /** Dictionary key — the UI resolves it with `t()`; never a raw string. */
  labelKey: TranslationKey
  categoryKey: TranslationKey
  defaultCombo: string
}

/** Rebindable global shortcuts. */
export const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'command-palette',
    labelKey: 'sc.commandPalette',
    categoryKey: 'sc.cat.navigation',
    defaultCombo: 'mod+k'
  },
  {
    id: 'code-search',
    labelKey: 'sc.searchCode',
    categoryKey: 'sc.cat.navigation',
    defaultCombo: 'mod+shift+f'
  },
  {
    id: 'vault',
    labelKey: 'sc.openVault',
    categoryKey: 'sc.cat.navigation',
    defaultCombo: 'mod+shift+v'
  },
  {
    id: 'open-repository',
    labelKey: 'sc.openRepository',
    categoryKey: 'sc.cat.navigation',
    defaultCombo: 'mod+o'
  },
  {
    id: 'settings',
    labelKey: 'sc.openSettings',
    categoryKey: 'sc.cat.navigation',
    defaultCombo: 'mod+,'
  }
]

/** Fixed (non-rebindable) shortcuts, shown in the cheatsheet for reference. */
export const FIXED_SHORTCUTS: {
  labelKey: TranslationKey
  combo: string
  categoryKey: TranslationKey
}[] = [
  { labelKey: 'sc.keyboardShortcuts', combo: '?', categoryKey: 'sc.cat.help' },
  { labelKey: 'sc.navigateCommits', combo: '↑ ↓ / j k', categoryKey: 'sc.cat.navigation' },
  { labelKey: 'sc.selectTab', combo: 'mod+1…9', categoryKey: 'sc.cat.navigation' },
  { labelKey: 'sc.newTab', combo: 'mod+t', categoryKey: 'sc.cat.navigation' },
  { labelKey: 'sc.closeTab', combo: 'mod+w', categoryKey: 'sc.cat.navigation' },
  { labelKey: 'sc.reopenTab', combo: 'mod+shift+t', categoryKey: 'sc.cat.navigation' },
  { labelKey: 'toolbar.terminalTitle', combo: 'ctrl+`', categoryKey: 'sc.cat.general' },
  { labelKey: 'terminal.new', combo: 'mod+t', categoryKey: 'sc.cat.general' },
  { labelKey: 'terminal.kill', combo: 'mod+w', categoryKey: 'sc.cat.general' },
  { labelKey: 'sc.saveFile', combo: 'mod+s', categoryKey: 'sc.cat.editing' },
  { labelKey: 'sc.undo', combo: 'mod+z', categoryKey: 'sc.cat.editing' },
  { labelKey: 'sc.redo', combo: 'mod+shift+z', categoryKey: 'sc.cat.editing' },
  { labelKey: 'sc.findInFile', combo: 'mod+f', categoryKey: 'sc.cat.editing' },
  { labelKey: 'sc.closeDialog', combo: 'Escape', categoryKey: 'sc.cat.general' }
]

/**
 * Combos the app answers before it consults the rebindable registry — the tab
 * shortcuts in App.tsx, and the ones the editor and the browser claim. Binding an
 * action to one of these would look accepted and then silently never fire, so the
 * editor refuses them instead.
 */
export const RESERVED_COMBOS: string[] = [
  'mod+t',
  'mod+w',
  'mod+`',
  'mod+shift+t',
  'mod+s',
  'mod+z',
  'mod+shift+z',
  'mod+f',
  ...Array.from({ length: 9 }, (_, i) => `mod+${i + 1}`)
]

export function isReservedCombo(combo: string): boolean {
  return RESERVED_COMBOS.includes(combo)
}

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

/** Zero-based tab position selected by Cmd/Ctrl+1…9, or null for any other key. */
export function tabIndexFromEvent(e: KeyboardEvent): number | null {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || !/^[1-9]$/.test(e.key)) return null
  return Number(e.key) - 1
}

/** Fixed tab action selected by Cmd/Ctrl+T or Cmd/Ctrl+W. */
export function tabActionFromEvent(e: KeyboardEvent): 'new' | 'close' | null {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return null
  const key = e.key.toLowerCase()
  if (key === 't') return 'new'
  if (key === 'w') return 'close'
  return null
}

/** Pretty-print a combo for display, e.g. "mod+shift+f" → "⌘⇧F" (mac) / "Ctrl+Shift+F". */
export function formatCombo(combo: string): string {
  const mac = isMac()
  return combo
    .split('+')
    .map((p) => {
      if (p === 'mod') return mac ? '⌘' : 'Ctrl'
      if (p === 'ctrl') return mac ? '⌃' : 'Ctrl'
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
