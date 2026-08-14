import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, LifeBuoy, Search, X } from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { HELP_PAGES, helpExcerpt, helpSections, resolveMedia, searchHelp } from '../help/pages'
import { useT } from '../i18n'

const ISSUES_URL = 'https://github.com/MyAppDesk/gitcito/issues/new'

/**
 * The handbook: every feature explained, offline, from the Markdown in
 * `docs/help/`.
 *
 * Links between pages use `href="#<page-id>"`, which is why the click handler
 * intercepts anchors: the same link is a working relative link on GitHub and an
 * in-app navigation here, with no separate link syntax to maintain.
 */
export function HelpPage({ initialPage }: { initialPage?: string }): React.JSX.Element {
  const t = useT()
  const [current, setCurrent] = useState(initialPage ?? HELP_PAGES[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const sections = useMemo(() => helpSections(), [])
  const results = useMemo(() => searchHelp(query), [query])
  const page = useMemo(() => HELP_PAGES.find((p) => p.id === current) ?? HELP_PAGES[0], [current])
  // allowFileMedia: bundled screenshots resolve to file:// URLs in the packaged app.
  const html = useMemo(() => (page ? renderMarkdown(resolveMedia(page.body), { allowFileMedia: true }) : ''), [page])

  const go = (id: string): void => {
    if (!HELP_PAGES.some((p) => p.id === id)) return
    setHistory((h) => (page ? [...h, page.id] : h))
    setCurrent(id)
    setQuery('')
    bodyRef.current?.scrollTo({ top: 0 })
  }

  const back = (): void => {
    setHistory((h) => {
      const prev = h[h.length - 1]
      if (prev) setCurrent(prev)
      return h.slice(0, -1)
    })
  }

  // Anchors inside the rendered Markdown: `#page-id` navigates, everything else
  // opens in the real browser rather than replacing the app window.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onClick = (e: MouseEvent): void => {
      const link = (e.target as HTMLElement).closest('a')
      const href = link?.getAttribute('href')
      if (!href) return
      e.preventDefault()
      if (href.startsWith('#')) go(href.slice(1))
      else if (/^https?:/.test(href)) void window.api.openExternal(href)
      // A relative .md link (how GitHub reads it) resolves to its page id.
      else if (href.endsWith('.md')) go((href.split('/').pop() ?? '').replace(/\.md$/, ''))
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, page?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const typing = (e.target as HTMLElement | null)?.tagName === 'INPUT'
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="help-root">
      <aside className="help-nav">
        <div className="help-search">
          <Search size={13} className="help-search-icon" />
          <input
            ref={searchRef}
            className="modal-input help-search-input"
            value={query}
            placeholder={t('help.search')}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
              if (e.key === 'Enter' && results[0]) go(results[0].id)
            }}
          />
          {query && (
            <button className="help-search-clear" onClick={() => setQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {query ? (
          <div className="help-results">
            {results.length === 0 ? (
              <div className="help-no-results">{t('help.noResults')}</div>
            ) : (
              results.map((r) => (
                <button key={r.id} className="help-result" onClick={() => go(r.id)}>
                  <span className="help-result-title">{r.title}</span>
                  <span className="help-result-excerpt">{helpExcerpt(r, query)}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.category} className="help-section">
              <span className="help-section-title">{section.category}</span>
              {section.pages.map((p) => (
                <button
                  key={p.id}
                  className={`help-link ${p.id === page?.id ? 'active' : ''}`}
                  onClick={() => go(p.id)}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ))
        )}

        <div className="help-nav-foot">
          <button className="help-foot-btn" onClick={() => void window.api.openExternal(ISSUES_URL)}>
            <ExternalLink size={12} /> {t('help.reportIssue')}
          </button>
        </div>
      </aside>

      <div className="help-body" ref={bodyRef}>
        {page ? (
          <>
            <div className="help-head">
              {history.length > 0 && (
                <button className="btn ghost small help-back" onClick={back}>
                  <ArrowLeft size={13} /> {t('help.back')}
                </button>
              )}
              <LifeBuoy size={14} className="help-head-icon" />
              <span className="help-breadcrumb">{page.category}</span>
            </div>
            <article className="help-article markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          </>
        ) : (
          <div className="help-empty">{t('help.empty')}</div>
        )}
      </div>
    </div>
  )
}
