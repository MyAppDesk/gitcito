import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CI_CACHE_MAX_ENTRIES,
  CI_MISS_FIRST_RECHECK_MS,
  CI_MISS_MAX_RECHECK_MS,
  CI_PENDING_RECHECK_MS,
  CI_SECONDARY_LIMIT_PAUSE_MS,
  CI_SETTLED_RECHECK_MS,
  type CiCacheEntry,
  ciRecheckAfter,
  isCiEntryFresh,
  nextCiEntry,
  rateLimitPauseUntil,
  rememberCiEntry
} from '../src/main/ciCache'
import { fetchCiStatuses } from '../src/main/hosting'

const REMOTE = 'https://github.com/acme/widget.git'
const SHAS = ['a1', 'b2', 'c3']

function checkRuns(runs: Array<{ status: string; conclusion: string | null }>): Response {
  const check_runs = runs.map((r, i) => ({ name: `job ${i}`, html_url: 'https://x', ...r }))
  return new Response(JSON.stringify({ check_runs }), { status: 200 })
}

describe('ciRecheckAfter', () => {
  const found = (state: 'pending' | 'success'): CiCacheEntry => ({
    lookup: { kind: 'found', status: { state, jobs: [] } },
    checkedAt: 0,
    misses: 0
  })

  it('re-asks running checks within the graph poll, finished ones rarely', () => {
    expect(ciRecheckAfter(found('pending'))).toBe(CI_PENDING_RECHECK_MS)
    expect(CI_PENDING_RECHECK_MS).toBeLessThan(60_000)
    expect(ciRecheckAfter(found('success'))).toBe(CI_SETTLED_RECHECK_MS)
  })

  it('backs off commits without checks, capped at an hour', () => {
    let entry: CiCacheEntry | undefined
    const waits: number[] = []
    for (let i = 0; i < 10; i++) {
      entry = nextCiEntry(entry, { kind: 'none' }, 0)
      waits.push(ciRecheckAfter(entry))
    }
    expect(waits[0]).toBe(CI_MISS_FIRST_RECHECK_MS)
    expect(waits[1]).toBe(CI_MISS_FIRST_RECHECK_MS * 2)
    expect(waits.at(-1)).toBe(CI_MISS_MAX_RECHECK_MS)
  })

  it('resets the backoff once checks appear', () => {
    const miss = nextCiEntry(nextCiEntry(undefined, { kind: 'none' }, 0), { kind: 'failed' }, 0)
    expect(miss.misses).toBe(2)
    const hit = nextCiEntry(miss, { kind: 'found', status: { state: 'success', jobs: [] } }, 0)
    expect(hit.misses).toBe(0)
  })

  it('keeps known checks through a failed lookup', () => {
    const status = { state: 'success' as const, jobs: [] }
    const found = nextCiEntry(undefined, { kind: 'found', status }, 0)
    const after = nextCiEntry(found, { kind: 'failed' }, 10)
    expect(after.lookup).toEqual({ kind: 'found', status })
    expect(after.checkedAt).toBe(10)
    expect(after.misses).toBe(1)
  })

  it('backs off known checks whose lookups keep failing', () => {
    const pending = { kind: 'found' as const, status: { state: 'pending' as const, jobs: [] } }
    let entry = nextCiEntry(undefined, pending, 0)
    for (let i = 0; i < 3; i++) entry = nextCiEntry(entry, { kind: 'failed' }, 0)
    expect(entry.lookup).toEqual(pending)
    expect(ciRecheckAfter(entry)).toBe(CI_MISS_FIRST_RECHECK_MS * 4)
  })

  it('treats an entry as fresh only inside its window', () => {
    const entry = nextCiEntry(undefined, { kind: 'none' }, 1000)
    expect(isCiEntryFresh(entry, 1000 + CI_MISS_FIRST_RECHECK_MS - 1)).toBe(true)
    expect(isCiEntryFresh(entry, 1000 + CI_MISS_FIRST_RECHECK_MS)).toBe(false)
    expect(isCiEntryFresh(undefined, 0)).toBe(false)
  })
})

describe('rateLimitPauseUntil', () => {
  it('pauses until the reset when the allowance is spent', () => {
    expect(rateLimitPauseUntil({ limited: false, status: 403, remaining: '0', reset: '2000', retryAfter: null }, 0)).toBe(2_000_000)
  })
  it('honours retry-after from a secondary limit', () => {
    expect(rateLimitPauseUntil({ limited: false, status: 403, remaining: '40', reset: '9999', retryAfter: '30' }, 1000)).toBe(31_000)
  })
  it('does not pause while there is room', () => {
    expect(rateLimitPauseUntil({ limited: false, status: 200, remaining: '4999', reset: '2000', retryAfter: null }, 0)).toBeNull()
    expect(rateLimitPauseUntil({ limited: false, status: 404, remaining: null, reset: null, retryAfter: null }, 0)).toBeNull()
    // No access to the repo: a 403 with allowance left is not a limit.
    expect(rateLimitPauseUntil({ limited: false, status: 403, remaining: '4000', reset: '2000', retryAfter: null }, 0)).toBeNull()
  })
  it('pauses for a secondary limit that still has hourly allowance left', () => {
    const answer = { limited: true, status: 403, remaining: '4000', reset: '2000', retryAfter: null }
    expect(rateLimitPauseUntil(answer, 5)).toBe(5 + CI_SECONDARY_LIMIT_PAUSE_MS)
  })
  it('waits a minute on a limit answer that names no time', () => {
    const minute = CI_SECONDARY_LIMIT_PAUSE_MS
    expect(rateLimitPauseUntil({ limited: false, status: 429, remaining: null, reset: null, retryAfter: null }, 5)).toBe(5 + minute)
    expect(rateLimitPauseUntil({ limited: false, status: 403, remaining: null, reset: null, retryAfter: null }, 5)).toBe(5 + minute)
  })
})

describe('rememberCiEntry', () => {
  it('drops the oldest entries past the cap', () => {
    const cache = new Map<string, CiCacheEntry>()
    const entry = nextCiEntry(undefined, { kind: 'none' }, 0)
    for (let i = 0; i < CI_CACHE_MAX_ENTRIES + 5; i++) rememberCiEntry(cache, `k${i}`, entry)
    expect(cache.size).toBe(CI_CACHE_MAX_ENTRIES)
    expect(cache.has('k0')).toBe(false)
    expect(cache.has(`k${CI_CACHE_MAX_ENTRIES + 4}`)).toBe(true)
  })
})

describe('fetchCiStatuses', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  // Each test uses its own token: a new credential starts the cache over.
  it('asks once about commits without checks, not on every poll', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(async () => checkRuns([]))
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchCiStatuses(REMOTE, SHAS, 'token-none')).toEqual({})
    expect(fetchMock).toHaveBeenCalledTimes(3)
    vi.setSystemTime(60_000)
    await fetchCiStatuses(REMOTE, SHAS, 'token-none')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    vi.setSystemTime(CI_MISS_FIRST_RECHECK_MS)
    await fetchCiStatuses(REMOTE, SHAS, 'token-none')
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('serves finished checks from the cache and re-asks running ones each minute', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('/a1/')
        ? checkRuns([{ status: 'in_progress', conclusion: null }])
        : checkRuns([{ status: 'completed', conclusion: 'success' }])
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchCiStatuses(REMOTE, SHAS, 'token-mixed')
    expect(first.a1?.state).toBe('pending')
    expect(first.b2?.state).toBe('success')
    vi.setSystemTime(60_000)
    const second = await fetchCiStatuses(REMOTE, SHAS, 'token-mixed')
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(second.b2?.state).toBe('success')
  })

  it('stops asking once GitHub says the allowance is spent', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(
      async () =>
        new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '3600' } })
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchCiStatuses(REMOTE, ['a1'], 'token-limited')
    vi.setSystemTime(CI_MISS_MAX_RECHECK_MS - 1)
    await fetchCiStatuses(REMOTE, ['b2', 'c3'], 'token-limited')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps one cache per credential, so switching profiles does not start over', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(async () => checkRuns([]))
    vi.stubGlobal('fetch', fetchMock)

    for (const token of ['token-profile-a', 'token-profile-b', 'token-profile-a', 'token-profile-b']) {
      await fetchCiStatuses(REMOTE, SHAS, token)
    }
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('stops a batch at the first limit answer instead of sending every request', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(async () => new Response('{}', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const many = Array.from({ length: 40 }, (_, i) => `sha${i}`)
    await fetchCiStatuses(REMOTE, many, 'token-burst')
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('shares a lookup already under way instead of repeating it', async () => {
    vi.useFakeTimers({ now: 0 })
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const fetchMock = vi.fn(async () => {
      await gate
      return checkRuns([{ status: 'completed', conclusion: 'success' }])
    })
    vi.stubGlobal('fetch', fetchMock)

    const graph = fetchCiStatuses(REMOTE, ['a1'], 'token-overlap')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const prList = fetchCiStatuses(REMOTE, ['a1'], 'token-overlap')
    release()
    const [fromGraph, fromPrList] = await Promise.all([graph, prList])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fromGraph.a1?.state).toBe('success')
    expect(fromPrList.a1?.state).toBe('success')
  })

  it('shares a whole queued batch with an overlapping call', async () => {
    vi.useFakeTimers({ now: 0 })
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const fetchMock = vi.fn(async () => {
      await gate
      return checkRuns([{ status: 'completed', conclusion: 'success' }])
    })
    vi.stubGlobal('fetch', fetchMock)

    const twenty = Array.from({ length: 20 }, (_, i) => `sha${i}`)
    const graph = fetchCiStatuses(REMOTE, twenty, 'token-batch-overlap')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const prList = fetchCiStatuses(REMOTE, twenty, 'token-batch-overlap')
    release()
    const [, fromPrList] = await Promise.all([graph, prList])
    expect(fetchMock).toHaveBeenCalledTimes(20)
    expect(Object.keys(fromPrList)).toHaveLength(20)
  })

  it('stops at a secondary-limit 403 that still reports allowance', async () => {
    vi.useFakeTimers({ now: 0 })
    const fetchMock = vi.fn(
      async () =>
        new Response('{"message":"You have exceeded a secondary rate limit."}', {
          status: 403,
          headers: { 'x-ratelimit-remaining': '4200', 'x-ratelimit-reset': '9999' }
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const many = Array.from({ length: 40 }, (_, i) => `sha${i}`)
    await fetchCiStatuses(REMOTE, many, 'token-secondary')
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('keeps a known badge through a failed lookup', async () => {
    vi.useFakeTimers({ now: 0 })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => checkRuns([{ status: 'completed', conclusion: 'success' }]))
    )
    await fetchCiStatuses(REMOTE, ['a1'], 'token-keep')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('oops', { status: 502 }))
    )
    vi.setSystemTime(CI_SETTLED_RECHECK_MS)
    const after = await fetchCiStatuses(REMOTE, ['a1'], 'token-keep')
    expect(after.a1?.state).toBe('success')
  })
})
