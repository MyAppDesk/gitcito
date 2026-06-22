import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Github, RefreshCw, Download, ArrowUpCircle } from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { bundledChangelog } from '../changelog'
import { isNewerVersion } from '../../../shared/version'
import type { AppRelease } from '../../../shared/types'
import { useUpdatesStore } from '../stores/updates'
import { useT } from '../i18n'

type Source = 'loading' | 'live' | 'bundled'

const stripV = (s: string): string => s.replace(/^v/i, '')

/** The "What's new" page tab. Shows the notes for the *currently installed*
 *  version only. If GitHub has a newer release, a callout at the top surfaces
 *  it (with its own notes + a download action) — never mixing the two. */
export function ChangelogPage(): React.JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  const [source, setSource] = useState<Source>('loading')
  const [releases, setReleases] = useState<AppRelease[] | null>(null)
  const download = useUpdatesStore((s) => s.download)
  const supported = useUpdatesStore((s) => s.supported)

  const bundledHtml = useMemo(() => renderMarkdown(bundledChangelog()), [])

  useEffect(() => {
    void window.api.appVersion().then(setVersion)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSource('loading')
    window.api
      .appReleases()
      .then((rs) => {
        if (cancelled) return
        setReleases(rs)
        setSource(rs.length > 0 ? 'live' : 'bundled')
      })
      .catch(() => {
        if (!cancelled) setSource('bundled')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The release matching the installed version, and any newer one on GitHub.
  const current = useMemo(
    () => releases?.find((r) => stripV(r.tag) === stripV(version)) ?? null,
    [releases, version]
  )
  const newer = useMemo(() => {
    if (!releases || !version) return null
    const ahead = releases
      .filter((r) => !r.prerelease && isNewerVersion(stripV(r.tag), stripV(version)))
      .sort((a, b) => (isNewerVersion(stripV(a.tag), stripV(b.tag)) ? -1 : 1))
    return ahead[0] ?? null
  }, [releases, version])

  // Body for the installed version: live notes if found, else bundled markdown.
  const currentHtml = useMemo(() => {
    if (current) {
      const body = current.body?.trim()
      return body ? renderMarkdown(body) : null
    }
    return null
  }, [current])

  const newerHtml = useMemo(
    () => (newer?.body?.trim() ? renderMarkdown(newer.body) : null),
    [newer]
  )

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

        {newer && (
          <motion.section
            className="changelog-update-callout"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="changelog-update-head">
              <ArrowUpCircle size={18} />
              <div>
                <strong>{t('update.available.title')}</strong>
                <span className="changelog-update-version">v{newer.tag.replace(/^v/i, '')}</span>
              </div>
              <button className="update-btn update-btn-primary" onClick={download}>
                <Download size={13} /> {supported ? t('update.download') : t('update.getIt')}
              </button>
            </div>
            {newerHtml && (
              <div
                className="changelog-update-notes md-preview"
                dangerouslySetInnerHTML={{ __html: newerHtml }}
              />
            )}
          </motion.section>
        )}

        <article
          className="changelog-body md-preview"
          dangerouslySetInnerHTML={{ __html: currentHtml ?? bundledHtml }}
        />
      </motion.div>
    </div>
  )
}
