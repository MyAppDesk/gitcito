import { useCallback, useEffect, useState } from 'react'
import { Camera, RotateCcw, Trash2, RefreshCw, Clock, Zap, Shield } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { DiffViewer } from './DiffViewer'
import { isSecretFile } from '../lib/secrets'
import type { SnapshotInfo, SnapshotKind, FileEntry } from '../../../shared/types'
import { useT, t as tr, interp, type TranslationKey } from '../i18n'

const INTERVALS: { labelKey: TranslationKey; min: number }[] = [
  { labelKey: 'snapshots.intervalOff', min: 0 },
  { labelKey: 'snapshots.interval5', min: 5 },
  { labelKey: 'snapshots.interval15', min: 15 },
  { labelKey: 'snapshots.interval30', min: 30 }
]

const KIND_LABEL: Record<SnapshotKind, TranslationKey> = {
  auto: 'snapshots.auto',
  manual: 'snapshots.manual',
  guard: 'snapshots.guard'
}

function KindIcon({ kind }: { kind: SnapshotKind }): React.JSX.Element {
  if (kind === 'auto') return <Zap size={14} />
  if (kind === 'guard') return <Shield size={14} />
  return <Clock size={14} />
}

function timeLabel(sec: number): string {
  const diff = Date.now() - sec * 1000
  const m = Math.round(diff / 60000)
  if (m < 1) return tr('time.justNow')
  if (m < 60) return interp(tr('time.minutesAgo'), { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return interp(tr('time.hoursAgo'), { n: h })
  return new Date(sec * 1000).toLocaleString()
}

export function SnapshotsModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const minutes = useSettingsStore((s) => s.settings.wipSnapshotMinutes)
  const guard = useSettingsStore((s) => s.settings.snapshotGuard !== false)
  const maskSecrets = useSettingsStore((s) => s.settings.maskSecrets)
  const update = useSettingsStore((s) => s.update)
  const [items, setItems] = useState<SnapshotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<SnapshotInfo | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selFile, setSelFile] = useState('')
  const [diff, setDiff] = useState('')

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setItems(await gitApi.listSnapshots(repoPath))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [repoPath, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  // A snapshot is a plain commit, so its file list and per-file diff come from
  // the same plumbing commit views use.
  const select = useCallback(
    async (s: SnapshotInfo): Promise<void> => {
      setSel(s)
      setSelFile('')
      setDiff('')
      setFiles(await gitApi.commitFiles(repoPath, s.sha).catch(() => []))
    },
    [repoPath]
  )

  const selectFile = async (file: string): Promise<void> => {
    if (!sel) return
    setSelFile(file)
    setDiff(await gitApi.commitFileDiff(repoPath, sel.sha, file).catch(() => ''))
  }

  const snapNow = async (): Promise<void> => {
    const snap = await gitApi.createSnapshot(repoPath, 'manual').catch(() => null)
    if (snap)
      toast(
        'success',
        interp(t('snapshots.saved'), {
          n: snap.files,
          fileWord: snap.files === 1 ? t('snapshots.file') : t('snapshots.files')
        })
      )
    else toast('info', t('snapshots.clean'))
    await reload()
  }

  const restoreAll = (s: SnapshotInfo): void => {
    openModal({
      kind: 'confirm',
      title: t('snapshots.restoreTitle'),
      message: interp(t('snapshots.restoreConfirm'), {
        files: s.files,
        fileWord: s.files === 1 ? t('snapshots.file') : t('snapshots.files'),
        when: timeLabel(s.time)
      }),
      confirmLabel: t('snapshots.restore'),
      onConfirm: () => void repoActions.restoreSnapshot(repoPath, s.sha)
    })
  }

  const restoreFile = (file: string): void => {
    if (!sel) return
    void repoActions.restoreSnapshot(repoPath, sel.sha, [file])
  }

  const del = async (s: SnapshotInfo): Promise<void> => {
    await gitApi.deleteSnapshot(repoPath, s.ref).catch(() => {})
    if (sel?.ref === s.ref) {
      setSel(null)
      setFiles([])
      setSelFile('')
      setDiff('')
    }
    await reload()
  }

  return (
    <div className="snapshots">
      <h3>
        <Camera size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('snapshots.title')}
      </h3>
      <p className="settings-hint">{t('snapshots.intro')}</p>

      <div className="snapshots-toolbar">
        <button className="btn primary small" onClick={() => void snapNow()}>
          <Camera size={13} /> {t('snapshots.now')}
        </button>
        <div className="snapshots-interval">
          <span className="settings-hint" style={{ marginRight: 6 }}>{t('snapshots.autoEvery')}</span>
          <div className="codesearch-tabs" style={{ margin: 0 }}>
            {INTERVALS.map((iv) => (
              <button
                key={iv.min}
                className={`codesearch-tab ${minutes === iv.min ? 'active' : ''}`}
                onClick={() => update((s) => ({ ...s, wipSnapshotMinutes: iv.min }))}
              >
                {iv.min === 0 ? t('snapshots.off') : t(iv.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <label className="snapshots-guard" title={t('snapshots.guardHint')}>
          <input
            type="checkbox"
            checked={guard}
            onChange={(e) => update((s) => ({ ...s, snapshotGuard: e.target.checked }))}
          />
          <Shield size={13} /> {t('snapshots.guardLabel')}
        </label>
        <button className="btn ghost small" onClick={() => void reload()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> {t('snapshots.refresh')}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="settings-hint">{loading ? t('snapshots.loading') : t('snapshots.empty')}</p>
      ) : (
        <div className="snapshots-split">
          <div className="snapshots-list">
            {items.map((s) => (
              <div
                key={s.ref}
                className={`snapshot-row ${sel?.ref === s.ref ? 'active' : ''}`}
                onClick={() => void select(s)}
              >
                <span className="snapshot-icon">
                  <KindIcon kind={s.kind} />
                </span>
                <span className="snapshot-body">
                  <span className="snapshot-when">{timeLabel(s.time)}</span>
                  <span className="snapshot-meta">
                    {t(KIND_LABEL[s.kind])} · {s.files}{' '}
                    {s.files === 1 ? t('snapshots.file') : t('snapshots.files')} · {s.sha.slice(0, 7)}
                  </span>
                </span>
                <button
                  className="snapshot-action"
                  title={t('snapshots.restore')}
                  onClick={(e) => {
                    e.stopPropagation()
                    restoreAll(s)
                  }}
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  className="snapshot-action danger"
                  title={t('snapshots.delete')}
                  onClick={(e) => {
                    e.stopPropagation()
                    void del(s)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="snapshot-detail">
            {!sel ? (
              <p className="settings-hint">{t('snapshots.select')}</p>
            ) : (
              <>
                <div className="snapshot-files">
                  {files.map((f) => (
                    <div
                      key={f.path}
                      className={`snapshot-file-row ${selFile === f.path ? 'active' : ''}`}
                      onClick={() => void selectFile(f.path)}
                    >
                      <span className={`snapshot-file-status st-${f.status.toLowerCase()}`}>{f.status}</span>
                      <span className="snapshot-file-path">{f.path}</span>
                      <button
                        className="snapshot-action"
                        title={t('snapshots.restoreFile')}
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreFile(f.path)
                        }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="snapshot-diff">
                  {selFile ? (
                    <DiffViewer diff={diff} file={selFile} maskValues={maskSecrets && isSecretFile(selFile)} />
                  ) : (
                    <p className="settings-hint" style={{ padding: 10 }}>{t('snapshots.selectFile')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
