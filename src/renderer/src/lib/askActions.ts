import type { ChatActionApproval, RepoChatAction } from '../../../shared/types'

/**
 * How much trust one proposed action needs before running:
 * - 'safe': reversible bookkeeping — undoable with one obvious git command.
 * - 'normal': changes history or the working tree, but loses nothing.
 * - 'destructive': throws uncommitted work away. Always confirmed explicitly,
 *   whatever approval mode is active — that rule is not configurable.
 */
export type AskActionSafety = 'safe' | 'normal' | 'destructive'

export function askActionSafety(action: RepoChatAction): AskActionSafety {
  switch (action.type) {
    case 'discard':
      return 'destructive'
    case 'commit':
    case 'stash':
    case 'checkout':
    case 'edit_file':
    case 'write_file':
    case 'delete_file':
    // Moving history, or publishing it, is never "bookkeeping": a pre-approved
    // mode may run these, a "safe only" mode may not.
    case 'merge':
    case 'rebase':
    case 'revert':
    case 'cherry_pick':
    case 'pull':
    case 'push':
    case 'open_pr':
    case 'stack_submit':
      return 'normal'
    default:
      return 'safe'
  }
}

/** True when a proposal may run on arrival under the given approval mode. */
export function askActionsAutoRun(actions: RepoChatAction[], mode: ChatActionApproval | undefined): boolean {
  if (!actions.length) return false
  if (mode === 'auto-all') return actions.every((action) => askActionSafety(action) !== 'destructive')
  if (mode === 'auto-safe') return actions.every((action) => askActionSafety(action) === 'safe')
  return false
}

/** Files a plan would irreversibly discard — what the confirm dialog must name. */
export function destructiveAskFiles(actions: RepoChatAction[]): string[] {
  return [...new Set(actions.flatMap((action) => (action.type === 'discard' ? action.files : [])))]
}

/** One-line parameter summary of an action, shared by every proposal card. */
export function askActionDetail(action: RepoChatAction, allChangesLabel: string): string {
  switch (action.type) {
    case 'gitignore':
      return action.patterns.join(', ')
    case 'commit':
      return `“${action.message}”${action.files?.length ? ` · ${action.files.join(', ')}` : ''}`
    case 'stash':
      return action.files?.length ? action.files.join(', ') : allChangesLabel
    case 'branch':
      return `${action.name}${action.at ? ` (from ${action.at})` : ''}`
    case 'checkout':
      return action.ref
    case 'tag':
      return `${action.name}${action.message ? ` · “${action.message}”` : ''}`
    case 'edit_file':
    case 'write_file':
    case 'delete_file':
      return action.path
    case 'merge':
      return action.ref
    case 'rebase':
      return action.onto
    case 'revert':
    case 'cherry_pick':
      return action.hashes.map((hash) => hash.slice(0, 7)).join(', ')
    case 'fetch':
      return action.remote ?? ''
    case 'pull':
      return action.mode ?? ''
    case 'push':
      return [action.remote, action.branch].filter(Boolean).join(' ')
    case 'open_pr':
      return `${action.title} · ${action.source ?? ''} → ${action.target}`
    case 'stack_submit':
      return action.leaf ?? ''
    default:
      return action.files.join(', ')
  }
}
