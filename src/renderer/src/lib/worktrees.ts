import type { WorktreeInfo } from '../../../shared/types'

/**
 * Git allows a branch to be checked out in exactly one worktree. Asking for a
 * second checkout of it fails with "already used by worktree at …", which is
 * true but useless: what the user meant was "take me to that branch".
 *
 * Returns the *other* worktree holding `ref`, so callers can open it instead of
 * running a checkout that cannot succeed.
 */
export function worktreeForBranch(worktrees: WorktreeInfo[], ref: string): WorktreeInfo | undefined {
  return worktrees.find((w) => !w.isCurrent && !w.detached && w.branch === ref)
}

/** Tab label for a worktree: the repo folder, then the branch living in it. */
export function worktreeTabName(repoPath: string, w: WorktreeInfo): string {
  const repoName = repoPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? repoPath
  const leaf = w.path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? w.path
  return `${repoName} · ${w.branch ?? leaf}`
}
