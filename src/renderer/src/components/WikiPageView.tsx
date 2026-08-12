import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Boxes, Loader2, RefreshCw, Sparkles, FileText, Trash2, Workflow } from 'lucide-react'
import { wikiApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { renderMarkdown } from '../preview/markdown'
import { useT } from '../i18n'
import { ImportMap, LanguageBar, PageMap, StackList } from './WikiOverview'
import { topLanguages } from '../../../shared/repoFacts'
import type { ImportGraph, RepoFacts, RepoWiki, WikiArchetype, WikiProgress } from '../../../shared/types'

type Freshness = 'current' | 'behind' | 'outdated'

/** What kind of page this is, shown as an icon rather than a label. */
function pageIcon(archetype: WikiArchetype): React.JSX.Element {
  switch (archetype) {
    case 'overview':
      return <BookOpen size={13} />
    case 'workflow':
      return <Workflow size={13} />
    case 'reference':
      return <FileText size={13} />
    default:
      return <Boxes size={13} />
  }
}

/** A generated wiki for one repo: pages on the left, the page itself on the right. */
export function WikiPageView({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const setFileView = useUIStore((s) => s.setFileView)
  const activeProfile = useSettingsStore((s) => s.activeProfile)
  const openRepoTab = useSettingsStore((s) => s.openRepoTab)
  const repoName = useRepoStore((s) => s.repos[repoPath]?.name ?? repoPath.split('/').pop() ?? repoPath)

  const [wiki, setWiki] = useState<RepoWiki | null>(null)
  const [freshness, setFreshness] = useState<Freshness>('outdated')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<WikiProgress | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [facts, setFacts] = useState<RepoFacts | null>(null)
  const [imports, setImports] = useState<ImportGraph | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    wikiApi
      .get(repoPath, activeProfile().ai.model || '')
      .then((stored) => {
        if (cancelled) return
        setWiki(stored.wiki)
        setFreshness(stored.freshness)
        setSlug(stored.wiki?.pages[0]?.slug ?? null)
      })
      .catch((err) => !cancelled && toast('error', err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false))
    void wikiApi
      .facts(repoPath)
      .then((f) => !cancelled && setFacts(f))
      .catch(() => undefined)
    // Reading every source file takes a moment, so it lands on its own.
    void wikiApi
      .imports(repoPath, 0)
      .then((g) => !cancelled && setImports(g))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [repoPath, activeProfile, toast])

  // Progress is pushed per page while generating; only this repo's is ours.
  useEffect(
    () => wikiApi.onProgress(({ repoPath: path, progress: p }) => path === repoPath && setProgress(p)),
    [repoPath]
  )

  const generate = async (): Promise<void> => {
    setGenerating(true)
    setProgress({ phase: 'planning' })
    try {
      const fresh = await wikiApi.generate(repoPath, activeProfile().ai)
      setWiki(fresh)
      setFreshness('current')
      setSlug(fresh.pages[0]?.slug ?? null)
      toast('success', t('wiki.generated'))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  // The wiki is a page tab, and the file viewer only lives in a repo tab — so
  // opening a source means switching to that repo first, then pointing it at
  // the file.
  const openSource = (path: string): void => {
    openRepoTab({ path: repoPath, name: repoName })
    setFileView({ repoPath, file: path, source: { type: 'tree' }, mode: 'file' })
  }

  const remove = async (): Promise<void> => {
    await wikiApi.clear(repoPath)
    setWiki(null)
    setFreshness('outdated')
    setSlug(null)
  }

  const page = useMemo(() => wiki?.pages.find((p) => p.slug === slug) ?? wiki?.pages[0] ?? null, [wiki, slug])
  const sources = useMemo(() => {
    if (!page) return []
    const paths = new Set<string>()
    for (const section of page.sections) for (const claim of section.claims) for (const p of claim.sourcePaths) paths.add(p)
    return [...paths].sort()
  }, [page])

  const progressLabel = (p: WikiProgress): string => {
    if (p.phase === 'planning') return t('wiki.planning')
    if (p.phase === 'page') return `${p.title} (${p.done}/${p.total})`
    if (p.phase === 'error') return p.message
    return t('wiki.generated')
  }

  return (
    <div className="changelog-page">
      <motion.div
        className="changelog-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <header className="changelog-header">
          <div className="changelog-title">
            <BookOpen size={20} />
            <h1>{t('wiki.title')}</h1>
            <span className="settings-hint">{repoName}</span>
          </div>
          <div className="wiki-actions">
            {wiki && (
              <button className="btn ghost small" onClick={() => void remove()} disabled={generating}>
                <Trash2 size={13} /> {t('wiki.clear')}
              </button>
            )}
            <button className="btn primary small" onClick={() => void generate()} disabled={generating}>
              {generating ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}{' '}
              {wiki ? t('wiki.regenerate') : t('wiki.generate')}
            </button>
          </div>
        </header>

        {wiki && freshness !== 'current' && (
          <p className="wiki-stale">
            {freshness === 'behind' ? t('wiki.behind') : t('wiki.outdated')}
          </p>
        )}

        {generating && progress && (
          <p className="settings-hint wiki-progress">
            <Loader2 size={13} className="spin" /> {progressLabel(progress)}
          </p>
        )}

        {loading ? (
          <p className="settings-hint">{t('wiki.loading')}</p>
        ) : !wiki ? (
          <>
            <div className="wiki-empty">
              <Sparkles size={22} />
              <p>{t('wiki.emptyTitle')}</p>
              <span className="settings-hint">{t('wiki.emptyHint')}</span>
            </div>
            {facts && <LanguageBar languages={topLanguages(facts.languages)} />}
            {imports && <ImportMap graph={imports} />}
          </>
        ) : (
          <div className="wiki-body">
            <nav className="wiki-nav">
              {wiki.pages.map((p) => (
                <button
                  key={p.slug}
                  className={`wiki-nav-item ${p.slug === page?.slug ? 'active' : ''}`}
                  onClick={() => setSlug(p.slug)}
                  title={p.title}
                >
                  {pageIcon(p.archetype)}
                  <span className="wiki-nav-title">{p.title}</span>
                </button>
              ))}
            </nav>

            {page && (
              <article className="wiki-content">
                {page.archetype === 'overview' && (
                  <div className="wiki-facts">
                    {facts && <LanguageBar languages={topLanguages(facts.languages)} />}
                    {facts && <StackList stack={wiki.stack} facts={facts} />}
                    <PageMap pages={wiki.pages} activeSlug={page.slug} onSelect={setSlug} />
                    {imports && <ImportMap graph={imports} />}
                  </div>
                )}
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.markdown) }} />

                {sources.length > 0 && (
                  <section className="wiki-sources">
                    <h3>{t('wiki.sources')}</h3>
                    <div className="wiki-source-list">
                      {sources.map((path) => (
                        <button
                          key={path}
                          className="wiki-source"
                          onClick={() => openSource(path)}
                        >
                          <FileText size={12} /> {path}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {page.related.length > 0 && (
                  <section className="wiki-sources">
                    <h3>{t('wiki.related')}</h3>
                    <div className="wiki-source-list">
                      {page.related.map((s) => (
                        <button key={s} className="wiki-source" onClick={() => setSlug(s)}>
                          {wiki.pages.find((p) => p.slug === s)?.title ?? s}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </article>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
