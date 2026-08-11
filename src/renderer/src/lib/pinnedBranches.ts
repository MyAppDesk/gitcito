// Pinned (favorite) branches for the sidebar: pure helpers so the pin list —
// stored per-repo in RepoLayout.pinnedBranches — can be toggled and projected
// onto the live branch list without any store or DOM dependency.

/** Toggle `name` in the pin list, preserving the order pins were added in. */
export function togglePin(pinned: string[], name: string): string[] {
  return pinned.includes(name) ? pinned.filter((p) => p !== name) : [...pinned, name]
}

/**
 * Project the pin list onto the current items, in pin order. Pins whose branch
 * no longer exists (deleted, renamed) are silently dropped — the stored entry
 * stays around, so a recreated branch comes back pinned.
 */
export function selectPinned<T>(items: T[], pinned: string[], nameOf: (t: T) => string): T[] {
  if (pinned.length === 0) return []
  const byName = new Map(items.map((it) => [nameOf(it), it]))
  return pinned.flatMap((name) => {
    const it = byName.get(name)
    return it === undefined ? [] : [it]
  })
}
