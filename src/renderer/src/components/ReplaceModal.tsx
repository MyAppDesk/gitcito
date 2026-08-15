import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, GitGraph, Loader2, Scissors, Trash2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { RefPicker, type RefOption } from './RefPicker'
import type { ReplaceStatus } from '../../../shared/types'
import { useT, interp } from '../i18n'

/**
 * `git replace`: telling git to read one object wherever another was asked for.
 *
 * The use worth knowing is grafting. Graft a commit onto no parents and the
 * history before it disappears from every walk — a clone that ships a year of
 * history instead of ten, with nothing rewritten and no sha changed. Point the
 * graft at an archive repository's tip instead and the whole history comes
 * back, on demand.
 *
 * It is also the one feature here that makes what you see differ from what is
 * stored, which is why the dialog says so out loud.
 */
export function ReplaceModal({ repoPath, commit }: { repoPath: string; commit?: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const [status, setStatus] = useState<ReplaceStatus | null>(null)
  const [target, setTarget] = useState(commit ?? '')
  const [parents, setParents] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setStatus(await gitApi.replacements(repoPath).catch(() => null))
  }, [repoPath])

  useEffect(() => {
    void load()
  }, [load])

  const refOptions: RefOption[] = [
    ...(repo?.branches.locals ?? []).map((b) => ({ value: b.name, kind: 'local' as const })),
    ...(repo?.branches.tags ?? []).map((tg) => ({ value: tg.name, kind: 'tag' as const }))
  ]

  const graft = (): void => {
    if (!target.trim()) return
    const list = parents.split(/[\s,]+/).filter(Boolean)
    const run = (): void => {
      setBusy(true)
      void repoActions
        .replaceGraft(repoPath, target.trim(), list)
        .then(() => load())
        .finally(() => setBusy(false))
    }
    // Grafting to no parents hides history rather than deleting it, and that
    // distinction is exactly what people get wrong — so it is spelled out.
    if (list.length) {
      run()
      return
    }
    openModal({
      kind: 'confirm',
      title: t('replace.rootTitle'),
      message: interp(t('replace.rootMessage'), { sha: target.trim().slice(0, 10) }),
      confirmLabel: t('replace.rootOk'),
      onConfirm: run
    })
  }

  const drop = (original: string): void => {
    setBusy(true)
    void repoActions
      .replaceDelete(repoPath, original)
      .then(() => load())
      .finally(() => setBusy(false))
  }

  return (
    <div className="replace-modal">
      <h3>
        <GitGraph size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('replace.title')}
      </h3>
      <p className="settings-hint">{t('replace.intro')}</p>

      {!status ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : (
        <>
          {!status.enabled && (
            <p className="replace-warn">
              <AlertTriangle size={12} /> {t('replace.disabled')}
            </p>
          )}

          <div className="replace-list">
            {status.refs.length === 0 ? (
              <p className="settings-hint">{t('replace.none')}</p>
            ) : (
              status.refs.map((ref) => (
                <div key={ref.original} className="replace-row">
                  <div className="replace-side">
                    <code>{ref.original.slice(0, 10)}</code>
                    <span title={ref.originalSubject}>{ref.originalSubject}</span>
                  </div>
                  <span className="replace-arrow">→</span>
                  <div className="replace-side">
                    <code>{ref.replacement.slice(0, 10)}</code>
                    <span title={ref.replacementSubject}>{ref.replacementSubject}</span>
                    <span className="replace-parents">
                      {ref.replacementParents.length
                        ? interp(t('replace.parents'), { n: String(ref.replacementParents.length) })
                        : t('replace.noParents')}
                    </span>
                  </div>
                  <button
                    className="icon-btn tiny"
                    disabled={busy}
                    title={t('replace.remove')}
                    onClick={() => drop(ref.original)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="replace-section">
            <div className="replace-head">
              <Scissors size={13} /> {t('replace.graftTitle')}
            </div>
            <p className="settings-hint">{t('replace.graftHint')}</p>
            <div className="export-field">
              <label className="modal-label">{t('replace.commit')}</label>
              <RefPicker value={target} options={refOptions} onChange={setTarget} />
            </div>
            <div className="export-field">
              <label className="modal-label">{t('replace.newParents')}</label>
              <input
                className="modal-input"
                value={parents}
                spellCheck={false}
                placeholder="v1.0 abc1234" // i18n-ignore example revisions, not prose
                onChange={(e) => setParents(e.target.value)}
              />
              <span className="modal-hint">{t('replace.newParentsHint')}</span>
            </div>
            <div className="modal-actions">
              <label className="clone-partial replace-toggle">
                <input
                  type="checkbox"
                  checked={status.enabled}
                  disabled={busy}
                  onChange={(e) => {
                    setBusy(true)
                    void repoActions
                      .setUseReplaceRefs(repoPath, e.target.checked)
                      .then(() => load())
                      .finally(() => setBusy(false))
                  }}
                />
                <span>{t('replace.honour')}</span>
              </label>
              <button className="btn primary" disabled={busy || !target.trim()} onClick={graft}>
                {busy ? <Loader2 size={13} className="spin" /> : <Scissors size={13} />} {t('replace.graft')}
              </button>
            </div>
          </div>

          <p className="settings-hint">{t('replace.shareHint')}</p>
        </>
      )}
    </div>
  )
}
