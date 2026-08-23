/**
 * Scheduling policy for the background remote fetch.
 *
 * The old scheduler was one `setInterval` firing `fetchAll` on the visible
 * repository. That is fine at a five-minute cadence on one repo and wrong at
 * every other point of the design space: a group tab leaves its other repos
 * stale, every repo ticks on the same edge (six laptops fetching in lockstep),
 * and a repo whose credentials have expired is retried at full rate forever —
 * which, when git falls through to a credential helper, is a password prompt
 * per tick.
 *
 * This module is the policy and holds no timers: a caller passes `now` and gets
 * back plain data. That keeps it testable without faking clocks, which is the
 * whole reason the rules live here rather than inside the effect.
 *
 * Three rules:
 *  • **Stagger** — repos of one tab are spread across the period instead of
 *    all firing on the same edge.
 *  • **Backoff** — a failing repo doubles its wait, capped, so a dead remote
 *    costs one attempt every quarter hour instead of one per tick.
 *  • **Circuit breaker** — after enough consecutive failures a repo stops being
 *    attempted at all until something the user did resets it. This is the guard
 *    against an authentication prompt storm; without it a short interval turns
 *    a locked keychain into an unusable app.
 */

/** Floor for the user-configurable period. Below this the fetches overlap. */
export const MIN_FETCH_SECONDS = 15

/** Ceiling for a backed-off repo's wait. */
export const MAX_BACKOFF_MS = 15 * 60_000

/** Consecutive failures after which a repo is parked until a reset. */
export const CIRCUIT_TRIP_AT = 5

/** Per-repository scheduling state. Serialisable on purpose — it lives in a ref,
 *  and a plain object is what makes the reducer-shaped helpers below testable. */
export interface RepoFetchState {
  /** Consecutive failures; reset to 0 by a success. */
  failures: number
  /** Epoch ms before which this repo must not be attempted again. */
  nextAt: number
}

export type FetchStates = Record<string, RepoFetchState>

/**
 * Where in the period a repo's first attempt lands. Spreading by index rather
 * than randomly keeps the order stable across re-renders — a repo does not jump
 * its slot because the tab list re-rendered.
 */
export function staggerOffset(index: number, count: number, periodMs: number): number {
  if (count <= 1 || periodMs <= 0) return 0
  return Math.round((index % count) * (periodMs / count))
}

/** Wait after `failures` consecutive failures: the period, doubled each time, capped. */
export function backoffMs(failures: number, periodMs: number, cap = MAX_BACKOFF_MS): number {
  if (failures <= 0) return periodMs
  // Cap the exponent before the shift so a long-dead remote cannot overflow.
  const factor = 2 ** Math.min(failures, 10)
  return Math.min(periodMs * factor, cap)
}

/** A repo the breaker has tripped on: never attempted until `resetRepo`. */
export function circuitOpen(state: RepoFetchState | undefined): boolean {
  return !!state && state.failures >= CIRCUIT_TRIP_AT
}

/**
 * Seed state for a set of repos, staggering their first attempts. Repos already
 * carrying state keep it — re-seeding on every tab change would hand a failing
 * remote a clean slate and re-open the prompt storm this is here to prevent.
 */
export function seedStates(paths: string[], states: FetchStates, now: number, periodMs: number): FetchStates {
  const next: FetchStates = {}
  paths.forEach((path, i) => {
    next[path] = states[path] ?? { failures: 0, nextAt: now + staggerOffset(i, paths.length, periodMs) }
  })
  return next
}

/** Repos whose turn has come. Tripped repos are excluded, not merely delayed. */
export function dueRepos(paths: string[], states: FetchStates, now: number): string[] {
  return paths.filter((p) => {
    const s = states[p]
    if (!s) return true
    if (circuitOpen(s)) return false
    return s.nextAt <= now
  })
}

/** Mark an attempt as started so a slow fetch is not re-entered by the next tick. */
export function markAttempt(states: FetchStates, path: string, now: number, periodMs: number): FetchStates {
  const prev = states[path] ?? { failures: 0, nextAt: now }
  return { ...states, [path]: { ...prev, nextAt: now + periodMs } }
}

export function markSuccess(states: FetchStates, path: string, now: number, periodMs: number): FetchStates {
  return { ...states, [path]: { failures: 0, nextAt: now + periodMs } }
}

export function markFailure(states: FetchStates, path: string, now: number, periodMs: number): FetchStates {
  const failures = (states[path]?.failures ?? 0) + 1
  return { ...states, [path]: { failures, nextAt: now + backoffMs(failures, periodMs) } }
}

/** Clear a repo's failure history — the user did something that could have fixed it. */
export function resetRepo(states: FetchStates, path: string, now: number): FetchStates {
  return { ...states, [path]: { failures: 0, nextAt: now } }
}

/** Drop state for repos no longer in scope, so a closed tab stops being tracked. */
export function pruneStates(states: FetchStates, paths: string[]): FetchStates {
  const keep = new Set(paths)
  const next: FetchStates = {}
  for (const [path, s] of Object.entries(states)) if (keep.has(path)) next[path] = s
  return next
}

/** The effective period in ms, honouring the floor. 0 (off) is passed through. */
export function periodMsFor(seconds: number): number {
  if (seconds <= 0) return 0
  return Math.max(seconds, MIN_FETCH_SECONDS) * 1000
}

/** Repos the breaker has parked, for the UI that offers to retry them. */
export function trippedRepos(states: FetchStates): string[] {
  return Object.entries(states)
    .filter(([, s]) => circuitOpen(s))
    .map(([path]) => path)
}
