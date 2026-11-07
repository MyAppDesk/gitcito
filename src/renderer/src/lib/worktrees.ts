import type { RepoRef, TabState, WorktreeInfo } from '../../../shared/types'
import { canonicalRepoName, canonicalRepoPath } from './repoAlias'

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

/** Default group name for a worktree family: the root repo's folder name. */
export function worktreeGroupName(rootPath: string): string {
  return canonicalRepoName(rootPath)
}

function sharesRoot(repo: RepoRef, root: string): boolean {
  return canonicalRepoPath(repo.path) === root || canonicalRepoPath(repo.worktreeRoot ?? '') === root
}

/** Where an incoming worktree's family already lives, if anywhere:
 *  'add' — the root or a sibling sits inside a group;
 *  'convert' — the root (or a sibling) is a standalone repo tab;
 *  null — the family is not open at all. */
export type WorktreeGroupPlan =
  | { kind: 'add'; tabId: string; groupName: string }
  | { kind: 'convert'; tabId: string; defaultName: string }

export function planWorktreeGroup(tabs: TabState[], rootPath: string): WorktreeGroupPlan | null {
  const root = canonicalRepoPath(rootPath)
  for (const tab of tabs) {
    if (tab.kind !== 'group') continue
    if (tab.repos.some((r) => sharesRoot(r, root))) {
      return { kind: 'add', tabId: tab.id, groupName: tab.name }
    }
  }
  for (const tab of tabs) {
    if (tab.kind !== 'repo') continue
    if (tab.repos.some((r) => sharesRoot(r, root))) {
      return { kind: 'convert', tabId: tab.id, defaultName: worktreeGroupName(rootPath) }
    }
  }
  return null
}

/**
 * Short chip label for a worktree inside a group that holds its family —
 * the part after `root · ` in the stored name, else the folder leaf.
 * Returns null when the repo is no worktree or is the group's only family
 * member (dropping the root would erase the context the name carries).
 */
export function worktreeLeafLabel(repo: RepoRef, siblings: RepoRef[]): string | null {
  const others = siblings.filter((s) => canonicalRepoPath(s.path) !== canonicalRepoPath(repo.path))
  if (others.length === 0) return null

  if (repo.worktreeRoot) {
    const root = canonicalRepoPath(repo.worktreeRoot)
    if (!others.some((s) => sharesRoot(s, root))) return null
    return leafFromName(repo)
  }

  // Refs persisted before worktreeRoot existed carry no metadata — infer the
  // family from the shared `root · leaf` name structure instead: a sibling
  // that is a tagged worktree, the root repo itself (folder = prefix), or
  // another chip carrying the same prefix.
  const sep = repo.name.includes(' · ') ? ' · ' : repo.name.includes(' - ') ? ' - ' : null
  if (!sep) return null
  const prefix = repo.name.slice(0, repo.name.indexOf(sep)).trim()
  if (!prefix) return null
  const related = others.some(
    (s) =>
      s.worktreeRoot != null ||
      canonicalRepoName(s.path) === prefix ||
      s.name.startsWith(`${prefix}${sep}`)
  )
  return related ? leafFromName(repo) : null
}

function leafFromName(repo: RepoRef): string | null {
  const sep = repo.name.indexOf(' · ')
  if (sep >= 0) return repo.name.slice(sep + 3).trim() || null
  const dash = repo.name.indexOf(' - ')
  if (dash >= 0) return repo.name.slice(dash + 3).trim() || null
  return canonicalRepoName(repo.path)
}
