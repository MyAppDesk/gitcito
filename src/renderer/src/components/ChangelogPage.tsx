import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Github,
  RefreshCw,
  Download,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { bundledChangelog } from '../changelog'
import { compareVersions, isNewerVersion } from '../../../shared/version'
import type { AppRelease } from '../../../shared/types'
import { useUpdatesStore } from '../stores/updates'
import { useT } from '../i18n'

type Source = 'loading' | 'live' | 'bundled'

const stripV = (s: string): string => s.replace(/^v/i, '')

/** The "What's new" page tab. Steps through every GitHub release (newest →
 *  oldest) with ‹ › arrows, opening on the *currently installed* version. If
 *  GitHub has a newer release, a callout at the top surfaces it (with its own
 *  notes + a download action). Offline, it falls back to the bundled notes. */
export function ChangelogPage(): React.JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  const [source, setSource] = useState<Source>('loading')
  const [releases, setReleases] = useState<AppRelease[] | null>(null)
  const [idx, setIdx] = useState(0)
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

  // Browsable timeline: real releases only, newest first.
  const timeline = useMemo(
    () =>
      (releases ?? [])
        .filter((r) => !r.prerelease)
        .sort((a, b) => -compareVersions(a.tag, b.tag)),
    [releases]
  )

  // Open on the installed version (else newest) once the timeline lands.
  useEffect(() => {
    if (!timeline.length) return
    const installed = timeline.findIndex((r) => stripV(r.tag) === stripV(version))
    setIdx(installed >= 0 ? installed : 0)
  }, [timeline, version])

  const selected = timeline[idx] ?? null
  const isInstalled = !!selected && stripV(selected.tag) === stripV(version)

  // Any release strictly newer than what's installed (top callout).
  const newer = useMemo(() => {
    if (!timeline.length || !version) return null
    const ahead = timeline.find((r) => isNewerVersion(stripV(r.tag), stripV(version)))
    return ahead ?? null
  }, [timeline, version])

  const selectedHtml = useMemo(
    () => (selected?.body?.trim() ? renderMarkdown(selected.body) : null),
    [selected]
  )
  const newerHtml = useMemo(
    () => (newer?.body?.trim() ? renderMarkdown(newer.body) : null),
    [newer]
  )

  const selectedDate = useMemo(() => {
    if (!selected?.publishedAt) return ''
    const d = new Date(selected.publishedAt)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString()
  }, [selected])

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
                <span className="changelog-update-version">v{stripV(newer.tag)}</span>
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

        {timeline.length > 0 && selected ? (
          <>
            <div className="changelog-stepper">
              <button
                className="changelog-step-btn"
                onClick={() => setIdx((i) => Math.min(i + 1, timeline.length - 1))}
                disabled={idx >= timeline.length - 1}
                title={t('changelog.older')}
                aria-label={t('changelog.older')}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="changelog-step-label">
                <span className="changelog-step-tag">v{stripV(selected.tag)}</span>
                {isInstalled && (
                  <span className="changelog-step-installed">{t('changelog.installed')}</span>
                )}
                {selectedDate && <span className="changelog-step-date">{selectedDate}</span>}
              </div>
              <button
                className="changelog-step-btn"
                onClick={() => setIdx((i) => Math.max(i - 1, 0))}
                disabled={idx <= 0}
                title={t('changelog.newer')}
                aria-label={t('changelog.newer')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {selectedHtml ? (
              <article
                className="changelog-body md-preview"
                dangerouslySetInnerHTML={{ __html: selectedHtml }}
              />
            ) : (
              <p className="changelog-empty">{t('changelog.noNotes')}</p>
            )}
          </>
        ) : (
          <article
            className="changelog-body md-preview"
            dangerouslySetInnerHTML={{ __html: bundledHtml }}
          />
        )}
      </motion.div>
    </div>
  )
}
