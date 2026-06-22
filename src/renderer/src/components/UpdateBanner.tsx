import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Download, X, RotateCw, CheckCircle2 } from 'lucide-react'
import { useUpdatesStore } from '../stores/updates'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'

/** Floating "new version available" card, bottom-right above the status bar.
 *  Drives the whole update flow: download → progress → restart to install.
 *  In dev / unpackaged builds the download button opens the release page. */
export function UpdateBanner(): React.JSX.Element {
  const t = useT()
  const status = useUpdatesStore((s) => s.status)
  const info = useUpdatesStore((s) => s.info)
  const progress = useUpdatesStore((s) => s.progress)
  const supported = useUpdatesStore((s) => s.supported)
  const dismissed = useUpdatesStore((s) => s.dismissed)
  const download = useUpdatesStore((s) => s.download)
  const install = useUpdatesStore((s) => s.install)
  const dismissBanner = useUpdatesStore((s) => s.dismiss)
  const skip = useUpdatesStore((s) => s.skip)
  const skippedVersion = useSettingsStore((s) => s.settings.skippedUpdateVersion)
  const openChangelog = useSettingsStore((s) => s.openPageTab)

  const active = status === 'available' || status === 'downloading' || status === 'downloaded'
  const show = active && !dismissed && !!info && info.version !== skippedVersion

  const pct = progress ? Math.round(progress.percent) : 0

  return (
    <AnimatePresence>
      {show && info && (
        <motion.div
          className="update-banner"
          role="dialog"
          aria-label={t('update.available.title')}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        >
          <button className="update-banner-close" onClick={dismissBanner} title={t('update.later')}>
            <X size={14} />
          </button>

          <div className="update-banner-head">
            <span className="update-banner-icon">
              {status === 'downloaded' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
            </span>
            <div className="update-banner-text">
              <strong>
                {status === 'downloaded'
                  ? t('update.downloaded.title')
                  : t('update.available.title')}
              </strong>
              <span className="update-banner-version">v{info.version}</span>
            </div>
          </div>

          <p className="update-banner-sub">
            {status === 'downloaded'
              ? t('update.downloaded.sub')
              : status === 'downloading'
                ? t('update.downloading')
                : t('update.available.sub')}
          </p>

          {status === 'downloading' && (
            <div className="update-banner-progress">
              <div className="update-banner-bar">
                <motion.span
                  className="update-banner-fill"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
              <span className="update-banner-pct">{pct}%</span>
            </div>
          )}

          <div className="update-banner-actions">
            {status === 'downloaded' ? (
              <button className="update-btn update-btn-primary" onClick={install}>
                <RotateCw size={13} /> {t('update.restart')}
              </button>
            ) : status === 'downloading' ? (
              <button className="update-btn update-btn-primary" disabled>
                {t('update.downloading')}
              </button>
            ) : (
              <button className="update-btn update-btn-primary" onClick={download}>
                <Download size={13} /> {supported ? t('update.download') : t('update.getIt')}
              </button>
            )}

            <button
              className="update-btn update-btn-ghost"
              onClick={() => openChangelog({ type: 'changelog' })}
            >
              {t('update.whatsNew')}
            </button>
          </div>

          {status !== 'downloaded' && (
            <button className="update-banner-skip" onClick={skip}>
              {t('update.skip')}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
