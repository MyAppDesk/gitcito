import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettingsStore } from '../stores/settings'
import { useHackStore } from '../stores/hack'
import { hackClock } from '../lib/hackSession'
import { useT, interp } from '../i18n'

/**
 * The full-window part of hack mode's look: the side rails and the celebration.
 *
 * It sits above everything as a `pointer-events: none` layer, so it can be as
 * loud as it likes without ever standing between the user and a button. That is
 * what lets the rule hold — motion is allowed to be everywhere *visually* while
 * the working surfaces themselves (diff, staging, conflicts, graph) never move
 * a pixel. Nothing here re-renders the app underneath it.
 *
 * Everything is skipped outright at `calm` and `off`, and by
 * `prefers-reduced-motion`. It is not animated to zero — it is not mounted.
 */

/** Live OS reduced-motion preference. */
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

/** Fixed rail geometry — the streaks are staggered by index, not randomised, so
 *  they do not resample on every render and jitter. */
const RAIL_STREAKS = [0, 1, 2, 3, 4, 5, 6, 7]

export function HackOverlay(): React.JSX.Element | null {
  const t = useT()
  const session = useSettingsStore((s) => s.settings.hackSession)
  const celebration = useHackStore((s) => s.celebration)
  const clearCelebration = useHackStore((s) => s.clearCelebration)
  const stats = useHackStore((s) => s.stats)
  const reduced = usePrefersReducedMotion()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!celebration) return
    const id = setTimeout(() => clearCelebration(), reduced ? 350 : 1250)
    return () => clearTimeout(id)
  }, [celebration, clearCelebration, reduced])

  const phase = useMemo(() => (session ? hackClock(session, now).phase : null), [session, now])

  // A session always looks like one. The only thing that turns this off is
  // the OS asking for reduced motion, which is a guarantee rather than a taste.
  if (!session || reduced) return null

  // The rails read the clock: they drift while there is time, run harder in the
  // freeze, and turn red once the deadline has passed. The intensity is the
  // information — you can tell where the session is without reading the number.
  const intensity = phase === 'overtime' ? 'over' : phase === 'freeze' ? 'freeze' : 'run'
  const combo = celebration?.combo ?? 0

  return (
    <div className={`hack-overlay hack-overlay--${intensity}`} aria-hidden="true">
      {/* Side rails: vertical action lines down both edges of the window. */}
      <div className="hack-rail hack-rail--left">
        {RAIL_STREAKS.map((i) => (
          <span key={i} className="hack-streak" style={{ animationDelay: `${i * 0.42}s` }} />
        ))}
      </div>
      <div className="hack-rail hack-rail--right">
        {RAIL_STREAKS.map((i) => (
          <span key={i} className="hack-streak" style={{ animationDelay: `${i * 0.37 + 0.2}s` }} />
        ))}
      </div>

      {/* A standing combo badge — visible between celebrations, so the streak is
          something you are holding rather than something you glimpsed. */}
      <AnimatePresence>
        {stats.combo > 1 && !celebration && (
          <motion.div
            className="hack-combo-standing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <span className="hack-combo-x">×{stats.combo}</span>
            <span className="hack-combo-label">{t('hack.combo')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The celebration itself. Brief, loud, and gone. */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.at}
            className={`hack-cel hack-cel--${celebration.kind}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            {/* Converging speed lines — the anime "impact" frame. */}
            <div className="hack-impact">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className="hack-impact-line" style={{ transform: `rotate(${i * (360 / 14)}deg)` }} />
              ))}
            </div>
            <motion.div
              className="hack-cel-core"
              initial={{ scale: 0.5, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.25, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 460, damping: 18 }}
            >
              <span className="hack-cel-word">
                {celebration.kind === 'push'
                  ? t('hack.burstPush')
                  : celebration.kind === 'merge'
                    ? t('hack.burstMerge')
                    : t('hack.burstCommit')}
              </span>
              {combo > 1 && (
                <motion.span
                  className="hack-cel-combo"
                  initial={{ scale: 0.4, rotate: -8 }}
                  animate={{ scale: 1, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 620, damping: 14, delay: 0.06 }}
                >
                  {interp(t('hack.comboX'), { n: String(combo) })}
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
