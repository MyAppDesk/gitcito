// Pure diff parsing + word-level + split-view helpers, extracted from
// DiffViewer so they can be unit-tested without rendering.

export interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
  hunkIdx: number
}

export type Range = [number, number] // [start, end) in decoded-character coords

/** Tokenize into words / whitespace runs / single punctuation for word-diffing. */
export function tokenize(s: string): string[] {
  return s.match(/\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) ?? []
}

/**
 * Word-level diff of two lines via an LCS over tokens. Returns the changed
 * character ranges on each side (delRanges over `a`, addRanges over `b`).
 */
export function wordDiff(a: string, b: string): { del: Range[]; add: Range[] } {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const n = ta.length
  const m = tb.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const del: Range[] = []
  const add: Range[] = []
  let i = 0
  let j = 0
  let aPos = 0
  let bPos = 0
  const push = (arr: Range[], start: number, end: number): void => {
    const last = arr[arr.length - 1]
    if (last && last[1] === start) last[1] = end
    else arr.push([start, end])
  }
  while (i < n && j < m) {
    if (ta[i] === tb[j]) {
      aPos += ta[i].length
      bPos += tb[j].length
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(del, aPos, aPos + ta[i].length)
      aPos += ta[i].length
      i++
    } else {
      push(add, bPos, bPos + tb[j].length)
      bPos += tb[j].length
      j++
    }
  }
  while (i < n) {
    push(del, aPos, aPos + ta[i].length)
    aPos += ta[i].length
    i++
  }
  while (j < m) {
    push(add, bPos, bPos + tb[j].length)
    bPos += tb[j].length
    j++
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
