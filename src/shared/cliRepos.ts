/**
 * Which repositories `gitcito repos` and `gitcito open <name>` can see.
 *
 * The headless CLI cannot ask the app — it may not even be running — so it
 * reads the settings file the app writes. That makes this a *reader of someone
 * else's format*: every field is optional and every shape is checked, because
 * a settings file written by a newer build must degrade to a shorter list
 * rather than to a crash in a shell pipeline.
 *
 * Read-only by design. The running app owns that file and would overwrite
 * anything the CLI wrote underneath it on its next save.
 */

export interface KnownRepo {
  path: string
  name: string
  /** The group tab it lives in, when it lives in one. */
  group?: string
}

interface SettingsShape {
  tabs?: { kind?: string; name?: string; repos?: { path?: string; name?: string }[] }[]
  recentRepos?: { path?: string; name?: string }[]
}

const basename = (path: string): string => path.split(/[/\\]/).filter(Boolean).pop() ?? path

/** Every repository with a tab, then anything else in the recents list. Tabs
 *  come first so a repo that is currently open keeps its tab's display name. */
export function knownRepos(settings: unknown): KnownRepo[] {
  const found = new Map<string, KnownRepo>()
  const s = (settings ?? {}) as SettingsShape
  for (const tab of Array.isArray(s.tabs) ? s.tabs : []) {
    for (const repo of Array.isArray(tab?.repos) ? tab.repos : []) {
      // First tab wins: tab order is stable, so a repo open both standalone
      // and inside a group keeps one identity between runs.
      if (typeof repo?.path !== 'string' || !repo.path || found.has(repo.path)) continue
      found.set(repo.path, {
        path: repo.path,
        name: repo.name || basename(repo.path),
        ...(tab.kind === 'group' && tab.name ? { group: tab.name } : {})
      })
    }
  }
  for (const repo of Array.isArray(s.recentRepos) ? s.recentRepos : []) {
    if (typeof repo?.path !== 'string' || !repo.path || found.has(repo.path)) continue
    found.set(repo.path, { path: repo.path, name: repo.name || basename(repo.path) })
  }
  return [...found.values()]
}

/** Case-insensitive substring match on either the display name or the path. */
export function matchesRepo(repo: KnownRepo, needle: string): boolean {
  const n = needle.toLowerCase()
  return repo.name.toLowerCase().includes(n) || repo.path.toLowerCase().includes(n)
}

/** What `gitcito open <name>` resolves to: an exact name wins, otherwise the
 *  first substring match, so the result does not depend on how much of the name
 *  was typed. Null when nothing matches. */
export function resolveRepo(repos: KnownRepo[], needle: string): KnownRepo | null {
  const n = needle.toLowerCase()
  return repos.find((r) => r.name.toLowerCase() === n) ?? repos.find((r) => matchesRepo(r, n)) ?? null
}
