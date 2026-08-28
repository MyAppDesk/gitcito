/**
 * Builds the native application menu's description.
 *
 * Pure on purpose: it takes a snapshot of what the app currently is — language,
 * open repository, tab list, recent repositories — and returns a plain spec the
 * main process turns into menu items. No stores, no IPC, so the whole menu is
 * testable without an Electron window.
 *
 * Two conventions run through it:
 *
 * - Labels are resolved here, through the caller's `t`, because the
 *   dictionaries live on this side of the bridge.
 * - Any item whose shortcut the renderer already handles in its own keydown
 *   listener is marked `showOnly`, so the menu displays the combo without
 *   claiming the key. That keeps `App.tsx` the single place a shortcut runs,
 *   and it keeps user rebinding (settings.shortcuts) working — the accelerator
 *   shown is the one actually bound.
 */

import { acceleratorFromCombo, type MenuSpec, type MenuSpecItem } from '../../../shared/menu'
import type { TranslationKey } from '../i18n'
// Straight from the leaf module: `../i18n` pulls in the settings store, and the
// menu builder is meant to stay importable without one.
import { interp } from '../i18n/interp'

export interface MenuRecentRepo {
  path: string
  name: string
}

export interface MenuContext {
  /** The product name, as it should read in "About …" and "Quit …". */
  appName: string
  /** Unpackaged builds get the reload / developer-tools items; releases do not. */
  isDev: boolean
  /** A tab is open (of any kind) — gates "Close tab". */
  hasTabs: boolean
  /** A git repository is the active tab's subject — gates the whole Repository menu. */
  hasRepo: boolean
  /** The active repository has an operation that can be undone. */
  canUndo: boolean
  /** Name of the configured external editor, or null when none is set. */
  editorName: string | null
  /** Effective shortcut bindings, defaults with the user's overrides applied. */
  bindings: Record<string, string>
  /** Recently opened repositories, most recent first. */
  recent: MenuRecentRepo[]
}

/** How many entries the "Open recent" submenu shows before it stops being a menu. */
const RECENT_LIMIT = 10

const SEP: MenuSpecItem = { type: 'separator' }

/** An item whose accelerator is displayed but left for the renderer to handle. */
function bound(id: string, label: string, combo: string | undefined, enabled = true): MenuSpecItem {
  const accelerator = combo ? acceleratorFromCombo(combo) : null
  return {
    id,
    label,
    enabled,
    ...(accelerator ? { accelerator, showOnly: true } : {})
  }
}

export function buildMenuSpec(ctx: MenuContext, t: (key: TranslationKey) => string): MenuSpec {
  const b = ctx.bindings
  const repo = ctx.hasRepo

  const recent: MenuSpecItem[] = ctx.recent.slice(0, RECENT_LIMIT).map((r) => ({
    id: `open-recent:${r.path}`,
    // A repository's own name is not translatable copy.
    label: r.name,
    enabled: true
  }))

  const appMenu: MenuSpecItem = {
    label: ctx.appName,
    submenu: [
      // A role, so macOS draws its own panel with the icon and version.
      { role: 'about', label: interp(t('menu.about'), { app: ctx.appName }) },
      { id: 'check-updates', label: t('menu.checkUpdates') },
      SEP,
      bound('settings', t('settings.title'), b['settings']),
      SEP,
      { role: 'services', label: t('menu.services') },
      SEP,
      { role: 'hide', label: interp(t('menu.hide'), { app: ctx.appName }) },
      { role: 'hideOthers', label: t('menu.hideOthers') },
      { role: 'unhide', label: t('menu.showAll') },
      SEP,
      { role: 'quit', label: interp(t('menu.quit'), { app: ctx.appName }) }
    ]
  }

  const fileMenu: MenuSpecItem = {
    label: t('menu.file'),
    submenu: [
      bound('new-tab', t('sc.newTab'), 'mod+t'),
      bound('open-repository', t('sc.openRepository'), b['open-repository']),
      { id: 'clone', label: t('clone.title') },
      {
        label: t('menu.openRecent'),
        submenu: recent.length ? recent : [{ label: t('menu.noRecent'), enabled: false }]
      },
      SEP,
      bound('close-tab', t('sc.closeTab'), 'mod+w', ctx.hasTabs),
      // Always enabled: the closed-tab stack is session state the menu cannot see,
      // and reopening with an empty stack is a no-op rather than an error.
      bound('reopen-tab', t('sc.reopenTab'), 'mod+shift+t')
    ]
  }

  // Roles, not commands: text editing has to work inside native inputs, and only
  // the OS can do that. These are the same items Electron's default menu carried.
  const editMenu: MenuSpecItem = {
    label: t('menu.edit'),
    submenu: [
      { role: 'undo', label: t('sc.undo') },
      { role: 'redo', label: t('sc.redo') },
      SEP,
      { role: 'cut', label: t('menu.cut') },
      { role: 'copy', label: t('menu.copy') },
      { role: 'paste', label: t('menu.paste') },
      { role: 'selectAll', label: t('menu.selectAll') },
      SEP,
      bound('code-search', t('sc.searchCode'), b['code-search'], repo)
    ]
  }

  const viewMenu: MenuSpecItem = {
    label: t('menu.view'),
    submenu: [
      bound('command-palette', t('sc.commandPalette'), b['command-palette']),
      SEP,
      bound('toggle-left-sidebar', t('sc.toggleLeftSidebar'), b['toggle-left-sidebar'], repo),
      bound('toggle-right-panel', t('sc.toggleRightPanel'), b['toggle-right-panel'], repo),
      bound('toggle-terminal', t('toolbar.terminalTitle'), 'ctrl+`', repo),
      SEP,
      { id: 'mission-control', label: t('mission.open') },
      bound('vault', t('sc.openVault'), b['vault']),
      SEP,
      { role: 'resetZoom', label: t('menu.actualSize') },
      { role: 'zoomIn', label: t('menu.zoomIn') },
      { role: 'zoomOut', label: t('menu.zoomOut') },
      SEP,
      { role: 'togglefullscreen', label: t('menu.toggleFullScreen') },
      // Reload throws away every open tab's state, and the inspector is not
      // something a release build should offer.
      ...(ctx.isDev
        ? [SEP, { role: 'reload' as const, label: t('menu.reload') }, { role: 'toggleDevTools' as const, label: t('menu.devTools') }]
        : [])
    ]
  }

  const repoMenu: MenuSpecItem = {
    label: t('menu.repository'),
    submenu: [
      { id: 'fetch', label: t('cmd.fetch'), enabled: repo },
      { id: 'pull', label: t('cmd.pull'), enabled: repo },
      { id: 'push', label: t('cmd.push'), enabled: repo },
      SEP,
      { id: 'commit', label: t('cmd.commit'), enabled: repo },
      { id: 'stash', label: t('cmd.stash'), enabled: repo },
      { id: 'create-branch', label: t('cmd.createBranch'), enabled: repo },
      SEP,
      { id: 'create-pr', label: t('cmd.createPr'), enabled: repo },
      SEP,
      { id: 'undo-last', label: t('toolbar.undoTitle'), enabled: repo && ctx.canUndo },
      SEP,
      { id: 'reveal', label: t('repoMenu.revealFinder'), enabled: repo },
      {
        id: 'open-in-editor',
        label: ctx.editorName
          ? interp(t('cmd.openInEditor'), { app: ctx.editorName })
          : t('repoMenu.openEditor'),
        enabled: repo && !!ctx.editorName
      },
      SEP,
      { id: 'repo-settings', label: t('repoSettings.title'), enabled: repo }
    ]
  }

  const windowMenu: MenuSpecItem = {
    label: t('menu.window'),
    // Let AppKit build the standard Window menu. Besides Minimize, Zoom and
    // Bring All to Front, this is what gives recent macOS versions ownership
    // of Fill / Fn-Control-F and the other native Move & Resize commands.
    role: 'windowMenu'
  }

  const helpMenu: MenuSpecItem = {
    label: t('menu.help'),
    submenu: [
      { id: 'help', label: t('help.open') },
      { id: 'cheatsheet', label: t('sc.keyboardShortcuts') },
      SEP,
      { id: 'changelog', label: t('changelog.title') },
      { id: 'licenses', label: t('licenses.title') },
      SEP,
      { id: 'report-issue', label: t('menu.reportIssue') }
    ]
  }

  return [appMenu, fileMenu, editMenu, viewMenu, repoMenu, windowMenu, helpMenu]
}

/** Every command id the menu can emit — the dispatcher is checked against this. */
export function menuCommandIds(spec: MenuSpec): string[] {
  const out: string[] = []
  const walk = (items: MenuSpec): void => {
    for (const item of items) {
      if (item.id && !item.role) out.push(item.id)
      if (item.submenu) walk(item.submenu)
    }
  }
  walk(spec)
  return out
}
