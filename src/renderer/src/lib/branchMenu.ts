export type BranchContextKind = 'local' | 'remote'

export type BranchContextActionId = 'rename' | 'copy' | 'worktree' | 'merge' | 'delete'

export interface BranchWorktreePlan {
  dir: string
  branch: string
  newBranch: boolean
  startPoint?: string
}

export function branchContextActionIds(
  kind: BranchContextKind,
  includeMerge = true
): BranchContextActionId[] {
  const actions: BranchContextActionId[] = kind === 'local'
    ? ['rename', 'copy', 'worktree', 'merge', 'delete']
    : ['copy', 'worktree', 'merge', 'delete']
  return includeMerge ? actions : actions.filter((action) => action !== 'merge')
}

export interface ActiveBranchForMerge {
  name: string
  sha: string
  upstream: string | null
  behind: number
}

export function branchMergeWouldChange(
  ref: string,
  sha: string,
  current: ActiveBranchForMerge | undefined,
  mergedIntoCurrent = false
): boolean {
  if (!current || mergedIntoCurrent || ref === current.name || sha === current.sha) return false
  if (current.upstream === ref && current.behind === 0) return false
  return true
}

export function branchWorktreePlan(
  repoPath: string,
  localBranch: string,
  ref: string,
  localExists: boolean
): BranchWorktreePlan {
  const suffix = localBranch.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'branch'
  const dir = `${repoPath.replace(/[\\/]+$/, '')}--${suffix}`
  if (localExists) return { dir, branch: localBranch, newBranch: false }
  return { dir, branch: localBranch, newBranch: true, startPoint: ref }
}
