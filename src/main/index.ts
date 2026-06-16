import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerGitHandlers } from './git'
import { registerSettingsHandlers } from './settings'
import { registerAiHandlers } from './ai'
import { registerHostingHandlers } from './hosting'
import { registerTerminalHandlers } from './terminal'
import { registerWatcherHandlers } from './watcher'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    icon,
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: { x: 16, y: 15 },
    backgroundColor: '#0e0f15',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Enables Chromium's built-in PDF viewer for the file previewer.
      plugins: true
    }
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setName('Gitcito')

  if (process.platform === 'darwin') app.dock?.setIcon(icon)

  ipcMain.handle('dialog:selectDirectory', async (_e, title?: string) => {
    const res = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: title ?? 'Open repository'
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('shell:showItemInFolder', (_e, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  ipcMain.handle('shell:openPath', (_e, fullPath: string) => shell.openPath(fullPath))

  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:maximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

  registerGitHandlers()
  registerSettingsHandlers()
  registerAiHandlers()
  registerHostingHandlers()
  registerTerminalHandlers()
  registerWatcherHandlers()

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
