import type { TreeStatusKind } from '../../../shared/types'

/**
 * The status to paint on one path in the file tree.
 *
 * `treeStatus` comes from `git status --ignored=matching`, which reports an
 * ignored *directory* once instead of listing every file beneath it. That is
 * deliberate — the exhaustive form (`--ignored` with `-uall`) walks into
 * node_modules and every build output directory, and on a real repository that
 * is the single most expensive thing a refresh does.
 *
 * The cost of the cheap form is that a file inside an ignored directory has no
 * entry of its own, so resolve it from its nearest ignored ancestor here. Only
 * `ignored` inherits: every other kind is already recorded per path, and a
 * modified file must never make its siblings look modified.
 */
export function treeStatusOf(
  map: Record<string, TreeStatusKind>,
  path: string
): TreeStatusKind | undefined {
  const own = map[path]
  if (own) return own
  let slash = path.lastIndexOf('/')
  while (slash > 0) {
    if (map[path.slice(0, slash)] === 'ignored') return 'ignored'
    slash = path.lastIndexOf('/', slash - 1)
  }
  return undefined
}
