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
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

type RunState = { workflow: string; running: boolean; exit: number | null }

export function LocalCIModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const enabled = useSettingsStore((s) => s.settings.localCiEnabled)
  const update = useSettingsStore((s) => s.update)
  const [status, setStatus] = useState<LocalCiStatus | null>(null)
  const [workflows, setWorkflows] = useState<LocalCiWorkflow[]>([])
  const [run, setRun] = useState<RunState | null>(null)
  const [log, setLog] = useState('')
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    void localCiApi.status().then(setStatus)
    void localCiApi.workflows(repoPath).then(setWorkflows)
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
    } catch (err) {
      setRun(null)
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const cancel = (): void => {
    void localCiApi.cancel(repoPath)
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

      {enabled && (log || run) && (
        <pre ref={logRef} className="localci-log">
          {log || t('localCi.waiting')}
        </pre>
      )}
    </div>
  )
}
