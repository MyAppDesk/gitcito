import { useCallback, useEffect, useState } from 'react'
import { Bug, Check, X, SkipForward, Loader2, Crosshair } from 'lucide-react'
import type { BisectStatus } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'

const EMPTY: BisectStatus = {
  inProgress: false,
  needGood: false,
  needBad: false,
  currentSha: '',
  currentSubject: '',
  remainingSteps: -1,
  finished: false,
  firstBadSha: '',
  firstBadSubject: ''
}

export function BisectModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)

  const [status, setStatus] = useState<BisectStatus>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [goodRev, setGoodRev] = useState('')

  const refreshRepo = useCallback(() => useRepoStore.getState().refresh(repoPath), [repoPath])

  // Wrap a bisect call: set busy, apply the new status, refresh the graph (HEAD moves).
  const run = useCallback(
    async (fn: () => Promise<BisectStatus>): Promise<void> => {
      setBusy(true)
      try {
        const next = await fn()
        setStatus(next)
        await refreshRepo()
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [refreshRepo, toast]
  )

  useEffect(() => {
    let cancelled = false
    gitApi
      .bisectStatus(repoPath)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [repoPath])

  const start = (): Promise<void> => run(() => gitApi.bisectStart(repoPath))
  const mark = (term: 'good' | 'bad' | 'skip', rev?: string): Promise<void> =>
    run(() => gitApi.bisectMark(repoPath, term, rev))
  const reset = async (): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.bisectReset(repoPath)
      await refreshRepo()
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const seeding = status.inProgress && (status.needGood || status.needBad)
  const narrowing = status.inProgress && !seeding && !status.finished

  return (
    <>
      <h3>
        <Bug size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Bisect
      </h3>
      <p className="bisect-sub">
        Binary-search your history for the commit that introduced a bug: mark commits good or bad and git
        narrows the range, checking out each candidate for you to test.
      </p>

      {loading ? (
        <div className="bisect-empty">
          <Loader2 size={15} className="spin" /> Checking bisect state…
        </div>
      ) : !status.inProgress ? (
        <div className="bisect-stage">
          <p>No bisect in progress. Start one, then mark the current commit and a known-good commit.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            <button className="btn primary" onClick={start} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : <Crosshair size={14} />} Start bisect
            </button>
          </div>
        </div>
      ) : status.finished ? (
        <div className="bisect-stage">
          <div className="bisect-result">
            <Crosshair size={15} />
            <div>
              <strong>First bad commit found</strong>
              <div className="bisect-result-sha">
                <code>{status.firstBadSha.slice(0, 10)}</code> {status.firstBadSubject}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn primary" onClick={reset} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : null} Finish &amp; restore HEAD
            </button>
          </div>
        </div>
      ) : seeding ? (
        <div className="bisect-stage">
          <p className="bisect-step">
            {status.needBad
              ? 'Step 1 — mark a bad commit (where the bug exists, usually the current HEAD).'
              : 'Step 2 — mark a known-good commit (an older commit without the bug).'}
          </p>
          {status.needBad && (
            <button className="btn bad" onClick={() => mark('bad')} disabled={busy}>
              <X size={14} /> Current commit (HEAD) is bad
            </button>
          )}
          {status.needGood && (
            <div className="bisect-goodseed">
              <input
                className="modal-input"
                placeholder="Known-good commit (SHA / tag / branch)"
                value={goodRev}
                onChange={(e) => setGoodRev(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && goodRev.trim()) void mark('good', goodRev.trim())
                }}
              />
              <button className="btn good" onClick={() => mark('good', goodRev.trim())} disabled={busy || !goodRev.trim()}>
                <Check size={14} /> Mark good
              </button>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn ghost danger" onClick={reset} disabled={busy}>
              Abort bisect
            </button>
          </div>
        </div>
      ) : narrowing ? (
        <div className="bisect-stage">
          <div className="bisect-candidate">
            <span className="bisect-testing">Testing now</span>
            <code>{status.currentSha.slice(0, 10)}</code>
            <span className="bisect-cand-subject" title={status.currentSubject}>
              {status.currentSubject}
            </span>
          </div>
          {status.remainingSteps >= 0 && (
            <p className="bisect-remaining">
              ~{status.remainingSteps} step{status.remainingSteps === 1 ? '' : 's'} left
            </p>
          )}
          <p className="bisect-step">Check out and test this commit, then tell git whether it&apos;s good or bad:</p>
          <div className="bisect-verdict">
            <button className="btn good" onClick={() => mark('good')} disabled={busy}>
              <Check size={14} /> Good
            </button>
            <button className="btn bad" onClick={() => mark('bad')} disabled={busy}>
              <X size={14} /> Bad
            </button>
            <button className="btn ghost" onClick={() => mark('skip')} disabled={busy} title="Can't test this commit">
              <SkipForward size={14} /> Skip
            </button>
          </div>
          <div className="modal-actions">
            <button className="btn ghost danger" onClick={reset} disabled={busy}>
              Abort bisect
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
