import type { PageContent, RepoFolder, TabState } from '../../../shared/types'
import { canonicalRepoPath } from './repoAlias'

// Re-keying the path-keyed settings maps when a repository's folder moves
// (Locate). Pure so the "destination wins" rule is testable without going
// through the settings store.

export interface RepathSettings {
  repoAliases: Record<string, string>
  repoProfiles: Record<string, string>
  favouriteRepos: string[]
  repoImages?: Record<string, string>
}

/**
 * Move `oldPath`'s alias, profile binding, star and tab image to `newPath`.
 *
 * `newPath` can already be a known repository — nothing in `locateRepo`
 * guarantees otherwise — so the destination's own alias/profile always wins;
 * a value only carries across when the destination has none. The old path
 * never refers to anything afterwards, so its entries are dropped either way.
 *
 * Moving a repository onto itself is the one case where "drop the old entries"
 * would drop the destination's: same key, so the delete undoes the keep.
 */
export function repathRepoSettings(
  settings: RepathSettings,
  oldPath: string,
  newPath: string
): RepathSettings {
  if (oldPath === newPath) return settings

  const repoAliases = { ...settings.repoAliases }
  if (repoAliases[oldPath] && !repoAliases[newPath]) repoAliases[newPath] = repoAliases[oldPath]
  delete repoAliases[oldPath]

  const repoProfiles = { ...settings.repoProfiles }
  if (repoProfiles[oldPath] && !repoProfiles[newPath]) repoProfiles[newPath] = repoProfiles[oldPath]
  delete repoProfiles[oldPath]

  const moved = (settings.favouriteRepos ?? []).map((p) => (p === oldPath ? newPath : p))
  const favouriteRepos = [...new Set(moved)]

  // Images are keyed by canonical path. The relative value stays valid as long
  // as the files moved with the folder, which is what Locate is for.
  const repoImages = { ...(settings.repoImages ?? {}) }
  const oldKey = canonicalRepoPath(oldPath)
  const newKey = canonicalRepoPath(newPath)
  if (oldKey !== newKey) {
    if (repoImages[oldKey] && !repoImages[newKey]) repoImages[newKey] = repoImages[oldKey]
    delete repoImages[oldKey]
  }

  return { repoAliases, repoProfiles, favouriteRepos, repoImages }
}

/** Point open and saved tabs at a repository's new folder — its entry, the
 *  selected repo, pages riding on the tab, and nested group folders. A group
 *  that already held `newPath` keeps one entry, not two. */
export function repathRepoTabs(tabs: TabState[], oldPath: string, newPath: string): TabState[] {
  if (oldPath === newPath) return tabs
  const page = (value: PageContent): PageContent =>
    'repoPath' in value && value.repoPath === oldPath ? { ...value, repoPath: newPath } : value
  const folder = (value: RepoFolder): RepoFolder => ({
    ...value,
    paths: [...new Set(value.paths.map((p) => (p === oldPath ? newPath : p)))],
    folders: value.folders.map(folder)
  })
  return tabs.map((tab) => {
    if (tab.kind === 'page') return { ...tab, page: page(tab.page) }
    const repos = tab.repos
      .map((r) => (r.path === oldPath ? { ...r, path: newPath } : r))
      .filter((r, i, all) => all.findIndex((other) => other.path === r.path) === i)
    return {
      ...tab,
      repos,
      activeRepoPath: tab.activeRepoPath === oldPath ? newPath : tab.activeRepoPath,
      ...(tab.pages ? { pages: tab.pages.map(page) } : {}),
      ...(tab.kind === 'group' && tab.folders ? { folders: tab.folders.map(folder) } : {})
    }
  })
}
