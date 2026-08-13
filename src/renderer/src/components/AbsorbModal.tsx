import { useEffect, useState } from 'react'
import { GitCommitHorizontal, HelpCircle, Loader2, Magnet } from 'lucide-react'
import type { AbsorbPlan } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useT, interp } from '../i18n'

/**
 * Absorb — route each staged hunk back into the commit that introduced the
 * lines it touches, as a `fixup!`, optionally folding them in straight away.
 * The plan is always recomputed in the main process on apply, so what runs is
 * what the repo says now, not what this dialog was showing a minute ago.
 */
export function AbsorbModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const [plan, setPlan] = useState<AbsorbPlan | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    gitApi
      .absorbPlan(repoPath)
      .then((p) => !cancelled && setPlan(p))
      .catch((err) => {
        if (cancelled) return
        toast('error', err instanceof Error ? err.message : String(err))
        closeModal()
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath])

  const apply = async (rebase: boolean): Promise<void> => {
    setBusy(true)
    try {
      const res = await gitApi.absorbApply(repoPath, { rebase })
      await useRepoStore.getState().refresh(repoPath)
      toast(
        'success',
        res.rebased
          ? interp(t('absorb.doneRebased'), { n: String(res.created) })
          : interp(t('absorb.done'), { n: String(res.created) })
      )
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!plan) {
    return (
      <div className="ab-loading">
        <Loader2 size={20} className="spin" />
      </div>
    )
  }

  const nothing = plan.reason || plan.targets.length === 0

  return (
    <div className="ab-root">
      <div className="ab-head">
        <span className="ab-icon">
          <Magnet size={17} />
        </span>
        <div className="ab-head-text">
          <h3>{t('absorb.title')}</h3>
          <span className="ab-sub">{plan.rangeLabel || t('absorb.subtitle')}</span>
        </div>
      </div>

      {nothing ? (
        <div className="ab-empty">
          {plan.reason === 'no-staged'
            ? t('absorb.emptyNoStaged')
            : plan.reason === 'no-commits'
              ? t('absorb.emptyNoCommits')
              : plan.reason === 'in-progress'
                ? t('absorb.emptyInProgress')
                : t('absorb.emptyNoMatch')}
        </div>
      ) : (
        <div className="ab-body">
          {plan.targets.map((target) => (
            <div key={target.sha} className="ab-target">
              <div className="ab-target-head">
                <GitCommitHorizontal size={13} className="ab-target-icon" />
                <code className="ab-sha">{target.sha.slice(0, 7)}</code>
                <span className="ab-subject" title={target.subject}>
                  {target.subject}
                </span>
                <span className="ab-count">{interp(t('absorb.hunkCount'), { n: String(target.hunks.length) })}</span>
              </div>
              {target.hunks.map((h) => (
                <div key={`${h.file}${h.header}`} className="ab-hunk">
                  <span className="ab-file" title={h.file}>
                    {h.file}
                  </span>
                  <code className="ab-header">{h.header}</code>
                  {h.added > 0 && <span className="ab-add">+{h.added}</span>}
                  {h.removed > 0 && <span className="ab-del">−{h.removed}</span>}
                </div>
              ))}
            </div>
          ))}

          {plan.unmatched.length > 0 && (
            <div className="ab-target unmatched">
              <div className="ab-target-head">
                <HelpCircle size={13} className="ab-target-icon" />
                <span className="ab-subject">{t('absorb.unmatched')}</span>
                <span className="ab-count">
                  {interp(t('absorb.hunkCount'), { n: String(plan.unmatched.length) })}
                </span>
              </div>
              {plan.unmatched.map((h) => (
                <div key={`${h.file}${h.header}`} className="ab-hunk">
                  <span className="ab-file" title={h.file}>
                    {h.file}
                  </span>
                  <code className="ab-header">{h.header}</code>
                  {h.added > 0 && <span className="ab-add">+{h.added}</span>}
                  {h.removed > 0 && <span className="ab-del">−{h.removed}</span>}
                </div>
              ))}
              <span className="ab-note">{t('absorb.unmatchedHint')}</span>
            </div>
          )}
        </div>
      )}

      <div className="ab-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        {!nothing && (
          <>
            <button className="btn ghost" disabled={busy} onClick={() => void apply(false)}>
              {t('absorb.createFixups')}
            </button>
            <button className="btn primary" disabled={busy} onClick={() => void apply(true)}>
              {busy ? <Loader2 size={13} className="spin" /> : <Magnet size={13} />}
              {t('absorb.createAndRebase')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
