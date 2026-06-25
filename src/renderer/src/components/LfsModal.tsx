import { useCallback, useEffect, useState } from 'react'
import { Boxes, Loader2, Plus, Trash2, Download, Trash, FileDown, AlertTriangle, MoreVertical } from 'lucide-react'
import type { LfsInfo, LfsFile } from '../../../shared/types'
import { gitApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'

export function LfsModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const t = useT()

  const fileMenu = (f: LfsFile, e: React.MouseEvent): void => {
    e.stopPropagation()
    const full = `${repoPath}/${f.path}`
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.right, rect.bottom + 4, [
      { label: shellApi.revealLabel, icon: <FileDown size={15} />, onClick: () => void shellApi.revealInFolder(full) },
      { label: t('lfs.openDefaultApp'), icon: <Download size={15} />, onClick: () => void shellApi.openPath(full) }
    ])
  }

  const [info, setInfo] = useState<LfsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pattern, setPattern] = useState('')

  const load = useCallback(async (): Promise<void> => {
    setInfo(await gitApi.lfsInfo(repoPath))
  }, [repoPath])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const run = async (fn: () => Promise<void>, ok?: string): Promise<void> => {
    setBusy(true)
    try {
      await fn()
      await load()
      if (ok) toast('success', ok)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const track = (): void => {
    const p = pattern.trim()
    if (!p) return
    setPattern('')
    void run(() => gitApi.lfsTrack(repoPath, p), interp(t('lfs.tracked'), { pattern: p }))
  }

  return (
    <>
      <h3>
        <Boxes size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('lfs.title')}
      </h3>

      {loading ? (
        <div className="lfs-empty">
          <Loader2 size={15} className="spin" /> {t('lfs.loading')}
        </div>
      ) : !info ? (
        <div className="lfs-empty">{t('lfs.error')}</div>
      ) : !info.installed ? (
        <div className="lfs-banner warn">
          <AlertTriangle size={14} />
          <span>
            {t('lfs.notInstalled').replace('git-lfs.com', '')}
            <a href="#" onClick={(e) => { e.preventDefault(); void window.api.openExternal('https://git-lfs.com') }}>
              git-lfs.com
            </a>{' '}
            to manage large files.
          </span>
        </div>
      ) : (
        <>
          {!info.enabled && (
            <p className="lfs-hint">{t('lfs.noTracking')}</p>
          )}

          <div className="lfs-section-title">{t('lfs.trackedPatterns')}</div>
          <div className="lfs-track-add">
            <input
              className="modal-input"
              placeholder={t('lfs.patternPlaceholder')}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') track()
              }}
            />
            <button className="btn ghost small" onClick={track} disabled={busy || !pattern.trim()}>
              <Plus size={13} /> {t('lfs.track')}
            </button>
          </div>
          {info.patterns.length > 0 && (
            <div className="lfs-list">
              {info.patterns.map((p) => (
                <div key={p} className="lfs-row">
                  <code className="lfs-pattern">{p}</code>
                  <button
                    className="icon-btn danger"
                    title={t('lfs.untrackTitle')}
                    onClick={() => void run(() => gitApi.lfsUntrack(repoPath, p), interp(t('lfs.untracked'), { pattern: p }))}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {info.files.length > 0 && (
            <>
              <div className="lfs-section-title">
                {t('lfs.files')} <span className="lfs-count">{info.files.length}</span>
              </div>
              <div className="lfs-list">
                {info.files.map((f) => (
                  <div key={f.path} className="lfs-row" onContextMenu={(e) => { e.preventDefault(); fileMenu(f, e) }}>
                    <span
                      className={`lfs-state ${f.downloaded ? 'lfs-have' : 'lfs-pointer'}`}
                      title={f.downloaded ? t('lfs.downloaded') : t('lfs.pointerOnly')}
                    >
                      {f.downloaded ? <FileDown size={12} /> : '◌'}
                    </span>
                    <code className="lfs-file" title={f.path}>
                      {f.path}
                    </code>
                    <code className="lfs-oid">{f.oid.slice(0, 8)}</code>
                    <button className="icon-btn" title={t('lfs.openReveal')} onClick={(e) => fileMenu(f, e)}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions lfs-actions">
            <button className="btn ghost" onClick={() => void run(() => gitApi.lfsPull(repoPath), t('lfs.pulled'))} disabled={busy}>
              <Download size={14} /> {t('lfs.pullObjects')}
            </button>
            <button className="btn ghost" onClick={() => void run(() => gitApi.lfsPrune(repoPath), t('lfs.pruned'))} disabled={busy}>
              <Trash size={14} /> {t('lfs.prune')}
            </button>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('rebase.cancel')}
        </button>
      </div>
    </>
  )
}
