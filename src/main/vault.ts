import { app, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'node:crypto'
import type { VaultEntry, VaultListResult, VaultExport } from '../shared/types'
import type { BundleVaultEntry } from './secureBundle'

// A small local secrets store, encrypted at rest with the OS keychain via
// Electron safeStorage. Two scopes: per-repo entries (keyed by repo path) and a
// global set referenceable from any repo. Never synced, never leaves this box.

type Scope = 'repo' | 'global'

interface VaultData {
  repos: Record<string, VaultEntry[]>
  global: VaultEntry[]
}

const filePath = (): string => join(app.getPath('userData'), 'gitcito-vault.enc')
const empty = (): VaultData => ({ repos: {}, global: [] })

async function load(): Promise<VaultData> {
  try {
    const b64 = await readFile(filePath(), 'utf-8')
    const plain = safeStorage.decryptString(Buffer.from(b64, 'base64'))
    return { ...empty(), ...(JSON.parse(plain) as VaultData) }
  } catch {
    return empty() // missing, corrupt, or key changed → start fresh
  }
}

async function save(data: VaultData): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const enc = safeStorage.encryptString(JSON.stringify(data))
  await writeFile(filePath(), enc.toString('base64'), 'utf-8')
}

function bucket(data: VaultData, scope: Scope, repoPath: string): VaultEntry[] {
  if (scope === 'global') return data.global
  return (data.repos[repoPath] ??= [])
}

async function list(repoPath: string): Promise<VaultListResult> {
  const available = safeStorage.isEncryptionAvailable()
  if (!available) return { available: false, repo: [], global: [] }
  const data = await load()
  return { available: true, repo: data.repos[repoPath] ?? [], global: data.global }
}

async function upsert(scope: Scope, repoPath: string, entry: VaultEntry): Promise<VaultListResult> {
  const data = await load()
  const arr = bucket(data, scope, repoPath)
  const now = Date.now()
  if (entry.id) {
    const i = arr.findIndex((e) => e.id === entry.id)
    if (i >= 0) arr[i] = { ...entry, updatedAt: now }
    else arr.push({ ...entry, updatedAt: now })
  } else {
    arr.push({ ...entry, id: randomUUID(), updatedAt: now })
  }
  await save(data)
  return list(repoPath)
}

async function remove(scope: Scope, repoPath: string, id: string): Promise<VaultListResult> {
  const data = await load()
  const arr = bucket(data, scope, repoPath)
  const i = arr.findIndex((e) => e.id === id)
  if (i >= 0) arr.splice(i, 1)
  await save(data)
  return list(repoPath)
}

/** Merge one entry list into another, incoming entries overriding by id. */
function mergeEntries(base: VaultEntry[], incoming: VaultEntry[]): VaultEntry[] {
  const byId = new Map(base.map((e) => [e.id, e]))
  for (const e of incoming) if (e.id) byId.set(e.id, e)
  return [...byId.values()]
}

/** Whole vault, for backup/transfer. Empty when OS encryption is unavailable. */
async function exportAll(): Promise<VaultExport> {
  if (!safeStorage.isEncryptionAvailable()) return { repos: {}, global: [] }
  const data = await load()
  return { repos: data.repos, global: data.global }
}

/** Merge an imported vault into the local one (incoming wins per id). No-op if
 *  OS encryption is unavailable (we can't safely persist secrets). */
async function importAll(incoming: VaultExport): Promise<void> {
  if (!safeStorage.isEncryptionAvailable() || !incoming) return
  const data = await load()
  data.global = mergeEntries(data.global, incoming.global ?? [])
  for (const [path, entries] of Object.entries(incoming.repos ?? {})) {
    data.repos[path] = mergeEntries(data.repos[path] ?? [], entries)
  }
  await save(data)
}

/** Global vault secrets as portable bundle entries (no id/updatedAt). Empty when
 *  OS encryption is unavailable. Used by secure-share to pack a vault section. */
export async function exportGlobalEntries(): Promise<BundleVaultEntry[]> {
  if (!safeStorage.isEncryptionAvailable()) return []
  const data = await load()
  return data.global.map((e) => ({ key: e.key, value: e.value, ...(e.note ? { note: e.note } : {}) }))
}

/** Merge bundle vault entries into the global vault, matching by key (incoming
 *  value/note win). Returns how many were written; 0 if encryption unavailable. */
export async function importGlobalEntries(entries: BundleVaultEntry[]): Promise<number> {
  if (!safeStorage.isEncryptionAvailable() || entries.length === 0) return 0
  const data = await load()
  const now = Date.now()
  for (const inc of entries) {
    const existing = data.global.find((e) => e.key === inc.key)
    if (existing) {
      existing.value = inc.value
      existing.note = inc.note ?? existing.note
      existing.updatedAt = now
    } else {
      data.global.push({ id: randomUUID(), key: inc.key, value: inc.value, note: inc.note, updatedAt: now })
    }
  }
  await save(data)
  return entries.length
}

export function registerVaultHandlers(): void {
  ipcMain.handle('vault:list', (_e, repoPath: string) => list(repoPath))
  ipcMain.handle('vault:upsert', (_e, scope: Scope, repoPath: string, entry: VaultEntry) =>
    upsert(scope, repoPath, entry)
  )
  ipcMain.handle('vault:remove', (_e, scope: Scope, repoPath: string, id: string) => remove(scope, repoPath, id))
  ipcMain.handle('vault:exportAll', () => exportAll())
  ipcMain.handle('vault:importAll', (_e, data: VaultExport) => importAll(data))
}
