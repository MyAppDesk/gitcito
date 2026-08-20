import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CircleSlash,
  Copy,
  ExternalLink,
  FlaskConical,
  Loader2,
  Play,
  Square,
  TriangleAlert
} from 'lucide-react'
import type { LocalCiStatus, LocalCiWorkflow } from '../../../shared/localCi'
import { localCiApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

type RunState = { workflow: string; running: boolean; exit: number | null }
type SweepRow = { sha: string; subject: string; state: 'pending' | 'running' | 'pass' | 'fail' }

export function LocalCIModal({ repoPath, rev }: { repoPath: string; rev?: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const enabled = useSettingsStore((s) => s.settings.localCiEnabled)
  const update = useSettingsStore((s) => s.update)
  const [status, setStatus] = useState<LocalCiStatus | null>(null)
  const [workflows, setWorkflows] = useState<LocalCiWorkflow[]>([])
  const [run, setRun] = useState<RunState | null>(null)
  const [log, setLog] = useState('')
  const logRef = useRef<HTMLPreElement>(null)
  // "Test this range": spec + explicit budget, resolved to real commits before
  // anything runs — each commit costs a full workflow run.
  const [spec, setSpec] = useState(rev ?? '')
  const [budget, setBudget] = useState(rev ? 1 : 5)
  const [rangeWf, setRangeWf] = useState('')
  const [rows, setRows] = useState<SweepRow[] | null>(null)
  const [sweepBusy, setSweepBusy] = useState(false)
  const [rangeTotal, setRangeTotal] = useState(0)

  useEffect(() => {
    void localCiApi.status().then(setStatus)
    void localCiApi.workflows(repoPath).then((ws) => {
      setWorkflows(ws)
      setRangeWf((cur) => cur || ws[0]?.file || '')
    })
  }, [repoPath])

  // Live output — subscribed for the modal's lifetime, filtered to this repo.
  useEffect(() => {
    const off = localCiApi.onData((p) => {
      if (p.repoPath !== repoPath) return
      setLog((prev) => prev + p.chunk)
    })
    return off
  }, [repoPath])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const ready = Boolean(enabled && status?.act && status?.docker)

  const start = async (w: LocalCiWorkflow): Promise<void> => {
    setLog('')
    setRun({ workflow: w.file, running: true, exit: null })
    try {
      const exit = await localCiApi.run(repoPath, w.file)
      setRun({ workflow: w.file, running: false, exit })
      // Pin the verdict to HEAD so the graph remembers it — only when the tree
      // is clean, because a dirty run tested something no commit contains.
      if (exit !== null) {
        const rec = await localCiApi.record(repoPath, w.file, exit === 0).catch(() => null)
        if (rec && !rec.recorded) toast('info', t('localCi.notRecorded'))
        if (rec?.recorded) {
          const v = await localCiApi.verdicts(repoPath).catch(() => null)
          if (v) useRepoStore.getState().patch(repoPath, { localCiVerdicts: v })
        }
      }
    } catch (err) {
      setRun(null)
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const cancel = (): void => {
    void localCiApi.cancel(repoPath)
  }

  // Live per-commit progress while a sweep runs.
  useEffect(() => {
    const off = localCiApi.onSweepProgress((p) => {
      if (p.repoPath !== repoPath) return
      setRows((cur) =>
        cur
          ? cur.map((r) =>
              r.sha === p.sha
                ? { ...r, state: p.phase === 'start' ? 'running' : p.ok ? 'pass' : 'fail' }
                : r
            )
          : cur
      )
    })
    return off
  }, [repoPath])

  const previewRange = async (): Promise<void> => {
    try {
      const r = await localCiApi.resolveRange(repoPath, spec, budget)
      setRangeTotal(r.total)
      setRows(r.shas.map((sha) => ({ sha, subject: r.subjects[sha] ?? '', state: 'pending' as const })))
    } catch (err) {
      setRows(null)
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const startSweep = async (): Promise<void> => {
    if (!rows || rows.length === 0 || !rangeWf) return
    setSweepBusy(true)
    setLog('')
    try {
      const result = await localCiApi.sweep(repoPath, rangeWf, rows.map((r) => r.sha))
      const pass = result.results.filter((r) => r.ok).length
      toast(
        result.aborted ? 'info' : pass === result.results.length ? 'success' : 'error',
        interp(t('localCi.sweepDone'), { pass, fail: result.results.length - pass })
      )
      const v = await localCiApi.verdicts(repoPath).catch(() => null)
      if (v) useRepoStore.getState().patch(repoPath, { localCiVerdicts: v })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSweepBusy(false)
    }
  }

  return (
    <div className="localci">
      <h3>
        <FlaskConical size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('localCi.title')}
      </h3>
      <p className="settings-hint">{t('localCi.intro')}</p>

      <label className="snapshots-guard">
        <input type="checkbox" checked={enabled} onChange={(e) => update((s) => ({ ...s, localCiEnabled: e.target.checked }))} />
        {t('localCi.enable')}
      </label>

      {enabled && status && !status.act && (
        <div className="localci-setup">
          <div className="commitedit-banner warn">
            <TriangleAlert size={13} /> {t('localCi.actMissing')}
          </div>
          <p className="settings-hint">{t('localCi.actInstallHint')}</p>
          <div className="localci-install">
            {/* i18n-ignore CLI command, identical in every language */}
            <code>brew install act</code>
            <button
              className="icon-btn"
              title={t('info.copy')}
              onClick={() => void navigator.clipboard.writeText('brew install act')}
            >
              <Copy size={12} />
            </button>
            <button
              className="btn ghost small"
              onClick={() => void window.api.openExternal('https://nektosact.com/installation/')}
            >
              <ExternalLink size={12} /> {t('localCi.actDocs')}
            </button>
          </div>
        </div>
      )}
      {enabled && status?.act && !status.docker && (
        <div className="commitedit-banner warn">
          <TriangleAlert size={13} /> {t('localCi.dockerMissing')}
        </div>
      )}

      {enabled && (
        <div className="localci-workflows">
          {workflows.length === 0 ? (
            <p className="settings-hint">{t('localCi.noWorkflows')}</p>
          ) : (
            workflows.map((w) => {
              const isThis = run?.workflow === w.file
              return (
                <div key={w.file} className="localci-row">
                  <span className="localci-name" title={w.file}>
                    {w.name}
                    <span className="localci-file">{w.file}</span>
                  </span>
                  {isThis && run?.running && <Loader2 size={13} className="spin" />}
                  {isThis && !run?.running && run?.exit === 0 && (
                    <span className="localci-verdict pass">
                      <Check size={12} /> {t('localCi.passed')}
                    </span>
                  )}
                  {isThis && !run?.running && run?.exit !== null && run?.exit !== 0 && (
                    <span className="localci-verdict fail">
                      <CircleSlash size={12} /> {interp(t('localCi.failed'), { code: run.exit })}
                    </span>
                  )}
                  {isThis && run?.running ? (
                    <button className="btn ghost small" onClick={cancel}>
                      <Square size={12} /> {t('localCi.stop')}
                    </button>
                  ) : (
                    <button className="btn primary small" disabled={!ready || run?.running} onClick={() => void start(w)}>
                      <Play size={12} /> {t('localCi.run')}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {enabled && workflows.length > 0 && (
        <div className="localci-range">
          <div className="attrs-section-head">
            <FlaskConical size={13} /> {t('localCi.rangeTitle')}
          </div>
          <p className="settings-hint">{t('localCi.rangeHint')}</p>
          <div className="attrs-add">
            <input
              className="modal-input"
              value={spec}
              spellCheck={false}
              placeholder="main..HEAD" // i18n-ignore a git revision spec, not prose
              onChange={(e) => {
                setSpec(e.target.value)
                setRows(null)
              }}
            />
            <input
              className="modal-input localci-budget"
              type="number"
              min={1}
              max={50}
              value={budget}
              aria-label={t('localCi.budgetLabel')}
              title={t('localCi.budgetLabel')}
              onChange={(e) => {
                setBudget(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                setRows(null)
              }}
            />
            <select value={rangeWf} aria-label={t('localCi.title')} onChange={(e) => setRangeWf(e.target.value)}>
              {workflows.map((w) => (
                <option key={w.file} value={w.file}>
                  {w.name}
                </option>
              ))}
            </select>
            <button className="btn ghost small" disabled={!spec.trim() || sweepBusy} onClick={() => void previewRange()}>
              {t('localCi.preview')}
            </button>
            <button
              className="btn primary small"
              disabled={!rows || rows.length === 0 || sweepBusy || !ready}
              onClick={() => void startSweep()}
            >
              <Play size={12} /> {interp(t('localCi.runRange'), { n: rows?.length ?? 0 })}
            </button>
            {sweepBusy && (
              <button className="btn ghost small" onClick={cancel}>
                <Square size={12} /> {t('localCi.stop')}
              </button>
            )}
          </div>
          {rows && (
            <>
              <p className="settings-hint">
                {rows.length === 0
                  ? t('localCi.rangeEmpty')
                  : interp(t('localCi.rangeCount'), { total: rangeTotal, n: rows.length })}
              </p>
              <div className="localci-sweep-rows">
                {rows.map((r) => (
                  <div key={r.sha} className="attrs-row">
                    <code className="attrs-pattern">{r.sha.slice(0, 7)}</code>
                    <span className="attrs-attrs" title={r.subject}>
                      {r.subject}
                    </span>
                    {r.state === 'running' && <Loader2 size={12} className="spin" />}
                    {r.state === 'pass' && (
                      <span className="localci-verdict pass">
                        <Check size={12} /> {t('localCi.passed')}
                      </span>
                    )}
                    {r.state === 'fail' && (
                      <span className="localci-verdict fail">
                        <CircleSlash size={12} /> {t('localCi.failedShort')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {enabled && (log || run || sweepBusy) && (
        <pre ref={logRef} className="localci-log">
          {log || t('localCi.waiting')}
        </pre>
      )}
    </div>
  )
}
