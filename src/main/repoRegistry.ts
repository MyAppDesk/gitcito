import { app, ipcMain } from 'electron'
import { join, basename, isAbsolute } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { RegistryRepo, RepoScanResult, RepoScanRoot } from '../shared/types'
import { gitDirOf, readHeadBranch, readOriginOwner } from './repoMeta'
import { scanForRepos } from './repoScan'

// Every repository Gitcito knows about, whether or not it is open. Kept in its
// own file rather than in settings: it is a cache of what is on *this* disk,
// while settings are preferences you would carry to another machine. Losing
// this file costs a rescan; losing settings costs information.

interface RegistryData {
  repos: RegistryRepo[]
}

/**
 * A sanity check on a path before it reaches the filesystem.
 *
 * Deliberately not `isSafeRepoPath` from aiSchemas: that one guards paths an
 * LLM produced, which are joined onto a repo root, so it rejects anything
 * absolute. Registry paths are absolute by definition and come from the user's
 * own folder picker or from scanning folders they configured — a different
 * threat model, and a different check.
 */
function isPlausibleRepoPath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  const p = path.trim()
  return p.length > 0 && p.length <= 4096 && isAbsolute(p) && !p.includes('\0')
}

export const registryFilePath = (): string => join(app.getPath('userData'), 'gitcito-repos.json')

// Every mutation below is load-mutate-save, so two overlapping calls would be
// last-writer-wins — and `remember` is fired without awaiting on every tab
// open, so overlap with a long scan is normal, not exotic. Chaining every
// mutation through one promise serializes their load-mutate-save cycles.
let writeQueue: Promise<unknown> = Promise.resolve()

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work)
  writeQueue = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

async function load(): Promise<RegistryRepo[]> {
  try {
    const raw = await readFile(registryFilePath(), 'utf-8')
    const data = JSON.parse(raw) as RegistryData
    return Array.isArray(data.repos) ? data.repos : []
  } catch {
    return []
  }
}

async function save(repos: RegistryRepo[]): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const data: RegistryData = { repos }
  await writeFile(registryFilePath(), JSON.stringify(data, null, 2), 'utf-8')
}

/** The registry, with `missing` refreshed. Stat-ing every path is why this is
 *  called on page open and not per render. */
export async function listRepos(): Promise<RegistryRepo[]> {
  return serialize(async () => {
    const repos = await load()
    let changed = false
    for (const repo of repos) {
      const missing = !existsSync(repo.path)
      if (missing !== repo.missing) {
        repo.missing = missing
        changed = true
      }
    }
    if (changed) await save(repos)
    return repos
  })
}

/** Record a repository as opened. Upserts: the same folder is one entry. */
export async function rememberRepo(repoPath: string): Promise<RegistryRepo[]> {
  if (!isPlausibleRepoPath(repoPath)) return serialize(load)
  const path = repoPath.trim()
  return serialize(async () => {
    const repos = await load()
    const now = Math.floor(Date.now() / 1000)
    const [branch, owner] = await Promise.all([readHeadBranch(path), readOriginOwner(path)])
    const existing = repos.find((r) => r.path === path)
    if (existing) {
      existing.lastOpenedAt = now
      existing.missing = !existsSync(path)
      existing.source = 'opened'
      existing.branch = branch
      existing.owner = owner
    } else {
      repos.push({
        path,
        name: basename(path),
        owner,
        branch,
        source: 'opened',
        lastOpenedAt: now,
        missing: !existsSync(path)
      })
    }
    await save(repos)
    return repos
  })
}

/** Drop an entry from the index. Never touches the folder on disk. */
export async function forgetRepo(repoPath: string): Promise<RegistryRepo[]> {
  return serialize(async () => {
    const repos = (await load()).filter((r) => r.path !== repoPath)
    await save(repos)
    return repos
  })
}

/** Re-read branch for the given paths. Cheap enough to call whenever the page
 *  opens: one file read each, no process spawned. */
export async function refreshRepos(paths: string[]): Promise<RegistryRepo[]> {
  return serialize(async () => {
    const repos = await load()
    const wanted = new Set(paths)
    await Promise.all(
      repos
        .filter((r) => wanted.has(r.path) && !r.missing)
        .map(async (r) => {
          r.branch = await readHeadBranch(r.path)
        })
    )
    await save(repos)
    return repos
  })
}

/** Index every repository under the configured roots. A repo already in the
 *  registry keeps its `source` and `lastOpenedAt` — a scan adds knowledge, it
 *  never demotes a repo the user has actually opened. */
export async function scanRoots(rootList: RepoScanRoot[]): Promise<RepoScanResult> {
  return serialize(async () => {
    const repos = await load()
    const byPath = new Map(repos.map((r) => [r.path, r]))
    let added = 0

    for (const root of rootList) {
      if (!isPlausibleRepoPath(root.path)) continue
      for (const found of await scanForRepos(root.path, root.depth)) {
        const existing = byPath.get(found)
        if (existing) {
          existing.missing = false
          continue
        }
        const [branch, owner] = await Promise.all([readHeadBranch(found), readOriginOwner(found)])
        const entry: RegistryRepo = {
          path: found,
          name: basename(found),
          owner,
          branch,
          source: 'scanned',
          lastOpenedAt: 0,
          missing: false
        }
        repos.push(entry)
        byPath.set(found, entry)
        added += 1
      }
    }

    await save(repos)
    return { repos, added }
  })
}

/** Re-point a missing entry at the folder it moved to. Favourites and aliases
 *  are path-keyed and live in settings, so the renderer migrates those; this
 *  moves the index entry and refreshes what it caches. */
export async function locateRepo(oldPath: string, newPath: string): Promise<RegistryRepo[]> {
  if (!isPlausibleRepoPath(newPath)) return serialize(load)
  if (!(await gitDirOf(newPath))) return serialize(load)
  return serialize(async () => {
    const repos = await load()
    const entry = repos.find((r) => r.path === oldPath)
    if (!entry) return repos
    const [branch, owner] = await Promise.all([readHeadBranch(newPath), readOriginOwner(newPath)])
    entry.path = newPath
    entry.name = basename(newPath)
    entry.branch = branch
    entry.owner = owner
    entry.missing = !existsSync(newPath)
    await save(repos)
    return repos
  })
}

export function registerRepoRegistryHandlers(): void {
  ipcMain.handle('repos:list', () => listRepos())
  ipcMain.handle('repos:remember', (_e, repoPath: string) => rememberRepo(repoPath))
  ipcMain.handle('repos:forget', (_e, repoPath: string) => forgetRepo(repoPath))
  ipcMain.handle('repos:scan', (_e, rootList: RepoScanRoot[]) => scanRoots(rootList))
  ipcMain.handle('repos:locate', (_e, oldPath: string, newPath: string) => locateRepo(oldPath, newPath))
  ipcMain.handle('repos:refresh', (_e, paths: string[]) => refreshRepos(paths))
}
