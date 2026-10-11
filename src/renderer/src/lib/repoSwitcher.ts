// The ⌘J repository switcher's ordering and filtering. Pure, so the order a
// person sees can be tested without a DOM: most recently used first, so the
// commonest jump (back to the repository you just left) is the first row.

import type { TabState } from '../../../shared/types'
import { fuzzyMatch } from './fuzzy'

export interface SwitcherEntry {
  tabId: string
  path: string
  name: string
  /** The group tab's name when the repository is a group member. */
  groupName: string | null
  /** Zero-based position for the ⌘1…9 hint — single-repository tabs only, since
   *  on a group tab that key selects the group, not this member. */
  tabIndex: number | null
  /** The repository already on screen. */
  current: boolean
  /** Matched positions in `name`, for highlighting. Empty without a query. */
  hits: number[]
}

/** How many recently used repositories the session remembers. */
const MRU_LIMIT = 50

/** Move `path` to the front of the recently-used list. */
export function touchMru(mru: string[], path: string): string[] {
  if (mru[0] === path) return mru
  return [path, ...mru.filter((p) => p !== path)].slice(0, MRU_LIMIT)
}

/**
 * Every open repository, across repository and group tabs. Others come first —
 * recently used ones in that order, the rest in tab order — and the current one
 * last, so the list never looks as if something is missing.
 */
export function switcherEntries(
  tabs: TabState[],
  activeTabId: string | null,
  mru: string[],
  displayName: (path: string, name: string) => string
): SwitcherEntry[] {
  const all: SwitcherEntry[] = []
  const seen = new Set<string>()
  tabs.forEach((tab, idx) => {
    if (tab.kind === 'page') return
    for (const ref of tab.repos) {
      // A repository open in two tabs is listed once, at its first tab.
      if (seen.has(ref.path)) continue
      seen.add(ref.path)
      all.push({
        tabId: tab.id,
        path: ref.path,
        name: displayName(ref.path, ref.name),
        groupName: tab.kind === 'group' ? tab.name : null,
        tabIndex: tab.kind === 'repo' && idx < 9 ? idx : null,
        current: tab.id === activeTabId && tab.activeRepoPath === ref.path,
        hits: []
      })
    }
  })
  const rank = (e: SwitcherEntry): number => {
    const i = mru.indexOf(e.path)
    return i < 0 ? MRU_LIMIT : i
  }
  const others = all
    .map((e, order) => ({ e, order }))
    .filter(({ e }) => !e.current)
    .sort((a, b) => rank(a.e) - rank(b.e) || a.order - b.order)
    .map(({ e }) => e)
  return [...others, ...all.filter((e) => e.current)]
}

/**
 * Narrow the list to a query, matched against name, folder path and branch,
 * best match first. The current repository drops out: you are already there.
 */
export function filterSwitcher(
  entries: SwitcherEntry[],
  query: string,
  branchOf: (path: string) => string | undefined
): SwitcherEntry[] {
  const q = query.trim()
  if (!q) return entries
  const scored: { e: SwitcherEntry; score: number }[] = []
  for (const e of entries) {
    if (e.current) continue
    const onName = fuzzyMatch(q, e.name)
    const anywhere = onName ?? fuzzyMatch(q, `${e.name} ${e.path} ${branchOf(e.path) ?? ''}`)
    if (!anywhere) continue
    // A hit on the name itself outranks one that needed the path or branch.
    scored.push({ e: { ...e, hits: onName?.hits ?? [] }, score: anywhere.score + (onName ? 10 : 0) })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e)
}
