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

/** A worktree ref's stored name is the structural `root · branch` label, not
 *  a user-chosen name — folding it into aliases would pin every worktree chip
 *  to the full label (and leak the label onto any other open of the path).
 *  Tagged refs are certain; untagged refs saved before `worktreeRoot` existed
 *  need sibling evidence: the root folder or another `X · leaf` chip nearby. */
export function isStructuralWorktreeName(repo: RepoRef, siblings: RepoRef[] = []): boolean {
  if (repo.worktreeRoot != null) return true
  const sep = repo.name.includes(' · ') ? ' · ' : repo.name.includes(' - ') ? ' - ' : null
  if (!sep) return false
  const prefix = repo.name.slice(0, repo.name.indexOf(sep)).trim()
  return siblings.some(
    (s) =>
      canonicalRepoPath(s.path) !== canonicalRepoPath(repo.path) &&
      (s.worktreeRoot != null || canonicalRepoName(s.path) === prefix || s.name.startsWith(`${prefix}${sep}`))
  )
}

function collectCustomNames(tabs: TabState[], into: Record<string, string>): void {
  for (const tab of tabs) {
    if (tab.kind === 'page') continue
    for (const repo of tab.repos) {
      if (isStructuralWorktreeName(repo, tab.repos)) continue
      const key = canonicalRepoPath(repo.path)
      if (into[key]) continue
      const canonical = canonicalRepoName(repo.path)
      if (repo.name && repo.name !== canonical) into[key] = repo.name
    }
  }
}

/** Aliases an earlier build swept out of structural worktree names. Tagged
 *  refs prune anything matching `<root folder> · <leaf>`; legacy untagged refs
 *  (saved before `worktreeRoot` existed) prune only when the alias merely
 *  repeats the stored name AND siblings prove it's a worktree — the root
 *  folder or another `X · leaf` chip sits next to it. */
function pruneSweptWorktreeAliases(settings: AppSettings, aliases: Record<string, string>): void {
  // No early-out per path: the same repo can sit in several tabs, and the
  // untagged case below needs the sibling evidence of whichever site has it.
  const check = (repo: RepoRef, siblings: RepoRef[]): void => {
    const key = canonicalRepoPath(repo.path)
    const alias = aliases[key]
    if (!alias) return
    if (repo.worktreeRoot != null) {
      const rootName = canonicalRepoName(repo.worktreeRoot)
      if (alias.startsWith(`${rootName} · `) || alias.startsWith(`${rootName} - `)) {
        delete aliases[key]
      }
      return
    }
    if (alias !== repo.name) return // a real rename — the alias is user data
    if (isStructuralWorktreeName(repo, siblings)) delete aliases[key]
  }
  const scanTabs = (tabs: TabState[]): void => {
    for (const tab of tabs) {
      if (tab.kind === 'page') continue
      tab.repos.forEach((r) => check(r, tab.repos))
    }
  }
  scanTabs(settings.tabs)
  for (const ws of settings.workspaces ?? []) scanTabs(ws.tabs ?? [])
  for (const repo of settings.recentRepos ?? []) check(repo, settings.recentRepos ?? [repo])
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
    if (isStructuralWorktreeName(repo, settings.recentRepos)) continue
    const key = canonicalRepoPath(repo.path)
    if (aliases[key]) continue
    const canonical = canonicalRepoName(repo.path)
    if (repo.name && repo.name !== canonical) aliases[key] = repo.name
  }
  pruneSweptWorktreeAliases(settings, aliases)
  let next: AppSettings = { ...settings, repoAliases: aliases }
  for (const key of Object.keys(aliases)) {
    next = applyRepoAlias(next, key, aliases[key])
  }
  return next
}
