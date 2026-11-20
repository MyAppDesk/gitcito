import type { DropRef } from './branchDrop'
import type { TranslationKey } from '../i18n'

/**
 * Dropping a commit onto a branch badge. Same rule as branchDrop.ts: offer only
 * what git can do, because a refusal arrives after the user committed to the
 * gesture.
 *
 * - **Cherry-pick** commits onto HEAD, so onto the current branch directly, or
 *   onto another local branch after checking it out.
 * - **Reset** the current branch to the commit goes through the reset dialog,
 *   which says what each mode keeps and confirms.
 * - **Move** another local branch to the commit is `git branch -f`: it can
 *   leave commits unreachable, so it confirms, and it can be undone.
 *
 * Remote-tracking branches and tags are not moved this way, so they take no drop.
 */

export type CommitDropActionId = 'cherryPick' | 'checkoutCherryPick' | 'resetCurrent' | 'moveBranch'

export interface CommitDropAction {
  id: CommitDropActionId
  labelKey: TranslationKey
}

const LABEL: Record<CommitDropActionId, TranslationKey> = {
  cherryPick: 'commitDrop.cherryPick',
  checkoutCherryPick: 'commitDrop.checkoutCherryPick',
  resetCurrent: 'commitDrop.resetCurrent',
  moveBranch: 'commitDrop.moveBranch'
}

export function commitDropActions(
  target: DropRef,
  ctx: { currentBranch?: string; targetHead?: string; commit: string }
): CommitDropAction[] {
  if (target.kind !== 'local') return []
  // Already where the branch points: nothing to pick, nothing to move.
  if (ctx.targetHead && ctx.targetHead === ctx.commit) return []
  const ids: CommitDropActionId[] =
    target.name === ctx.currentBranch ? ['cherryPick', 'resetCurrent'] : ['checkoutCherryPick', 'moveBranch']
  return ids.map((id) => ({ id, labelKey: LABEL[id] }))
}
