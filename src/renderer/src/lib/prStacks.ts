import type { PullRequest } from '../../../shared/types'

/**
 * Folding a list of pull requests back into the stacks they came from.
 *
 * Four chained pull requests are one piece of work, and listing them as four
 * peers is the same mistake as listing a stack's branches unordered — the
 * reader has to rebuild the chain from the base branches every time.
 *
 * Two things say a group is a stack. GitHub, once its stacked pull requests are
 * in play, stamps each PR with the stack it belongs to, and that is
 * authoritative. Everywhere else the chain is still visible in the refs: a PR
 * whose base is another PR's head sits directly on it. The second rule is what
 * makes this work on GitLab, Bitbucket and Azure, and for PRs opened before any
 * of this existed.
 */

export type PrGroup =
  | { kind: 'single'; pr: PullRequest }
  /** Top of the stack first — the reading order of a review. */
  | { kind: 'stack'; prs: PullRequest[]; number?: number; base: string }

/** The stack chains in `prs`, plus everything that stands alone, in order. */
export function groupPrStacks(prs: PullRequest[]): PrGroup[] {
  const byHead = new Map<string, PullRequest>()
  for (const pr of prs) if (pr.sourceBranch) byHead.set(pr.sourceBranch, pr)

  /** The PR this one sits on, if that PR is in the list too. */
  const parentOf = (pr: PullRequest): PullRequest | undefined => {
    const native = pr.stackNumber
    const below = pr.targetBranch ? byHead.get(pr.targetBranch) : undefined
    if (!below || below.id === pr.id) return undefined
    // A native stack number on both sides has to agree; a PR that merely
    // targets another's head while GitHub puts them in different stacks is not
    // part of this one.
    if (native !== undefined && below.stackNumber !== undefined && below.stackNumber !== native) return undefined
    return below
  }

  const claimed = new Set<number>()
  const groups: PrGroup[] = []
  for (const pr of prs) {
    if (claimed.has(pr.id)) continue
    // Only start from a leaf: nothing else in the list sits on this one.
    if (prs.some((other) => other.id !== pr.id && parentOf(other)?.id === pr.id)) continue

    const chain: PullRequest[] = [pr]
    const seen = new Set([pr.id])
    for (let below = parentOf(pr); below && !seen.has(below.id); below = parentOf(below)) {
      chain.push(below)
      seen.add(below.id)
    }
    chain.forEach((p) => claimed.add(p.id))
    if (chain.length === 1) groups.push({ kind: 'single', pr })
    else
      groups.push({
        kind: 'stack',
        prs: chain,
        number: chain.find((p) => p.stackNumber !== undefined)?.stackNumber,
        base: chain[chain.length - 1].targetBranch
      })
  }

  // A cycle (A targets B's head, B targets A's) leaves nothing claimed and no
  // leaf to start from; those PRs are still listed, on their own.
  for (const pr of prs) if (!claimed.has(pr.id)) groups.push({ kind: 'single', pr })
  return groups
}
