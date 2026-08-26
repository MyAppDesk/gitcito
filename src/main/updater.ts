import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState, UpdateInfo } from '../shared/types'
import { isNewerVersion } from '../shared/version'

const REPO = 'MyAppDesk/gitcito'
const releaseUrl = (version: string): string =>
  `https://github.com/${REPO}/releases/tag/v${version.replace(/^v/, '')}`

// Single source of truth for update state; pushed to every renderer on change.
const state: UpdateState = {
  status: 'idle',
  info: null,
  progress: null,
  error: null,
  supported: app.isPackaged,
  staged: null
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:event', state)
  }
}

function setState(patch: Partial<UpdateState>): void {
  Object.assign(state, patch)
  broadcast()
}

/** Coerce electron-updater's releaseNotes (string | {note}[] | null) to text. */
function notesToText(notes: unknown): string | null {
  if (!notes) return null
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map((n) => (typeof n === 'string' ? n : (n as { note?: string }).note ?? ''))
      .filter(Boolean)
      .join('\n\n')
  }
  return null
}

/** Dev / unpackaged builds can't run electron-updater. Poll the GitHub API so
 *  the "new version available" UI still works (download falls back to the page). */
async function checkViaGitHub(): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'gitcito' }
    })
    if (!res.ok) {
      setState({ status: 'not-available' })
      return
    }
    const json = (await res.json()) as { tag_name?: string; body?: string | null; published_at?: string }
    const latest = (json.tag_name ?? '').replace(/^v/, '')
    if (latest && isNewerVersion(latest, app.getVersion())) {
      const info: UpdateInfo = {
        version: latest,
        notes: json.body ?? null,
        releaseDate: json.published_at,
        url: releaseUrl(latest)
      }
      setState({ status: 'available', info })
    } else {
      setState({ status: 'not-available' })
    }
  } catch {
    setState({ status: 'error', error: 'Could not reach the update server.' })
  }
}

// A check the user did not ask for — priming before a download, or the
// background re-check below. Suppresses the 'checking' UI flip so the banner
// doesn't flicker or disappear under them. A depth counter, not a boolean,
// because a background tick can overlap a download prime.
let silentDepth = 0

async function runCheck(silent: boolean): Promise<void> {
  if (silent) silentDepth++
  try {
    await autoUpdater.checkForUpdates()
  } finally {
    if (silent) silentDepth--
  }
}

// A session left open for days used to keep offering whatever the launch check
// found, so the What's-new page (which refetches from GitHub every time it
// opens) could name a newer version than the updater had ever heard of.
const RECHECK_MS = 3 * 60 * 60 * 1000
let recheckTimer: NodeJS.Timeout | null = null

function scheduleRechecks(): void {
  if (recheckTimer) return
  recheckTimer = setInterval(() => {
    // Never interrupt a transfer in flight; it re-checks when it finishes.
    if (state.status === 'downloading') return
    void runCheck(true).catch(() => {})
  }, RECHECK_MS)
  recheckTimer.unref?.()
}

let wired = false
function wireAutoUpdater(): void {
  if (wired) return
  wired = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    if (silentDepth > 0) return
    setState({ status: 'checking', error: null })
  })
  autoUpdater.on('update-available', (info) => {
    // Every check re-announces whatever the feed holds, compared against the
    // *installed* version — so a re-check with something already staged would
    // otherwise knock the banner back from "restart" to "download".
    if (state.staged && !isNewerVersion(info.version, state.staged)) return
    setState({
      status: 'available',
      progress: null,
      info: {
        version: info.version,
        notes: notesToText(info.releaseNotes),
        releaseDate: info.releaseDate,
        url: releaseUrl(info.version)
      }
    })
  })
  autoUpdater.on('update-not-available', () => {
    // A staged build is still installable even if the feed now says we're current.
    if (state.status === 'downloaded') return
    setState({ status: 'not-available' })
  })
  autoUpdater.on('download-progress', (p) =>
    setState({
      status: 'downloading',
      progress: {
        percent: p.percent,
        bytesPerSecond: p.bytesPerSecond,
        transferred: p.transferred,
        total: p.total
      }
    })
  )
  autoUpdater.on('update-downloaded', (info) =>
    setState({
      status: 'downloaded',
      progress: null,
      staged: info.version,
      info: {
        version: info.version,
        notes: notesToText(info.releaseNotes),
        releaseDate: info.releaseDate,
        url: releaseUrl(info.version)
      }
    })
  )
  autoUpdater.on('error', (err) => {
    // A failed background re-check must not bury an update already on disk.
    if (state.status === 'downloaded') return
    setState({ status: 'error', error: err?.message ?? String(err) })
  })
}

export function registerUpdaterHandlers(): void {
  ipcMain.handle('update:getState', (): UpdateState => state)

  // `silent` keeps the banner as it is instead of flipping to 'checking' — for
  // checks the user did not ask for, like opening the What's-new page.
  ipcMain.handle('update:check', async (_e, silent?: boolean) => {
    if (!app.isPackaged) {
      await checkViaGitHub()
      return
    }
    wireAutoUpdater()
    try {
      await runCheck(silent === true)
    } catch (err) {
      if (silent === true) return
      setState({ status: 'error', error: (err as Error)?.message ?? 'Update check failed.' })
    }
  })

  ipcMain.handle('update:download', async () => {
    // Unsupported (dev): open the release page; the renderer also handles this,
    // but guard here in case it calls through anyway.
    if (!app.isPackaged) {
      if (state.info?.url) await shell.openExternal(state.info.url)
      return
    }
    wireAutoUpdater()
    try {
      // electron-updater's downloadUpdate() depends on internal state populated
      // by a successful checkForUpdates(). That state can be missing or stale if
      // the launch check raced with / lost to the renderer's check, which makes
      // the first Download click silently no-op (a reload re-checks and fixes
      // it). Re-prime with a silent check first so the button always works.
      if (state.status !== 'downloading') await runCheck(true)
      await autoUpdater.downloadUpdate()
    } catch (err) {
      setState({ status: 'error', error: (err as Error)?.message ?? 'Download failed.' })
    }
  })

  // Quit and install the downloaded update. Fire-and-forget (the app exits).
  ipcMain.on('update:install', () => {
    if (state.status !== 'downloaded') return
    setImmediate(() => autoUpdater.quitAndInstall())
  })
}

/** Kick a silent check shortly after launch (packaged builds only). */
export function checkForUpdatesOnLaunch(): void {
  if (!app.isPackaged) return
  wireAutoUpdater()
  scheduleRechecks()
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      setState({ status: 'error', error: (err as Error)?.message ?? 'Update check failed.' })
    })
  }, 4000)
}
