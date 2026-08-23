import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Flame, GitPullRequestArrow, Snowflake, Timer, Users, X, Zap } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useHackStore } from '../stores/hack'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { formatCountdown, hackClock } from '../lib/hackSession'
import { useT, interp } from '../i18n'

/**
 * The one place hack mode is allowed to move.
 *
 * The rule the whole visual layer is built on: motion lives on celebration and
 * status surfaces — this banner, the burst on a push, the counters — and
 * nowhere near the surfaces people work in. A diff, the staging list, the
 * conflict resolver and the graph never animate, because at 4am those are
 * precision work and a moving background is an obstacle.
 *
 * `prefers-reduced-motion` collapses `anime` to `calm` here rather than at the
 * setting, so the stored intent survives a user moving between machines with
 * different OS settings.
 */

/** Does this machine want motion at all? Read live — the OS setting can change
 *  while the app is open, and someone toggling it deserves an immediate answer. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (): void => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function HackBanner(): React.JSX.Element | null {
  const t = useT()
  const session = useSettingsStore((s) => s.settings.hackSession)
  const stats = useHackStore((s) => s.stats)
  const alerts = useHackStore((s) => s.alerts)
  const dismissAlert = useHackStore((s) => s.dismissAlert)
  const openModal = useUIStore((s) => s.openModal)
  const repos = useRepoStore((s) => s.repos)
  const reduced = usePrefersReducedMotion()

  // A minute is the finest granularity the countdown shows, so that is how
  // often it needs to re-render. A ticking second counter for 36 hours is a
  // distraction dressed as information.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const clock = useMemo(() => (session ? hackClock(session, now) : null), [session, now])

  // Live totals across the session's repos, straight from what is already
  // loaded — no extra git calls to keep a banner fed.
  const totals = useMemo(() => {
    if (!session) return { ahead: 0, behind: 0, dirty: 0 }
    let ahead = 0
    let behind = 0
    let dirty = 0
    for (const p of session.repos) {
      const r = repos[p]
      if (!r) continue
      // Ahead/behind live on the current local branch, not on the payload.
      const cur = r.branches?.locals.find((b) => b.name === r.branches?.current)
      ahead += cur?.ahead ?? 0
      behind += cur?.behind ?? 0
      dirty += (r.status?.staged.length ?? 0) + (r.status?.unstaged.length ?? 0)
    }
    return { ahead, behind, dirty }
  }, [session, repos])

  if (!session || !clock) return null

  // A session always wears its look; only the OS reduced-motion setting stops
  // the movement, and it stops all of it.
  const motionOn = !reduced
  const phaseClass = `hack-banner--${clock.phase}`

  return (
    <div className={`hack-banner ${phaseClass} ${motionOn ? 'hack-banner--anime' : ''}`}>
      {/* Purely decorative: the moving sheen that makes the mode feel like one.
          Skipped entirely when motion is off, rather than animated to nothing. */}
      {motionOn && <div className="hack-banner-sheen" aria-hidden="true" />}

      <button
        className="hack-banner-name"
        onClick={() => openModal({ kind: 'hack-mode' })}
        title={t('hack.openSettings')}
      >
        {clock.phase === 'freeze' ? <Snowflake size={14} /> : <Flame size={14} />}
        <strong>{session.name}</strong>
      </button>

      <div className="hack-banner-clock" role="timer" aria-live="off">
        <Timer size={13} />
        <span className={clock.phase === 'overtime' ? 'hack-over' : ''}>
          {clock.phase === 'overtime' ? '+' : ''}
          {formatCountdown(clock.remainingMs)}
        </span>
        <div className="hack-progress" aria-hidden="true">
          <div className="hack-progress-fill" style={{ width: `${Math.round(clock.progress * 100)}%` }} />
        </div>
      </div>

      <div className="hack-banner-stats">
        <span title={t('hack.statPushes')}>
          <GitPullRequestArrow size={12} /> {stats.pushes}
        </span>
        <span title={t('hack.statCaught')}>
          <Zap size={12} /> {stats.caught}
        </span>
        <span title={t('hack.statRepos')}>
          <Users size={12} /> {session.repos.length}
        </span>
        {stats.bestCombo > 1 && (
          <span className="hack-best" title={t('hack.statBest')}>
            <Flame size={12} /> ×{stats.bestCombo}
          </span>
        )}
        <span className={totals.behind > 0 ? 'hack-warn' : ''} title={t('hack.statBehind')}>
          ↓{totals.behind}
        </span>
        <span className={totals.ahead > 0 ? 'hack-warn' : ''} title={t('hack.statAhead')}>
          ↑{totals.ahead}
        </span>
      </div>

      {clock.phase === 'freeze' && session.freezeAllowlist.length > 0 && (
        <span className="hack-freeze-chip" title={t('hack.freezeOnHint')}>
          <Snowflake size={11} /> {t('hack.freezeOn')}
        </span>
      )}

      {alerts.length > 0 && (
        <button className="hack-alert-chip" onClick={() => openModal({ kind: 'hack-alerts' })}>
          <AlertTriangle size={12} /> {interp(t('hack.alertCount'), { n: String(alerts.length) })}
        </button>
      )}

      {/* Most recent alert inline, so the common case needs no click. */}
      <AnimatePresence>
        {alerts[0] && (
          <motion.div
            key={alerts[0].id}
            className="hack-alert-inline"
            initial={motionOn ? { opacity: 0, y: -6 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -6 } : { opacity: 0 }}
            transition={{ duration: motionOn ? 0.22 : 0 }}
          >
            <span>{alerts[0].message}</span>
            <button onClick={() => dismissAlert(alerts[0].id)} title={t('common.dismiss')}>
              <X size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
