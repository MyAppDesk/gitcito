import type { AskAction } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'

export interface AskRunResult {
  applied: number
  /** Action types the model emitted that this app refuses to execute. */
  skipped: string[]
}

/**
 * Runs a validated action list against one repository, in order. The single
 * executor behind both AI surfaces (the Ask tab and chat proposals), so an
 * action behaves identically wherever it was approved. Throws on the first
 * failing git call; the caller owns refresh, toasts and busy state.
 */
export async function executeAskActions(repoPath: string, actions: AskAction[]): Promise<AskRunResult> {
  // Fresh untracked set, so "discard" routes to clean vs checkout correctly.
  const status = await gitApi.status(repoPath)
  const untracked = new Set(
    [...status.unstaged, ...status.staged].filter((file) => file.untracked).map((file) => file.path)
  )
  let applied = 0
  const skipped: string[] = []
  for (const action of actions) {
    if (action.type === 'gitignore') await gitApi.addToGitignore(repoPath, action.patterns)
    else if (action.type === 'stage') await gitApi.stage(repoPath, action.files)
    else if (action.type === 'unstage') await gitApi.unstage(repoPath, action.files)
    else if (action.type === 'commit') {
      if (action.files && action.files.length > 0) await gitApi.stage(repoPath, action.files)
      await gitApi.commit(repoPath, action.message)
    } else if (action.type === 'stash') {
      await gitApi.stashPush(repoPath, action.message, action.files)
    } else if (action.type === 'discard') {
      const tracked = action.files.filter((file) => !untracked.has(file))
      const untrackedFiles = action.files.filter((file) => untracked.has(file))
      if (tracked.length) await gitApi.discard(repoPath, tracked, false)
      if (untrackedFiles.length) await gitApi.discard(repoPath, untrackedFiles, true)
    } else if (action.type === 'branch') {
      await gitApi.createBranch(repoPath, action.name, action.at, action.checkout ?? true)
    } else if (action.type === 'checkout') {
      await gitApi.checkout(repoPath, action.ref)
    } else if (action.type === 'tag') {
      await gitApi.createTag(repoPath, action.name, undefined, action.message ? { message: action.message } : undefined)
    } else {
      // Model emitted a type we don't execute — never claim it was applied.
      skipped.push((action as { type?: string }).type ?? 'unknown')
      continue
    }
    applied++
  }
  return { applied, skipped }
}
