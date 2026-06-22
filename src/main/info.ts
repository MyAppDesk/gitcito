import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'node:crypto'
import type { InfoEntry, InfoExport } from '../shared/types'

// Per-repo, non-private reference metadata (App ID, bundle id, website, social
// handles…). Unlike the vault these are NOT secrets, so they're stored in plain
// JSON in userData — never synced, but never encrypted either. Keyed by repo path.

interface InfoData {
  repos: Record<string, InfoEntry[]>
}

const filePath = (): string => join(app.getPath('userData'), 'gitcito-info.json')
const empty = (): InfoData => ({ repos: {} })

async function load(): Promise<InfoData> {
  try {
    const raw = await readFile(filePath(), 'utf-8')
    return { ...empty(), ...(JSON.parse(raw) as InfoData) }
  } catch {
    return empty() // missing or corrupt → start fresh
  }
}

async function save(data: InfoData): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(filePath(), JSON.stringify(data, null, 2), 'utf-8')
}

async function list(repoPath: string): Promise<InfoEntry[]> {
  const data = await load()
  return data.repos[repoPath] ?? []
}

async function upsert(repoPath: string, entry: InfoEntry): Promise<InfoEntry[]> {
  const data = await load()
  const arr = (data.repos[repoPath] ??= [])
  const now = Date.now()
  if (entry.id) {
    const i = arr.findIndex((e) => e.id === entry.id)
    if (i >= 0) arr[i] = { ...entry, updatedAt: now }
    else arr.push({ ...entry, updatedAt: now })
  } else {
    arr.push({ ...entry, id: randomUUID(), updatedAt: now })
  }
  await save(data)
  return arr
}

async function remove(repoPath: string, id: string): Promise<InfoEntry[]> {
  const data = await load()
  const arr = data.repos[repoPath] ?? []
  const i = arr.findIndex((e) => e.id === id)
  if (i >= 0) arr.splice(i, 1)
  await save(data)
  return arr
}

async function reorder(repoPath: string, ids: string[]): Promise<InfoEntry[]> {
  const data = await load()
  const arr = data.repos[repoPath] ?? []
  const byId = new Map(arr.map((e) => [e.id, e]))
  const next = ids.map((id) => byId.get(id)).filter((e): e is InfoEntry => !!e)
  // keep any entries not present in the id list (defensive) at the end
  for (const e of arr) if (!ids.includes(e.id)) next.push(e)
  data.repos[repoPath] = next
  await save(data)
  return next
}

/** Whole info store, for backup/transfer. */
async function exportAll(): Promise<InfoExport> {
  const data = await load()
  return { repos: data.repos }
}

/** Merge imported info into the local store (incoming wins per id). */
async function importAll(incoming: InfoExport): Promise<void> {
  if (!incoming) return
  const data = await load()
  for (const [path, entries] of Object.entries(incoming.repos ?? {})) {
    const byId = new Map((data.repos[path] ?? []).map((e) => [e.id, e]))
    for (const e of entries) if (e.id) byId.set(e.id, e)
    data.repos[path] = [...byId.values()]
  }
  await save(data)
}

export function registerInfoHandlers(): void {
  ipcMain.handle('info:list', (_e, repoPath: string) => list(repoPath))
  ipcMain.handle('info:upsert', (_e, repoPath: string, entry: InfoEntry) => upsert(repoPath, entry))
  ipcMain.handle('info:remove', (_e, repoPath: string, id: string) => remove(repoPath, id))
  ipcMain.handle('info:reorder', (_e, repoPath: string, ids: string[]) => reorder(repoPath, ids))
  ipcMain.handle('info:exportAll', () => exportAll())
  ipcMain.handle('info:importAll', (_e, data: InfoExport) => importAll(data))
}
