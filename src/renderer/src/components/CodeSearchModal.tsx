import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Loader2, FileText, GitCommit, CaseSensitive, WholeWord, Regex } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { buildQueryRegExp, highlightHtml, type HighlightLayer } from './FileSearchBar'
import { guessLanguage, highlightLine } from '../lib/highlight'
import type { CodeSearchHit, HistorySearchHit } from '../../../shared/types'
import { useT } from '../i18n'

type Tab = 'files' | 'history'

export function CodeSearchModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const setFileView = useUIStore((s) => s.setFileView)
  const setFileSearch = useUIStore((s) => s.setFileSearch)
  const requestScrollTo = useUIStore((s) => s.requestScrollTo)

  const [tab, setTab] = useState<Tab>('files')
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileHits, setFileHits] = useState<CodeSearchHit[]>([])
  const [histHits, setHistHits] = useState<HistorySearchHit[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  // Debounced search; re-runs on query / option / tab change.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setFileHits([])
      setHistHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        if (tab === 'files') {
          setFileHits(await gitApi.grepWorkingTree(repoPath, q, { caseSensitive, wholeWord, regex }))
        } else {
          setHistHits(await gitApi.searchHistory(repoPath, q, { caseSensitive, regex }))
        }
      } catch {
        setFileHits([])
        setHistHits([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(handle)
  }, [query, caseSensitive, wholeWord, regex, tab, repoPath])

  const openFileHit = (hit: CodeSearchHit): void => {
    setFileSearch({ query: query.trim(), caseSensitive, wholeWord, regex })
    setFileView({ repoPath, file: hit.file, source: { type: 'tree' }, mode: 'file' })
    closeModal()
  }

  const openHistHit = (hit: HistorySearchHit): void => {
    setFileView(null)
    useRepoStore.getState().select(repoPath, { type: 'commit', hash: hit.hash })
    requestScrollTo(hit.hash)
    closeModal()
  }

  // Group file hits by file for a compact, readable result list.
  const grouped = useMemo(() => {
    const map = new Map<string, CodeSearchHit[]>()
    for (const h of fileHits) {
      const arr = map.get(h.file)
      if (arr) arr.push(h)
      else map.set(h.file, [h])
    }
    return Array.from(map.entries())
  }, [fileHits])

  const total = tab === 'files' ? fileHits.length : histHits.length

  // Overlay layer that marks the matched query on top of the syntax-highlighted
  // line. Built from the same options the search ran with.
  const layers = useMemo<HighlightLayer[]>(() => {
    const re = buildQueryRegExp({ query: query.trim(), caseSensitive, wholeWord, regex }, true)
    return re ? [{ re, className: 'search-hit' }] : []
  }, [query, caseSensitive, wholeWord, regex])

  return (
    <div className="codesearch">
      <h3>{t('search.title')}</h3>

      <div className="codesearch-tabs">
        <button className={`codesearch-tab ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
          <FileText size={13} /> {t('search.workingTree')}
        </button>
        <button className={`codesearch-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <GitCommit size={13} /> {t('search.history')}
        </button>
      </div>

      <div className="codesearch-input-row">
        <Search size={15} className="codesearch-icon" />
        <input
          ref={inputRef}
          className="modal-input codesearch-input"
          placeholder={tab === 'files' ? t('search.filesPlaceholder') : t('search.historyPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="codesearch-opts">
          <button
            className={`codesearch-opt ${caseSensitive ? 'on' : ''}`}
            title={t('search.caseSensitive')}
            onClick={() => setCaseSensitive((v) => !v)}
          >
            <CaseSensitive size={15} />
          </button>
          {tab === 'files' && (
            <button
              className={`codesearch-opt ${wholeWord ? 'on' : ''}`}
              title={t('search.wholeWord')}
              onClick={() => setWholeWord((v) => !v)}
            >
              <WholeWord size={15} />
            </button>
          )}
          <button
            className={`codesearch-opt ${regex ? 'on' : ''}`}
            title={t('search.regex')}
            onClick={() => setRegex((v) => !v)}
          >
            <Regex size={15} />
          </button>
        </div>
      </div>

      <div className="codesearch-meta">
        {loading ? (
          <span className="codesearch-loading">
            <Loader2 size={13} className="spin" /> {t('search.searching')}
          </span>
        ) : query.trim() ? (
          <span>
            {total} {tab === 'files' ? 'match' : 'commit'}
            {total === 1 ? '' : tab === 'files' ? 'es' : 's'}
            {tab === 'files' && grouped.length > 0 ? ` in ${grouped.length} file${grouped.length === 1 ? '' : 's'}` : ''}
          </span>
        ) : (
          <span className="codesearch-hint">
            {tab === 'files' ? t('search.filesHint') : t('search.historyHint')}
          </span>
        )}
      </div>

      <div className="codesearch-results">
        {tab === 'files' &&
          grouped.map(([file, hits]) => {
            const lang = guessLanguage(file)
            return (
              <div key={file} className="codesearch-filegroup">
                <div className="codesearch-filename" title={file}>
                  {file}
                </div>
                {hits.map((h, i) => (
                  <button key={`${file}:${h.line}:${i}`} className="codesearch-hit" onClick={() => openFileHit(h)}>
                    <span className="codesearch-lineno">{h.line}</span>
                    <span
                      className="codesearch-text hljs"
                      dangerouslySetInnerHTML={{ __html: highlightHtml(highlightLine(h.text, lang), layers) || '&nbsp;' }}
                    />
                  </button>
                ))}
              </div>
            )
          })}

        {tab === 'history' &&
          histHits.map((h) => (
            <button key={h.hash} className="codesearch-commit" onClick={() => openHistHit(h)}>
              <GitCommit size={14} className="codesearch-commit-icon" />
              <span className="codesearch-commit-body">
                <span className="codesearch-commit-subject">{h.subject}</span>
                <span className="codesearch-commit-meta">
                  {h.hash.slice(0, 7)} · {h.author}
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}
