// Re-keying the path-keyed settings maps when a repository's folder moves
// (Locate). Pure so the "destination wins" rule is testable without going
// through the settings store.

export interface RepathSettings {
  repoAliases: Record<string, string>
  repoProfiles: Record<string, string>
  favouriteRepos: string[]
}

/**
 * Move `oldPath`'s alias, profile binding and star to `newPath`.
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

  return { repoAliases, repoProfiles, favouriteRepos }
}
