// Deciding whether closing a tab needs a warning — and which one — is the same
// question for the X button, middle-click, the context menu and Cmd/Ctrl+W. It
// lives here so there is one answer, and so it can be tested without a DOM.
//
// Following the LintHint convention, this returns dictionary keys rather than
// rendered copy: the caller translates, which keeps the logic locale-agnostic.

import type { RepoRef, TabState } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

export type TabStatus = 'conflict' | 'wip' | null

/** The slice of a loaded repo that decides whether closing it loses anything. */
export type CloseRepoSnapshot = {
  mergeState: unknown
  status: { conflicted: unknown[]; staged: unknown[]; unstaged: unknown[] } | null
}

/** What you would lose by closing this repo. A conflict outranks uncommitted work. */
export function repoCloseStatus(data: CloseRepoSnapshot | undefined): TabStatus {
  if (!data) return null
  if (data.mergeState || (data.status?.conflicted.length ?? 0) > 0) return 'conflict'
  if ((data.status?.staged.length ?? 0) + (data.status?.unstaged.length ?? 0) > 0) return 'wip'
  return null
}

/** The worst status across every repo a tab carries. */
export function tabCloseStatus(
  repos: RepoRef[],
  byPath: Record<string, CloseRepoSnapshot | undefined>
): TabStatus {
  let wip = false
  for (const ref of repos) {
    const status = repoCloseStatus(byPath[ref.path])
    if (status === 'conflict') return 'conflict'
    if (status === 'wip') wip = true
  }
  return wip ? 'wip' : null
}

export type CloseTabPrompt = {
  titleKey: TranslationKey
  messageKey: TranslationKey
  /** Group messages name the tab and count its repos; repo messages take none. */
  vars?: { name: string; count: number }
  /** Names what is at risk, interpolated into `{reason}` of a group message. */
  reasonKey?: TranslationKey
  status: TabStatus
  /**
   * Enter confirms only when nothing is at stake. The warning exists to slow you
   * down on a dirty or conflicted tab; focusing its destructive button would let
   * a stray Enter — the one right after Cmd/Ctrl+W — walk straight through it.
   */
  autoFocusConfirm: boolean
}

/** The confirmation a close needs, or null when the tab may just go. */
export function closeTabPrompt(
  tab: TabState,
  status: TabStatus,
  warnOnClose: 'always' | 'wip' | 'never' | undefined
): CloseTabPrompt | null {
  // A page tab holds no repository state, so there is never anything to lose.
  if (tab.kind === 'page') return null
  const warn = warnOnClose ?? 'always'
  if (warn === 'never' || (warn === 'wip' && status === null)) return null

  const autoFocusConfirm = status === null
  if (tab.kind === 'group') {
    const count = tab.repos.length
    // A one-repo group reads better as a plain repo message than as a group one.
    if (count > 1) {
      const vars = { name: tab.name, count }
      return status
        ? {
            titleKey: 'titlebar.closeGroupTitle',
            messageKey: 'titlebar.closeGroupDirty',
            vars,
            reasonKey:
              status === 'conflict' ? 'titlebar.mergeConflicts' : 'titlebar.uncommittedChanges',
            status,
            autoFocusConfirm
          }
        : {
            titleKey: 'titlebar.closeGroupTitle',
            messageKey: 'titlebar.closeGroup',
            vars,
            status,
            autoFocusConfirm
          }
    }
  }

  return {
    titleKey: tab.kind === 'group' ? 'titlebar.closeGroupTitle' : 'titlebar.closeTab',
    messageKey:
      status === 'conflict'
        ? 'titlebar.closeRepoConflicts'
        : status === 'wip'
          ? 'titlebar.closeRepoWip'
          : 'titlebar.closeTabConfirm',
    status,
    autoFocusConfirm
  }
}
