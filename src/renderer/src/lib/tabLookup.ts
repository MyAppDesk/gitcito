import type { TabState } from '../../../shared/types'

/**
 * Where a repository is already open, standalone or inside a group, matched by
 * path since a repo can be renamed independently. Opening the same repo twice
 * would make two tabs fight over one working tree, so callers focus this
 * instead of creating another.
 */
export function focusOpenRepo(
  tabs: TabState[],
  path: string
): { tabs: TabState[]; activeTabId: string } | null {
  const existing = tabs.find((t) => t.kind !== 'page' && t.repos.some((r) => r.path === path))
  if (!existing) return null
  const next =
    existing.kind === 'group'
      ? tabs.map((t) => (t.id === existing.id ? { ...t, activeRepoPath: path } : t))
      : tabs
  return { tabs: next, activeTabId: existing.id }
}
