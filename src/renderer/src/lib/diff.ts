// Pure diff parsing + word-level + split-view helpers, extracted from
// DiffViewer so they can be unit-tested without rendering.

export interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
  hunkIdx: number
  /** Git's `\ No newline at end of file` followed this line. It is a note on the
   *  line, not a line of the file, so it gets no number and no row of its own. */
  noEol?: boolean
}

export type Range = [number, number] // [start, end) in decoded-character coords

/** Tokenize into words / whitespace runs / single punctuation for word-diffing. */
export function tokenize(s: string): string[] {
  return s.match(/\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) ?? []
}

/** Above this many LCS cells the differing middle of a line pair is marked
 *  changed wholesale: a minified line can hold tens of thousands of tokens, and
 *  a full table for two of them would exhaust the renderer's memory. */
export const WORD_DIFF_CELL_BUDGET = 1_000_000

/**
 * Word-level diff of two lines via an LCS over tokens. Returns the changed
 * character ranges on each side (delRanges over `a`, addRanges over `b`).
 * The common prefix and suffix are matched first, so a small edit inside a huge
 * line stays cheap.
 */
export function wordDiff(a: string, b: string): { del: Range[]; add: Range[] } {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const max = Math.min(ta.length, tb.length)
  let p = 0
  let aPos = 0
  while (p < max && ta[p] === tb[p]) aPos += ta[p++].length
  let s = 0
  while (s < max - p && ta[ta.length - 1 - s] === tb[tb.length - 1 - s]) s++
  let bPos = aPos
  const n = ta.length - p - s
  const m = tb.length - p - s
  const del: Range[] = []
  const add: Range[] = []
  const push = (arr: Range[], start: number, end: number): void => {
    const last = arr[arr.length - 1]
    if (last && last[1] === start) last[1] = end
    else arr.push([start, end])
  }
  if (n * m > WORD_DIFF_CELL_BUDGET) {
    let aEnd = aPos
    for (let k = 0; k < n; k++) aEnd += ta[p + k].length
    let bEnd = bPos
    for (let k = 0; k < m; k++) bEnd += tb[p + k].length
    if (aEnd > aPos) del.push([aPos, aEnd])
    if (bEnd > bPos) add.push([bPos, bEnd])
    return { del, add }
  }
  const w = m + 1
  const dp = new Uint32Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const below = (i + 1) * w + j
      dp[i * w + j] = ta[p + i] === tb[p + j] ? dp[below + 1] + 1 : Math.max(dp[below], dp[i * w + j + 1])
    }
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    const x = ta[p + i]
    const y = tb[p + j]
    if (x === y) {
      aPos += x.length
      bPos += y.length
      i++
      j++
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      push(del, aPos, aPos + x.length)
      aPos += x.length
      i++
    } else {
      push(add, bPos, bPos + y.length)
      bPos += y.length
      j++
    }
  }
  while (i < n) {
    const x = ta[p + i++]
    push(del, aPos, aPos + x.length)
    aPos += x.length
  }
  while (j < m) {
    const y = tb[p + j++]
    push(add, bPos, bPos + y.length)
    bPos += y.length
  }
  return { del, add }
}

/**
 * Git's extended header lines, which sit between `diff --git` and the first
 * `@@` of a file. Content lines always carry a ' ', '+' or '-' prefix, so an
 * unprefixed line matching one of these can only be a header.
 */
const EXT_HEADER =
  /^(new file mode |deleted file mode |old mode |new mode |similarity index |dissimilarity index |rename (from|to) |copy (from|to) |Binary files |GIT binary patch)/

/** Parse a unified diff into typed lines with old/new line numbers + hunk index. */
export function parseDiff(diff: string): DiffLine[] {
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0
  let hunkIdx = -1
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (m) {
        oldNo = +m[1]
        newNo = +m[2]
      }
      hunkIdx++
      out.push({ kind: 'hunk', text: line, oldNo: null, newNo: null, hunkIdx })
    } else if (
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      EXT_HEADER.test(line)
    ) {
      out.push({ kind: 'meta', text: line, oldNo: null, newNo: null, hunkIdx })
    } else if (line.startsWith('\\')) {
      const prev = out[out.length - 1]
      if (prev) prev.noEol = true
    } else if (line.startsWith('+')) {
      out.push({ kind: 'add', text: line.slice(1), oldNo: null, newNo: newNo++, hunkIdx })
    } else if (line.startsWith('-')) {
      out.push({ kind: 'del', text: line.slice(1), oldNo: oldNo++, newNo: null, hunkIdx })
    } else {
      out.push({ kind: 'ctx', text: line.startsWith(' ') ? line.slice(1) : line, oldNo: oldNo++, newNo: newNo++, hunkIdx })
    }
  }
  return out
}

/**
 * Per-line changed-character ranges, pairing each run of consecutive deletions
 * with the additions that immediately follow it (zipped line-by-line). Keyed by
 * index into `lines`.
 */
export function wordRangesByLine(lines: DiffLine[]): Map<number, Range[]> {
  const map = new Map<number, Range[]>()
  let i = 0
  while (i < lines.length) {
    if (lines[i].kind !== 'del') {
      i++
      continue
    }
    const dels: number[] = []
    while (i < lines.length && lines[i].kind === 'del') dels.push(i++)
    const adds: number[] = []
    while (i < lines.length && lines[i].kind === 'add') adds.push(i++)
    const pairs = Math.min(dels.length, adds.length)
    for (let k = 0; k < pairs; k++) {
      const { del, add } = wordDiff(lines[dels[k]].text, lines[adds[k]].text)
      if (del.length) map.set(dels[k], del)
      if (add.length) map.set(adds[k], add)
    }
  }
  return map
}

export interface SplitCell {
  idx: number
  no: number | null
  text: string
  kind: 'del' | 'add' | 'ctx'
}
export interface SplitRow {
  hunk?: string
  hunkIdx?: number
  left?: SplitCell
  right?: SplitCell
}

/**
 * Build side-by-side rows: context lines mirror both sides; each deletion run is
 * zipped with the following addition run (leftovers become one-sided rows).
 */
export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.kind === 'meta') {
      i++
      continue
    }
    if (l.kind === 'hunk') {
      rows.push({ hunk: l.text, hunkIdx: l.hunkIdx })
      i++
      continue
    }
    if (l.kind === 'ctx') {
      rows.push({
        left: { idx: i, no: l.oldNo, text: l.text, kind: 'ctx' },
        right: { idx: i, no: l.newNo, text: l.text, kind: 'ctx' }
      })
      i++
      continue
    }
    const dels: number[] = []
    while (i < lines.length && lines[i].kind === 'del') dels.push(i++)
    const adds: number[] = []
    while (i < lines.length && lines[i].kind === 'add') adds.push(i++)
    const n = Math.max(dels.length, adds.length)
    for (let k = 0; k < n; k++) {
      const li = dels[k]
      const ri = adds[k]
      rows.push({
        left: li != null ? { idx: li, no: lines[li].oldNo, text: lines[li].text, kind: 'del' } : undefined,
        right: ri != null ? { idx: ri, no: lines[ri].newNo, text: lines[ri].text, kind: 'add' } : undefined
      })
    }
  }
  return rows
}

/**
 * The edited lines a split view shows side by side, as each line's partner:
 * the deletion on the left and the addition opposite it are one edit, so a
 * line action takes both. Only a deletion run followed by an addition run of
 * the same length pairs up — otherwise which old line became which new one is
 * a guess, and acting on half of a guess is worse than acting on one line.
 */
export function splitEditPartners(lines: DiffLine[]): Map<number, number> {
  const partners = new Map<number, number>()
  let i = 0
  while (i < lines.length) {
    if (lines[i].kind !== 'del') {
      i++
      continue
    }
    const dels: number[] = []
    while (i < lines.length && lines[i].kind === 'del') dels.push(i++)
    const adds: number[] = []
    while (i < lines.length && lines[i].kind === 'add') adds.push(i++)
    if (dels.length !== adds.length) continue
    dels.forEach((d, k) => {
      partners.set(d, adds[k])
      partners.set(adds[k], d)
    })
  }
  return partners
}

/** One changed region against the new (current) file, for the File view's
 *  change gutter. `lineStart`..`lineEnd` are new-file line numbers the bar
 *  spans; for a pure deletion (nothing added) they are equal and `edge` says
 *  which border of that line the marker sits on — the line the deletion
 *  happened before, or (deletion at EOF) after the last line. */
export interface GutterChange {
  index: number
  type: 'add' | 'mod' | 'del'
  lineStart: number
  lineEnd: number
  edge: 'before' | 'after'
  removed: string[]
  added: string[]
}

/** Parse a unified diff (current file vs. its last committed/staged version)
 *  into the regions a change gutter decorates. Consecutive del/add runs are
 *  zipped the same way {@link buildSplitRows} pairs them: a run with both is
 *  a modification, add-only is an insertion, del-only is a pure deletion
 *  anchored to the line it now sits next to. */
export function computeGutterChanges(diff: string): GutterChange[] {
  const lines = parseDiff(diff)
  const changes: GutterChange[] = []
  let lastNewNo = 0
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.kind === 'ctx' && l.newNo != null) lastNewNo = l.newNo
    if (l.kind !== 'del' && l.kind !== 'add') {
      i++
      continue
    }
    const dels: typeof lines = []
    while (i < lines.length && lines[i].kind === 'del') dels.push(lines[i++])
    const adds: typeof lines = []
    while (i < lines.length && lines[i].kind === 'add') {
      lastNewNo = lines[i].newNo ?? lastNewNo
      adds.push(lines[i++])
    }
    if (adds.length > 0) {
      changes.push({
        index: changes.length,
        type: dels.length > 0 ? 'mod' : 'add',
        lineStart: adds[0].newNo!,
        lineEnd: adds[adds.length - 1].newNo!,
        edge: 'before',
        removed: dels.map((d) => d.text),
        added: adds.map((a) => a.text)
      })
    } else if (dels.length > 0) {
      const next = lines[i]
      const atEof = !next || next.newNo == null
      changes.push({
        index: changes.length,
        type: 'del',
        lineStart: atEof ? Math.max(1, lastNewNo) : next.newNo!,
        lineEnd: atEof ? Math.max(1, lastNewNo) : next.newNo!,
        edge: atEof ? 'after' : 'before',
        removed: dels.map((d) => d.text),
        added: []
      })
    }
  }
  return changes
}

/** Every new-file line number a change touches, mapped back to that change —
 *  a multi-line insertion/modification marks each of its lines. */
export function gutterMarksByLine(changes: GutterChange[]): Map<number, GutterChange> {
  const map = new Map<number, GutterChange>()
  for (const c of changes) {
    for (let ln = c.lineStart; ln <= c.lineEnd; ln++) map.set(ln, c)
  }
  return map
}
