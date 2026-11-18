import type { TranslationKey } from '../i18n'

/**
 * Dropping one ref onto another — the graph's ref badges and the sidebar's
 * branch rows both use this to decide what the drop is allowed to mean.
 *
 * The rules come from what git can actually do, not from what reads nicely:
 *
 * - **Merge** checks the *target* out and commits there, so the target has to
 *   be a local branch. The source can be anything with a commit behind it.
 * - **Rebase** rewrites the *source*, so the source has to be a local branch.
 *   The target is only a base, so a tag or a remote-tracking ref is fine.
 * - **Compare** touches nothing, so it is always on offer.
 * - **Fast-forward** moves the *target* up to the source without a merge
 *   commit, so the target has to be a local branch that is an ancestor of the
 *   source — which only git can say, so the caller passes it in (`context`).
 * - **Interactive rebase** works on HEAD, so the source has to be the branch
 *   that is checked out.
 * - **Create pull request** needs a host to open it on; it takes branch names,
 *   so a remote-tracking source or target is named without its remote. A
 *   source the remote has never seen is pushed first ("Push … and start a PR").
 * - **Push to** sends a local source to the target's remote branch — never
 *   forced, so the remote refuses anything but a fast-forward.
 * - **Reset** moves HEAD, so the source has to be the branch checked out; the
 *   reset dialog it opens says what each mode keeps and confirms.
 *
 * Offering an action git would refuse is worse than offering fewer: the error
 * arrives after the user has already committed to the gesture.
 */

export type DropRefKind = 'local' | 'remote' | 'tag'

export interface DropRef {
  /** The name git takes: `main`, `origin/main`, `v1.2.0`. */
  name: string
  kind: DropRefKind
}

export type BranchDropActionId =
  | 'fastForward'
  | 'merge'
  | 'rebase'
  | 'interactiveRebase'
  | 'pushTo'
  | 'reset'
  | 'createPr'
  | 'pushAndCreatePr'
  | 'compare'

/** Rows of a kind sit together, with a separator between kinds — as the menu draws them. */
export type BranchDropGroup = 'integrate' | 'move' | 'share' | 'inspect'

/** What only the repository knows about a drop. Left out, those actions are not offered. */
export interface DropContext {
  /** The branch checked out — interactive rebase replays HEAD, so the source must be it. */
  currentBranch?: string
  /** The target is a strict ancestor of the source (`merge-base --is-ancestor`). */
  canFastForward?: boolean
  /** The repository's remote is on a host Gitcito can open a pull request on. */
  canCreatePr?: boolean
  /** The remote branch a push of the source onto the target would update
   *  (`origin/main`): the target itself if remote, else the local target's upstream. */
  targetRemote?: string
  /** The source already exists on the remote; when false, a PR pushes it first. */
  sourceOnRemote?: boolean
}

export interface BranchDropAction {
  id: BranchDropActionId
  labelKey: TranslationKey
  /** Interpolation values for `labelKey`. */
  vars: { source: string; target: string }
  /** Rewrites history — the caller confirms before running it. */
  danger: boolean
  group: BranchDropGroup
}

/** What dropping `source` onto `target` may offer, most likely first. Empty when it means nothing. */
export function branchDropActions(source: DropRef, target: DropRef, context: DropContext = {}): BranchDropAction[] {
  if (!source.name || !target.name) return []
  // Dropping a ref on itself, or on another name for the same ref, is a no-op.
  if (source.name === target.name) return []

  const vars = { source: source.name, target: target.name }
  const actions: BranchDropAction[] = []
  const add = (id: BranchDropActionId, labelKey: TranslationKey, group: BranchDropGroup, v = vars, danger = false): void => {
    actions.push({ id, labelKey, vars: v, danger, group })
  }
  const isCurrent = source.kind === 'local' && source.name === context.currentBranch

  // When it is possible it is what the drop almost always means: catch the
  // target up, no merge commit.
  if (target.kind === 'local' && context.canFastForward) add('fastForward', 'sidebar.dropBranchFastForward', 'integrate')
  if (target.kind === 'local') add('merge', 'sidebar.dropBranchMerge', 'integrate')
  if (source.kind === 'local') add('rebase', 'sidebar.dropBranchRebase', 'integrate', vars, true)
  // Opens the planner; nothing is rewritten until it is confirmed there.
  if (isCurrent) add('interactiveRebase', 'sidebar.dropBranchInteractiveRebase', 'integrate')

  if (source.kind === 'local' && context.targetRemote) {
    add('pushTo', 'sidebar.dropBranchPushTo', 'move', { source: source.name, target: context.targetRemote })
  }
  // Opens the reset dialog, which explains the modes and confirms.
  if (isCurrent) add('reset', 'sidebar.dropBranchReset', 'move', vars, true)

  if (context.canCreatePr && source.kind !== 'tag' && target.kind !== 'tag') {
    const pr = { source: branchNameOf(source), target: branchNameOf(target) }
    if (pr.source !== pr.target) {
      if (source.kind === 'local' && context.sourceOnRemote === false) {
        add('pushAndCreatePr', 'sidebar.dropBranchPushAndCreatePr', 'share', pr)
      } else {
        add('createPr', 'sidebar.dropBranchCreatePr', 'share', pr)
      }
    }
  }
  add('compare', 'sidebar.dropBranchCompare', 'inspect')
  return actions
}

/** The branch name a host knows a ref by: `origin/feature` → `feature`. */
export function branchNameOf(ref: DropRef): string {
  if (ref.kind !== 'remote') return ref.name
  const slash = ref.name.indexOf('/')
  return slash > 0 ? ref.name.slice(slash + 1) : ref.name
}

/** The drag payload, kept as a mime type of our own so a dragged file or tab
 *  never reads as a branch. */
export const BRANCH_DND_TYPE = 'application/x-gitcito-ref'

export function encodeDropRef(ref: DropRef): string {
  return JSON.stringify(ref)
}

export function decodeDropRef(raw: string | null | undefined): DropRef | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DropRef>
    if (typeof parsed?.name !== 'string' || !parsed.name) return null
    const kind = parsed.kind
    if (kind !== 'local' && kind !== 'remote' && kind !== 'tag') return null
    return { name: parsed.name, kind }
  } catch {
    return null
  }
}
