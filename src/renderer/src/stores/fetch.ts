import { create } from 'zustand'
import {
  circuitOpen,
  dueRepos,
  markAttempt,
  markFailure,
  markSuccess,
  pruneStates,
  resetRepo,
  seedStates,
  trippedRepos,
  type FetchStates
} from '../lib/fetchScheduler'
import { useUIStore } from './ui'
import { t, interp } from '../i18n'

/**
 * Live state of the background fetch scheduler.
 *
 * The policy is pure and lives in `lib/fetchScheduler`; this holds the mutable
 * part and the one side effect worth having — telling the user when a repo has
 * been parked. A repository that quietly stopped fetching is indistinguishable
 * from a repository where nothing is happening, and that is precisely the
 * failure the scheduler exists to avoid.
 *
 * It is a store rather than a ref inside the effect because two other places
 * need to reach it: a manual fetch clears a repo's failure history (the user
 * just did the thing that could have fixed the credentials), and the UI shows
 * which repos are parked.
 */
interface FetchStore {
  states: FetchStates
  /** Repos with a fetch currently in flight — not persisted, just re-entry guard. */
  inFlight: string[]
  /** Repos already announced as parked, so the toast fires once per trip. */
  announced: string[]

  /** Bring the tracked set in line with the repos now in scope, staggering newcomers. */
  seed(paths: string[], periodMs: number): void
  /** Which of `paths` are due right now. */
  due(paths: string[], now: number): string[]
  /** Take a repo's slot before awaiting, so a slow fetch is not re-entered. */
  claim(path: string, periodMs: number): boolean
  /** Record the outcome and release the slot. */
  settle(path: string, ok: boolean, periodMs: number): void
  /** Forget a repo's failures — something the user did may have fixed it. */
  reset(path: string): void
  /** Repos the breaker has parked. */
  tripped(): string[]
}

export const useFetchStore = create<FetchStore>((set, get) => ({
  states: {},
  inFlight: [],
  announced: [],

  seed: (paths, periodMs) =>
    set((s) => ({
      states: seedStates(paths, pruneStates(s.states, paths), Date.now(), periodMs),
      announced: s.announced.filter((p) => paths.includes(p))
    })),

  due: (paths, now) => {
    const { states, inFlight } = get()
    return dueRepos(paths, states, now).filter((p) => !inFlight.includes(p))
  },

  claim: (path, periodMs) => {
    if (get().inFlight.includes(path)) return false
    set((s) => ({
      states: markAttempt(s.states, path, Date.now(), periodMs),
      inFlight: [...s.inFlight, path]
    }))
    return true
  },

  settle: (path, ok, periodMs) => {
    const now = Date.now()
    set((s) => ({
      states: ok ? markSuccess(s.states, path, now, periodMs) : markFailure(s.states, path, now, periodMs),
      inFlight: s.inFlight.filter((p) => p !== path)
    }))
    // Announce the trip once. Silence here is the failure mode: a repo that
    // stopped fetching looks exactly like a repo where nothing is happening.
    const s = get()
    if (!ok && circuitOpen(s.states[path]) && !s.announced.includes(path)) {
      set({ announced: [...s.announced, path] })
      useUIStore
        .getState()
        .toast('info', interp(t('fetchSched.parked'), { repo: path.split('/').pop() ?? path }), { repoPath: path })
    }
  },

  reset: (path) =>
    set((s) => ({
      states: resetRepo(s.states, path, Date.now()),
      announced: s.announced.filter((p) => p !== path)
    })),

  tripped: () => trippedRepos(get().states)
}))
