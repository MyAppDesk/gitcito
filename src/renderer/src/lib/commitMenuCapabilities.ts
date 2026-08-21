import type { RemoteInfo } from '../../../shared/types'
import { githubCommitUrl } from './hosting'

/** Git-derived facts for one commit, plus UI-only inflight state. */
export type CommitMenuInput = {
  isHead: boolean
  isOnLocalBranch: boolean
  isPublished: boolean
  isAncestorOfHead: boolean
  isWithinResetBoundary: boolean
  operationInProgress: boolean
  mutationInFlight: boolean
  githubCommitUrl: string | null
}

export type CommitMenuCapabilities = {
  isHead: boolean
  isOnLocalBranch: boolean
  isPublished: boolean
  isAncestorOfHead: boolean
  isWithinResetBoundary: boolean
  operationInProgress: boolean
  mutationInFlight: boolean
  githubCommitUrl: string | null
  canAmend: boolean
  canUndo: boolean
  canReset: boolean
  canViewOnGitHub: boolean
}

export type CommitMenuAction = 'amend' | 'undo' | 'reset' | 'viewOnGitHub'

/** Stable i18n keys for disabled-state titles. The caller renders via `t()`. */
export type CommitMenuDisabledKey =
  | 'commitMenu.disabled.notHead'
  | 'commitMenu.disabled.detached'
  | 'commitMenu.disabled.published'
  | 'commitMenu.disabled.notAncestor'
  | 'commitMenu.disabled.beyondReset'
  | 'commitMenu.disabled.operation'
  | 'commitMenu.disabled.inflight'
  | 'commitMenu.disabled.notOnGitHub'

/**
 * Decide which rewrite / hosting actions are safe for a single-commit menu.
 * Conditions stay here — not in JSX — so the matrix is unit-testable.
 */
export function commitMenuCapabilities(input: CommitMenuInput): CommitMenuCapabilities {
  const blocked = input.operationInProgress || input.mutationInFlight
  const onBranch = input.isOnLocalBranch && !blocked
  return {
    ...input,
    canAmend: onBranch && input.isHead,
    canUndo: onBranch && input.isHead && !input.isPublished,
    canReset: onBranch && !input.isHead && input.isAncestorOfHead && input.isWithinResetBoundary,
    canViewOnGitHub: input.isPublished && !!input.githubCommitUrl
  }
}

/** Why a menu row is disabled, or null when the action is enabled. */
export function commitMenuDisabledKey(
  caps: CommitMenuCapabilities,
  action: CommitMenuAction
): CommitMenuDisabledKey | null {
  const enabled =
    action === 'amend'
      ? caps.canAmend
      : action === 'undo'
        ? caps.canUndo
        : action === 'reset'
          ? caps.canReset
          : caps.canViewOnGitHub
  if (enabled) return null
  if (action === 'viewOnGitHub') return 'commitMenu.disabled.notOnGitHub'
  if (caps.operationInProgress) return 'commitMenu.disabled.operation'
  if (caps.mutationInFlight) return 'commitMenu.disabled.inflight'
  if (!caps.isOnLocalBranch) return 'commitMenu.disabled.detached'
  if (action === 'amend' || action === 'undo') {
    if (!caps.isHead) return 'commitMenu.disabled.notHead'
    if (action === 'undo' && caps.isPublished) return 'commitMenu.disabled.published'
    return 'commitMenu.disabled.notHead'
  }
  if (!caps.isAncestorOfHead) return 'commitMenu.disabled.notAncestor'
  if (caps.isHead) return 'commitMenu.disabled.notHead'
  if (!caps.isWithinResetBoundary) return 'commitMenu.disabled.beyondReset'
  return 'commitMenu.disabled.notAncestor'
}

/** Split a full commit message into composer summary + body. */
export function splitCommitMessage(message: string): { summary: string; description: string } {
  const text = message.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
  const nl = text.indexOf('\n')
  if (nl < 0) return { summary: text, description: '' }
  return {
    summary: text.slice(0, nl).trimEnd(),
    description: text.slice(nl + 1).replace(/^\n+/, '').replace(/\n+$/, '')
  }
}

/** GitHub commit URL for a sha, or null when no github.com remote exists. */
export function commitGitHubUrl(remotes: RemoteInfo[], sha: string): string | null {
  return githubCommitUrl(remotes, sha)
}
