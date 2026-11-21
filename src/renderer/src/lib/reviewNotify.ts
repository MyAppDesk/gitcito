import type { HostingProvider, PullRequest } from '../../../shared/types'

/**
 * Which pull requests just started waiting for your review — the 👁 rows that
 * were not 👁 at the last look. The first look at a repository only remembers
 * what is there: announcing a backlog as if it had just arrived is noise.
 */
export function newlyAwaitingReview(
  seen: ReadonlySet<number> | undefined,
  prs: readonly PullRequest[]
): { fresh: PullRequest[]; seen: Set<number> } {
  const waiting = prs.filter((p) => p.awaitingYou)
  const next = new Set(waiting.map((p) => p.id))
  if (!seen) return { fresh: [], seen: next }
  // A PR that stopped waiting and was asked again counts as new: it is a new request.
  return { fresh: waiting.filter((p) => !seen.has(p.id)), seen: next }
}

/**
 * Hosts whose review requests this raises a desktop notification for. GitHub's
 * already arrive through its notifications inbox, which notifies on its own —
 * announcing them here too would say everything twice.
 */
export function notifiesReviewRequests(provider: HostingProvider): boolean {
  return provider === 'gitlab' || provider === 'forgejo'
}

/**
 * Where the last look is remembered: per profile as well as per repository.
 * Another account's requests, seen for the first time after a profile switch,
 * are not news — that first look only primes, like any first look.
 */
export function awaitingSeenKey(profileId: string, repoPath: string): string {
  return `${profileId}\u0000${repoPath}`
}
