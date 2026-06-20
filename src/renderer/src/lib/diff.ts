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
    } else if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
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
