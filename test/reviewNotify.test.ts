import { describe, expect, it } from 'vitest'
import { newlyAwaitingReview, notifiesReviewRequests } from '../src/renderer/src/lib/reviewNotify'
import type { PullRequest } from '../src/shared/types'

const pr = (id: number, awaitingYou = false): PullRequest =>
  ({ id, title: `PR ${id}`, author: 'x', sourceBranch: '', targetBranch: '', url: '', isDraft: false, awaitingYou }) as PullRequest

describe('newlyAwaitingReview', () => {
  it('only remembers on the first look, so a backlog is not announced', () => {
    const first = newlyAwaitingReview(undefined, [pr(1, true), pr(2)])
    expect(first.fresh).toEqual([])
    expect([...first.seen]).toEqual([1])
  })

  it('announces a PR that starts waiting, once', () => {
    const a = newlyAwaitingReview(new Set([1]), [pr(1, true), pr(3, true), pr(4)])
    expect(a.fresh.map((p) => p.id)).toEqual([3])
    const b = newlyAwaitingReview(a.seen, [pr(1, true), pr(3, true)])
    expect(b.fresh).toEqual([])
  })

  it('announces again when a request comes back after being answered', () => {
    const answered = newlyAwaitingReview(new Set([5]), [pr(5)])
    expect(answered.fresh).toEqual([])
    expect(newlyAwaitingReview(answered.seen, [pr(5, true)]).fresh.map((p) => p.id)).toEqual([5])
  })

  it('leaves GitHub to its own inbox', () => {
    expect(notifiesReviewRequests('github')).toBe(false)
    expect(notifiesReviewRequests('gitlab')).toBe(true)
    expect(notifiesReviewRequests('forgejo')).toBe(true)
    expect(notifiesReviewRequests(null)).toBe(false)
  })
})
