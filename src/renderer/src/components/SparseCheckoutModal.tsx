import { useCallback, useEffect, useState } from 'react'
import { FolderTree, Loader2, AlertTriangle } from 'lucide-react'
import type { SparseCheckoutInfo } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'

export function SparseCheckoutModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)

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
      toast('success', `Working tree limited to ${selected.size} folder${selected.size === 1 ? '' : 's'}`)
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
      toast('success', 'Sparse-checkout disabled — full working tree restored')
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
        Sparse-checkout
      </h3>
      <p className="sparse-sub">
        Limit the working tree to the top-level folders you pick. Unchecked folders are removed from disk (still kept
        in git) — handy for huge monorepos.
      </p>

      {loading ? (
        <div className="sparse-empty">
          <Loader2 size={15} className="spin" /> Loading…
        </div>
      ) : !info ? (
        <div className="sparse-empty">Could not read sparse-checkout state.</div>
      ) : info.topLevelDirs.length === 0 ? (
        <div className="sparse-empty">This repository has no top-level folders to limit.</div>
      ) : (
        <>
          {info.enabled ? (
            <div className="sparse-status on">
              Sparse-checkout is <strong>on</strong>
              {info.cone ? ' (cone mode)' : ''}.
            </div>
          ) : (
            <div className="sparse-status">Sparse-checkout is off — the full tree is checked out.</div>
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
              <AlertTriangle size={13} /> Nothing selected — only top-level files will remain.
            </p>
          )}

          <div className="modal-actions">
            <button className="btn ghost" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            {info.enabled && (
              <button className="btn ghost danger" onClick={() => void disable()} disabled={busy}>
                Disable
              </button>
            )}
            <button className="btn primary" onClick={() => void apply()} disabled={busy}>
              {busy ? <Loader2 size={13} className="spin" /> : null} Apply
            </button>
          </div>
        </>
      )}
    </>
  )
}
