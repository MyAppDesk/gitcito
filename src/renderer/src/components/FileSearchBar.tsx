import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight } from 'lucide-react'

export type SearchMode = 'content' | 'name'

export interface FileFilter {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
  include: string
  exclude: string
}

export const EMPTY_FILTER: FileFilter = {
  query: '',
  mode: 'content',
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  include: '',
  exclude: ''
}

export const isFilterActive = (f: FileFilter): boolean =>
  f.query.trim() !== '' || f.include.trim() !== '' || f.exclude.trim() !== ''

/** Build a RegExp from the query + toggles. `global` for highlight replace;
 *  non-global for `.test`. Returns null for an empty/invalid query. */
export function buildQueryRegExp(
  f: { query: string; caseSensitive: boolean; wholeWord: boolean; regex: boolean },
  global = false
): RegExp | null {
  const q = f.query.trim()
  if (!q) return null
  try {
    const src = f.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const body = f.wholeWord ? `\\b${src}\\b` : src
    return new RegExp(body, `${f.caseSensitive ? '' : 'i'}${global ? 'g' : ''}`)
  } catch {
    return null
  }
}

// Convert a single glob to an anchored regex. Supports `*`, `**`, `?` and treats
// slash-less patterns (e.g. `*.ts`) as matching at any directory depth, à la VSCode.
function globToRegExp(glob: string): RegExp {
  let core = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          core += '(?:.*/)?' // **/ → any number of directories (including none)
        } else {
          core += '.*' // ** → anything, crossing directory boundaries
        }
      } else {
        core += '[^/]*' // * → within a single path segment
      }
    } else if (c === '?') {
      core += '[^/]'
    } else if ('.+^${}()|[]\\'.includes(c)) {
      core += '\\' + c
    } else {
      core += c
    }
  }
  const anchored = glob.includes('/') ? core : `(?:.*/)?${core}`
  return new RegExp(`^${anchored}$`, 'i')
}

export interface HighlightLayer {
  re: RegExp
  className: string
}

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' '
}

function decodeEntity(token: string): string {
  if (token[0] !== '&') return token
  if (ENTITY_MAP[token]) return ENTITY_MAP[token]
  const num = /^&#(\d+);$/.exec(token)
  if (num) return String.fromCodePoint(+num[1])
  const hex = /^&#x([0-9a-fA-F]+);$/.exec(token)
  if (hex) return String.fromCodePoint(parseInt(hex[1], 16))
  return token
}

// Highlight one tag-free (but HTML-escaped) text segment with overlapping
// layers; earlier layers win conflicts (find layer over filter layer).
//
// Matching runs on the DECODED text so a query never lands inside an HTML
// entity (e.g. "o" inside &quot;); marks always wrap whole entity tokens.
function highlightSegment(text: string, layers: HighlightLayer[]): string {
  const tokens = text.match(/&[a-zA-Z][a-zA-Z0-9]*;|&#\d+;|&#x[0-9a-fA-F]+;|[\s\S]/g)
  if (!tokens) return text
  // Each token decodes to exactly one character, so decoded-string indices map
  // 1:1 onto token indices.
  const decoded = tokens.map(decodeEntity).join('')

  const hits: { s: number; e: number; cls: string; pri: number }[] = []
  layers.forEach((layer, pri) => {
    const flags = layer.re.flags.includes('g') ? layer.re.flags : `${layer.re.flags}g`
    const re = new RegExp(layer.re.source, flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(decoded)) !== null) {
      if (m[0] === '') {
        re.lastIndex++
        continue
      }
      hits.push({ s: m.index, e: m.index + m[0].length, cls: layer.className, pri })
    }
  })
  if (hits.length === 0) return text
  hits.sort((a, b) => a.s - b.s || a.pri - b.pri || b.e - a.e)
  let out = ''
  let pos = 0
  for (const h of hits) {
    if (h.s < pos) continue // overlaps an already-emitted (higher-priority) hit
    out += tokens.slice(pos, h.s).join('')
    out += `<mark class="${h.cls}">${tokens.slice(h.s, h.e).join('')}</mark>`
    pos = h.e
  }
  return out + tokens.slice(pos).join('')
}

/** Wrap matches in <mark> within a highlighted HTML string, touching only text
 *  outside tags so hljs markup stays intact. Supports multiple layers. */
export function highlightHtml(html: string, layers: HighlightLayer[]): string {
  if (layers.length === 0) return html
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag, text) =>
    tag ? tag : highlightSegment(text as string, layers)
  )
}

/** True when `path` matches any comma-separated glob in `list` (empty list → false). */
export function matchesGlobList(path: string, list: string): boolean {
  const pats = list
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  return pats.some((p) => {
    try {
      return globToRegExp(p).test(path)
    } catch {
      return false
    }
  })
}

export function FileSearchBar({
  value,
  onChange
}: {
  value: FileFilter
  onChange: (next: FileFilter) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const set = (patch: Partial<FileFilter>): void => onChange({ ...value, ...patch })
  const hasGlobs = value.include.trim() !== '' || value.exclude.trim() !== ''

  return (
    <div className="file-search">
      <div className="fs-row">
        <button
          className={`fs-expand${hasGlobs ? ' has-globs' : ''}`}
          title={expanded ? 'Hide file filters' : 'Toggle file filters'}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight size={13} className={`chevron${expanded ? ' open' : ''}`} />
        </button>
        <div className="fs-input-wrap">
          <Search size={13} className="fs-search-icon" />
          <input
            className="fs-input"
            placeholder="Search"
            value={value.query}
            spellCheck={false}
            onChange={(e) => set({ query: e.target.value })}
          />
          <div className="fs-toggles">
            <button
              className={`fs-toggle${value.caseSensitive ? ' active' : ''}`}
              title="Match Case"
              onClick={() => set({ caseSensitive: !value.caseSensitive })}
            >
              Aa
            </button>
            <button
              className={`fs-toggle${value.wholeWord ? ' active' : ''}`}
              title="Match Whole Word"
              onClick={() => set({ wholeWord: !value.wholeWord })}
            >
              ab
            </button>
            <button
              className={`fs-toggle${value.regex ? ' active' : ''}`}
              title="Use Regular Expression"
              onClick={() => set({ regex: !value.regex })}
            >
              .*
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="fs-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="fs-mode-switch" role="radiogroup" aria-label="Search target">
              <button
                className={value.mode === 'content' ? 'active' : ''}
                role="radio"
                aria-checked={value.mode === 'content'}
                onClick={() => set({ mode: 'content' })}
              >
                Content
              </button>
              <button
                className={value.mode === 'name' ? 'active' : ''}
                role="radio"
                aria-checked={value.mode === 'name'}
                onClick={() => set({ mode: 'name' })}
              >
                File name
              </button>
            </div>
            <label className="fs-field">
              <span className="fs-field-label">files to include</span>
              <input
                className="fs-glob-input"
                placeholder="e.g. *.ts, src/**/include"
                value={value.include}
                spellCheck={false}
                onChange={(e) => set({ include: e.target.value })}
              />
            </label>
            <label className="fs-field">
              <span className="fs-field-label">files to exclude</span>
              <input
                className="fs-glob-input"
                placeholder="e.g. *.ts, src/**/exclude"
                value={value.exclude}
                spellCheck={false}
                onChange={(e) => set({ exclude: e.target.value })}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
