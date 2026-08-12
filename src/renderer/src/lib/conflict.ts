// Conflict-marker parsing and output assembly for the merge conflict editor.
// Pure functions — no React, no git — so the picking logic is unit-testable.

export interface Hunk {
  index: number
  /** Line where this hunk's ours lines start in the reconstructed ours file. */
  oursStart: number
  /** Line where this hunk's theirs lines start in the reconstructed theirs file. */
  theirsStart: number
  ours: string[]
  theirs: string[]
  /** Label git wrote after `<<<<<<<` (usually `HEAD`). */
  oursLabel: string
  /** Label git wrote after `>>>>>>>` (usually the incoming ref). */
  theirsLabel: string
}

export type ConflictLineSide = 'ours' | 'theirs'
/** `${hunkIndex}:${side}:${lineIdx}` */
export type LineKey = string

export const lineKey = (hunk: number, side: ConflictLineSide, idx: number): LineKey => `${hunk}:${side}:${idx}`

/**
 * Split a conflicted file into hunks plus the two whole-file reconstructions
 * shown side by side. Context lines appear in both sides; a diff3 base section
 * (`|||||||`) is skipped.
 */
export function parseHunks(content: string): { hunks: Hunk[]; oursContent: string; theirsContent: string } {
  const lines = content.split('\n')
  const hunks: Hunk[] = []
  const ourLines: string[] = []
  const theirLines: string[] = []
  let hunkIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('<<<<<<<')) {
      const oursLabel = line.slice(7).trim() || 'ours'
      const ours: string[] = []
      const theirs: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('=======') && !lines[i].startsWith('|||||||')) {
        ours.push(lines[i])
        i++
      }
      if (i < lines.length && lines[i].startsWith('|||||||')) {
        while (i < lines.length && !lines[i].startsWith('=======')) i++
      }
      i++
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        theirs.push(lines[i])
        i++
      }
      const theirsLabel = i < lines.length ? lines[i].slice(7).trim() || 'theirs' : 'theirs'
      const oursStart = ourLines.length
      const theirsStart = theirLines.length
      ourLines.push(...ours)
      theirLines.push(...theirs)
      hunks.push({ index: hunkIdx++, oursStart, theirsStart, ours, theirs, oursLabel, theirsLabel })
    } else {
      ourLines.push(line)
      theirLines.push(line)
    }
  }

  return { hunks, oursContent: ourLines.join('\n'), theirsContent: theirLines.join('\n') }
}

/** Where an output line came from — null for untouched context lines. */
export type LineOrigin = { side: ConflictLineSide; hunk: number; line: number } | null

/** A generated output plus the metadata the pane and the merge need. */
export interface Assembled {
  text: string
  /** Output line each hunk starts on, indexed by hunk. */
  starts: number[]
  /** Source of each output line. */
  origins: LineOrigin[]
  /** Pick-independent identity of each output line. */
  keys: string[]
}

/**
 * Reconstruct the output from the per-line selection set. Context lines are
 * always emitted; inside each conflict hunk we emit the chosen ours lines (in
 * order) followed by the chosen theirs lines. Unselected hunks emit nothing.
 *
 * `starts[i]` is the 0-based output line where hunk `i` lands, so the conflict
 * navigator can scroll the output pane to the same place as the side panes.
 * `origins[n]` is the source of output line `n`, so the output can show which
 * side each line came from. `keys[n]` identifies that line independently of the
 * current picks (`c<contextLine>` or a line key), which is what lets a later
 * re-assembly keep the user's hand edits — see `mergePicks`.
 */
export function assemble(
  hunks: Hunk[],
  oursContent: string,
  selected: Set<LineKey>
): Assembled {
  const ourLines = oursContent.split('\n')
  const result: string[] = []
  const origins: LineOrigin[] = []
  const keys: string[] = []
  const starts: number[] = []
  let cursor = 0

  const emit = (line: string, origin: LineOrigin, key: string): void => {
    result.push(line)
    origins.push(origin)
    keys.push(key)
  }

  for (const h of hunks) {
    while (cursor < h.oursStart && cursor < ourLines.length) {
      emit(ourLines[cursor], null, `c${cursor}`)
      cursor++
    }
    starts[h.index] = result.length
    h.ours.forEach((line, idx) => {
      const key = lineKey(h.index, 'ours', idx)
      if (selected.has(key)) emit(line, { side: 'ours', hunk: h.index, line: idx }, key)
    })
    h.theirs.forEach((line, idx) => {
      const key = lineKey(h.index, 'theirs', idx)
      if (selected.has(key)) emit(line, { side: 'theirs', hunk: h.index, line: idx }, key)
    })
    cursor += h.ours.length
  }

  while (cursor < ourLines.length) {
    emit(ourLines[cursor], null, `c${cursor}`)
    cursor++
  }

  return { text: result.join('\n'), starts, origins, keys }
}

/** A line of the output pane: which side it came from, or a hand edit. */
export type OutputMark = LineOrigin | 'edited'

/** Above this many DP cells the middle region is flagged wholesale instead of
 *  running an LCS — a huge hand-edited file is not worth the wait. */
const LCS_CELL_BUDGET = 250_000

/**
 * Line-align the current output against a generated one. `align[i]` is the
 * generated line that current line `i` still is, or -1 when the user typed it.
 * Common prefix/suffix first, then an LCS over the differing middle so scattered
 * edits don't drag their neighbours along.
 */
export function alignOutput(generated: string, current: string): number[] {
  const b = current.split('\n')
  if (current === generated) return b.map((_, i) => i)
  const a = generated.split('\n')
  const align: number[] = new Array(b.length).fill(-1)

  const max = Math.min(a.length, b.length)
  let p = 0
  while (p < max && a[p] === b[p]) p++
  let s = 0
  while (s < max - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++

  for (let i = 0; i < p; i++) align[i] = i
  for (let k = 0; k < s; k++) align[b.length - 1 - k] = a.length - 1 - k

  const midA = a.length - p - s
  const midB = b.length - p - s
  if (midA > 0 && midB > 0 && midA * midB <= LCS_CELL_BUDGET) {
    const dp: number[][] = Array.from({ length: midA + 1 }, () => new Array(midB + 1).fill(0))
    for (let i = midA - 1; i >= 0; i--) {
      for (let j = midB - 1; j >= 0; j--) {
        dp[i][j] = a[p + i] === b[p + j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < midA && j < midB) {
      if (a[p + i] === b[p + j]) {
        align[p + j] = p + i
        i++
        j++
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i++
      } else {
        j++
      }
    }
  }
  return align
}

/**
 * Match the current (possibly hand-edited) output back onto the assembled one,
 * so untouched lines keep their side attribution and everything the user typed
 * reads as an edit.
 */
export function reconcileOutput(assembledText: string, origins: LineOrigin[], current: string): OutputMark[] {
  return alignOutput(assembledText, current).map((src) => (src < 0 ? 'edited' : (origins[src] ?? null)))
}

/**
 * Re-assemble after a pick change without throwing away hand edits.
 *
 * Typed lines are anchored to the last generated line above them and re-emitted
 * in the same spot. A generated line is re-emitted only if it is still in the
 * current text, or if this pick change just introduced it — so unpicking removes
 * a line, picking adds one, and a line the user deleted or rewrote by hand is
 * not resurrected.
 */
export function mergePicks(prev: Assembled, current: string, next: Assembled): string {
  if (current === prev.text) return next.text

  const curLines = current.split('\n')
  const align = alignOutput(prev.text, current)

  // Typed lines, bucketed under the generated line they sit below ('' = top).
  const edits = new Map<string, string[]>()
  const kept = new Set<string>()
  let anchor = ''
  curLines.forEach((line, i) => {
    const src = align[i]
    if (src >= 0) {
      anchor = prev.keys[src]
      kept.add(anchor)
      return
    }
    const bucket = edits.get(anchor)
    if (bucket) bucket.push(line)
    else edits.set(anchor, [line])
  })

  const prevKeys = new Set(prev.keys)
  const emitted = new Set(next.keys.filter((k) => kept.has(k) || !prevKeys.has(k)))

  // An anchor that is gone hands its edits to the nearest surviving one above.
  let surviving = ''
  for (const key of prev.keys) {
    if (emitted.has(key)) {
      surviving = key
      continue
    }
    const orphaned = edits.get(key)
    if (!orphaned) continue
    edits.delete(key)
    const target = edits.get(surviving)
    if (target) target.push(...orphaned)
    else edits.set(surviving, orphaned)
  }

  const out: string[] = [...(edits.get('') ?? [])]
  const nextLines = next.text.split('\n')
  next.keys.forEach((key, i) => {
    if (!emitted.has(key)) return
    out.push(nextLines[i])
    const bucket = edits.get(key)
    if (bucket) out.push(...bucket)
  })
  return out.join('\n')
}

/** Keys for every line of one side of one hunk. */
export function sideKeys(hunk: Hunk, side: ConflictLineSide): LineKey[] {
  const lines = side === 'ours' ? hunk.ours : hunk.theirs
  return lines.map((_, i) => lineKey(hunk.index, side, i))
}

/** True when every line of `side` is picked in every hunk. */
export function sideFullyPicked(hunks: Hunk[], side: ConflictLineSide, selected: Set<LineKey>): boolean {
  return hunks.length > 0 && hunks.every((h) => sideKeys(h, side).every((k) => selected.has(k)))
}

/** True when at least one line of `side` is picked anywhere. */
export function sidePartlyPicked(hunks: Hunk[], side: ConflictLineSide, selected: Set<LineKey>): boolean {
  return hunks.some((h) => sideKeys(h, side).some((k) => selected.has(k)))
}

/**
 * Add or drop every line of one side across all hunks. The other side is left
 * untouched, so both sides — or neither — can be taken.
 */
export function toggleSideEverywhere(
  hunks: Hunk[],
  side: ConflictLineSide,
  selected: Set<LineKey>,
  on: boolean
): Set<LineKey> {
  const next = new Set(selected)
  for (const h of hunks) {
    for (const k of sideKeys(h, side)) {
      if (on) next.add(k)
      else next.delete(k)
    }
  }
  return next
}

/** Add or drop every line of one side of a single hunk. */
export function toggleSideInHunk(hunk: Hunk, side: ConflictLineSide, selected: Set<LineKey>): Set<LineKey> {
  const keys = sideKeys(hunk, side)
  const allOn = keys.length > 0 && keys.every((k) => selected.has(k))
  const next = new Set(selected)
  for (const k of keys) {
    if (allOn) next.delete(k)
    else next.add(k)
  }
  return next
}
