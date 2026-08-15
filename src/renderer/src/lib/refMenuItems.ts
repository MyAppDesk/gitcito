import type { MenuItem } from '../stores/ui'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import { refIntegrationActions } from './refMenu'
import { t, interp } from '../i18n'

/**
 * The shared "what to do with this ref" block, wired to the store.
 *
 * Every surface that right-clicks a ref renders this and appends its own
 * extras, so an action added here shows up everywhere at once. The rules for
 * *which* entries are offered live in `refMenu.ts`, which is pure and tested.
 */
export function refIntegrationItems(repoPath: string, ref: string, current: string): MenuItem[] {
  return refIntegrationActions(ref, current).map((action) => {
    const label = interp(t(action.labelKey), action.vars)
    const base = { label, disabled: action.disabled }
    switch (action.id) {
      case 'merge':
        return { ...base, onClick: () => void repoActions.merge(repoPath, ref) }
      case 'merge-options':
        return {
          ...base,
          onClick: () => useUIStore.getState().openModal({ kind: 'merge-options', repoPath, source: ref })
        }
      case 'rebase':
        return { ...base, onClick: () => void repoActions.rebase(repoPath, ref) }
      default:
        return {
          ...base,
          onClick: () =>
            useUIStore
              .getState()
              .openModal({ kind: 'branch-compare', repoPath, branchA: ref, branchB: current || 'HEAD' })
        }
    }
  })
}
