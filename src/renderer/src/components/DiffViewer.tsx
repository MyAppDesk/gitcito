import { useEffect, useMemo, useState } from 'react'
import { highlightHtml, type HighlightLayer } from './FileSearchBar'
import { highlightLine } from '../lib/highlight'

interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
  hunkIdx: number
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
  onStageHunk
}: {
  diff: string
  lang?: string
  highlightLayers?: HighlightLayer[]
  onStageHunk?: (patch: string) => void
}): React.JSX.Element {
  const lines = useMemo(() => parseDiff(diff), [diff])
  const hunkData = useMemo(() => (onStageHunk ? extractHunks(diff) : null), [diff, onStageHunk])

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

  return (
    <div className="diff-viewer hljs">
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
              dangerouslySetInnerHTML={{ __html: highlightHtml(highlightLine(l.text, lang), highlightLayers) || '&nbsp;' }}
            />
          </div>
        )
      })}
    </div>
  )
}
