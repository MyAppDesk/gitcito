import type { GraphCommit } from '../../../shared/types'

/**
 * New commits that are visible because a remote ref moved, but are not yet in
 * the checked-out branch's history. A pull moves HEAD over those commits, so
 * they naturally leave this set on the next graph refresh.
 */
export function fetchedOnlyHashes(commits: GraphCommit[], newCommits: string[]): Set<string> {
  const marked = new Set(newCommits)
  if (marked.size === 0) return new Set()

  const head = commits.find((commit) => commit.refs.some((ref) => ref.startsWith('HEAD')))?.hash
  if (!head) return new Set()

  const byHash = new Map(commits.map((commit) => [commit.hash, commit]))
  const pulled = new Set<string>()
  const stack = [head]
  while (stack.length) {
    const hash = stack.pop()!
    if (pulled.has(hash)) continue
    pulled.add(hash)
    for (const parent of byHash.get(hash)?.parents ?? []) stack.push(parent)
  }

  return new Set(commits.filter((commit) => marked.has(commit.hash) && !pulled.has(commit.hash)).map((commit) => commit.hash))
}
