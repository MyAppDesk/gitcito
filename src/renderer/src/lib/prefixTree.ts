/** A node in a "/"-prefix tree of refs (local branches, remotes, or tags).
 *  `item` is set when this segment is itself a ref — a leaf, or a folder name
 *  that is also a branch (`feat` alongside `feat/login`). */
export interface PrefixNode<T> {
  seg: string
  item?: T
  children: Map<string, PrefixNode<T>>
}

/** Fold a flat list of refs into a folder tree keyed by their "/" prefix. */
export function buildPrefixTree<T>(items: T[], nameOf: (t: T) => string): PrefixNode<T> {
  const root: PrefixNode<T> = { seg: '', children: new Map() }
  for (const it of items) {
    let node = root
    const parts = nameOf(it).split('/')
    parts.forEach((seg, i) => {
      let child = node.children.get(seg)
      if (!child) {
        child = { seg, children: new Map() }
        node.children.set(seg, child)
      }
      node = child
      if (i === parts.length - 1) node.item = it
    })
  }
  return root
}

/** Number of actual refs under a node, used for the folder's count badge. */
export function leafCount<T>(node: PrefixNode<T>): number {
  let n = node.item ? 1 : 0
  for (const c of node.children.values()) n += leafCount(c)
  return n
}

/** Every ref under a node, in tree order — the scope of a folder-wide action. */
export function collectLeaves<T>(node: PrefixNode<T>, out: T[] = []): T[] {
  if (node.item) out.push(node.item)
  for (const c of node.children.values()) collectLeaves(c, out)
  return out
}

/** Collapse a run of single-child folders into one header, but stop before a
 *  leaf. `feature/login` stays a folder from day one; `dependabot/npm_and_yarn/x`
 *  compresses to one header `dependabot/npm_and_yarn` containing `x`. */
export function shouldCollapsePrefix<T>(node: PrefixNode<T>): boolean {
  if (node.item || node.children.size !== 1) return false
  const child = [...node.children.values()][0]
  return child.children.size > 0
}

export function collapseFolderRun<T>(
  node: PrefixNode<T>,
  prefix: string
): { node: PrefixNode<T>; display: string } {
  let display = prefix ? `${prefix}/${node.seg}` : node.seg
  let cur = node
  while (shouldCollapsePrefix(cur)) {
    cur = [...cur.children.values()][0]
    display = `${display}/${cur.seg}`
  }
  return { node: cur, display }
}
