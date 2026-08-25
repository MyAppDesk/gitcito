import { useState } from 'react'
import { GitPullRequest, Loader2, ExternalLink, Layers, ArrowRight, Check } from 'lucide-react'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useRepoStore, repoActions, type StackSubmitResult } from '../stores/repo'
import { useT, interp } from '../i18n'

/**
 * Submitting a stack, on one screen: what is about to happen, what is happening
 * while it does, and what came out of it.
 *
 * It replaced a confirm dialog that closed the stack modal behind it and left
 * nothing on screen afterwards — four pull requests and a GitHub stack appeared
 * somewhere, and the only trace was a toast. The links are the point: this is
 * the moment a reviewer's URL is worth having.
 */
export function StackSubmitModal({ spec }: { spec: Extract<ModalSpec, { kind: 'stack-submit' }> }): React.JSX.Element {
  const t = useT()
  const busy = useUIStore((s) => s.busy)
  const closeModal = useUIStore((s) => s.closeModal)
  const repo = useRepoStore((s) => s.repos[spec.repoPath])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<StackSubmitResult | null>(null)
  const [failed, setFailed] = useState(false)

  const remote = repo?.remotes.find((r) => r.name === 'origin')?.name ?? repo?.remotes[0]?.name ?? 'origin'

  const run = async (): Promise<void> => {
    setRunning(true)
    setFailed(false)
    try {
      const outcome = await repoActions.submitStack(spec.repoPath, spec.leaf)
      setResult(outcome)
      // A null outcome means the run failed and has already said why; keep the
      // screen open on the plan so the button can be pressed again.
      setFailed(!outcome)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="stack-submit">
      <h3>
        <GitPullRequest size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {result ? t('stack.resultTitle') : t('stack.submitConfirmTitle')}
      </h3>

      {!result && (
        <>
          <p className="settings-hint">
            {interp(t('stack.submitConfirmMessage'), {
              create: spec.create,
              retarget: spec.retarget,
              remote
            })}
          </p>
          <div className="stack-plan">
            {spec.lines.map((line) => (
              <div key={line} className="stack-plan-row">
                <ArrowRight size={12} /> {line}
              </div>
            ))}
          </div>
        </>
      )}

      {running && (
        <p className="stack-progress">
          <Loader2 size={14} className="spin" /> {busy ?? t('stack.stepPrepare')}
        </p>
      )}

      {result && (
        <>
          <p className="settings-hint">
            {interp(t('stack.submitReport'), {
              created: result.entries.filter((e) => e.action === 'create').length,
              retargeted: result.entries.filter((e) => e.action === 'retarget').length
            })}
          </p>

          {result.stack && (
            <button
              className="stack-result-stack"
              onClick={() => result.stack?.url && void window.api.openExternal(result.stack.url)}
              disabled={!result.stack.url}
            >
              <Layers size={13} />
              {interp(t('stack.registered'), { n: result.stack.number })}
              {result.stack.url && <ExternalLink size={12} />}
            </button>
          )}

          <div className="stack-result-list">
            {result.entries.map((e) => (
              <button
                key={e.number}
                className="stack-result-row"
                onClick={() => e.url && void window.api.openExternal(e.url)}
                disabled={!e.url}
                title={e.url}
              >
                {/* i18n-ignore GitHub's own PR numbering */}
                <span className="stack-result-num">#{e.number}</span>
                <span className="stack-result-branch">{e.branch}</span>
                <ArrowRight size={11} className="stack-result-arrow" />
                <span className="stack-result-base">{e.base}</span>
                <span className={`stack-badge ${e.action === 'create' ? 'current' : ''}`}>
                  {t(e.action === 'create' ? 'stack.resultOpened' : e.action === 'retarget' ? 'stack.resultRetargeted' : 'stack.resultUnchanged')}
                </span>
                {e.url && <ExternalLink size={12} className="stack-result-open" />}
              </button>
            ))}
          </div>

          {result.pruned.length > 0 && (
            <p className="settings-hint">{interp(t('act.stackPruned'), { branches: result.pruned.join(', ') })}</p>
          )}
        </>
      )}

      <div className="modal-actions">
        {!result ? (
          <>
            <button className="btn ghost" onClick={closeModal} disabled={running}>
              {t('common.cancel')}
            </button>
            <button className="btn primary" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 size={13} className="spin" /> : <GitPullRequest size={13} />}{' '}
              {failed ? t('stack.retrySubmit') : t('stack.submitConfirmOk')}
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={closeModal}>
            <Check size={13} /> {t('common.done')}
          </button>
        )}
      </div>
    </div>
  )
}
