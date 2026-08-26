import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Github,
  RefreshCw,
  Download,
  ArrowUpCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Scale
} from 'lucide-react'
import { renderMarkdown } from '../preview/markdown'
import { bundledChangelog } from '../changelog'
import { compareVersions } from '../../../shared/version'
import { resolveUpdateOffer, type ReleaseRef } from '../lib/updateOffer'
import type { AppRelease } from '../../../shared/types'
import { useUpdatesStore } from '../stores/updates'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

type Source = 'loading' | 'live' | 'bundled'

const stripV = (s: string): string => s.replace(/^v/i, '')

/** Where the badge sends you when GitHub has not told us a release URL yet. */
const RELEASES_URL = 'https://github.com/MyAppDesk/gitcito/releases/latest'

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
  const install = useUpdatesStore((s) => s.install)
  const supported = useUpdatesStore((s) => s.supported)
  const updateStatus = useUpdatesStore((s) => s.status)
  const updateInfo = useUpdatesStore((s) => s.info)
  const updateProgress = useUpdatesStore((s) => s.progress)
  const staged = useUpdatesStore((s) => s.staged)

  const bundledHtml = useMemo(() => renderMarkdown(bundledChangelog()), [])

  useEffect(() => {
    void window.api.appVersion().then(setVersion)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSource('loading')
    // Re-check the updater alongside the GitHub refetch. Opening this page is
    // exactly when the two have to agree, and the launch check can be days old.
    useUpdatesStore.getState().check(true)
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

  // The badge is a way *out* of the app: it points at the newest published
  // release, which is what "latest from GitHub" means to a reader.
  const latestUrl = timeline[0]?.url || RELEASES_URL

  const selected = timeline[idx] ?? null
  const isInstalled = !!selected && stripV(selected.tag) === stripV(version)

  // One decision for the whole callout, shared with the floating banner: the
  // updater names the build, the timeline only fills in what it cannot.
  const newer = useMemo(
    () =>
      version
        ? resolveUpdateOffer({ installed: version, info: updateInfo, staged, timeline })
        : null,
    [version, updateInfo, staged, timeline]
  )

  const pct = updateProgress ? Math.round(updateProgress.percent) : 0

  const selectedHtml = useMemo(
    () => (selected?.body?.trim() ? renderMarkdown(selected.body) : null),
    [selected]
  )
  const newerHtml = useMemo(
    () => (newer?.notes?.trim() ? renderMarkdown(newer.notes) : null),
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
          <div className="changelog-header-actions">
            {source === 'live' ? (
              <button
                type="button"
                className="changelog-source changelog-source-live changelog-source-btn"
                title={t('changelog.openLatest')}
                onClick={() => void window.api.openExternal(latestUrl)}
              >
                <Github size={12} /> {t('changelog.live')}
              </button>
            ) : (
              <span className={`changelog-source changelog-source-${source}`}>
                {source === 'loading' && (
                  <>
                    <RefreshCw size={12} className="spin" /> {t('changelog.checking')}
                  </>
                )}
                {source === 'bundled' && t('changelog.bundled')}
              </span>
            )}
            <button
              type="button"
              className="changelog-source changelog-source-btn"
              title={t('changelog.licensesTitle')}
              onClick={() => useSettingsStore.getState().openPageTab({ type: 'licenses' })}
            >
              <Scale size={12} /> {t('changelog.licenses')}
            </button>
          </div>
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
                <strong>
                  {updateStatus === 'downloaded'
                    ? t('update.downloaded.title')
                    : t('update.available.title')}
                </strong>
                <span className="changelog-update-version">v{newer.version}</span>
              </div>
              {updateStatus === 'downloaded' ? (
                <button className="update-btn update-btn-primary" onClick={install}>
                  <RotateCw size={13} /> {t('update.restart')}
                </button>
              ) : updateStatus === 'downloading' ? (
                <button className="update-btn update-btn-primary" disabled>
                  {interp(t('update.downloadingPct'), { pct: String(pct) })}
                </button>
              ) : (
                <button className="update-btn update-btn-primary" onClick={download}>
                  <Download size={13} /> {supported ? t('update.download') : t('update.getIt')}
                </button>
              )}
            </div>
            {newer.supersedes && (
              <p className="changelog-update-note">
                {interp(t('update.superseded'), { staged: newer.supersedes })}
              </p>
            )}
            {newer.aheadOnGitHub && (
              <FeedBehindNote release={newer.aheadOnGitHub} />
            )}
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

/** GitHub has a release the update feed is not serving yet. Its own component
 *  so the link keeps a narrowed, non-null release without an assertion. */
function FeedBehindNote({ release }: { release: ReleaseRef }): React.JSX.Element {
  const t = useT()
  return (
    <p className="changelog-update-note">
      {interp(t('update.feedBehind'), { latest: stripV(release.tag) })}{' '}
      <button
        type="button"
        className="changelog-update-link"
        onClick={() => void window.api.openExternal(release.url)}
      >
        {t('update.openGithub')}
      </button>
    </p>
  )
}
