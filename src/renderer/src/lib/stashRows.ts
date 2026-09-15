import type { GraphCommit, StashInfo } from '../../../shared/types'

/**
 * Merges stash entries into a commit list as pseudo-commits, one row each.
 *
 * A stash is anchored to the commit it was taken from: it lands in the row
 * directly above its parent, never in its own chronological slot. A stash is
 * almost always newer than the commit it sits on, so date order would float it
 * up among unrelated commits and leave a long dashed tether crossing half the
 * graph — the parent is the only row it actually relates to, so it is the one
 * worth being adjacent to.
 *
 * A stash whose parent is outside the loaded window has no anchor, so it falls
 * back to date order. That keeps its edge pointing downward at whatever does
 * eventually load, and it is the pre-existing behaviour for that case.
 *
 * `stashes` is expected in git's own order (`stash@{0}` first). Several stashes
 * sharing a parent therefore stack newest-first immediately above it, because
 * each insertion pushes the parent — and with it the next insertion point — one
 * row further down.
 */
export function withStashRows(commits: GraphCommit[], stashes: StashInfo[]): GraphCommit[] {
  // Always a fresh array, even with no stashes: callers append their own rows
  // (the WIP placeholder) to the result, and must never touch the store's.
  const out = [...commits]
  for (const s of stashes) {
    const parentIdx = out.findIndex((c) => c.hash === s.parentSha)
    let idx = parentIdx
    if (idx === -1) {
      idx = out.findIndex((c) => c.date < s.date)
      if (idx === -1) idx = out.length
    }
    out.splice(idx, 0, {
      hash: s.sha,
      parents: [s.parentSha],
      author: '',
      email: '',
      date: s.date,
      refs: [],
      subject: s.message
    })
  }
  return out
}
