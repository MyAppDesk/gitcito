// Moved-code detection for one file's diff, after git's `--color-moved`: a
// block of deleted lines that reappears, line for line, as a block of added
// lines somewhere else in the same diff was moved, not rewritten. Pure, so it is
// tested on its own and the viewer only paints what it returns.

import type { DiffLine } from './diff'

/**
 * A line that belongs to a moved block. `role` says which end: `out` is the old
 * copy (a deletion, moved away from here), `in` the new one (an addition, moved
 * to here). `dir` points at the other end, `peer` is its index in the lines.
 * `block` numbers the blocks in diff order, so alternate ones can be told
 * apart where two moved blocks touch (git's zebra).
 */
export interface MovedMark {
  role: 'out' | 'in'
  dir: 'up' | 'down'
  peer: number
  block: number
}

/** Git ignores moved blocks with fewer alphanumeric characters than this, so a
 *  shuffled `}` or `return` is not mistaken for a move. Same number as git's. */
export const MOVED_MIN_ALNUM = 20

const alnumCount = (s: string): number => (s.match(/[A-Za-z0-9]/g) ?? []).length

/**
 * Find the moved lines in a parsed diff. Lines compare by their trimmed text,
 * so a block that moved into (or out of) a deeper indent still counts.
 *
 * A match inside one change — a deletion run and the addition run right after
 * it, with no context between — is not a move: that is the same lines edited in
 * place (typically re-indented). Each line belongs to at most one block, and
 * longer blocks are matched first, so a big move is not split by a small
 * coincidental one.
 */
export function findMovedLines(lines: DiffLine[]): Map<number, MovedMark> {
  // Group = one del-run plus the add-run that follows it; same-group matches
  // are in-place edits.
  const group = new Array<number>(lines.length).fill(-1)
  let g = -1
  let prev: DiffLine['kind'] | null = null
  lines.forEach((l, i) => {
    if (l.kind === 'del' || l.kind === 'add') {
      const startsNew = prev === null || (prev !== 'del' && prev !== 'add') || (prev === 'add' && l.kind === 'del')
      if (startsNew) g++
      group[i] = g
    }
    prev = l.kind
  })

  const key = (i: number): string => lines[i].text.trim()
  const isKind = (i: number, kind: 'add' | 'del'): boolean => i >= 0 && i < lines.length && lines[i].kind === kind

  // Every addition by its trimmed text, so a deletion finds its candidates fast.
  const addsByText = new Map<string, number[]>()
  lines.forEach((l, i) => {
    if (l.kind !== 'add') return
    const k = key(i)
    if (!k) return
    const list = addsByText.get(k)
    if (list) list.push(i)
    else addsByText.set(k, [i])
  })

  type Block = { del: number; add: number; len: number }
  const candidates: Block[] = []
  lines.forEach((l, d) => {
    if (l.kind !== 'del' || !key(d)) return
    // Only start a block where the previous line could not have extended it.
    for (const a of addsByText.get(key(d)) ?? []) {
      if (group[a] === group[d]) continue
      if (isKind(d - 1, 'del') && isKind(a - 1, 'add') && key(d - 1) === key(a - 1) && group[a - 1] !== group[d - 1]) {
        continue
      }
      let len = 1
      while (isKind(d + len, 'del') && isKind(a + len, 'add') && key(d + len) === key(a + len)) len++
      candidates.push({ del: d, add: a, len })
    }
  })

  candidates.sort((x, y) => y.len - x.len || x.del - y.del || x.add - y.add)
  const taken = new Set<number>()
  const accepted: Block[] = []
  for (const c of candidates) {
    // Shrink to the part neither end has given to a longer block already.
    let len = 0
    while (len < c.len && !taken.has(c.del + len) && !taken.has(c.add + len)) len++
    // Blank lines at the tail carry no evidence of a move.
    while (len > 0 && !key(c.del + len - 1)) len--
    if (len === 0) continue
    let alnum = 0
    for (let k = 0; k < len; k++) alnum += alnumCount(lines[c.del + k].text)
    if (alnum < MOVED_MIN_ALNUM) continue
    for (let k = 0; k < len; k++) {
      taken.add(c.del + k)
      taken.add(c.add + k)
    }
    accepted.push({ ...c, len })
  }

  accepted.sort((x, y) => Math.min(x.del, x.add) - Math.min(y.del, y.add))
  const marks = new Map<number, MovedMark>()
  accepted.forEach((b, block) => {
    const down = b.add > b.del
    for (let k = 0; k < b.len; k++) {
      marks.set(b.del + k, { role: 'out', dir: down ? 'down' : 'up', peer: b.add + k, block })
      marks.set(b.add + k, { role: 'in', dir: down ? 'up' : 'down', peer: b.del + k, block })
    }
  })
  return marks
}
