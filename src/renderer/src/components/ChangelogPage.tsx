import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Github, RefreshCw } from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { bundledChangelog, releasesToMarkdown } from '../changelog'
import { useT } from '../i18n'

type Source = 'loading' | 'live' | 'bundled'

/** The "What's new" page tab. Shows the bundled changelog instantly, then
 *  upgrades to live GitHub release notes when the network call succeeds. */
export function ChangelogPage(): React.JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  const [source, setSource] = useState<Source>('loading')
  // Bundled markdown is rendered immediately so there is never a blank state.
  const bundledHtml = useMemo(() => renderMarkdown(bundledChangelog()), [])
  const [liveHtml, setLiveHtml] = useState<string | null>(null)

  useEffect(() => {
    void window.api.appVersion().then(setVersion)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSource('loading')
    window.api
      .appReleases()
      .then((releases) => {
        if (cancelled) return
        if (releases.length > 0) {
          setLiveHtml(renderMarkdown(releasesToMarkdown(releases)))
          setSource('live')
        } else {
          setSource('bundled')
        }
      })
      .catch(() => {
        if (!cancelled) setSource('bundled')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const html = liveHtml ?? bundledHtml

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
            <Sparkles size={20} />
            <div>
              <h1>{t('changelog.title')}</h1>
              {version && <span className="changelog-version">v{version}</span>}
            </div>
          </div>
          <span className={`changelog-source changelog-source-${source}`}>
            {source === 'loading' && (
              <>
                <RefreshCw size={12} className="spin" /> {t('changelog.checking')}
              </>
            )}
            {source === 'live' && (
              <>
                <Github size={12} /> {t('changelog.live')}
              </>
            )}
            {source === 'bundled' && t('changelog.bundled')}
          </span>
        </header>
        <article
          className="changelog-body md-preview"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </motion.div>
    </div>
  )
}
