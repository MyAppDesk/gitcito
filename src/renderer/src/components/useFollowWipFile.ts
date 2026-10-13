import { useEffect, useRef } from 'react'
import { gitApi } from '../infrastructure/api'
import { useRepoStore } from '../stores/repo'
import { useUIStore, type FileViewState } from '../stores/ui'
import { followCommitFile, followWipFile, headMove, headOf, type HeadSnapshot } from '../lib/wipFileFollow'

/**
 * Keeps an open file pointed at where the file actually is, whatever moved it
 * — this app, a terminal, or an agent — so the chip in the viewer's header
 * always tells the truth: Unstaged, Staged, or the commit that holds it.
 *
 * A working change staged or unstaged elsewhere flips side; committed, it
 * follows into the commit; discarded or stashed, the view closes, there being
 * nothing to show. At a commit that is undone, it returns to the side the
 * change landed on — or closes, if the undo threw the changes away; at a HEAD
 * that is amended or reworded, it moves on to the new HEAD.
 *
 * Paused while the editor is open, so an unsaved draft is never pulled out
 * from under the person typing it.
 */
export function useFollowWipFile(view: FileViewState, editing: boolean): void {
  const { repoPath, file, source } = view
  const status = useRepoStore((s) => s.repos[repoPath]?.status ?? null)
  const commits = useRepoStore((s) => s.repos[repoPath]?.commits)
  const branches = useRepoStore((s) => s.repos[repoPath]?.branches)
  // Where HEAD was the last time this view looked. A commit view follows only
  // the commit HEAD was on, and only when HEAD moves off it — undone, or
  // amended. Judged by HEAD, not by the log: a stash keeps the commit it was
  // taken on in the log after that commit has been undone.
  const lastSeen = useRef<HeadSnapshot>({ commits: commits ?? [], branches })
  const headCommit = commits ? headOf({ commits, branches })?.hash : undefined
  // HEAD as of the last time the file was still a working change. When the file
  // leaves, HEAD having moved since means it was committed (follow it into the
  // commit); HEAD where it was means it was discarded (close). Without this a
  // discarded file whose last commit had touched it would follow into that
  // commit — an old change, shown as if it were where the work went.
  const headWhileWip = useRef<string | undefined>(headCommit)

  useEffect(() => {
    if (!commits) return
    const now: HeadSnapshot = { commits, branches }
    const move = headMove(lastSeen.current, now)
    lastSeen.current = now
    if (editing || !status) return
    const ui = useUIStore.getState()
    // Only act on the view a decision was made for — the user may have opened
    // another file, or closed this one, while git was answering.
    const stillOpen = (): boolean => useUIStore.getState().fileView === view
    const headIfItHas = async (): Promise<string | null> => {
      const head = await gitApi.resolveRev(repoPath, 'HEAD').catch(() => null)
      const files = head ? await gitApi.commitFiles(repoPath, head).catch(() => []) : []
      return head && files.some((f) => f.path === file) ? head : null
    }
    let cancelled = false
    const cancel = (): void => {
      cancelled = true
    }

    if (source.type === 'commit') {
      const left =
        move.kind !== 'none' && move.from.hash === source.hash && (move.kind === 'undone' || move.kind === 'amended')
      const next = followCommitFile(file, left, move.kind === 'undone', status)
      if (next.kind === 'keep') return
      if (next.kind === 'close') {
        ui.setFileView(null)
        return
      }
      if (next.kind === 'move') {
        ui.setFileView({ ...view, source: next.source })
        return
      }
      void (async () => {
        const head = await headIfItHas()
        if (cancelled || !stillOpen()) return
        // Rewritten without this file: it is no longer part of the commit.
        ui.setFileView(head ? { ...view, source: { type: 'commit', hash: head } } : null)
      })()
      return cancel
    }

    if (source.type !== 'wip') return
    const next = followWipFile(source, file, status)
    if (next.kind !== 'left') headWhileWip.current = headCommit
    if (next.kind === 'keep') return
    if (next.kind === 'move') {
      ui.setFileView({ ...view, source: next.source })
      return
    }
    const headBefore = headWhileWip.current
    void (async () => {
      const head = await headIfItHas()
      if (cancelled || !stillOpen()) return
      // HEAD unmoved: the change was discarded or stashed, not committed.
      ui.setFileView(head && head !== headBefore ? { ...view, source: { type: 'commit', hash: head } } : null)
    })()
    return cancel
  }, [view, status, headCommit, commits, branches, editing, repoPath, file, source])
}
