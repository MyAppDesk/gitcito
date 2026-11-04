import type { CiStatus } from '../shared/types'

// Every commit the graph shows asks GitHub for its checks, and on a repo
// without CI most commits answer "no checks". Not remembering that answer
// re-asked for all 40 visible commits every minute, which spent the account's
// whole 5,000-an-hour API allowance. So every answer is remembered, and how
// long depends on how likely it is to change.

/** What one commit's checks looked like when GitHub was last asked. */
export type CiLookup = { kind: 'found'; status: CiStatus } | { kind: 'none' } | { kind: 'failed' }

export interface CiCacheEntry {
  lookup: CiLookup
  checkedAt: number
  /** Lookups in a row that came back empty or failed; drives the backoff. */
  misses: number
}

/** Running checks: under the graph's one-minute poll, so each tick re-asks. */
export const CI_PENDING_RECHECK_MS = 45_000
/** Finished checks only change on a re-run. */
export const CI_SETTLED_RECHECK_MS = 10 * 60_000
/** No checks (yet): a just-pushed commit gets them within minutes, so start short. */
export const CI_MISS_FIRST_RECHECK_MS = 2 * 60_000
/** An old commit that never had CI is asked about at most once an hour. */
export const CI_MISS_MAX_RECHECK_MS = 60 * 60_000
/** Enough for every open repo's visible commits; the oldest answers go first. */
export const CI_CACHE_MAX_ENTRIES = 5000

export function ciRecheckAfter(entry: CiCacheEntry): number {
  const backoff =
    entry.misses > 0 ? Math.min(CI_MISS_FIRST_RECHECK_MS * 2 ** (entry.misses - 1), CI_MISS_MAX_RECHECK_MS) : 0
  if (entry.lookup.kind !== 'found') return backoff
  // Known checks whose lookups keep failing back off too, not every 45 seconds.
  const window = entry.lookup.status.state === 'pending' ? CI_PENDING_RECHECK_MS : CI_SETTLED_RECHECK_MS
  return Math.max(window, backoff)
}

export function isCiEntryFresh(entry: CiCacheEntry | undefined, now: number): boolean {
  return !!entry && now - entry.checkedAt < ciRecheckAfter(entry)
}

/** The entry a new lookup leaves behind, carrying the miss streak forward. */
export function nextCiEntry(previous: CiCacheEntry | undefined, lookup: CiLookup, now: number): CiCacheEntry {
  if (lookup.kind === 'found') return { lookup, checkedAt: now, misses: 0 }
  const misses = (previous?.misses ?? 0) + 1
  // A failed lookup says nothing new about the commit: keep the checks we knew.
  if (lookup.kind === 'failed' && previous?.lookup.kind === 'found') {
    return { lookup: previous.lookup, checkedAt: now, misses }
  }
  return { lookup, checkedAt: now, misses }
}

/** GitHub's documented minimum wait after a secondary limit that names no time. */
export const CI_SECONDARY_LIMIT_PAUSE_MS = 60_000

/**
 * When GitHub says to stop, the time to wait until before the next lookup:
 * `retry-after` seconds (secondary limit), `x-ratelimit-reset` epoch seconds
 * once `x-ratelimit-remaining` hits 0, or a minute for any other limit answer:
 * a 429, a 403 whose body names a rate limit (`limited`; GitHub's secondary
 * limit keeps hourly allowance left) or a 403 without limit headers. Null when
 * the response leaves room. Any other 403 is an access answer, not a limit.
 */
export function rateLimitPauseUntil(
  res: {
    status: number
    remaining: string | null
    reset: string | null
    retryAfter: string | null
    limited: boolean
  },
  now: number
): number | null {
  const retryAfter = Number(res.retryAfter)
  if (res.retryAfter && Number.isFinite(retryAfter) && retryAfter > 0) return now + retryAfter * 1000
  if (res.remaining === '0') {
    const reset = Number(res.reset)
    return res.reset && Number.isFinite(reset) && reset > 0 ? reset * 1000 : now + CI_SECONDARY_LIMIT_PAUSE_MS
  }
  const bareLimit = res.status === 429 || (res.status === 403 && (res.limited || res.remaining === null))
  return bareLimit ? now + CI_SECONDARY_LIMIT_PAUSE_MS : null
}

/** Stores an answer as the newest entry, dropping the oldest past the cap. */
export function rememberCiEntry(cache: Map<string, CiCacheEntry>, key: string, entry: CiCacheEntry): void {
  cache.delete(key)
  cache.set(key, entry)
  for (const oldest of cache.keys()) {
    if (cache.size <= CI_CACHE_MAX_ENTRIES) break
    cache.delete(oldest)
  }
}

/** A body that says it is a rate-limit answer, primary or secondary. */
export function mentionsRateLimit(body: string): boolean {
  return /rate limit/i.test(body)
}
