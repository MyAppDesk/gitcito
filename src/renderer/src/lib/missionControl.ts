import type { RepoPulse } from '../../../shared/types'

/**
 * Ranking for Mission Control: what deserves your attention first across every
 * open repository.
 *
 * The order is deliberate rather than alphabetical — a repo stuck mid-rebase is
 * an emergency, unpushed work is a reminder, and a clean repo is just noise at
 * the bottom of the list.
 */
export type PulseLevel = 'blocked' | 'action' | 'pending' | 'clean'

export interface PulseVerdict {
  level: PulseLevel
  /** Higher sorts first. */
  score: number
  /** Why it is up there, for the row's summary line. */
  reasons: string[]
}

export function pulseVerdict(p: RepoPulse): PulseVerdict {
  const reasons: string[] = []
  let score = 0
  let level: PulseLevel = 'clean'

  if (p.error) {
    return { level: 'blocked', score: 1000, reasons: ['unreadable'] }
  }
  if (p.operation) {
    score += 500
    level = 'blocked'
    reasons.push(`${p.operation} in progress`)
  }
  if (p.conflicted) {
    score += 400 + p.conflicted
    level = 'blocked'
    reasons.push(`${p.conflicted} conflicted`)
  }
  if (p.behind) {
    score += 100 + Math.min(p.behind, 50)
    if (level === 'clean') level = 'action'
    reasons.push(`${p.behind} behind`)
  }
  if (p.ahead) {
    score += 60 + Math.min(p.ahead, 50)
    if (level === 'clean') level = 'action'
    reasons.push(`${p.ahead} to push`)
  }
  const dirty = p.staged + p.unstaged
  if (dirty) {
    score += 30 + Math.min(dirty, 30)
    if (level === 'clean') level = 'pending'
    reasons.push(`${dirty} uncommitted`)
  }
  if (p.untracked) {
    score += 5
    if (level === 'clean') level = 'pending'
    reasons.push(`${p.untracked} untracked`)
  }
  if (p.stashes) {
    score += 3
    reasons.push(`${p.stashes} stashed`)
  }
  // A branch with no upstream can never be pushed by mistake — worth a nudge,
  // but only once everything louder has been dealt with.
  if (!p.upstream && p.branch) {
    score += 2
    reasons.push('no upstream')
  }
  return { level, score, reasons }
}

/** Most urgent first; ties broken by the most recently active repo. */
export function sortPulses(pulses: RepoPulse[]): RepoPulse[] {
  return [...pulses].sort((a, b) => {
    const d = pulseVerdict(b).score - pulseVerdict(a).score
    if (d !== 0) return d
    if (b.lastCommitAt !== a.lastCommitAt) return b.lastCommitAt - a.lastCommitAt
    return a.name.localeCompare(b.name)
  })
}

/** Sort orders the dashboard offers. */
export type PulseSort = 'urgency' | 'name' | 'activity'

/** Sum of a repo's recent commits — the "activity" ordering and sparkline total. */
export function activityTotal(p: RepoPulse): number {
  return (p.activity ?? []).reduce((a, b) => a + b, 0)
}

/** Apply the chosen ordering. Urgency is the default and the point of the page. */
export function orderPulses(pulses: RepoPulse[], sort: PulseSort): RepoPulse[] {
  if (sort === 'name') return [...pulses].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'activity') {
    return [...pulses].sort(
      (a, b) => activityTotal(b) - activityTotal(a) || b.lastCommitAt - a.lastCommitAt || a.name.localeCompare(b.name)
    )
  }
  return sortPulses(pulses)
}

/**
 * Everything the toolbar can act on in bulk: repos that are behind can be
 * pulled, repos with an upstream can be fetched.
 */
export function bulkTargets(pulses: RepoPulse[]): { fetchable: string[]; pullable: string[] } {
  return {
    fetchable: pulses.filter((p) => !p.error).map((p) => p.path),
    pullable: pulses.filter((p) => !p.error && p.upstream && p.behind > 0).map((p) => p.path)
  }
}

/** Points for a sparkline path, normalised into a `width`×`height` box. */
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return ''
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  return values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(' ')
}

/** Counts for the header: how many repos sit at each level. */
export function pulseTotals(pulses: RepoPulse[]): Record<PulseLevel, number> {
  const totals: Record<PulseLevel, number> = { blocked: 0, action: 0, pending: 0, clean: 0 }
  for (const p of pulses) totals[pulseVerdict(p).level]++
  return totals
}
