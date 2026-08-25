/**
 * The wire format for the native application menu.
 *
 * The menu is *described* by the renderer and *built* by the main process. That
 * split exists for one reason: menu labels are user-facing copy, and the
 * dictionaries live in the renderer. Rather than teach the main process about
 * locales, the renderer resolves every label through `t()` and ships a fully
 * translated, fully evaluated spec across the bridge — rebuilding it whenever
 * the language, the open repository or the tab list changes.
 *
 * Items carry an `id` instead of a callback; clicking one sends that id back to
 * the renderer, which dispatches it through the same command table the keyboard
 * shortcuts use.
 */

/**
 * Electron roles the menu is allowed to use. Roles give native behaviour the
 * renderer cannot reproduce — the Services submenu, window ordering, text
 * editing that works inside a native context — so they are kept, but only from
 * this list. Notably absent: `close`, which would claim ⌘W and close the whole
 * window instead of the active tab.
 */
export const MENU_ROLES = [
  'about',
  'services',
  'hide',
  'hideOthers',
  'unhide',
  'quit',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'pasteAndMatchStyle',
  'selectAll',
  'reload',
  'forceReload',
  'toggleDevTools',
  'resetZoom',
  'zoomIn',
  'zoomOut',
  'togglefullscreen',
  'minimize',
  'zoom',
  'front'
] as const

export type MenuRole = (typeof MENU_ROLES)[number]

export interface MenuSpecItem {
  /** Command id sent back to the renderer on click. Omitted for roles and separators. */
  id?: string
  /** Already translated — the main process never looks a label up. */
  label?: string
  role?: MenuRole
  /** Electron accelerator string, e.g. `CmdOrCtrl+Shift+T`. */
  accelerator?: string
  /**
   * Show the accelerator but do not let the menu claim the key. Every combo the
   * renderer already handles in its own keydown listener is displayed this way,
   * so the menu documents the shortcut without competing for it.
   */
  showOnly?: boolean
  enabled?: boolean
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox'
  checked?: boolean
  submenu?: MenuSpecItem[]
}

export type MenuSpec = MenuSpecItem[]

const ROLE_SET: ReadonlySet<string> = new Set(MENU_ROLES)

export function isMenuRole(value: unknown): value is MenuRole {
  return typeof value === 'string' && ROLE_SET.has(value)
}

/**
 * Translate an internal combo (`mod+shift+t`) into an Electron accelerator
 * (`CmdOrCtrl+Shift+T`). Returns null for combos Electron cannot express, so a
 * user-rebound shortcut can never produce a menu that refuses to build.
 */
export function acceleratorFromCombo(combo: string): string | null {
  const parts = combo.split('+').filter(Boolean)
  if (parts.length === 0) return null
  const key = parts[parts.length - 1]
  if (!key || key === 'mod' || key === 'shift' || key === 'alt' || key === 'ctrl') return null
  const mods: string[] = []
  for (const p of parts.slice(0, -1)) {
    if (p === 'mod') mods.push('CmdOrCtrl')
    else if (p === 'ctrl') mods.push('Control')
    else if (p === 'shift') mods.push('Shift')
    else if (p === 'alt') mods.push('Alt')
    else return null
  }
  return [...mods, key.length === 1 ? key.toUpperCase() : key].join('+')
}
