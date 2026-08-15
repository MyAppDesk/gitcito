import type { TranslationKey } from '../i18n'

/** What can be done *with* a ref, once you have one. */
export type RefActionId = 'merge' | 'merge-options' | 'rebase' | 'compare'

export interface RefAction {
  id: RefActionId
  labelKey: TranslationKey
  vars: Record<string, string>
  /** Greyed out rather than hidden: the entry still teaches what is possible. */
  disabled: boolean
}

/**
 * The integration actions offered for a ref — merge it, merge it with options,
 * rebase onto it, compare against it.
 *
 * These rules live here, apart from any component, because the same four
 * entries have to appear wherever a ref is right-clicked: the sidebar's branch
 * rows, the graph's ref badges, and anything added later. Two hand-maintained
 * copies is how the graph ended up without "Merge with options" while the
 * sidebar had it.
 *
 * @param ref     The ref as git sees it: `main`, `origin/main`, `v1.2`.
 * @param current The checked-out branch, or '' when HEAD is detached.
 */
export function refIntegrationActions(ref: string, current: string): RefAction[] {
  // Merging a branch into itself, or rebasing it onto itself, is not an action
  // — and with a detached HEAD there is no branch to merge into at all.
  const sameRef = ref === current
  const blocked = sameRef || !current
  const vars = { ref, branch: current, current }
  return [
    { id: 'merge', labelKey: 'branch.mergeInto', vars, disabled: blocked },
    { id: 'merge-options', labelKey: 'branch.mergeWithOptions', vars, disabled: blocked },
    { id: 'rebase', labelKey: 'branch.rebaseOnto', vars, disabled: blocked },
    { id: 'compare', labelKey: 'branch.compareWith', vars, disabled: blocked }
  ]
}
