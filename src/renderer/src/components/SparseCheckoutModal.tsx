import { useCallback, useEffect, useState } from 'react'
import { FolderTree, Loader2, AlertTriangle } from 'lucide-react'
import type { SparseCheckoutInfo } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useT, interp } from '../i18n'

export function SparseCheckoutModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const [info, setInfo] = useState<SparseCheckoutInfo | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    const next = await gitApi.sparseCheckoutInfo(repoPath)
    setInfo(next)
    // Pre-check the included dirs, or everything when sparse-checkout is off.
    setSelected(new Set(next.enabled ? next.dirs : next.topLevelDirs))
  }, [repoPath])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const toggle = (dir: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }

  const apply = async (): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.sparseCheckoutSet(repoPath, [...selected])
      await useRepoStore.getState().refresh(repoPath)
      toast('success', interp(t('sparse.enabledMsg'), { n: selected.size, s: selected.size === 1 ? '' : 's' }))
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const disable = async (): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.sparseCheckoutDisable(repoPath)
      await useRepoStore.getState().refresh(repoPath)
      toast('success', t('sparse.disabledMsg'))
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <>
      <h3>
        <FolderTree size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('sparse.title')}
      </h3>
      <p className="sparse-sub">
        {t('sparse.description')}
      </p>

      {loading ? (
        <div className="sparse-empty">
          <Loader2 size={15} className="spin" /> {t('sparse.loading')}
        </div>
      ) : !info ? (
        <div className="sparse-empty">{t('sparse.error')}</div>
      ) : info.topLevelDirs.length === 0 ? (
        <div className="sparse-empty">{t('sparse.noFolders')}</div>
      ) : (
        <>
          {info.enabled ? (
            <div className="sparse-status on">
              {interp(t('sparse.statusOn'), { mode: info.cone ? t('sparse.coneMode') : '' })}
            </div>
          ) : (
            <div className="sparse-status">{t('sparse.statusOff')}</div>
          )}

          <div className="sparse-list">
            {info.topLevelDirs.map((d) => (
              <label key={d} className="sparse-row">
                <input type="checkbox" checked={selected.has(d)} onChange={() => toggle(d)} />
                <span className="sparse-dir">{d}/</span>
              </label>
            ))}
          </div>

          {selected.size === 0 && (
            <p className="sparse-warn">
              <AlertTriangle size={13} /> {t('sparse.nothingSelected')}
            </p>
          )}

          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              {t('bisect.cancel')}
            </button>
            {info.enabled && (
              <button className="btn ghost danger" onClick={() => void disable()} disabled={busy}>
                {t('sparse.disable')}
              </button>
            )}
            <button className="btn primary" onClick={() => void apply()} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : null} {t('sparse.apply')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
