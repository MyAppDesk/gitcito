import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { writeFile, readFile, mkdir, chmod } from 'fs/promises'
import icon from '../../resources/icon.png?asset'
import type { AppRelease } from '../shared/types'
import { registerGitHandlers } from './git'
import { registerSettingsHandlers } from './settings'
import { registerAiHandlers } from './ai'
import { registerAnalyticsHandlers } from './analytics'
import { registerLogHandlers } from './log'
import { registerHostingHandlers } from './hosting'
import { registerTerminalHandlers } from './terminal'
import { registerWatcherHandlers } from './watcher'
import { registerVaultHandlers } from './vault'
import { registerUpdaterHandlers, checkForUpdatesOnLaunch } from './updater'
import { fixPath } from './fix-path'

// GUI launches inherit a minimal PATH; restore the login-shell PATH so spawned
// git (and its hooks, e.g. husky → npm) find node/npm. Runs before any spawn.
fixPath()

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
      plugins: true,
      // Forward the screenshot-automation flag into the renderer/preload
      // process so the capture harness can enable its store bridge.
      additionalArguments: process.argv.includes('--shot') ? ['--shot'] : []
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

  // Save a generated patch to a user-chosen file. Returns the path, or null if cancelled.
  ipcMain.handle('dialog:savePatch', async (_e, defaultName: string, content: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export patch',
      defaultPath: defaultName,
      filters: [{ name: 'Patch', extensions: ['patch', 'diff'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, content, 'utf-8')
    return filePath
  })

  // Open a patch/diff file. Returns { path, content } or null if cancelled.
  ipcMain.handle('dialog:openPatch', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Apply patch',
      filters: [{ name: 'Patch', extensions: ['patch', 'diff'] }, { name: 'All files', extensions: ['*'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return null
    return { path: filePaths[0], content: await readFile(filePaths[0], 'utf-8') }
  })

  ipcMain.handle('app:version', () => app.getVersion())

  // Public release notes from GitHub. Done in main (not the renderer) because the
  // renderer CSP forbids cross-origin requests; no token needed for public repos.
  ipcMain.handle('app:releases', async (): Promise<AppRelease[]> => {
    try {
      const res = await fetch('https://api.github.com/repos/MyAppDesk/gitcito/releases?per_page=20', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'gitcito' }
      })
      if (!res.ok) return []
      const json = (await res.json()) as Array<{
        tag_name: string
        name: string | null
        body: string | null
        published_at: string
        html_url: string
        draft: boolean
        prerelease: boolean
      }>
      if (!Array.isArray(json)) return []
      return json
        .filter((r) => !r.draft)
        .map((r) => ({
          tag: r.tag_name,
          name: r.name,
          body: r.body,
          publishedAt: r.published_at,
          url: r.html_url,
          prerelease: r.prerelease
        }))
    } catch {
      return []
    }
  })

  ipcMain.handle('shell:showItemInFolder', (_e, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  ipcMain.handle('shell:openPath', (_e, fullPath: string) => shell.openPath(fullPath))

  ipcMain.handle(
    'shell:writeFiles',
    async (_e, repoPath: string, files: { path: string; content: string }[]) => {
      for (const file of files) {
        const fullPath = join(repoPath, file.path)
        await mkdir(dirname(fullPath), { recursive: true })
        await writeFile(fullPath, file.content, 'utf-8')
        if (file.path.startsWith('.git/hooks/')) {
          await chmod(fullPath, 0o755)
        }
      }
    }
  )

  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:maximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

  registerGitHandlers()
  registerSettingsHandlers()
  registerAiHandlers()
  registerAnalyticsHandlers()
  registerLogHandlers()
  registerHostingHandlers()
  registerTerminalHandlers()
  registerWatcherHandlers()
  registerVaultHandlers()
  registerUpdaterHandlers()

  createWindow()
  checkForUpdatesOnLaunch()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
