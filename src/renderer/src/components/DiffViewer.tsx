import { useEffect, useMemo, useState } from 'react'
import { SplitSquareHorizontal, Columns2 } from 'lucide-react'
import { highlightHtml, type HighlightLayer } from './FileSearchBar'
import { highlightLine } from '../lib/highlight'
import { maskSecretLine } from '../lib/secrets'

interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
  hunkIdx: number
}

type Range = [number, number] // [start, end) in decoded-character coords

/** Tokenize into words / whitespace runs / single punctuation for word-diffing. */
function tokenize(s: string): string[] {
  return s.match(/\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) ?? []
}

/**
 * Word-level diff of two lines. Returns the changed character ranges on each
 * side (delRanges over `a`, addRanges over `b`) via a classic LCS over tokens.
 */
function wordDiff(a: string, b: string): { del: Range[]; add: Range[] } {
  const ta = tokenize(a)
  const tb = tokenize(b)
  const n = ta.length
  const m = tb.length
  // LCS length table.
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
    if (last && last[1] === start) last[1] = end // coalesce adjacent
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
 * Wrap the given decoded-character ranges in <mark class> within an HTML string
 * (post-hljs/search-highlight), tracking a running decoded offset across all
 * tag-free segments so marks never break tags or entities.
 */
function markRanges(html: string, ranges: Range[], cls: string): string {
  if (ranges.length === 0) return html
  const inRange = (idx: number): boolean => ranges.some(([s, e]) => idx >= s && idx < e)
  let pos = 0
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag, text) => {
    if (tag) return tag
    const tokens = (text as string).match(/&[a-zA-Z][a-zA-Z0-9]*;|&#\d+;|&#x[0-9a-fA-F]+;|[\s\S]/g) ?? []
    let out = ''
    let open = false
    for (const tok of tokens) {
      const hit = inRange(pos)
      if (hit && !open) {
        out += `<mark class="${cls}">`
        open = true
      } else if (!hit && open) {
        out += '</mark>'
        open = false
      }
      out += tok
      pos++
    }
    if (open) out += '</mark>'
    return out
  })
}

function parseDiff(diff: string): DiffLine[] {
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

function extractHunks(diff: string): { header: string; hunks: string[] } {
  const rawLines = diff.split('\n')
  const headerLines: string[] = []
  const hunks: string[] = []
  let currentHunk: string[] | null = null

  for (const line of rawLines) {
    if (line.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk.join('\n'))
      currentHunk = [line]
    } else if (currentHunk !== null) {
      currentHunk.push(line)
    } else {
      headerLines.push(line)
    }
  }
  if (currentHunk) hunks.push(currentHunk.join('\n'))

  return { header: headerLines.join('\n'), hunks }
}

/**
 * Build a partial patch containing only the selected +/- lines (by index into
 * `lines`). Unselected deletions become context (kept), unselected additions are
 * dropped, and each affected hunk's @@ counts are recomputed — the same shape
 * `git add -p` produces, applied to the index via `git apply --cached`.
 */
function buildLinePatch(lines: DiffLine[], header: string, selected: Set<number>): string {
  const starts = new Map<number, { o: number; n: number }>()
  for (const l of lines) {
    if (l.kind === 'hunk') {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l.text)
      if (m) starts.set(l.hunkIdx, { o: +m[1], n: +m[2] })
    }
  }
  const hunks = new Map<number, number[]>()
  lines.forEach((l, i) => {
    if (l.kind === 'add' || l.kind === 'del' || l.kind === 'ctx') {
      if (!hunks.has(l.hunkIdx)) hunks.set(l.hunkIdx, [])
      hunks.get(l.hunkIdx)!.push(i)
    }
  })

  const parts: string[] = []
  for (const [hunkIdx, idxs] of hunks) {
    if (!idxs.some((i) => selected.has(i))) continue
    const start = starts.get(hunkIdx) ?? { o: 1, n: 1 }
    const body: string[] = []
    let oldC = 0
    let newC = 0
    for (const i of idxs) {
      const l = lines[i]
      if (l.text.startsWith('\\')) {
        body.push(l.text) // "\ No newline at end of file" — keep verbatim, don't count
        continue
      }
      if (l.kind === 'ctx') {
        body.push(` ${l.text}`)
        oldC++
        newC++
      } else if (l.kind === 'del') {
        if (selected.has(i)) {
          body.push(`-${l.text}`)
          oldC++
        } else {
          body.push(` ${l.text}`) // keep this deletion out of the stage
          oldC++
          newC++
        }
      } else if (selected.has(i)) {
        body.push(`+${l.text}`)
        newC++
      }
      // unselected additions are omitted
    }
    parts.push(`@@ -${start.o},${oldC} +${start.n},${newC} @@`)
    parts.push(...body)
  }
  return `${header}\n${parts.join('\n')}\n`
}

export function DiffViewer({
  diff,
  lang = '',
  highlightLayers = [],
  maskValues = false,
  onStageHunk
}: {
  diff: string
  lang?: string
  highlightLayers?: HighlightLayer[]
  /** Mask secret values (KEY=••••) in displayed lines — secret files only. */
  maskValues?: boolean
  onStageHunk?: (patch: string) => void
}): React.JSX.Element {
  const lines = useMemo(() => parseDiff(diff), [diff])
  const hunkData = useMemo(() => (onStageHunk ? extractHunks(diff) : null), [diff, onStageHunk])

  const [wordDiffOn, setWordDiffOn] = useState(() => localStorage.getItem('gitcito-word-diff') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-word-diff', wordDiffOn ? 'on' : 'off'), [wordDiffOn])

  const [splitView, setSplitView] = useState(() => localStorage.getItem('gitcito-split-diff') === 'on')
  useEffect(() => localStorage.setItem('gitcito-split-diff', splitView ? 'on' : 'off'), [splitView])

  // Per-line changed-character ranges, computed by pairing each block of
  // consecutive deletions with the additions that immediately follow it.
  const wordRanges = useMemo(() => {
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
      // Only word-diff a balanced-ish edit; zip line-by-line.
      const pairs = Math.min(dels.length, adds.length)
      for (let k = 0; k < pairs; k++) {
        const d = lines[dels[k]]
        const a = lines[adds[k]]
        const { del, add } = wordDiff(d.text, a.text)
        if (del.length) map.set(dels[k], del)
        if (add.length) map.set(adds[k], add)
      }
    }
    return map
  }, [lines])

  // Side-by-side rows: ctx lines mirror both sides; each del-run is zipped with
  // the following add-run (leftovers become one-sided rows).
  const splitRows = useMemo(() => {
    type Cell = { idx: number; no: number | null; text: string; kind: 'del' | 'add' | 'ctx' }
    const rows: { hunk?: string; hunkIdx?: number; left?: Cell; right?: Cell }[] = []
    let i = 0
    while (i < lines.length) {
      const l = lines[i]
      if (l.kind === 'meta') { i++; continue }
      if (l.kind === 'hunk') { rows.push({ hunk: l.text, hunkIdx: l.hunkIdx }); i++; continue }
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
  }, [lines])

  // Render one cell's HTML: syntax highlight → search layers → word marks (or
  // secret mask). Shared by unified and split views.
  const cellHtml = (text: string, idx: number, kind: 'add' | 'del' | 'ctx'): string => {
    const t = maskValues ? maskSecretLine(text) : text
    let html = highlightHtml(highlightLine(t, lang), highlightLayers)
    const wr = !maskValues && wordDiffOn && kind !== 'ctx' ? wordRanges.get(idx) : undefined
    if (wr) html = markRanges(html, wr, kind === 'add' ? 'word-add' : 'word-del')
    return html || '&nbsp;'
  }

  // Line-level staging selection (only when staging is enabled). Keyed by index
  // into `lines`; cleared whenever the diff changes.
  const [selected, setSelected] = useState<Set<number>>(new Set())
  useEffect(() => setSelected(new Set()), [diff])

  const toggleLine = (i: number): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const stageSelected = (): void => {
    if (!onStageHunk || !hunkData || selected.size === 0) return
    onStageHunk(buildLinePatch(lines, hunkData.header, selected))
    setSelected(new Set())
  }

  if (!diff.trim()) return <div className="diff-empty">No changes to display</div>

  const hasWordDiffs = wordRanges.size > 0

  return (
    <div className={`diff-viewer hljs ${splitView ? 'is-split' : ''}`}>
      <div className="diff-toggles">
        <button
          className={`diff-word-toggle ${splitView ? 'on' : ''}`}
          title="Side-by-side (split) view"
          onClick={() => setSplitView((v) => !v)}
        >
          <Columns2 size={12} /> Split
        </button>
        {hasWordDiffs && (
          <button
            className={`diff-word-toggle ${wordDiffOn ? 'on' : ''}`}
            title="Highlight changed words within edited lines"
            onClick={() => setWordDiffOn((v) => !v)}
          >
            <SplitSquareHorizontal size={12} /> Word diff
          </button>
        )}
      </div>
      {splitView ? (
        <div className="diff-split">
          {splitRows.map((r, i) =>
            r.hunk !== undefined ? (
              <div key={i} className="diff-split-hunk">
                <span className="diff-text">{r.hunk}</span>
                {onStageHunk && hunkData && r.hunkIdx !== undefined && (
                  <button
                    className="btn ghost tiny diff-stage-hunk"
                    onClick={() => onStageHunk(`${hunkData.header}\n${hunkData.hunks[r.hunkIdx as number] ?? ''}\n`)}
                  >
                    Stage hunk
                  </button>
                )}
              </div>
            ) : (
              <div key={i} className="diff-split-row">
                <div className={`diff-split-cell ${r.left ? r.left.kind : 'empty'}`}>
                  <span className="diff-gutter">{r.left?.no ?? ''}</span>
                  {r.left ? (
                    <span className="diff-text" dangerouslySetInnerHTML={{ __html: cellHtml(r.left.text, r.left.idx, r.left.kind) }} />
                  ) : (
                    <span className="diff-text" />
                  )}
                </div>
                <div className={`diff-split-cell ${r.right ? r.right.kind : 'empty'}`}>
                  <span className="diff-gutter">{r.right?.no ?? ''}</span>
                  {r.right ? (
                    <span className="diff-text" dangerouslySetInnerHTML={{ __html: cellHtml(r.right.text, r.right.idx, r.right.kind) }} />
                  ) : (
                    <span className="diff-text" />
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <>
      {onStageHunk && selected.size > 0 && (
        <div className="diff-select-bar">
          <span>{selected.size} line{selected.size === 1 ? '' : 's'} selected</span>
          <button className="btn ghost tiny" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <button className="btn primary tiny" onClick={stageSelected}>
            Stage {selected.size} line{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      )}
      {lines.map((l, i) => {
        if (l.kind === 'meta') return null
        if (l.kind === 'hunk') {
          return (
            <div key={i} className="diff-line hunk">
              <span className="diff-gutter" />
              <span className="diff-gutter" />
              <span className="diff-text">{l.text}</span>
              {onStageHunk && hunkData && (
                <button
                  className="btn ghost tiny diff-stage-hunk"
                  onClick={() => {
                    const patch = `${hunkData.header}\n${hunkData.hunks[l.hunkIdx] ?? ''}\n`
                    onStageHunk(patch)
                  }}
                >
                  Stage hunk
                </button>
              )}
            </div>
          )
        }
        const selectable = onStageHunk && (l.kind === 'add' || l.kind === 'del')
        return (
          <div
            key={i}
            className={`diff-line ${l.kind} ${selectable ? 'selectable' : ''} ${selected.has(i) ? 'line-selected' : ''}`}
            onClick={selectable ? () => toggleLine(i) : undefined}
            title={selectable ? 'Click to select this line for staging' : undefined}
          >
            <span className="diff-gutter">{l.oldNo ?? ''}</span>
            <span className="diff-gutter">{l.newNo ?? ''}</span>
            <span className="diff-sign">{l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}</span>
            <span
              className="diff-text"
              dangerouslySetInnerHTML={{ __html: cellHtml(l.text, i, l.kind as 'add' | 'del' | 'ctx') }}
            />
          </div>
        )
      })}
        </>
      )}
    </div>
  )
}
