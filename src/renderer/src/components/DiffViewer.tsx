import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SplitSquareHorizontal,
  Columns2,
  Pilcrow,
  Search,
  ChevronUp,
  ChevronDown,
  WrapText,
  Link2,
  Unlink2,
  X
} from 'lucide-react'
import { highlightHtml, buildQueryRegExp, type HighlightLayer } from './FileSearchBar'
import { highlightLine } from '../lib/highlight'
import { maskSecretLine } from '../lib/secrets'
import { useT, interp } from '../i18n'
import { useSettingsStore } from '../stores/settings'
import { useHoverExplain } from './HoverExplain'
import type { NumberedLine } from '../../../shared/types'
import {
  parseDiff,
  wordRangesByLine,
  buildSplitRows,
  type DiffLine,
  type Range,
  type SplitCell,
  type SplitRow
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

/** Above this many parsed lines the viewer gets `is-huge` — the browser skips
 *  layout/paint for offscreen rows (`content-visibility: auto`) while the DOM
 *  stays complete, so find, staging clicks and selection behave as before. */
const HUGE_LINES = 5000

export function DiffViewer({
  diff,
  file = '',
  lang = '',
  highlightLayers = [],
  maskValues = false,
  ignoreWs = false,
  onToggleIgnoreWs,
  onStageHunk
}: {
  diff: string
  /** Path of the file being diffed — labels the hover-explain card. */
  file?: string
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
  const t = useT()
  const lines = useMemo(() => parseDiff(diff), [diff])

  // ─── Hover-to-explain over the diff's own lines ───
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const hoverOn = useSettingsStore((s) => s.activeProfile().ai.hoverExplain !== false)
  const hoverKey = useSettingsStore((s) => s.activeProfile().ai.hoverExplainKey ?? 'shift')
  // The diff only shows hunks, so the window has gaps. Numbers come from the new
  // side where there is one, and from the old side for removed lines.
  const hoverLines = useMemo<NumberedLine[]>(
    () =>
      lines
        .filter((l) => l.kind === 'add' || l.kind === 'del' || l.kind === 'ctx')
        .map((l) => ({ no: l.newNo ?? l.oldNo ?? 0, text: l.text }))
        .filter((l) => l.no > 0),
    [lines]
  )
  const { hoverProps, armed: hoverArmed, card: hoverCard } = useHoverExplain({
    enabled: aiEnabled && hoverOn && !maskValues,
    file,
    lang,
    modifier: hoverKey,
    getLines: () => hoverLines,
    lineOf: (el) => {
      const row = el.closest('.diff-line, .diff-split-cell')
      if (!row) return null
      const gutters = [...row.querySelectorAll('.diff-gutter')].map((g) => Number(g.textContent?.trim()))
      // Unified rows carry old and new; the new number is the one to cite.
      const no = gutters.reverse().find((n) => Number.isInteger(n) && n > 0)
      return no ?? null
    }
  })
  const hunkData = useMemo(() => (onStageHunk ? extractHunks(diff) : null), [diff, onStageHunk])

  const [wordDiffOn, setWordDiffOn] = useState(() => localStorage.getItem('gitcito-word-diff') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-word-diff', wordDiffOn ? 'on' : 'off'), [wordDiffOn])

  const [splitView, setSplitView] = useState(() => localStorage.getItem('gitcito-split-diff') === 'on')
  useEffect(() => localStorage.setItem('gitcito-split-diff', splitView ? 'on' : 'off'), [splitView])

  // Split-view line wrapping. Off by default: one line per row keeps the two
  // sides row-for-row comparable, which is the point of split view. On, long
  // lines fold inside their column instead of scrolling.
  const [wrapOn, setWrapOn] = useState(() => localStorage.getItem('gitcito-diff-wrap') === 'on')
  useEffect(() => localStorage.setItem('gitcito-diff-wrap', wrapOn ? 'on' : 'off'), [wrapOn])

  // Scrolling with wrap off: each column fully on its own, or the two locked
  // together both ways — vertically and sideways. Locked is the default: the
  // sides are worth comparing at the same row and column, and one that drifts
  // is the reason to look away from a split view.
  const [linkScroll, setLinkScroll] = useState(() => localStorage.getItem('gitcito-diff-link-scroll') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-diff-link-scroll', linkScroll ? 'on' : 'off'), [linkScroll])

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

  // Column-major split view scrolls each side on its own, so the vertical
  // position has to be mirrored by hand. The flag stops the mirrored write from
  // bouncing back as a second scroll event.
  const leftColRef = useRef<HTMLDivElement>(null)
  const rightColRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)
  const syncScroll = (from: React.RefObject<HTMLDivElement>, to: React.RefObject<HTMLDivElement>): void => {
    if (syncingScroll.current || !from.current || !to.current) return
    const sameTop = !linkScroll || to.current.scrollTop === from.current.scrollTop
    const sameLeft = !linkScroll || to.current.scrollLeft === from.current.scrollLeft
    if (sameTop && sameLeft) return
    syncingScroll.current = true
    if (linkScroll) {
      to.current.scrollTop = from.current.scrollTop
      to.current.scrollLeft = from.current.scrollLeft
    }
    requestAnimationFrame(() => (syncingScroll.current = false))
  }

  // One side of a split row. An absent side is an empty cell rather than a gap,
  // so the two columns keep the same number of rows.
  const splitCell = (c: SplitCell | undefined, key: string): React.JSX.Element => (
    <div key={key} className={`diff-split-cell ${c ? c.kind : 'empty'}`}>
      <span className="diff-gutter">{c?.no ?? ''}</span>
      {c ? (
        <span className="diff-text" dangerouslySetInnerHTML={{ __html: cellHtml(c.text, c.idx, c.kind) }} />
      ) : (
        <span className="diff-text" />
      )}
    </div>
  )

  // The @@ bar. Column-major mode draws it in both columns — the left carries
  // the header text, the right the stage button, and together they read as one
  // bar without either column losing a row.
  const splitHunk = (r: SplitRow, key: number, side?: 'left' | 'right'): React.JSX.Element => (
    <div key={key} className="diff-split-hunk">
      <span className="diff-text">{side === 'right' ? '' : r.hunk}</span>
      {side !== 'left' && onStageHunk && hunkData && r.hunkIdx !== undefined && (
        <button
          className="btn ghost tiny diff-stage-hunk"
          onClick={() => onStageHunk(`${hunkData.header}\n${hunkData.hunks[r.hunkIdx as number] ?? ''}\n`)}
        >
          {t('diff.stageHunk')}
        </button>
      )}
    </div>
  )

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

  if (!diff.trim()) return <div className="diff-empty">{t('diff.noChanges')}</div>

  const hasWordDiffs = wordRanges.size > 0

  return (
    <div
      className={`diff-viewer hljs ${splitView ? 'is-split' : ''} ${splitView && !wrapOn ? 'is-nowrap' : ''} ${
        lines.length > HUGE_LINES ? 'is-huge' : ''
      } ${hoverArmed ? 'hover-armed' : ''}`}
      ref={viewerRef}
      tabIndex={0}
      onKeyDown={onViewerKeyDown}
      {...hoverProps}
    >
      {hoverCard}
      <div className="diff-toggles">
        {/* Only meaningful side-by-side: the unified view has the full width to
            scroll a long line through, a 50% column does not. */}
        {splitView && (
          <button
            className={`diff-word-toggle ${wrapOn ? 'on' : ''}`}
            title={t('diff.wrapTitle')}
            onClick={() => setWrapOn((v) => !v)}
          >
            <WrapText size={12} /> {t('diff.wrap')}
          </button>
        )}
        {/* Only means anything when each column has its own scroller. */}
        {splitView && !wrapOn && (
          <button
            className={`diff-word-toggle ${linkScroll ? 'on' : ''}`}
            title={t('diff.linkScrollTitle')}
            onClick={() => setLinkScroll((v) => !v)}
          >
            {linkScroll ? <Link2 size={12} /> : <Unlink2 size={12} />} {t('diff.linkScroll')}
          </button>
        )}
        {onToggleIgnoreWs && (
          <button
            className={`diff-word-toggle ${ignoreWs ? 'on' : ''}`}
            title={t('diff.whitespaceTitle')}
            onClick={onToggleIgnoreWs}
          >
            <Pilcrow size={12} /> {t('diff.whitespace')}
          </button>
        )}
        <button
          className={`diff-word-toggle ${splitView ? 'on' : ''}`}
          title={t('diff.splitTitle')}
          onClick={() => setSplitView((v) => !v)}
        >
          <Columns2 size={12} /> {t('diff.split')}
        </button>
        {hasWordDiffs && (
          <button
            className={`diff-word-toggle ${wordDiffOn ? 'on' : ''}`}
            title={t('diff.wordDiffTitle')}
            onClick={() => setWordDiffOn((v) => !v)}
          >
            <SplitSquareHorizontal size={12} /> {t('diff.wordDiff')}
          </button>
        )}
        <button className={`diff-word-toggle ${findOpen ? 'on' : ''}`} title={t('diff.findTitle')} onClick={openFind}>
          <Search size={12} /> {t('diff.find')}
        </button>
      </div>
      {findOpen && (
        <div className="diff-find">
          <Search size={13} className="diff-find-icon" />
          <input
            ref={findInputRef}
            className="diff-find-input"
            placeholder={t('diff.findPlaceholder')}
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
          <button className="diff-find-btn" title={t('diff.prevMatch')} disabled={matchCount === 0} onClick={() => stepMatch(-1)}>
            <ChevronUp size={14} />
          </button>
          <button className="diff-find-btn" title={t('diff.nextMatch')} disabled={matchCount === 0} onClick={() => stepMatch(1)}>
            <ChevronDown size={14} />
          </button>
          <button className="diff-find-btn" title={t('diff.closeFind')} onClick={closeFind}>
            <X size={14} />
          </button>
        </div>
      )}
      {splitView ? (
        wrapOn ? (
          <div className="diff-split">
            {splitRows.map((r, i) =>
              r.hunk !== undefined ? (
                splitHunk(r, i)
              ) : (
                <div key={i} className="diff-split-row">
                  {splitCell(r.left, `${i}l`)}
                  {splitCell(r.right, `${i}r`)}
                </div>
              )
            )}
          </div>
        ) : (
          // Wrap off: a scrollbar per side, which needs one scroller per side —
          // hence column-major DOM. Each column scrolls both ways; the vertical
          // scroll is mirrored so the sides stay row-for-row, and the horizontal
          // one is not, which is the whole point. Rows line up because every
          // cell is exactly one line tall and the hunk bar spans both columns.
          <div className="diff-split is-cols">
            <div className="diff-split-col" ref={leftColRef} onScroll={() => syncScroll(leftColRef, rightColRef)}>
              {/* The inner block is as wide as the column's longest line, and every
                  row fills it — a row sized to its own text would leave its
                  background behind as soon as you scrolled past it. */}
              <div className="diff-split-inner">
                {splitRows.map((r, i) => (r.hunk !== undefined ? splitHunk(r, i, 'left') : splitCell(r.left, `${i}l`)))}
              </div>
            </div>
            <div className="diff-split-col" ref={rightColRef} onScroll={() => syncScroll(rightColRef, leftColRef)}>
              <div className="diff-split-inner">
                {splitRows.map((r, i) => (r.hunk !== undefined ? splitHunk(r, i, 'right') : splitCell(r.right, `${i}r`)))}
              </div>
            </div>
          </div>
        )
      ) : (
        <>
      {onStageHunk && selected.size > 0 && (
        <div className="diff-select-bar">
          <span>{interp(t('diff.linesSelected'), { n: selected.size, s: selected.size === 1 ? '' : 's' })}</span>
          <button className="btn ghost tiny" onClick={() => setSelected(new Set())}>
            {t('diff.clearSelection')}
          </button>
          <button className="btn primary tiny" onClick={stageSelected}>
            {interp(t('diff.stageLines'), { n: selected.size, s: selected.size === 1 ? '' : 's' })}
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
                  {t('diff.stageHunk')}
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
            title={selectable ? t('diff.stageLinesTitle') : undefined}
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
