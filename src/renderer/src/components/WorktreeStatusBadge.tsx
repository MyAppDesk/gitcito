import { useEffect, useState } from 'react'
import { gitApi } from '../infrastructure/api'
import { useT, interp } from '../i18n'
import type { WorktreeInfo, WorktreeStatus } from '../../../shared/types'

/**
 * Uncommitted changes and ahead/behind for one linked worktree's sidebar row.
 *
 * The repo refresh only knows about the checkout it is looking at; another
 * worktree's state needs a `git status` inside that folder. That is one process
 * per row, so it runs when the row mounts (the section is open), when the
 * worktree's HEAD moves, and when the window regains focus — the moment the
 * user may have been working in it elsewhere — never on the refresh tick.
 */
// Every row listens for focus, so alt-tabbing back would spawn one `git status`
// per worktree each time; skip a row whose status is still fresh.
const FOCUS_REFETCH_MS = 5000
const loadedAt = new Map<string, number>()

export function WorktreeStatusBadge({ repoPath, worktree }: { repoPath: string; worktree: WorktreeInfo }): React.JSX.Element | null {
  const t = useT()
  const [status, setStatus] = useState<WorktreeStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      loadedAt.set(worktree.path, Date.now())
      gitApi
        .getWorktreeStatus(repoPath, worktree.path)
        .then((s) => !cancelled && setStatus(s))
        .catch(() => !cancelled && setStatus(null))
    }
    const onFocus = (): void => {
      if (Date.now() - (loadedAt.get(worktree.path) ?? 0) >= FOCUS_REFETCH_MS) load()
    }
    load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [repoPath, worktree.path, worktree.head])

  if (!status) return null
  const upstream = status.upstream ?? ''
  return (
    <>
      {status.changes > 0 && (
        <span className="badge dirty" title={interp(t('worktree.changesTitle'), { count: String(status.changes) })}>
          {/* i18n-ignore a count with a bullet glyph, no words */}
          ●{status.changes}
        </span>
      )}
      {status.ahead > 0 && (
        <span className="badge ahead" title={interp(t('worktree.aheadTitle'), { upstream, count: String(status.ahead) })}>
          {/* i18n-ignore arrow glyph and a count */}
          ↑{status.ahead}
        </span>
      )}
      {status.behind > 0 && (
        <span className="badge behind" title={interp(t('worktree.behindTitle'), { upstream, count: String(status.behind) })}>
          {/* i18n-ignore arrow glyph and a count */}
          ↓{status.behind}
        </span>
      )}
    </>
  )
}
