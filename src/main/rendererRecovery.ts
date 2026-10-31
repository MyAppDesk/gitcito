import { app, ipcMain, BrowserWindow, type RenderProcessGoneDetails } from 'electron'
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

// When the page process dies, hangs, or the whole React tree throws, the window
// is left showing only its background colour. Nobody wants to look for a
// Reload button on a blank window, so the main process brings the page back by
// itself and writes one line per incident to ~/Library/Logs/<app>/.

/** Recoveries this close together reload straight away; after that each one
 *  waits longer, so a page that fails on every load can't spin the machine. */
export const RECOVERY_WINDOW_MS = 2 * 60_000
export const QUICK_RECOVERIES = 3
const QUICK_DELAY_MS = 300
const BACKOFF_BASE_MS = 15_000
const BACKOFF_MAX_MS = 5 * 60_000
/** Chromium reports a hang after about 30 s of no response; this is the extra
 *  grace before the page is restarted, in case it is only slow. */
const HANG_GRACE_MS = 10_000

export type RecoveryReason = 'crash' | 'hang' | 'ui-error'

/** How long to wait before reloading, given when earlier recoveries happened.
 *  Pure so the back-off can be tested without Electron. */
export function recoveryDelayMs(history: readonly number[], now: number): number {
  const recent = history.filter((ts) => now - ts < RECOVERY_WINDOW_MS).length
  if (recent < QUICK_RECOVERIES) return QUICK_DELAY_MS
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (recent - QUICK_RECOVERIES))
}

/** One log line; tab-separated so `grep` and `cut` work on it. */
export function formatRecoveryLine(at: Date, reason: RecoveryReason, detail: string, delayMs: number): string {
  const oneLine = detail.replace(/\s+/g, ' ').trim().slice(0, 2000)
  return `${at.toISOString()}\t${reason}\t${oneLine}\treload in ${delayMs} ms\n`
}

const logFile = (): string => join(app.getPath('logs'), 'renderer-recovery.log')

async function writeLog(line: string): Promise<void> {
  try {
    await mkdir(app.getPath('logs'), { recursive: true })
    await appendFile(logFile(), line, 'utf-8')
  } catch {
    // Logging must never stand in the way of the reload itself.
  }
}

const history: number[] = []
const pending = new WeakMap<BrowserWindow, ReturnType<typeof setTimeout>>()

function recover(win: BrowserWindow, reason: RecoveryReason, detail: string): void {
  if (win.isDestroyed() || pending.has(win)) return
  const now = Date.now()
  const delay = recoveryDelayMs(history, now)
  history.push(now)
  while (history.length && now - history[0]! >= RECOVERY_WINDOW_MS * 4) history.shift()
  console.error(`[gitcito] renderer ${reason}: ${detail}; reloading in ${delay} ms`)
  void writeLog(formatRecoveryLine(new Date(now), reason, detail, delay))
  pending.set(
    win,
    setTimeout(() => {
      pending.delete(win)
      if (!win.isDestroyed()) win.webContents.reload()
    }, delay)
  )
}

function crashDetail(details: RenderProcessGoneDetails): string {
  return `${details.reason} (exit code ${details.exitCode})`
}

/** Reload the window's page whenever it crashes or stays frozen. */
export function attachRendererRecovery(win: BrowserWindow): void {
  let hangTimer: ReturnType<typeof setTimeout> | null = null
  let restartingFrozenPage = false
  const clearHang = (): void => {
    if (hangTimer) clearTimeout(hangTimer)
    hangTimer = null
  }

  win.webContents.on('render-process-gone', (_e, details) => {
    clearHang()
    // `clean-exit` is the page closing normally, e.g. while the app quits.
    if (details.reason === 'clean-exit') return
    if (restartingFrozenPage) recover(win, 'hang', 'page stopped responding; restarted it')
    else recover(win, 'crash', crashDetail(details))
    restartingFrozenPage = false
  })

  win.on('unresponsive', () => {
    if (hangTimer) return
    hangTimer = setTimeout(() => {
      hangTimer = null
      if (win.isDestroyed()) return
      restartingFrozenPage = true
      // Restarting the frozen process raises `render-process-gone`, which reloads.
      win.webContents.forcefullyCrashRenderer()
    }, HANG_GRACE_MS)
  })
  win.on('responsive', clearHang)
  win.on('closed', clearHang)
}

/** The renderer's top-level error boundary calls this when the whole UI threw. */
export function registerRendererRecoveryHandlers(): void {
  ipcMain.on('window:ui-crashed', (event, message: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    recover(win, 'ui-error', typeof message === 'string' ? message : 'unknown error')
  })
}
