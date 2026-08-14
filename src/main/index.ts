import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, resolve, sep } from 'path'
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs'
import { writeFile, readFile, mkdir, chmod } from 'fs/promises'
import { execFile, spawn } from 'child_process'
import icon from '../../resources/icon.png?asset'
import type { AppRelease } from '../shared/types'
import { registerGitHandlers } from './git'
import { registerSettingsHandlers } from './settings'
import { registerAiHandlers } from './ai'
import { registerWikiHandlers } from './wiki'
import { isSafeRepoPath } from './aiSchemas'
import { registerAnalyticsHandlers } from './analytics'
import { registerLogHandlers } from './log'
import { registerHostingHandlers } from './hosting'
import { registerTerminalHandlers } from './terminal'
import { registerLaunchHandlers } from './launch'
import { registerWatcherHandlers } from './watcher'
import { registerVaultHandlers } from './vault'
import { registerKeychainHandlers } from './keychain'
import { registerSecureShareHandlers } from './secureShare'
import { registerInfoHandlers } from './info'
import { registerUpdaterHandlers, checkForUpdatesOnLaunch } from './updater'
import { fixPath } from './fix-path'
import { registerCliHandlers } from './cli'
import { parseCliOpenArgs, type CliOpenPayload } from '../shared/cli'

// GUI launches inherit a minimal PATH; restore the login-shell PATH so spawned
// git (and its hooks, e.g. husky → npm) find node/npm. Runs before any spawn.
fixPath()

// Sends a CLI-requested path to a window once its page has actually loaded.
// Applies to both cold launch and second-instance hand-off (see whenReady()
// and 'second-instance' below) — the renderer itself queues this until its
// settings store has finished loading from disk, since settings load()
// resolves asynchronously and would otherwise clobber a tab added too early.
function sendOpenPath(win: BrowserWindow, payload: CliOpenPayload): void {
  if (win.webContents.isLoadingMainFrame()) {
    win.webContents.once('did-finish-load', () => win.webContents.send('cli:open-path', payload))
  } else {
    win.webContents.send('cli:open-path', payload)
  }
}

// Dev builds get their own userData dir. The single-instance lock below lives
// in userData, and dev's app name ("gitcito", from package.json) resolves to
// the same dir as the packaged app ("Gitcito") on case-insensitive filesystems
// — so `electron-vite dev` would silently quit whenever the installed app is
// running. A separate dir gives dev its own lock and keeps dev runs from
// mutating real settings/vault data.
// An explicit --user-data-dir (screenshot harness, scripted runs) must win:
// Electron has already applied it, and redirecting to the dev dir here would
// replace the caller's seeded throwaway settings with a copy of prod data.
if (!app.isPackaged && !app.commandLine.hasSwitch('user-data-dir')) {
  const devDir = join(app.getPath('appData'), 'gitcito-dev')
  app.setPath('userData', devDir)
  // First dev run: seed from the installed app's data so dev mirrors the real
  // setup (workspaces, settings, repo info). Only when dev has no settings yet
  // — re-copying every launch would clobber state saved during dev sessions,
  // which is often the thing under test. Re-seed by deleting the dev dir.
  // The vault copy is best-effort: if dev's keychain entry differs from prod's,
  // vault load() just falls back to an empty vault.
  const prodDir = join(app.getPath('appData'), 'Gitcito')
  if (!existsSync(join(devDir, 'gitcito-settings.json')) && existsSync(prodDir)) {
    mkdirSync(devDir, { recursive: true })
    for (const f of readdirSync(prodDir)) {
      if (/^gitcito-.+\.(json|enc)$/.test(f)) copyFileSync(join(prodDir, f), join(devDir, f))
    }
  }
}

// Only one Gitcito instance should run — `gitcito <dir>` from a second
// terminal should hand its path to the existing window rather than spawn a
// new app instance.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const [win] = BrowserWindow.getAllWindows()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
    const payload = parseCliOpenArgs(argv)
    if (payload) sendOpenPath(win, payload)
  })
}

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
  // The default application menu owns Cmd/Ctrl+W ("Close Window") and would swallow
  // it before the renderer can close the active tab, so suppress the accelerator for
  // that one combo. The renderer falls back to closing the window when no tab is left.
  // This fires on every keystroke, so only cross into the browser process on a real
  // change — and only on key-down, since the flag has to be set before the accelerator
  // for the same event is resolved.
  let ignoringMenuShortcuts = false
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return
    const isCloseTab =
      (input.meta || input.control) && !input.shift && !input.alt && input.key.toLowerCase() === 'w'
    if (isCloseTab === ignoringMenuShortcuts) return
    ignoringMenuShortcuts = isCloseTab
    win.webContents.setIgnoreMenuShortcuts(isCloseTab)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setName(app.isPackaged ? 'Gitcito' : 'Gitcito Dev')

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

  // Save binary content (the timelapse video) to a user-chosen file. The
  // renderer records in-page and hands the bytes over; nothing is written
  // anywhere until the user picks a destination. Returns the path, or null.
  ipcMain.handle(
    'dialog:saveBinary',
    async (_e, defaultName: string, data: Uint8Array, filters?: { name: string; extensions: string[] }[]) => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save file',
        defaultPath: defaultName,
        filters: filters?.length ? filters : [{ name: 'All files', extensions: ['*'] }]
      })
      if (canceled || !filePath) return null
      await writeFile(filePath, Buffer.from(data))
      return filePath
    }
  )

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

  // Shows the OS-native "Open With…" app picker for a file or folder. macOS and
  // Windows have first-class support; other platforms fall back to the default
  // opener since there's no universal picker across Linux desktop environments.
  ipcMain.handle('shell:openWithPicker', (_e, fullPath: string): Promise<string> => {
    if (process.platform === 'darwin') {
      return new Promise((resolve) => {
        const script = `tell application "Finder" to open (POSIX file ${JSON.stringify(fullPath)}) using (choose application)`
        execFile('osascript', ['-e', script], (err, _stdout, stderr) => {
          // -128 is AppleScript's "user canceled" — not a real failure.
          if (err && !/-128/.test(String(stderr))) resolve(err.message)
          else resolve('')
        })
      })
    }
    if (process.platform === 'win32') {
      return new Promise((resolve) => {
        execFile('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', fullPath], (err) => resolve(err ? err.message : ''))
      })
    }
    return shell.openPath(fullPath)
  })

  // Lets the user browse to and pick a specific application (e.g. VS Code), to be
  // remembered as the default "Open with <App>" target. Returns null if cancelled.
  ipcMain.handle(
    'shell:pickApplication',
    async (): Promise<{ name: string; path: string } | null> => {
      const isMac = process.platform === 'darwin'
      const isWin = process.platform === 'win32'
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Choose application',
        defaultPath: isMac ? '/Applications' : undefined,
        properties: ['openFile'],
        filters: isMac
          ? [{ name: 'Applications', extensions: ['app'] }]
          : isWin
            ? [{ name: 'Programs', extensions: ['exe'] }]
            : [{ name: 'All files', extensions: ['*'] }]
      })
      if (canceled || !filePaths[0]) return null
      const appPath = filePaths[0]
      const base = appPath.split(/[\\/]/).pop() ?? appPath
      const name = base.replace(/\.(app|exe)$/i, '')
      return { name, path: appPath }
    }
  )

  // Launches a specific application with a file/folder path, e.g. the equivalent
  // of running `code <path>` for VS Code, without relying on a shell/PATH lookup.
  ipcMain.handle('shell:openWithApp', (_e, targetPath: string, appPath: string): Promise<string> => {
    return new Promise((resolve) => {
      if (process.platform === 'darwin') {
        execFile('open', ['-a', appPath, targetPath], (err) => resolve(err ? err.message : ''))
      } else {
        const child = spawn(appPath, [targetPath], { detached: true, stdio: 'ignore' })
        child.once('error', (err) => resolve(err.message))
        child.unref()
        resolve('')
      }
    })
  })

  ipcMain.handle(
    'shell:writeFiles',
    async (_e, repoPath: string, files: { path: string; content: string }[]) => {
      // These paths can come from an LLM (the project-config wizard), so a
      // "../.." would otherwise write anywhere on disk. Refuse rather than
      // clamp — a path that needed rewriting was not the one that was asked for
      // — and check the whole batch first so a bad entry writes nothing at all.
      const root = resolve(repoPath)
      for (const file of files) {
        const full = resolve(join(repoPath, file.path))
        if (!isSafeRepoPath(file.path) || (full !== root && !full.startsWith(root + sep))) {
          throw new Error(`Refusing to write outside the repository: ${file.path}`)
        }
      }
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
  registerWikiHandlers()
  registerAnalyticsHandlers()
  registerLogHandlers()
  registerHostingHandlers()
  registerTerminalHandlers()
  registerLaunchHandlers()
  registerWatcherHandlers()
  registerVaultHandlers()
  registerKeychainHandlers()
  registerSecureShareHandlers()
  registerInfoHandlers()
  registerUpdaterHandlers()
  registerCliHandlers()

  createWindow()
  checkForUpdatesOnLaunch()

  // Cold launch via `gitcito <dir>` (open -a Gitcito --args --open <path> ...).
  // process.argv here is the *main* process's own argv — not visible to the
  // preload/renderer processes, which only see whatever we forward explicitly.
  const openPayload = parseCliOpenArgs(process.argv)
  if (openPayload) {
    const [win] = BrowserWindow.getAllWindows()
    if (win) sendOpenPath(win, openPayload)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
