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

export type BranchDropActionId = 'merge' | 'rebase' | 'compare'

export interface BranchDropAction {
  id: BranchDropActionId
  labelKey: TranslationKey
  /** Interpolation values for `labelKey`. */
  vars: { source: string; target: string }
  /** Rewrites history — the caller confirms before running it. */
  danger: boolean
}

/** What dropping `source` onto `target` may offer. Empty when it means nothing. */
export function branchDropActions(source: DropRef, target: DropRef): BranchDropAction[] {
  if (!source.name || !target.name) return []
  // Dropping a ref on itself, or on another name for the same ref, is a no-op.
  if (source.name === target.name) return []

  const vars = { source: source.name, target: target.name }
  const actions: BranchDropAction[] = []
  if (target.kind === 'local') {
    actions.push({ id: 'merge', labelKey: 'sidebar.dropBranchMerge', vars, danger: false })
  }
  if (source.kind === 'local') {
    actions.push({ id: 'rebase', labelKey: 'sidebar.dropBranchRebase', vars, danger: true })
  }
  actions.push({ id: 'compare', labelKey: 'sidebar.dropBranchCompare', vars, danger: false })
  return actions
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
