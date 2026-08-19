import type { RepoChatSource, RepoStatus } from '../../../shared/types'

export interface RightPanelDetailsState {
  available: boolean
  selectWip: boolean
}

export type RightPanelToggleAction = 'open-chat' | 'close-all' | 'show-required-details'

/**
 * Chat is an AI feature: with AI off, or chat switched off on its own, the tab,
 * the toolbar button and the shortcut target all disappear rather than offering
 * something that cannot answer.
 */
export function repoChatAvailable(ai: { enabled?: boolean; repoChat?: boolean } | null): boolean {
  return !!ai && ai.enabled !== false && ai.repoChat !== false
}

/** Decide the global right-column toggle without coupling it to Zustand. */
export function rightPanelToggleAction(
  hasSelection: boolean,
  forceConflict: boolean,
  chatPanelOpen: boolean,
  chatAvailable = true
): RightPanelToggleAction {
  if (forceConflict) return 'show-required-details'
  if (hasSelection || chatPanelOpen) return 'close-all'
  return chatAvailable ? 'open-chat' : 'close-all'
}

/**
 * WIP is valid Details content even before the graph row has been selected.
 * Keep availability separate from panel visibility so dirty repos do not open
 * the right column until the user asks for Chat or selects a graph row.
 */
export function rightPanelDetailsState(
  hasSelection: boolean,
  forceConflict: boolean,
  status: Pick<RepoStatus, 'staged' | 'unstaged' | 'conflicted'> | null
): RightPanelDetailsState {
  const hasWip =
    (status?.staged.length ?? 0) +
      (status?.unstaged.length ?? 0) +
      (status?.conflicted.length ?? 0) >
    0
  return {
    available: hasSelection || forceConflict || hasWip,
    selectWip: !hasSelection && !forceConflict && hasWip
  }
}

/** Translate a grounded chat citation into the existing file-view request. */
export function repoChatSourceView(repoPath: string, source: RepoChatSource) {
  return {
    repoPath,
    file: source.path,
    source: { type: 'tree' as const },
    mode: 'file' as const,
    line: source.startLine
  }
}

/** Keep the composer keyboard rule testable without rendering the Electron UI. */
export function shouldSubmitRepoChatOnKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'isComposing'>
): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing
}

/** Keep the composer rules testable without rendering the Electron UI. */
export function canSubmitRepoChat(enabled: boolean, pending: boolean, draft: string): boolean {
  return enabled && !pending && draft.trim().length > 0
}
