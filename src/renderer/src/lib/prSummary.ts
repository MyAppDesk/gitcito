import type { PrCheck, PrDetail, PrReview } from '../../../shared/types'

/** Where one reviewer stands on a pull request. */
export type ReviewerState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING'

export interface ReviewerRow {
  login: string
  state: ReviewerState
  team?: boolean
}

/**
 * One row per reviewer, the way the hosts present it.
 *
 * A reviewer's *latest* decisive review counts: an approval after a change
 * request supersedes it, and a plain comment never overrides a decision. A
 * dismissed review no longer counts at all. Anyone asked to review who has not
 * answered is pending. The author reviewing their own PR (a reply) is left out.
 */
export function reviewerStates(pr: Pick<PrDetail, 'author' | 'reviews' | 'requestedReviewers'>): ReviewerRow[] {
  const decided = new Map<string, ReviewerState>()
  const commented = new Set<string>()
  for (const r of pr.reviews as PrReview[]) {
    if (r.author === pr.author) continue
    if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') decided.set(r.author, r.state)
    else if (r.state === 'DISMISSED') decided.delete(r.author)
    else if (r.state === 'COMMENTED') commented.add(r.author)
  }
  const rows: ReviewerRow[] = []
  const listed = new Set<string>()
  // Asked and not yet answered: the host re-requests after new commits, so a
  // pending request outranks an older review from the same person.
  for (const p of pr.requestedReviewers ?? []) {
    rows.push({ login: p.login, state: 'PENDING', ...(p.team ? { team: true } : {}) })
    listed.add(p.login)
  }
  for (const [login, state] of decided) if (!listed.has(login)) (rows.push({ login, state }), listed.add(login))
  for (const login of commented) if (!listed.has(login)) rows.push({ login, state: 'COMMENTED' })
  const order: Record<ReviewerState, number> = { CHANGES_REQUESTED: 0, APPROVED: 1, COMMENTED: 2, PENDING: 3 }
  return rows.sort((a, b) => order[a.state] - order[b.state])
}

/** Everyone who took part, in order of first appearance, author first. */
export function participants(pr: PrDetail): string[] {
  const out: string[] = []
  const add = (login: string | null | undefined): void => {
    if (login && login !== 'unknown' && !out.includes(login)) out.push(login)
  }
  add(pr.author)
  pr.comments.forEach((c) => add(c.author))
  pr.reviews.forEach((r) => add(r.author))
  pr.reviewThreads.forEach((th) => th.comments.forEach((c) => add(c.author)))
  add(pr.mergedBy)
  return out
}

export type CheckState = 'pass' | 'fail' | 'pending' | 'neutral'

export function checkState(c: PrCheck): CheckState {
  if (c.status !== 'completed') return 'pending'
  if (c.conclusion === 'success') return 'pass'
  if (c.conclusion === 'failure' || c.conclusion === 'timed_out' || c.conclusion === 'action_required') return 'fail'
  return 'neutral'
}

export function checkCounts(checks: PrCheck[]): Record<CheckState, number> {
  const out: Record<CheckState, number> = { pass: 0, fail: 0, pending: 0, neutral: 0 }
  for (const c of checks) out[checkState(c)]++
  return out
}

/** The state the header pill shows. */
export function prStatus(pr: Pick<PrDetail, 'merged' | 'state' | 'draft'>): 'merged' | 'closed' | 'draft' | 'open' {
  if (pr.merged) return 'merged'
  if (pr.state === 'closed') return 'closed'
  return pr.draft ? 'draft' : 'open'
}

/** A label colour as CSS, or null when the host gave none or an unusable one. */
export function labelColor(color: string | undefined): string | null {
  if (!color) return null
  const hex = color.replace(/^#/, '')
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? `#${hex}` : null
}

/** Black or white text, whichever reads on that background (WCAG relative luminance). */
export function labelTextColor(bg: string): '#000' | '#fff' {
  const hex = bg.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#000' : '#fff'
}
