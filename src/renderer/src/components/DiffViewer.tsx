import { useEffect, useMemo, useRef, useState } from 'react'
import { SplitSquareHorizontal, Columns2, Pilcrow, Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { highlightHtml, buildQueryRegExp, type HighlightLayer } from './FileSearchBar'
import { highlightLine } from '../lib/highlight'
import { maskSecretLine } from '../lib/secrets'
import {
  parseDiff,
  wordRangesByLine,
  buildSplitRows,
  type DiffLine,
  type Range
} from '../lib/diff'

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
  ignoreWs = false,
  onToggleIgnoreWs,
  onStageHunk
}: {
  diff: string
  lang?: string
  highlightLayers?: HighlightLayer[]
  /** Mask secret values (KEY=••••) in displayed lines — secret files only. */
  maskValues?: boolean
  /** Whether the diff was fetched ignoring whitespace (drives the toggle state). */
  ignoreWs?: boolean
  /** Re-fetch the diff with/without `-w`. When absent, the toggle is hidden. */
  onToggleIgnoreWs?: () => void
  onStageHunk?: (patch: string) => void
}): React.JSX.Element {
  const lines = useMemo(() => parseDiff(diff), [diff])
  const hunkData = useMemo(() => (onStageHunk ? extractHunks(diff) : null), [diff, onStageHunk])

  const [wordDiffOn, setWordDiffOn] = useState(() => localStorage.getItem('gitcito-word-diff') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-word-diff', wordDiffOn ? 'on' : 'off'), [wordDiffOn])

  const [splitView, setSplitView] = useState(() => localStorage.getItem('gitcito-split-diff') === 'on')
  useEffect(() => localStorage.setItem('gitcito-split-diff', splitView ? 'on' : 'off'), [splitView])

  // Per-line changed-character ranges (for word-level highlighting).
  const wordRanges = useMemo(() => wordRangesByLine(lines), [lines])

  // Side-by-side rows (ctx mirrored, del-runs zipped with following add-runs).
  const splitRows = useMemo(() => buildSplitRows(lines), [lines])

  // ── In-diff find (⌘F) ──
  const viewerRef = useRef<HTMLDivElement>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const [matchCount, setMatchCount] = useState(0)
  const findRe = useMemo(
    () => (findQuery.trim() ? buildQueryRegExp({ query: findQuery.trim(), caseSensitive: false, wholeWord: false, regex: false }, true) : null),
    [findQuery]
  )
  // The find layer rides on top of any externally-supplied search layers.
  const layers = useMemo<HighlightLayer[]>(
    () => (findRe ? [...highlightLayers, { re: findRe, className: 'diff-find-hit' }] : highlightLayers),
    [highlightLayers, findRe]
  )

  // Render one cell's HTML: syntax highlight → search layers → word marks (or
  // secret mask). Shared by unified and split views.
  const cellHtml = (text: string, idx: number, kind: 'add' | 'del' | 'ctx'): string => {
    const t = maskValues ? maskSecretLine(text) : text
    let html = highlightHtml(highlightLine(t, lang), layers)
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

  // Recount find matches whenever the query or rendered content changes.
  useEffect(() => {
    const root = viewerRef.current
    if (!root || !findRe) {
      setMatchCount(0)
      return
    }
    const n = root.querySelectorAll('.diff-find-hit').length
    setMatchCount(n)
    setMatchIdx((i) => (n ? Math.min(i, n - 1) : 0))
  }, [findRe, diff, splitView, wordDiffOn, maskValues])

  // Highlight + scroll the active match into view.
  useEffect(() => {
    const root = viewerRef.current
    if (!root) return
    const hits = root.querySelectorAll<HTMLElement>('.diff-find-hit')
    hits.forEach((h, i) => h.classList.toggle('current', i === matchIdx))
    hits[matchIdx]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [matchIdx, matchCount])

  const stepMatch = (dir: 1 | -1): void => {
    if (matchCount === 0) return
    setMatchIdx((i) => (i + dir + matchCount) % matchCount)
  }

  const openFind = (): void => {
    setFindOpen(true)
    requestAnimationFrame(() => findInputRef.current?.select())
  }
  const closeFind = (): void => {
    setFindOpen(false)
    setFindQuery('')
  }

  const onViewerKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault()
      e.stopPropagation()
      openFind()
    } else if (e.key === 'Escape' && findOpen) {
      closeFind()
    }
  }

  if (!diff.trim()) return <div className="diff-empty">No changes to display</div>

  const hasWordDiffs = wordRanges.size > 0

  return (
    <div
      className={`diff-viewer hljs ${splitView ? 'is-split' : ''}`}
      ref={viewerRef}
      tabIndex={0}
      onKeyDown={onViewerKeyDown}
    >
      <div className="diff-toggles">
        {onToggleIgnoreWs && (
          <button
            className={`diff-word-toggle ${ignoreWs ? 'on' : ''}`}
            title="Ignore whitespace changes"
            onClick={onToggleIgnoreWs}
          >
            <Pilcrow size={12} /> Whitespace
          </button>
        )}
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
        <button className={`diff-word-toggle ${findOpen ? 'on' : ''}`} title="Find in diff (⌘F)" onClick={openFind}>
          <Search size={12} /> Find
        </button>
      </div>
      {findOpen && (
        <div className="diff-find">
          <Search size={13} className="diff-find-icon" />
          <input
            ref={findInputRef}
            className="diff-find-input"
            placeholder="Find in diff…"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                stepMatch(e.shiftKey ? -1 : 1)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                closeFind()
              }
            }}
          />
          <span className="diff-find-count">{matchCount ? `${matchIdx + 1}/${matchCount}` : findQuery ? '0/0' : ''}</span>
          <button className="diff-find-btn" title="Previous (⇧↵)" disabled={matchCount === 0} onClick={() => stepMatch(-1)}>
            <ChevronUp size={14} />
          </button>
          <button className="diff-find-btn" title="Next (↵)" disabled={matchCount === 0} onClick={() => stepMatch(1)}>
            <ChevronDown size={14} />
          </button>
          <button className="diff-find-btn" title="Close (Esc)" onClick={closeFind}>
            <X size={14} />
          </button>
        </div>
      )}
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
