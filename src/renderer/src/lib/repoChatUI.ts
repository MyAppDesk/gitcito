import type { RepoChatSource, RepoStatus } from '../../../shared/types'

export interface RightPanelDetailsState {
  available: boolean
  selectWip: boolean
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

/** Keep the composer rules testable without rendering the Electron UI. */
export function canSubmitRepoChat(enabled: boolean, pending: boolean, draft: string): boolean {
  return enabled && !pending && draft.trim().length > 0
}
