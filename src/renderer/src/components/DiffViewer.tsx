import { useMemo } from 'react'
import hljs from 'highlight.js'

interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
  hunkIdx: number
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightLine(text: string, lang: string): string {
  if (!lang || !hljs.getLanguage(lang)) return escapeHtml(text)
  try {
    return hljs.highlight(text, { language: lang }).value
  } catch {
    return escapeHtml(text)
  }
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

export function DiffViewer({
  diff,
  lang = '',
  onStageHunk
}: {
  diff: string
  lang?: string
  onStageHunk?: (patch: string) => void
}): React.JSX.Element {
  const lines = useMemo(() => parseDiff(diff), [diff])
  const hunkData = useMemo(() => (onStageHunk ? extractHunks(diff) : null), [diff, onStageHunk])

  if (!diff.trim()) return <div className="diff-empty">No changes to display</div>

  return (
    <div className="diff-viewer hljs">
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
        return (
          <div key={i} className={`diff-line ${l.kind}`}>
            <span className="diff-gutter">{l.oldNo ?? ''}</span>
            <span className="diff-gutter">{l.newNo ?? ''}</span>
            <span className="diff-sign">{l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}</span>
            <span
              className="diff-text"
              dangerouslySetInnerHTML={{ __html: highlightLine(l.text, lang) || '&nbsp;' }}
            />
          </div>
        )
      })}
    </div>
  )
}
