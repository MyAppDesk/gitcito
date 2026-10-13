// An open working-change file is a view of a moving target: a terminal, an
// agent or another tool can stage it, unstage it or commit it while it is on
// screen. The view's source is fixed when the file opens, so without this the
// pane goes on diffing the side the file has left — "No changes to display"
// under a chip that names the wrong side. Pure: the caller hands in status.

import type { FileEntry } from '../../../shared/types'

export type WipSource = { type: 'wip'; staged: boolean; untracked: boolean }

type StatusLists = { staged: FileEntry[]; unstaged: FileEntry[]; conflicted: FileEntry[] }

export type WipFollow =
  /** The view still shows a side the file is on. */
  | { kind: 'keep' }
  /** The file moved between staged and unstaged; show the side it is on now. */
  | { kind: 'move'; source: WipSource }
  /** No longer a working change — committed or discarded. The caller decides which. */
  | { kind: 'left' }

export function followWipFile(source: WipSource, file: string, status: StatusLists): WipFollow {
  // A conflicted file has its own resolver; staged/unstaged mean little mid-merge.
  if (status.conflicted.some((f) => f.path === file)) return { kind: 'keep' }
  const staged = status.staged.find((f) => f.path === file)
  const unstaged = status.unstaged.find((f) => f.path === file)
  // Partly staged: both sides are real, so whichever the user picked stands.
  if (staged && unstaged) return { kind: 'keep' }
  if (staged) {
    return source.staged ? { kind: 'keep' } : { kind: 'move', source: { type: 'wip', staged: true, untracked: false } }
  }
  if (unstaged) {
    const untracked = !!unstaged.untracked
    return !source.staged && source.untracked === untracked
      ? { kind: 'keep' }
      : { kind: 'move', source: { type: 'wip', staged: false, untracked } }
  }
  return { kind: 'left' }
}

export type CommitFollow =
  /** The commit is still in history, or nothing better is known. */
  | { kind: 'keep' }
  /** The commit was undone and the file is a working change again. */
  | { kind: 'move'; source: WipSource }
  /** HEAD was rewritten in place (amend, reword): show the file in the new HEAD
   *  if that holds it, else close. */
  | { kind: 'head' }
  /** The commit was undone and its changes thrown away: nothing on screen
   *  exists any more. The commit underneath is a different change, so the
   *  view closes rather than jump to it. */
  | { kind: 'close' }

/**
 * The other direction: a file shown at a commit that HEAD has just left.
 * `left` means HEAD was on this commit and moved off it by an undo or an amend;
 * `undone` that HEAD is now the commit's parent rather than a rewrite of it.
 * A commit that leaves history some other way (a rebase further back) keeps
 * its view — its content still exists, and guessing where it went would be the
 * surprise.
 */
export function followCommitFile(file: string, left: boolean, undone: boolean, status: StatusLists | null): CommitFollow {
  if (!left) return { kind: 'keep' }
  if (status && !status.conflicted.some((f) => f.path === file)) {
    // An undone commit lands staged (soft reset) or unstaged (mixed). When
    // both, the staged side is the one that holds what the commit held.
    if (status.staged.some((f) => f.path === file)) {
      return { kind: 'move', source: { type: 'wip', staged: true, untracked: false } }
    }
    const unstaged = status.unstaged.find((f) => f.path === file)
    if (unstaged) return { kind: 'move', source: { type: 'wip', staged: false, untracked: !!unstaged.untracked } }
  }
  return undone ? { kind: 'close' } : { kind: 'head' }
}

/** True for the commit HEAD points at, from the log's decorations. */
export function isHeadCommit(refs: readonly string[]): boolean {
  return refs.some((r) => r === 'HEAD' || r.startsWith('HEAD ->'))
}

type LogCommit = { hash: string; parents: string[]; refs: string[] }

/** The slice of a repository's state that says where HEAD is. */
export type HeadSnapshot = {
  commits: readonly LogCommit[]
  branches?: { locals: readonly { sha: string; isCurrent: boolean }[] }
}

/**
 * The commit HEAD is on. Read from the checked-out branch first: the log's
 * `HEAD ->` label is a decoration, and a log that also lists stash bases is
 * not a reliable place to find it. The label is the fallback, for a detached
 * HEAD.
 */
export function headOf(s: HeadSnapshot): LogCommit | undefined {
  const sha = s.branches?.locals.find((b) => b.isCurrent)?.sha
  return (sha ? s.commits.find((c) => c.hash === sha) : undefined) ?? s.commits.find((c) => isHeadCommit(c.refs))
}

/**
 * What HEAD just did, judged by where it went — not by whether a commit is
 * still in the log (a stash keeps the commit it was taken on in the log long
 * after that commit was undone).
 */
export type HeadMove =
  | { kind: 'none' }
  | { kind: 'committed' | 'amended' | 'undone' | 'other'; from: LogCommit; to: LogCommit }

export function headMove(before: HeadSnapshot, after: HeadSnapshot): HeadMove {
  const from = headOf(before)
  const to = headOf(after)
  if (!from || !to || from.hash === to.hash) return { kind: 'none' }
  const sameParents = to.parents.length === from.parents.length && to.parents.every((p, i) => p === from.parents[i])
  const kind = to.parents.includes(from.hash)
    ? 'committed'
    : sameParents
      ? 'amended'
      : from.parents.includes(to.hash)
        ? 'undone'
        : 'other'
  return { kind, from, to }
}
