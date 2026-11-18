import type { MenuItem } from '../stores/ui'
import { useUIStore } from '../stores/ui'
import { repoActions, useRepoStore } from '../stores/repo'
import { gitApi } from '../infrastructure/api'
import { branchDropActions, type BranchDropAction, type DropContext, type DropRef } from './branchDrop'
import { t, interp } from '../i18n'

/**
 * What the repository can say about a drop that the refs alone cannot: which
 * branch is checked out, whether the target is behind the source (fast-forward),
 * which remote branch a push onto the target would update, whether the source
 * is on the remote yet, and whether there is a host to open a pull request on.
 * One quick git read at most — the ancestry check, only when a fast-forward
 * could be on offer.
 */
async function dropContext(repoPath: string, source: DropRef, target: DropRef): Promise<DropContext> {
  const repo = useRepoStore.getState().repos[repoPath]
  const branches = repo?.branches
  const currentBranch = branches?.current || undefined
  // The checked-out branch is merged into instead: merge already fast-forwards
  // when it can, and `git branch -f` refuses to move HEAD's branch.
  const ffCandidate = target.kind === 'local' && target.name !== currentBranch && source.name !== target.name
  const canFastForward = ffCandidate
    ? await gitApi.isAncestor(repoPath, target.name, source.name).catch(() => false)
    : false
  const targetRemote =
    target.kind === 'remote'
      ? target.name
      : target.kind === 'local'
        ? (branches?.locals.find((b) => b.name === target.name)?.upstream ?? undefined)
        : undefined
  const sourceOnRemote =
    source.kind !== 'local' ||
    !!branches?.locals.find((b) => b.name === source.name)?.upstream ||
    !!branches?.remotes.some((r) => r.name === source.name)
  return { currentBranch, canFastForward, canCreatePr: !!repo?.prProvider, targetRemote, sourceOnRemote }
}

/** The commit a ref points at, from what the store already holds. */
function shaOf(repoPath: string, ref: DropRef): string | undefined {
  const b = useRepoStore.getState().repos[repoPath]?.branches
  if (!b) return undefined
  if (ref.kind === 'local') return b.locals.find((x) => x.name === ref.name)?.sha
  if (ref.kind === 'remote') return b.remotes.find((x) => x.fullName === ref.name)?.sha
  return b.tags.find((x) => x.name === ref.name)?.sha
}

/**
 * The menu a ref-onto-ref drop opens, wired to the store actions. The rules for
 * *which* entries appear live in `branchDrop.ts`, which is pure and tested; this
 * only gathers the repository's side of them and turns them into items, with a
 * separator between groups (integrate · move · share · inspect).
 */
export async function openBranchDropMenu(
  repoPath: string,
  source: DropRef,
  target: DropRef,
  x: number,
  y: number
): Promise<void> {
  const context = await dropContext(repoPath, source, target)
  const actions = branchDropActions(source, target, context)
  const items: MenuItem[] = []
  actions.forEach((action, i) => {
    if (i > 0 && actions[i - 1].group !== action.group) items.push({ separator: true })
    items.push(dropItem(repoPath, source, target, action))
  })
  if (items.length) useUIStore.getState().openContextMenu(x, y, items)
}

function dropItem(repoPath: string, source: DropRef, target: DropRef, action: BranchDropAction): MenuItem {
  const ui = useUIStore.getState()
  const label = interp(t(action.labelKey), action.vars)
  switch (action.id) {
    case 'fastForward':
      return { label, onClick: () => void repoActions.fastForwardBranch(repoPath, target.name, source.name) }
    case 'merge':
      return { label, onClick: () => void repoActions.mergeInto(repoPath, source.name, target.name) }
    case 'rebase':
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
    case 'interactiveRebase':
      // The planner shows every commit and rewrites nothing until it is confirmed.
      return {
        label,
        onClick: () => ui.openModal({ kind: 'interactive-rebase', repoPath, base: target.name, baseSubject: target.name })
      }
    case 'pushTo': {
      const slash = action.vars.target.indexOf('/')
      const remote = action.vars.target.slice(0, slash)
      const remoteBranch = action.vars.target.slice(slash + 1)
      return { label, onClick: () => void repoActions.pushRefTo(repoPath, source.name, remote, remoteBranch) }
    }
    case 'reset': {
      // The same dialog as the graph's "Reset to this commit": it explains what
      // each mode keeps, warns about uncommitted work, and confirms.
      const sha = shaOf(repoPath, target) ?? target.name
      const status = useRepoStore.getState().repos[repoPath]?.status
      const dirty = !!status && status.staged.length + status.unstaged.length + status.conflicted.length > 0
      return {
        label,
        danger: true,
        onClick: () =>
          ui.openModal({
            kind: 'reset-to-commit',
            repoPath,
            sha,
            shortSha: sha.slice(0, 7),
            branch: source.name,
            dirty,
            onReset: (mode) => void repoActions.reset(repoPath, sha, mode)
          })
      }
    }
    case 'createPr':
      return {
        label,
        onClick: () => ui.openModal({ kind: 'create-pr', repoPath, source: action.vars.source, target: action.vars.target })
      }
    case 'pushAndCreatePr':
      // The host needs the branch before it can open a pull request from it.
      return {
        label,
        onClick: () =>
          void repoActions.push(repoPath, false, false, source.name).then((pushed) => {
            if (pushed) {
              ui.openModal({ kind: 'create-pr', repoPath, source: action.vars.source, target: action.vars.target })
            }
          })
      }
    case 'compare':
      return {
        label,
        onClick: () => ui.openModal({ kind: 'branch-compare', repoPath, branchA: source.name, branchB: target.name })
      }
  }
}
