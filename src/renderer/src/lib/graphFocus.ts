// Graph focus: which commits the graph keeps. Pure set arithmetic over the
// commit DAG the log already returned — no git call, no store, no DOM — so a
// focus switch is instant and testable.
//
// Every mode is expressed as "keep this set of hashes"; the caller filters the
// commit array itself, preserving log order.

import type { GraphCommit, GraphFocus } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

/** The focus modes, in the order both the settings tab and the graph gear menu
 *  show them. Keys, not strings — a module constant outlives a language switch. */
export const GRAPH_FOCUS_MODES: { id: GraphFocus; labelKey: TranslationKey }[] = [
  { id: 'all', labelKey: 'graphFocus.all' },
  { id: 'linear', labelKey: 'graphFocus.linear' },
  { id: 'hideMerged', labelKey: 'graphFocus.hideMerged' },
  { id: 'solo', labelKey: 'graphFocus.solo' }
]

export interface FocusInput {
  /** Local branches, as the sidebar knows them. */
  locals: { name: string; isCurrent: boolean; mergedIntoCurrent: boolean }[]
  /** Remote-tracking branches — a merged remote branch is just as much clutter. */
  remotes: { fullName: string; mergedIntoCurrent: boolean }[]
  /** Starred branch names (RepoLayout.pinnedBranches). */
  pinned: string[]
  /** Remote names, needed to tell `origin/feat` from a local `feat/x`. */
  remoteNames: Set<string>
}

/**
 * A commit's decoration, split the way the graph reads it. `other` holds tags
 * and anything that is not a plain branch name — refs nothing in the branch
 * list can vouch for, which is exactly the case a deleted branch leaves behind.
 */
function refNames(
  refs: string[],
  remoteNames: Set<string>
): { local: string[]; remote: string[]; other: string[]; head: boolean } {
  const local: string[] = []
  const remote: string[] = []
  const other: string[] = []
  let head = false
  for (const r of refs) {
    if (r === 'HEAD') {
      head = true
      other.push(r)
    } else if (r.startsWith('HEAD ->')) {
      head = true
      local.push(r.replace('HEAD ->', '').trim())
    } else if (r.startsWith('tag:')) {
      other.push(r)
    } else {
      const slash = r.indexOf('/')
      const prefix = slash > 0 ? r.slice(0, slash) : ''
      if (prefix && remoteNames.has(prefix)) remote.push(r)
      else local.push(r)
    }
  }
  return { local, remote, other, head }
}

/** Walk first parents from `start` until the chain leaves the loaded window. */
function firstParentChain(byHash: Map<string, GraphCommit>, start: string | undefined, into: Set<string>): void {
  let cur = start ? byHash.get(start) : undefined
  while (cur && !into.has(cur.hash)) {
    into.add(cur.hash)
    cur = cur.parents[0] ? byHash.get(cur.parents[0]) : undefined
  }
}

/** Everything reachable from `tips` through *all* parents. */
function reachable(byHash: Map<string, GraphCommit>, tips: string[], into: Set<string>): void {
  const stack = [...tips]
  while (stack.length) {
    const hash = stack.pop()!
    if (into.has(hash)) continue
    const c = byHash.get(hash)
    if (!c) continue
    into.add(hash)
    for (const p of c.parents) if (!into.has(p)) stack.push(p)
  }
}

/** The default branch, by the usual names — `solo` keeps it even unstarred. */
export function defaultBranchName(locals: { name: string }[]): string | null {
  return locals.find((b) => b.name === 'main')?.name ?? locals.find((b) => b.name === 'master')?.name ?? null
}

/**
 * The hashes a focus mode keeps, or `null` for "keep everything" — which lets
 * the caller skip the filter entirely and preserve array identity.
 */
export function focusedHashes(commits: GraphCommit[], focus: GraphFocus, input: FocusInput): Set<string> | null {
  if (focus === 'all' || commits.length === 0) return null

  const byHash = new Map(commits.map((c) => [c.hash, c]))
  const headHash = commits.find((c) => c.refs.some((r) => r.startsWith('HEAD')))?.hash

  // Local branch tips, resolved from the decorations the log already carries —
  // `solo` needs to find a starred branch by name.
  const localTip = new Map<string, string>()
  for (const c of commits) {
    for (const n of refNames(c.refs, input.remoteNames).local) if (!localTip.has(n)) localTip.set(n, c.hash)
  }

  const keep = new Set<string>()
  firstParentChain(byHash, headHash, keep)

  if (focus === 'linear') return keep

  if (focus === 'solo') {
    const wanted = new Set(input.pinned)
    const def = defaultBranchName(input.locals)
    if (def) wanted.add(def)
    for (const name of wanted) firstParentChain(byHash, localTip.get(name), keep)
    return keep
  }

  // hideMerged works by exclusion, not by listing what to keep: a commit is a
  // tip unless *every* ref on it is a branch git already reports as contained
  // in the current one. Tags, a detached HEAD and refs the branch list cannot
  // account for — what a deleted branch leaves behind — therefore survive.
  // Dropping a commit someone deliberately marked is the worse mistake.
  const merged = new Set<string>()
  for (const b of input.locals) {
    if (b.mergedIntoCurrent && !b.isCurrent && !input.pinned.includes(b.name)) merged.add(b.name)
  }
  for (const r of input.remotes) if (r.mergedIntoCurrent) merged.add(r.fullName)
  const tips: string[] = []
  for (const c of commits) {
    const { local, remote, other } = refNames(c.refs, input.remoteNames)
    if (local.length + remote.length + other.length === 0) continue
    const allMerged = other.length === 0 && [...local, ...remote].every((n) => merged.has(n))
    if (!allMerged) tips.push(c.hash)
  }
  reachable(byHash, tips, keep)
  return keep
}

/**
 * Stashes are inserted after the focus filter, so one whose parent the filter
 * dropped would hang in mid-air with nothing to draw its edge to. Hide those
 * with their parent — a stash whose parent was never loaded at all already
 * floats in the unfiltered graph, and focus should not change that.
 */
export function focusedStashes<T extends { parentSha: string }>(
  stashes: T[],
  commits: GraphCommit[],
  keep: Set<string> | null
): T[] {
  if (!keep) return stashes
  const loaded = new Set(commits.map((c) => c.hash))
  return stashes.filter((s) => !loaded.has(s.parentSha) || keep.has(s.parentSha))
}
