/** Keyboard navigation helpers for the file lists (commit files, WIP files).
 *  Kept free of React so the ordering rules can be unit-tested. */

export interface NavNode {
  path: string
  children: NavNode[]
  /** Set on leaves — folders have none. */
  file?: unknown
}

/** Paths of the files actually on screen, top to bottom. Collapsed folders hide
 *  their whole subtree, so arrow keys must skip those rows. */
export function visiblePaths(nodes: NavNode[], collapsed: Set<string>, out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.file) out.push(n.path)
    else if (!collapsed.has(n.path)) visiblePaths(n.children, collapsed, out)
  }
  return out
}

/** Next path when moving `dir` rows from `anchor`. Stops at both ends (no
 *  wrap-around, like the commit graph). With no anchor in this list, Down
 *  enters at the top and Up at the bottom. Returns null when nothing moves. */
export function stepPath(order: string[], anchor: string | null | undefined, dir: 1 | -1): string | null {
  if (order.length === 0) return null
  const at = anchor ? order.indexOf(anchor) : -1
  const next = at === -1 ? (dir === 1 ? 0 : order.length - 1) : Math.min(Math.max(at + dir, 0), order.length - 1)
  const path = order[next]
  return path && path !== anchor ? path : null
}
