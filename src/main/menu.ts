import { app, BrowserWindow, Menu, ipcMain, type MenuItemConstructorOptions } from 'electron'
import { isMenuRole, type MenuSpec, type MenuSpecItem } from '../shared/menu'

/**
 * The native application menu.
 *
 * Everything about *what* the menu says is decided in the renderer (see
 * `renderer/src/lib/appMenu.ts`) and arrives here already translated; this
 * module only turns that description into Electron menu items and routes clicks
 * back. Keeping the decisions on the renderer side is what lets the menu track
 * the language, the active repository and the tab list without the main process
 * knowing anything about them.
 *
 * The menu is installed on macOS only. Windows and Linux run frameless (see
 * `createWindow`), where an application menu has nowhere to draw — there the
 * menu is cleared instead, which also stops Electron's default menu from
 * quietly claiming accelerators such as Ctrl+W that the renderer wants.
 */

function toItem(spec: MenuSpecItem, send: (id: string) => void): MenuItemConstructorOptions | null {
  if (spec.type === 'separator') return { type: 'separator' }

  const item: MenuItemConstructorOptions = {}
  if (spec.label) item.label = spec.label
  // An unrecognised role is dropped rather than passed through: Electron throws
  // on an unknown role and would take the whole menu down with it.
  if (spec.role) {
    if (!isMenuRole(spec.role)) return null
    item.role = spec.role
  }
  if (spec.accelerator) item.accelerator = spec.accelerator
  // `showOnly` items document a shortcut the renderer's own keydown listener
  // owns. Registering it here would consume the key first and the renderer would
  // never see it.
  if (spec.showOnly) item.registerAccelerator = false
  if (spec.enabled === false) item.enabled = false
  if (spec.type === 'checkbox') {
    item.type = 'checkbox'
    item.checked = !!spec.checked
  }
  if (spec.submenu) {
    item.submenu = spec.submenu.map((s) => toItem(s, send)).filter((s): s is MenuItemConstructorOptions => !!s)
  }
  const id = spec.id
  if (id && !spec.role) item.click = () => send(id)
  return item
}

function buildMenu(spec: MenuSpec): Menu {
  const send = (id: string): void => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    win?.webContents.send('menu:command', id)
  }
  const template = spec.map((s) => toItem(s, send)).filter((s): s is MenuItemConstructorOptions => !!s)
  return Menu.buildFromTemplate(template)
}

export function registerMenuHandlers(): void {
  if (process.platform !== 'darwin') {
    // Frameless window: no menu bar to draw into, and the default menu would
    // only get in the renderer's way.
    Menu.setApplicationMenu(null)
    ipcMain.handle('menu:set', () => {})
    return
  }

  // The About item is a role, so the panel is drawn (and localised) by macOS.
  app.setAboutPanelOptions({
    applicationName: app.getName(),
    applicationVersion: app.getVersion(),
    version: ''
  })

  ipcMain.handle('menu:set', (_e, spec: MenuSpec) => {
    if (!Array.isArray(spec)) return
    try {
      Menu.setApplicationMenu(buildMenu(spec))
    } catch (err) {
      // A malformed spec must never leave the app menu-less; keep the previous
      // menu and let the log carry the reason.
      console.error('menu: failed to build application menu', err)
    }
  })
}
