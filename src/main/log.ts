import { app, ipcMain } from 'electron'
import { join, basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import type { ActivityEvent, LogEntry } from '../shared/types'

/** Hard cap on retained entries; oldest are dropped once exceeded. */
const MAX_ENTRIES = 1000

const filePath = (): string => join(app.getPath('userData'), 'gitcito-log.json')

let cache: LogEntry[] | null = null

async function load(): Promise<LogEntry[]> {
  if (cache) return cache
  try {
    const raw = await readFile(filePath(), 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    cache = Array.isArray(parsed) ? (parsed as LogEntry[]) : []
  } catch {
    cache = []
  }
  return cache
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!cache) return
    const snapshot = cache
    void mkdir(app.getPath('userData'), { recursive: true })
      .then(() => writeFile(filePath(), JSON.stringify(snapshot, null, 2), 'utf-8'))
      .catch(() => {})
  }, 400)
}

/** Append one operation to the local log (best-effort; never throws to callers). */
export async function recordLog(entry: {
  event: ActivityEvent
  repoPath: string
  ok: boolean
  error?: string
}): Promise<void> {
  const log = await load()
  log.push({
    ts: Date.now(),
    repoPath: entry.repoPath,
    repoName: entry.repoPath ? basename(entry.repoPath) : '',
    event: entry.event,
    ok: entry.ok,
    ...(entry.error ? { error: entry.error.slice(0, 500) } : {})
  })
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES)
  scheduleSave()
}

export function registerLogHandlers(): void {
  ipcMain.handle('log:get', () => load())
  ipcMain.handle('log:clear', () => {
    cache = []
    scheduleSave()
    return [] as LogEntry[]
  })
}
