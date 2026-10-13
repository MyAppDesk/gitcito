import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SplitSquareHorizontal,
  Columns2,
  MoveVertical,
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
import { useUIStore, type MenuItem } from '../stores/ui'
import { buildLinePatch, extractHunks, singleHunkPatch } from '../lib/hunkPatch'
import { useSettingsStore } from '../stores/settings'
import { useHoverExplain } from './HoverExplain'
import type { NumberedLine } from '../../../shared/types'
import {
  parseDiff,
  wordRangesByLine,
  buildSplitRows,
  splitEditPartners,
  type Range,
  type SplitCell,
  type SplitRow
} from '../lib/diff'
import { findMovedLines, type MovedMark } from '../lib/movedLines'

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

/**
 * Something a hunk (or a line selection) can be sent to. The host decides which
 * apply to the diff on screen — stage and discard for unstaged changes, unstage
 * for staged ones, revert for a commit, apply for a stash.
 */
export interface HunkAction {
  id: string
  /** Button on each hunk's @@ bar, and the hunk row of the line menu. */
  hunkLabel: string
  /** Button on the line-selection bar, given how many lines are selected. */
  linesLabel: (n: number) => string
  /** The right-click menu's row for the one line under the pointer. */
  lineLabel: string
  /** The patch will be applied reversed, so a line selection is built mirrored. */
  reverse: boolean
  /** Throws work away — drawn in the danger colour. */
  danger?: boolean
  run: (patch: string) => void
}

/** Above this many parsed lines the viewer gets `is-huge` — the browser skips
 *  layout/paint for offscreen rows (`content-visibility: auto`) while the DOM
 *  stays complete, so find, staging clicks and selection behave as before. */
const HUGE_LINES = 5000

const MOVE_ARROW: Record<MovedMark['dir'], string> = { up: '↑', down: '↓' }
const NO_MOVES = new Map<number, MovedMark>()

export function DiffViewer({
  diff,
  file = '',
  lang = '',
  highlightLayers = [],
  maskValues = false,
  ignoreWs = false,
  onToggleIgnoreWs,
  hunkActions = [],
  busy = false
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
  /** Hunk/line actions for this diff; none means a read-only diff. */
  hunkActions?: HunkAction[]
  /** A change is still landing: the actions stay in place but are off, so a
   *  second press cannot act on lines that are already gone. */
  busy?: boolean
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
  const hasHunkActions = hunkActions.length > 0
  const hunkData = useMemo(() => (hasHunkActions ? extractHunks(diff) : null), [diff, hasHunkActions])

  const [wordDiffOn, setWordDiffOn] = useState(() => localStorage.getItem('gitcito-word-diff') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-word-diff', wordDiffOn ? 'on' : 'off'), [wordDiffOn])

  const [splitView, setSplitView] = useState(() => localStorage.getItem('gitcito-split-diff') === 'on')
  useEffect(() => localStorage.setItem('gitcito-split-diff', splitView ? 'on' : 'off'), [splitView])

  // Moved code is marked by default: a block that only changed place is the
  // most common thing a reader mistakes for a rewrite.
  const [movedOn, setMovedOn] = useState(() => localStorage.getItem('gitcito-diff-moved') !== 'off')
  useEffect(() => localStorage.setItem('gitcito-diff-moved', movedOn ? 'on' : 'off'), [movedOn])

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
  // An edited line in split view is one edit across two cells: clicking or
  // right-clicking either side acts on both, so staging it never leaves half
  // the edit behind.
  const splitPartners = useMemo(() => (splitView ? splitEditPartners(lines) : new Map<number, number>()), [splitView, lines])

  const allMoved = useMemo(() => findMovedLines(lines), [lines])
  const moved = movedOn ? allMoved : NO_MOVES
  // The arrow's tip names the other end of the move by its line number.
  const movedTitle = (m: MovedMark): string =>
    m.role === 'out'
      ? interp(t('diff.movedTo'), { line: lines[m.peer].newNo ?? '' })
      : interp(t('diff.movedFrom'), { line: lines[m.peer].oldNo ?? '' })
  // Alternate blocks get a second shade, so two moves that touch read as two.
  const movedClass = (idx: number): string => {
    const m = moved.get(idx)
    return m ? ` moved${m.block % 2 ? ' moved-alt' : ''}` : ''
  }

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
    // A moved line's word marks would compare it with whatever line happened to
    // sit opposite, which is not what it moved from.
    const wr = !maskValues && wordDiffOn && kind !== 'ctx' && !moved.has(idx) ? wordRanges.get(idx) : undefined
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
  // Changed cells are selectable for line actions, exactly as unified rows are —
  // `idx` points into the same `lines`, so one selection serves both views.
  const splitCell = (c: SplitCell | undefined, key: string): React.JSX.Element => {
    const selectable = hasHunkActions && !!c && c.kind !== 'ctx'
    const partner = c ? splitPartners.get(c.idx) : undefined
    const idxs = c ? (partner === undefined ? [c.idx] : [c.idx, partner].sort((a, b) => a - b)) : []
    const m = c ? moved.get(c.idx) : undefined
    return (
      <div
        key={key}
        className={`diff-split-cell ${c ? c.kind : 'empty'}${c ? movedClass(c.idx) : ''} ${
          selectable ? 'selectable' : ''
        } ${c && selected.has(c.idx) ? 'line-selected' : ''}`}
        onClick={selectable ? () => toggleLines(idxs) : undefined}
        onContextMenu={c ? (e) => openLineMenu(e, idxs, c.text) : undefined}
        title={selectable ? t('diff.selectLineTitle') : undefined}
      >
        {m ? (
          <span className="diff-gutter" data-move={MOVE_ARROW[m.dir]} title={movedTitle(m)}>
            {c?.no ?? ''}
          </span>
        ) : (
          <span className="diff-gutter">{c?.no ?? ''}</span>
        )}
        {c ? (
          <span className="diff-text" dangerouslySetInnerHTML={{ __html: cellHtml(c.text, c.idx, c.kind) }} />
        ) : (
          <span className="diff-text" />
        )}
      </div>
    )
  }

  // The buttons on a hunk's @@ bar, one per action that fits this diff.
  const hunkButtons = (hunkIdx: number): React.JSX.Element | null =>
    hunkData ? (
      <span className="diff-hunk-actions">
        {hunkActions.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`btn ghost tiny diff-stage-hunk${a.danger ? ' danger' : ''}`}
            disabled={busy}
            title={busy ? t('diff.busyRow') : undefined}
            onClick={() => a.run(singleHunkPatch(hunkData, hunkIdx))}
          >
            {a.hunkLabel}
          </button>
        ))}
      </span>
    ) : null

  // The @@ bar. Column-major mode draws it in both columns — the left carries
  // the header text, the right the hunk buttons, and together they read as one
  // bar without either column losing a row.
  const splitHunk = (r: SplitRow, key: number, side?: 'left' | 'right'): React.JSX.Element => (
    <div key={key} className="diff-split-hunk">
      <span className="diff-text">{side === 'right' ? '' : r.hunk}</span>
      {side !== 'left' && r.hunkIdx !== undefined && hunkButtons(r.hunkIdx)}
    </div>
  )

  // Line selection for the line actions (only when the diff has any). Keyed by
  // index into `lines`, so it carries across unified and split view; cleared
  // whenever the diff changes.
  const [selected, setSelected] = useState<Set<number>>(new Set())
  useEffect(() => setSelected(new Set()), [diff])

  const toggleLine = (i: number): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  // Several lines at once — a split row's two halves — select together, and
  // deselect together once all of them are on.
  const toggleLines = (idxs: number[]): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      const on = idxs.every((i) => next.has(i))
      for (const i of idxs) {
        if (on) next.delete(i)
        else next.add(i)
      }
      return next
    })

  const runOnLines = (action: HunkAction, target: Set<number>): void => {
    if (!hunkData || target.size === 0) return
    action.run(buildLinePatch(lines, hunkData.header, target, action.reverse ? 'reverse' : 'forward'))
    setSelected(new Set())
  }

  // Right-click on a line: act on that line — or on the selection, when the
  // line is part of one — on its whole hunk, or copy it. `idxs` is what the row
  // stands for: one line, or a split row's edited pair.
  const openLineMenu = (e: React.MouseEvent, idxs: number[], text: string): void => {
    const first = lines[idxs[0]]
    if (!first) return
    e.preventDefault()
    const items: MenuItem[] = []
    // While the last action is still landing the rows stay, greyed, saying why.
    const busyRow = busy ? { disabled: true, title: t('diff.busyRow') } : {}
    if (hunkData && hasHunkActions) {
      const changed = idxs.filter((i) => lines[i].kind === 'add' || lines[i].kind === 'del')
      const inSelection = changed.some((i) => selected.has(i))
      const target = inSelection ? new Set(selected) : new Set(changed)
      if (target.size > 0) {
        for (const a of hunkActions) {
          items.push({
            label: inSelection ? a.linesLabel(target.size) : a.lineLabel,
            danger: a.danger,
            ...busyRow,
            onClick: () => runOnLines(a, target)
          })
        }
        items.push({ separator: true })
      }
      for (const a of hunkActions) {
        items.push({
          label: a.hunkLabel,
          danger: a.danger,
          ...busyRow,
          onClick: () => a.run(singleHunkPatch(hunkData, first.hunkIdx))
        })
      }
      items.push({ separator: true })
    }
    // Text picked inside the diff wins; otherwise the line, as it is shown (a
    // secret file's values stay masked on the clipboard too).
    const picked = window.getSelection()
    const pickedText = picked && viewerRef.current?.contains(picked.anchorNode) ? picked.toString() : ''
    items.push(
      pickedText
        ? { label: t('diff.copySelection'), onClick: () => void navigator.clipboard.writeText(pickedText) }
        : {
            label: t('diff.copyLine'),
            onClick: () => void navigator.clipboard.writeText(maskValues ? maskSecretLine(text) : text)
          }
    )
    useUIStore.getState().openContextMenu(e.clientX, e.clientY, items)
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
  }, [findRe, diff, splitView, wordDiffOn, movedOn, maskValues])

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
  const hasMoves = allMoved.size > 0

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
        {hasMoves && (
          <button
            className={`diff-word-toggle ${movedOn ? 'on' : ''}`}
            title={t('diff.movedTitle')}
            onClick={() => setMovedOn((v) => !v)}
          >
            <MoveVertical size={12} /> {t('diff.moved')}
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
      {hasHunkActions && selected.size > 0 && (
        <div className="diff-select-bar" role="status">
          <span>{interp(t('diff.linesSelected'), { n: selected.size, s: selected.size === 1 ? '' : 's' })}</span>
          <button className="btn ghost tiny" onClick={() => setSelected(new Set())}>
            {t('diff.clearSelection')}
          </button>
          {hunkActions.map((a, i) => (
            <button
              key={a.id}
              type="button"
              // The first action is the everyday one; the rest stay quieter.
              className={`btn tiny ${a.danger ? 'danger' : i === 0 ? 'primary' : 'ghost'}`}
              disabled={busy}
              title={busy ? t('diff.busyRow') : undefined}
              onClick={() => runOnLines(a, selected)}
            >
              {a.linesLabel(selected.size)}
            </button>
          ))}
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
      {lines.map((l, i) => {
        if (l.kind === 'meta') return null
        if (l.kind === 'hunk') {
          return (
            <div key={i} className="diff-line hunk">
              <span className="diff-gutter" />
              <span className="diff-gutter" />
              <span className="diff-text">{l.text}</span>
              {hunkButtons(l.hunkIdx)}
            </div>
          )
        }
        const selectable = hasHunkActions && (l.kind === 'add' || l.kind === 'del')
        return (
          <div
            key={i}
            className={`diff-line ${l.kind} ${selectable ? 'selectable' : ''} ${selected.has(i) ? 'line-selected' : ''}${movedClass(i)}`}
            onClick={selectable ? () => toggleLine(i) : undefined}
            onContextMenu={(e) => openLineMenu(e, [i], l.text)}
            title={selectable ? t('diff.selectLineTitle') : undefined}
          >
            <span className="diff-gutter">{l.oldNo ?? ''}</span>
            <span className="diff-gutter">{l.newNo ?? ''}</span>
            {moved.has(i) ? (
              <span className="diff-sign diff-move-sign" title={movedTitle(moved.get(i)!)}>
                {MOVE_ARROW[moved.get(i)!.dir]}
              </span>
            ) : (
              <span className="diff-sign">{l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}</span>
            )}
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
