import type { MenuItem } from '../stores/ui'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import { branchDropActions, type DropRef } from './branchDrop'
import { t, interp } from '../i18n'

/**
 * The menu a ref-onto-ref drop opens, wired to the store actions. The rules for
 * *which* entries appear live in `branchDrop.ts`, which is pure and tested; this
 * only turns them into clickable items.
 */
export function openBranchDropMenu(repoPath: string, source: DropRef, target: DropRef, x: number, y: number): void {
  const ui = useUIStore.getState()
  const items: MenuItem[] = branchDropActions(source, target).map((action) => {
    const label = interp(t(action.labelKey), action.vars)
    if (action.id === 'merge') {
      return { label, onClick: () => void repoActions.mergeInto(repoPath, source.name, target.name) }
    }
    if (action.id === 'compare') {
      return {
        label,
        onClick: () =>
          ui.openModal({ kind: 'branch-compare', repoPath, branchA: source.name, branchB: target.name })
      }
    }
    // Rebasing rewrites the source branch's commits, so it asks first — the
    // gesture is easy to make by accident, the rewrite is not obvious to spot.
    return {
      label,
      danger: true,
      onClick: () =>
        ui.openModal({
          kind: 'confirm',
          danger: true,
          title: t('confirm.dropRebase.title'),
          message: interp(t('confirm.dropRebase.message'), action.vars),
          confirmLabel: t('confirm.dropRebase.ok'),
          onConfirm: () => void repoActions.rebaseOnto(repoPath, source.name, target.name)
        })
    }
  })
  if (items.length) ui.openContextMenu(x, y, items)
}
