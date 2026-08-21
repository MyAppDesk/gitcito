import type { AppSettings, RepoRef, TabState } from '../../../shared/types'

/** Slash-normalized path used as the alias map key. Drive letters are lowercased
 *  so `C:\foo` and `c:/foo` are the same repository. */
export function canonicalRepoPath(path: string): string {
  const trimmed = path.replace(/\\/g, '/').replace(/\/+$/, '')
  return trimmed.replace(/^([A-Za-z]):/, (_, d: string) => `${d.toLowerCase()}:`)
}

/** Last path segment — the on-disk folder name, never an alias. */
export function canonicalRepoName(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const segs = normalized.split('/').filter(Boolean)
  return segs[segs.length - 1] || normalized
}

export function lookupRepoAlias(
  path: string,
  aliases: Record<string, string> | undefined
): string | undefined {
  if (!aliases) return undefined
  const key = canonicalRepoPath(path)
  const direct = aliases[key] ?? aliases[path]
  return direct?.trim() || undefined
}

/** What the UI shows: the path-keyed alias, else a leftover chip name, else the folder. */
export function repoDisplayName(
  path: string,
  aliases: Record<string, string> | undefined,
  fallbackName?: string
): string {
  return lookupRepoAlias(path, aliases) || fallbackName?.trim() || canonicalRepoName(path)
}

function renameRefs(repos: RepoRef[], key: string, display: string): RepoRef[] {
  return repos.map((r) => (canonicalRepoPath(r.path) === key ? { ...r, name: display } : r))
}

function mapTabs(tabs: TabState[], key: string, display: string, previous: string): TabState[] {
  return tabs.map((t) => {
    if (t.kind === 'page') return t
    const repos = renameRefs(t.repos, key, display)
    const owns = t.repos.some((r) => canonicalRepoPath(r.path) === key)
    // Standalone tab chips follow the alias when they still showed the previous
    // display name. A user-renamed tab whose title already diverged stays put.
    const name = t.kind === 'repo' && owns && t.name === previous ? display : t.name
    return { ...t, repos, name }
  })
}

function existingDisplay(settings: AppSettings, key: string, canonical: string): string {
  const aliased = settings.repoAliases?.[key]
  if (aliased?.trim()) return aliased.trim()
  for (const tab of settings.tabs) {
    if (tab.kind === 'page') continue
    const hit = tab.repos.find((r) => canonicalRepoPath(r.path) === key)
    if (hit?.name) return hit.name
  }
  const recent = settings.recentRepos.find((r) => canonicalRepoPath(r.path) === key)
  if (recent?.name) return recent.name
  return canonical
}

/**
 * Set or clear a display alias keyed by canonical path. Updates every tab,
 * workspace and recent-repo chip that points at the same directory. Never
 * touches the filesystem.
 */
export function applyRepoAlias(settings: AppSettings, path: string, alias: string | null): AppSettings {
  const key = canonicalRepoPath(path)
  const canonical = canonicalRepoName(path)
  const previous = existingDisplay(settings, key, canonical)
  const aliases = { ...(settings.repoAliases ?? {}) }
  const trimmed = alias?.trim() ?? ''
  if (trimmed && trimmed !== canonical) aliases[key] = trimmed
  else delete aliases[key]
  const display = aliases[key] ?? canonical
  return {
    ...settings,
    repoAliases: aliases,
    tabs: mapTabs(settings.tabs, key, display, previous),
    recentRepos: renameRefs(settings.recentRepos, key, display),
    workspaces: settings.workspaces.map((w) => ({
      ...w,
      tabs: mapTabs(w.tabs, key, display, previous)
    }))
  }
}

function collectCustomNames(tabs: TabState[], into: Record<string, string>): void {
  for (const tab of tabs) {
    if (tab.kind === 'page') continue
    for (const repo of tab.repos) {
      const key = canonicalRepoPath(repo.path)
      if (into[key]) continue
      const canonical = canonicalRepoName(repo.path)
      if (repo.name && repo.name !== canonical) into[key] = repo.name
    }
  }
}

/**
 * Fold leftover per-group `RepoRef.name` custom names into `repoAliases` so a
 * repo has one display name everywhere. Canonical folder names are left alone.
 */
export function migrateRepoAliases(settings: AppSettings): AppSettings {
  const aliases = { ...(settings.repoAliases ?? {}) }
  collectCustomNames(settings.tabs, aliases)
  for (const ws of settings.workspaces ?? []) collectCustomNames(ws.tabs ?? [], aliases)
  for (const repo of settings.recentRepos ?? []) {
    const key = canonicalRepoPath(repo.path)
    if (aliases[key]) continue
    const canonical = canonicalRepoName(repo.path)
    if (repo.name && repo.name !== canonical) aliases[key] = repo.name
  }
  let next: AppSettings = { ...settings, repoAliases: aliases }
  for (const key of Object.keys(aliases)) {
    next = applyRepoAlias(next, key, aliases[key])
  }
  return next
}
