import { useCallback, useEffect, useState } from 'react'
import { Bug, Check, X, SkipForward, Loader2, Crosshair, Play, Square, Terminal } from 'lucide-react'
import type { BisectStatus } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useT, interp } from '../i18n'

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
  const t = useT()

  const [status, setStatus] = useState<BisectStatus>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [goodRev, setGoodRev] = useState('')
  // `git bisect run`: one command, run at every step, judged by its exit code.
  const [command, setCommand] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [scripts, setScripts] = useState<string[]>([])

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

  // The run streams; without this the window looks hung for the whole search.
  useEffect(() => window.api.onBisectOutput((chunk) => setOutput((prev) => (prev + chunk).slice(-20000))), [])

  // Offer this project's own test commands rather than guessing at one.
  useEffect(() => {
    void gitApi
      .fileContent(repoPath, 'package.json')
      .then((raw) => {
        const parsed = JSON.parse(raw) as { scripts?: Record<string, string> }
        setScripts(Object.keys(parsed.scripts ?? {}).filter((name) => /test|check|lint|build/.test(name)))
      })
      .catch(() => setScripts([]))
  }, [repoPath])

  const runScript = async (): Promise<void> => {
    setRunning(true)
    setOutput('')
    try {
      const next = await gitApi.bisectRunScript(repoPath, command)
      setStatus(next)
      await refreshRepo()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

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
        {t('bisect.title')}
      </h3>
      <p className="bisect-sub">
        {t('bisect.intro')}
      </p>

      {loading ? (
        <div className="bisect-empty">
          <Loader2 size={15} className="spin" /> {t('bisect.loading')}
        </div>
      ) : !status.inProgress ? (
        <div className="bisect-stage">
          <p>{t('bisect.idle')}</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              {t('bisect.cancel')}
            </button>
            <button className="btn primary" onClick={start} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : <Crosshair size={14} />} {t('bisect.start')}
            </button>
          </div>
        </div>
      ) : status.finished ? (
        <div className="bisect-stage">
          <div className="bisect-result">
            <Crosshair size={15} />
            <div>
              <strong>{t('bisect.foundTitle')}</strong>
              <div className="bisect-result-sha">
                <code>{status.firstBadSha.slice(0, 10)}</code> {status.firstBadSubject}
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn primary" onClick={reset} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : null} {t('bisect.finish')}
            </button>
          </div>
        </div>
      ) : seeding ? (
        <div className="bisect-stage">
          <p className="bisect-step">
            {status.needBad
              ? t('bisect.step1')
              : t('bisect.step2')}
          </p>
          {status.needBad && (
            <button className="btn bad" onClick={() => mark('bad')} disabled={busy}>
              <X size={14} /> {t('bisect.currentBad')}
            </button>
          )}
          {status.needGood && (
            <div className="bisect-goodseed">
              <input
                className="modal-input"
                placeholder={t('bisect.goodPlaceholder')}
                value={goodRev}
                onChange={(e) => setGoodRev(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && goodRev.trim()) void mark('good', goodRev.trim())
                }}
              />
              <button className="btn good" onClick={() => mark('good', goodRev.trim())} disabled={busy || !goodRev.trim()}>
                <Check size={14} /> {t('bisect.markGood')}
              </button>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn ghost danger" onClick={reset} disabled={busy}>
              {t('bisect.abort')}
            </button>
          </div>
        </div>
      ) : narrowing ? (
        <div className="bisect-stage">
          <div className="bisect-candidate">
            <span className="bisect-testing">{t('bisect.testing')}</span>
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
          <p className="bisect-step">{t('bisect.instruction')}</p>
          <div className="bisect-verdict">
            <button className="btn good" onClick={() => mark('good')} disabled={busy}>
              <Check size={14} /> {t('bisect.good')}
            </button>
            <button className="btn bad" onClick={() => mark('bad')} disabled={busy}>
              <X size={14} /> {t('bisect.bad')}
            </button>
            <button className="btn ghost" onClick={() => mark('skip')} disabled={busy} title={t('bisect.skipTitle')}>
              <SkipForward size={14} /> {t('bisect.skip')}
            </button>
          </div>
          <div className="bisect-auto">
            <div className="bisect-auto-head">
              <Terminal size={13} /> {t('bisect.autoTitle')}
            </div>
            <p className="settings-hint">{t('bisect.autoHint')}</p>
            {scripts.length > 0 && (
              <div className="bisect-scripts">
                {scripts.slice(0, 6).map((name) => (
                  <button key={name} className="btn ghost tiny" onClick={() => setCommand(`npm run ${name}`)}>
                    {`npm run ${name}`}
                  </button>
                ))}
              </div>
            )}
            <div className="bisect-auto-row">
              <input
                className="modal-input"
                value={command}
                spellCheck={false}
                placeholder="npm test" // i18n-ignore an example shell command
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && command.trim() && !running) void runScript()
                }}
              />
              {running ? (
                <button className="btn ghost" onClick={() => void gitApi.bisectCancel(repoPath)}>
                  <Square size={13} /> {t('bisect.stop')}
                </button>
              ) : (
                <button className="btn primary" disabled={!command.trim() || busy} onClick={() => void runScript()}>
                  <Play size={13} /> {t('bisect.runIt')}
                </button>
              )}
            </div>
            {output && <pre className="bisect-output">{output}</pre>}
          </div>
          <div className="modal-actions">
            <button className="btn ghost danger" onClick={reset} disabled={busy || running}>
              {t('bisect.abort')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
