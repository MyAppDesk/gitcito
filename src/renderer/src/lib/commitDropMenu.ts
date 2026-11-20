import type { DropRef } from './branchDrop'
import { commitDropActions } from './commitDrop'
import { useRepoStore, repoActions } from '../stores/repo'
import { useUIStore, type MenuItem } from '../stores/ui'
import { t, interp } from '../i18n'

/**
 * The menu a commit-onto-branch drop opens. Which entries appear is decided in
 * commitDrop.ts (pure, tested); this wires them to the store actions.
 * `targetHead` is the commit the badge sits on — where the branch points now.
 */
export function openCommitDropMenu(
  repoPath: string,
  commit: string,
  target: DropRef,
  targetHead: string,
  x: number,
  y: number
): void {
  const repo = useRepoStore.getState().repos[repoPath]
  const currentBranch = repo?.branches.current
  const actions = commitDropActions(target, { currentBranch, targetHead, commit })
  if (!actions.length) return
  const ui = useUIStore.getState()
  const vars = { sha: commit.slice(0, 7), branch: target.name }
  const items: MenuItem[] = actions.map((a) => {
    const label = interp(t(a.labelKey), vars)
    switch (a.id) {
      case 'cherryPick':
        return { label, onClick: () => void repoActions.cherryPick(repoPath, commit) }
      case 'checkoutCherryPick':
        return { label, onClick: () => void repoActions.checkoutAndCherryPick(repoPath, target.name, commit) }
      case 'resetCurrent': {
        const dirty = (repo?.status?.staged.length ?? 0) + (repo?.status?.unstaged.length ?? 0) > 0
        return {
          label,
          // The reset dialog says what each mode keeps and confirms the hard one.
          onClick: () =>
            ui.openModal({
              kind: 'reset-to-commit',
              repoPath,
              sha: commit,
              shortSha: vars.sha,
              branch: target.name,
              dirty,
              onReset: (mode) => void repoActions.reset(repoPath, commit, mode)
            })
        }
      }
      case 'moveBranch':
        return {
          label,
          // Commits only this branch reached would no longer be on a branch.
          onClick: () =>
            ui.openModal({
              kind: 'confirm',
              title: t('commitDrop.moveTitle'),
              message: interp(t('commitDrop.moveMsg'), vars),
              danger: true,
              confirmLabel: t('commitDrop.moveConfirm'),
              onConfirm: () => void repoActions.moveBranchTo(repoPath, target.name, commit)
            })
        }
    }
  })
  ui.openContextMenu(x, y, items)
}
