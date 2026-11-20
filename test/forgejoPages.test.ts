import { describe, expect, it } from 'vitest'
import { forgejoPages, type FjPage } from '../src/main/forgejo'

/** A server holding `count` items, serving `cap` per page, with or without X-Total-Count. */
function server(count: number, cap: number, withTotal: boolean): { fetchPage: (page: number) => Promise<FjPage<number>>; calls: number[] } {
  const calls: number[] = []
  const all = Array.from({ length: count }, (_, i) => i)
  return {
    calls,
    fetchPage: async (page) => {
      calls.push(page)
      const items = all.slice((page - 1) * cap, page * cap)
      return withTotal ? { items, total: count } : { items }
    }
  }
}

describe('forgejoPages', () => {
  it('stops exactly at the reported total, without an extra request', async () => {
    const s = server(7, 50, true)
    expect(await forgejoPages(s.fetchPage)).toHaveLength(7)
    expect(s.calls).toEqual([1])
    const t = server(120, 50, true)
    expect(await forgejoPages(t.fetchPage)).toHaveLength(120)
    expect(t.calls).toEqual([1, 2, 3])
  })

  it('keeps going when the server caps pages below the asked limit', async () => {
    // MAX_RESPONSE_ITEMS = 30: every full page is 30, shorter than the 50 asked for.
    const s = server(75, 30, false)
    expect(await forgejoPages(s.fetchPage)).toEqual(Array.from({ length: 75 }, (_, i) => i))
    expect(s.calls).toEqual([1, 2, 3])
  })

  it('ends on an empty page when the total is an exact multiple of the page size', async () => {
    const s = server(60, 30, false)
    expect(await forgejoPages(s.fetchPage)).toHaveLength(60)
    expect(s.calls).toEqual([1, 2, 3])
  })

  it('handles an empty list and stops at maxPages', async () => {
    expect(await forgejoPages(server(0, 50, true).fetchPage)).toEqual([])
    const s = server(1000, 10, false)
    expect(await forgejoPages(s.fetchPage, 3)).toHaveLength(30)
  })

  it('does not loop on a total that over-reports', async () => {
    const s = server(5, 50, false)
    const lying = async (page: number): Promise<FjPage<number>> => ({ ...(await s.fetchPage(page)), total: 500 })
    expect(await forgejoPages(lying)).toHaveLength(5)
    expect(s.calls).toEqual([1, 2])
  })
})
