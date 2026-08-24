import type { TranslationKey } from '../i18n'

/**
 * A "how long ago" label as a dictionary key plus its variables, rather than
 * finished text. The caller renders it, so the label follows a language switch
 * instead of freezing at whatever was active when it was computed.
 */
export interface TimeAgo {
  key: TranslationKey
  n: number
}

/** Past this, the age is worth saying out loud rather than only on hover. */
export const STALE_AFTER_MS = 15 * 60 * 1000

/** Null for a timestamp we do not have — "never" is the caller's word to pick. */
export function timeAgo(at: number | null, now: number): TimeAgo | null {
  if (!at) return null
  // A clock that jumped backwards should read as "now", not as a negative age.
  const secs = Math.max(0, (now - at) / 1000)
  if (secs < 10) return { key: 'time.justNow', n: 0 }
  if (secs < 60) return { key: 'time.secondsAgo', n: Math.floor(secs) }
  if (secs < 3600) return { key: 'time.minutesAgo', n: Math.floor(secs / 60) }
  if (secs < 86400) return { key: 'time.hoursAgo', n: Math.floor(secs / 3600) }
  return { key: 'time.daysAgo', n: Math.floor(secs / 86400) }
}

/** Whether an age has crossed the threshold that earns it a visible label. */
export function isStale(at: number | null, now: number): boolean {
  return at !== null && now - at >= STALE_AFTER_MS
}
