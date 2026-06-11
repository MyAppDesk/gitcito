import { useMemo } from 'react'
import hljs from 'highlight.js'

interface DiffLine {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  text: string
  oldNo: number | null
  newNo: number | null
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
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (m) {
        oldNo = +m[1]
        newNo = +m[2]
      }
      out.push({ kind: 'hunk', text: line, oldNo: null, newNo: null })
    } else if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
      out.push({ kind: 'meta', text: line, oldNo: null, newNo: null })
    } else if (line.startsWith('+')) {
      out.push({ kind: 'add', text: line.slice(1), oldNo: null, newNo: newNo++ })
    } else if (line.startsWith('-')) {
      out.push({ kind: 'del', text: line.slice(1), oldNo: oldNo++, newNo: null })
    } else {
      out.push({ kind: 'ctx', text: line.startsWith(' ') ? line.slice(1) : line, oldNo: oldNo++, newNo: newNo++ })
    }
  }
  return out
}

export function DiffViewer({ diff, lang = '' }: { diff: string; lang?: string }): React.JSX.Element {
  const lines = useMemo(() => parseDiff(diff), [diff])

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
