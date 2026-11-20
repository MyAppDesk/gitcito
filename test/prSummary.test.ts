import { prRemoteIdentity } from '../src/renderer/src/lib/hosting'
import { describe, it, expect } from 'vitest'
import {
  checkCounts,
  labelColor,
  labelTextColor,
  participants,
  prStatus,
  reviewerStates
} from '../src/renderer/src/lib/prSummary'
import type { PrDetail } from '../src/shared/types'

const base: PrDetail = {
  number: 1,
  title: 't',
  body: '',
  author: 'ana',
  source: 'feat',
  target: 'main',
  draft: false,
  state: 'open',
  merged: false,
  mergeable: true,
  url: '',
  comments: [],
  reviews: [],
  reviewThreads: []
}

describe('reviewerStates', () => {
  it('the latest decision counts, a later comment does not override it', () => {
    const rows = reviewerStates({
      ...base,
      reviews: [
        { author: 'bob', state: 'CHANGES_REQUESTED' },
        { author: 'bob', state: 'APPROVED' },
        { author: 'bob', state: 'COMMENTED' }
      ]
    })
    expect(rows).toEqual([{ login: 'bob', state: 'APPROVED' }])
  })

  it('a dismissed review no longer counts; a comment alone shows as commented', () => {
    const rows = reviewerStates({
      ...base,
      reviews: [
        { author: 'bob', state: 'APPROVED' },
        { author: 'bob', state: 'DISMISSED' },
        { author: 'cy', state: 'COMMENTED' }
      ]
    })
    expect(rows).toEqual([{ login: 'cy', state: 'COMMENTED' }])
  })

  it('a re-requested reviewer is pending, teams included; the author is left out', () => {
    const rows = reviewerStates({
      ...base,
      reviews: [
        { author: 'bob', state: 'APPROVED' },
        { author: 'ana', state: 'COMMENTED' },
        { author: 'dee', state: 'CHANGES_REQUESTED' }
      ],
      requestedReviewers: [{ login: 'bob' }, { login: 'org/core', team: true }]
    })
    expect(rows).toEqual([
      { login: 'dee', state: 'CHANGES_REQUESTED' },
      { login: 'bob', state: 'PENDING' },
      { login: 'org/core', state: 'PENDING', team: true }
    ])
  })
})

describe('participants', () => {
  it('lists everyone once, author first', () => {
    expect(
      participants({
        ...base,
        comments: [{ author: 'bob', body: '', createdAt: '' }, { author: 'ana', body: '', createdAt: '' }],
        reviews: [{ author: 'cy', state: 'APPROVED' }],
        reviewThreads: [{ path: 'a', line: 1, diffHunk: '', rootId: 1, comments: [{ id: 1, author: 'dee', body: '', createdAt: '' }] }],
        mergedBy: 'eve'
      })
    ).toEqual(['ana', 'bob', 'cy', 'dee', 'eve'])
  })
})

describe('status, checks and labels', () => {
  it('reads the header state', () => {
    expect(prStatus({ ...base, merged: true, state: 'closed' })).toBe('merged')
    expect(prStatus({ ...base, state: 'closed' })).toBe('closed')
    expect(prStatus({ ...base, draft: true })).toBe('draft')
    expect(prStatus(base)).toBe('open')
  })

  it('counts checks by outcome', () => {
    expect(
      checkCounts([
        { name: 'a', status: 'completed', conclusion: 'success', url: '' },
        { name: 'b', status: 'completed', conclusion: 'failure', url: '' },
        { name: 'c', status: 'in_progress', conclusion: null, url: '' },
        { name: 'd', status: 'completed', conclusion: 'skipped', url: '' }
      ])
    ).toEqual({ pass: 1, fail: 1, pending: 1, neutral: 1 })
  })

  it('accepts GitHub and GitLab colours, rejects anything else, and picks readable text', () => {
    expect(labelColor('d73a4a')).toBe('#d73a4a')
    expect(labelColor('#FFF')).toBe('#FFF')
    expect(labelColor('red; background: url(x)')).toBeNull()
    expect(labelTextColor('#ffffff')).toBe('#000')
    expect(labelTextColor('#1d1d1d')).toBe('#fff')
  })
})

describe('allPages', () => {
  it('follows pages of 100 until a short one, and stops at the cap', async () => {
    const { allPages } = await import('../src/main/hosting')
    const sizes = [100, 100, 40, 100]
    const seen: number[] = []
    const items = await allPages(async (page) => {
      seen.push(page)
      return Array.from({ length: sizes[page - 1] ?? 0 }, (_, i) => i)
    })
    expect(items).toHaveLength(240)
    expect(seen).toEqual([1, 2, 3])
    const capped = await allPages(async () => Array.from({ length: 100 }, () => 0), 2)
    expect(capped).toHaveLength(200)
  })
})

it('keeps credentials out of saved PR tab identities', () => {
  expect(prRemoteIdentity('https://user:fixture@gitlab.com/group/repo.git?extra=value')).toBe('https://gitlab.com/group/repo.git')
  expect(prRemoteIdentity('git@github.com:team/repo.git')).toBe('git@github.com:team/repo.git')
})

describe('markAwaitingYou', () => {
  it('marks the PRs where you are a pending reviewer, case-insensitively', async () => {
    const { markAwaitingYou } = await import('../src/main/hosting')
    const pr = (id: number, requestedReviewers?: string[]): never =>
      ({ id, title: '', author: 'x', sourceBranch: '', targetBranch: '', url: '', isDraft: false, requestedReviewers }) as never
    const out = markAwaitingYou([pr(1, ['Ana', 'bob']), pr(2, ['bob']), pr(3)], 'ana')
    expect(out.map((p) => !!p.awaitingYou)).toEqual([true, false, false])
    // Without a known login nothing is marked.
    expect(markAwaitingYou([pr(1, ['ana'])], null)[0].awaitingYou).toBeUndefined()
  })
})
