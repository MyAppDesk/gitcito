import type { StackInfo } from '../../../shared/types'

/**
 * Ordering a stack, as plain arrays.
 *
 * A stack is stored as parent links, but a user thinks about it as a list with
 * a top and a bottom — "this one should go under that one". These helpers do
 * that thinking in terms the UI can test, and the store turns the resulting
 * order back into links.
 *
 * Every array here is **bottom → top**, matching `StackInfo.branches`, even
 * though the modal draws it the other way up.
 */

/** The branch names of a stack, bottom → top. */
export function stackOrder(info: StackInfo | null): string[] {
  return (info?.branches ?? []).map((b) => b.name)
}

/**
 * `branch` moved one place towards the top (`+1`) or the bottom (`-1`).
 * Returns null when the move is not available — already at that end, or the
 * branch is not in the stack — so the caller can disable the button with the
 * same answer it would act on.
 */
export function moveLevel(order: string[], branch: string, direction: 1 | -1): string[] | null {
  const i = order.indexOf(branch)
  if (i < 0) return null
  const j = i + direction
  if (j < 0 || j >= order.length) return null
  const next = order.slice()
  next[i] = order[j]
  next[j] = order[i]
  return next
}

/**
 * Local branches that could join this stack: everything not already a level and
 * not the trunk it lands on. Sorted, because the list is a picker and the
 * repository's own branch order means nothing to the reader.
 */
export function adoptableBranches(locals: string[], info: StackInfo | null): string[] {
  const taken = new Set(stackOrder(info))
  if (info?.trunk) taken.add(info.trunk)
  return locals.filter((n) => !taken.has(n)).sort((a, b) => a.localeCompare(b))
}

/**
 * What each level's PR will target once the stack is submitted: the level below
 * it, and the trunk for the bottom one. This is the whole promise of a stack,
 * so the modal states it per level rather than leaving it to be inferred.
 */
export function targetFor(info: StackInfo | null, branch: string): string {
  const order = stackOrder(info)
  const i = order.indexOf(branch)
  if (i <= 0) return info?.trunk ?? ''
  return order[i - 1]
}

/**
 * The marker `stackRestack` throws when a replay hits a conflict, so the two
 * branches that clash can be named in the reader's own language rather than in
 * git's paragraph about `rebase --continue`.
 */
export function parseRouteConflict(message: string): { branch: string; parent: string } | null {
  const m = /GITCITO_ROUTE_CONFLICT:([^:\s]+):([^:\s]+)/.exec(message)
  return m ? { branch: m[1], parent: m[2] } : null
}
