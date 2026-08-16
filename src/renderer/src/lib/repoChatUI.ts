import type { RepoChatSource } from '../../../shared/types'

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
