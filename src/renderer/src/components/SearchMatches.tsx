import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File } from 'lucide-react'
import type { CodeSearchHit } from '../../../shared/types'
import { buildQueryRegExp, highlightHtml, type FileFilter } from './FileSearchBar'

/** Matching lines for one file, in file order. */
export interface FileMatches {
  file: string
  hits: CodeSearchHit[]
}

/** Bucket flat hits by file, preserving the order the backend returned them in. */
export function groupHits(hits: CodeSearchHit[]): FileMatches[] {
  const byFile = new Map<string, CodeSearchHit[]>()
  for (const h of hits) {
    const list = byFile.get(h.file)
    if (list) list.push(h)
    else byFile.set(h.file, [h])
  }
  return [...byFile].map(([file, list]) => ({ file, hits: list }))
}

/** Index of a hit list by file — for surfaces that render their own file rows. */
export function matchesByFile(hits: CodeSearchHit[]): Map<string, CodeSearchHit[]> {
  return new Map(groupHits(hits).map((g) => [g.file, g.hits]))
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Long lines are useless in a narrow panel: keep a window around the first match
// so the highlighted term is always visible.
const WINDOW_BEFORE = 40
const WINDOW_AFTER = 160

function excerpt(text: string, re: RegExp | null): string {
  const trimmed = text.replace(/^\s+/, '')
  if (trimmed.length <= WINDOW_BEFORE + WINDOW_AFTER) return trimmed
  const at = re ? trimmed.search(new RegExp(re.source, re.flags.replace('g', ''))) : -1
  if (at < 0) return `${trimmed.slice(0, WINDOW_BEFORE + WINDOW_AFTER)}…`
  const start = Math.max(0, at - WINDOW_BEFORE)
  const end = Math.min(trimmed.length, at + WINDOW_AFTER)
  return `${start > 0 ? '…' : ''}${trimmed.slice(start, end)}${end < trimmed.length ? '…' : ''}`
}

export interface MatchRowsProps {
  hits: CodeSearchHit[]
  /** The active query, used to <mark> the term inside each line. */
  re: RegExp | null
  onOpen: (file: string, line: number) => void
  /** Line currently open in the viewer, highlighted in the list. */
  activeLine?: number | null
  activeFile?: string | null
  /** Left padding in px, so rows can line up under their file row. */
  indent?: number
}

/** The `line — matching text` rows shown under an expanded file. */
export function MatchRows({
  hits,
  re,
  onOpen,
  activeLine,
  activeFile,
  indent = 26
}: MatchRowsProps): React.JSX.Element {
  return (
    <>
      {hits.map((h) => {
        const active = activeFile === h.file && activeLine === h.line
        return (
          <div
            key={`${h.file}:${h.line}`}
            className={`sm-match${active ? ' active' : ''}`}
            style={{ paddingLeft: indent }}
            title={`${h.file}:${h.line}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onOpen(h.file, h.line)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(h.file, h.line)
              }
            }}
          >
            <span className="sm-line">{h.line}</span>
            <span
              className="sm-text"
              dangerouslySetInnerHTML={{
                __html: highlightHtml(escapeHtml(excerpt(h.text, re)), re ? [{ re, className: 'search-hit' }] : [])
              }}
            />
          </div>
        )
      })}
    </>
  )
}

export interface SearchResultsTreeProps {
  hits: CodeSearchHit[]
  filter: FileFilter
  onOpen: (file: string, line: number) => void
  activeFile?: string | null
  activeLine?: number | null
  /** Extra content rendered on the file row (e.g. an "open with" button). */
  fileRowExtras?: (file: string) => React.ReactNode
  onFileContext?: (file: string, e: React.MouseEvent) => void
  /** Status class for the file row (e.g. `st-mod`). */
  fileRowClass?: (file: string) => string
}

const baseOf = (p: string): string => p.slice(p.lastIndexOf('/') + 1)
const dirOf = (p: string): string => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')

/**
 * VSCode-style results tree: one collapsible row per file with a match count,
 * expanding into the matching lines. Clicking a line opens the file there.
 */
export function SearchResultsTree({
  hits,
  filter,
  onOpen,
  activeFile,
  activeLine,
  fileRowExtras,
  onFileContext,
  fileRowClass
}: SearchResultsTreeProps): React.JSX.Element {
  const groups = useMemo(() => groupHits(hits), [hits])
  const re = useMemo(() => buildQueryRegExp(filter, true), [filter])
  // Files start expanded (as in VSCode); this holds the ones collapsed by hand.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (file: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })

  return (
    <>
      {groups.map((g) => {
        const open = !collapsed.has(g.file)
        const selected = activeFile === g.file
        return (
          <div key={g.file} className="sm-group">
            <div
              className={`sm-file${selected ? ' selected' : ''} ${fileRowClass?.(g.file) ?? ''}`}
              role="button"
              title={g.file}
              onClick={() => toggle(g.file)}
              onContextMenu={(e) => onFileContext?.(g.file, e)}
            >
              <span className="sm-caret">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
              <span className="sm-icon">
                <File size={13} />
              </span>
              <span className="sm-name">
                <span className="sm-base">{baseOf(g.file)}</span>
                {dirOf(g.file) && <span className="sm-dir">{dirOf(g.file)}</span>}
              </span>
              <span className="sm-count">{g.hits.length}</span>
              {fileRowExtras?.(g.file)}
            </div>
            {open && (
              <MatchRows
                hits={g.hits}
                re={re}
                onOpen={onOpen}
                activeFile={activeFile}
                activeLine={activeLine}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

/** "N results in M files" summary line. */
export function MatchSummary({
  hits,
  label
}: {
  hits: CodeSearchHit[]
  label: (results: number, files: number) => string
}): React.JSX.Element {
  const files = useMemo(() => new Set(hits.map((h) => h.file)).size, [hits])
  return <div className="sm-summary">{label(hits.length, files)}</div>
}
