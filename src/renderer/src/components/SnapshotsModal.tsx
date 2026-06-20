import { useCallback, useEffect, useState } from 'react'
import { Camera, RotateCcw, Trash2, RefreshCw, Clock, Zap } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import type { SnapshotInfo } from '../../../shared/types'

const INTERVALS = [
  { label: 'Off', min: 0 },
  { label: '5 min', min: 5 },
  { label: '15 min', min: 15 },
  { label: '30 min', min: 30 }
]

function timeLabel(sec: number): string {
  const diff = Date.now() - sec * 1000
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(sec * 1000).toLocaleString()
}

export function SnapshotsModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const minutes = useSettingsStore((s) => s.settings.wipSnapshotMinutes)
  const update = useSettingsStore((s) => s.update)
  const [items, setItems] = useState<SnapshotInfo[]>([])
  const [loading, setLoading] = useState(true)

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

  const snapNow = async (): Promise<void> => {
    const snap = await gitApi.createSnapshot(repoPath, false).catch(() => null)
    if (snap) toast('success', `Snapshot saved — ${snap.files} file${snap.files === 1 ? '' : 's'}`)
    else toast('info', 'Nothing to snapshot — working tree is clean')
    await reload()
  }

  const restore = (s: SnapshotInfo): void => {
    openModal({
      kind: 'confirm',
      title: 'Restore snapshot',
      message: `Apply this snapshot (${s.files} file${s.files === 1 ? '' : 's'}, ${timeLabel(s.time)}) back into the working tree? Current uncommitted changes are kept; conflicting files may need resolving.`,
      confirmLabel: 'Restore',
      onConfirm: () => {
        void gitApi
          .restoreSnapshot(repoPath, s.sha)
          .then(() => {
            toast('success', 'Snapshot restored')
            void useRepoStore.getState().refresh(repoPath)
          })
          .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
      }
    })
  }

  const del = async (s: SnapshotInfo): Promise<void> => {
    await gitApi.deleteSnapshot(repoPath, s.ref).catch(() => {})
    await reload()
  }

  return (
    <div className="snapshots">
      <h3>
        <Camera size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        WIP snapshots
      </h3>
      <p className="settings-hint">
        Point-in-time captures of your <strong>tracked</strong> changes + staged index (a <code>git stash create</code>
        pinned to a ref). A safety net you can restore from — they never touch your working tree or stash list.
        Brand-new untracked files aren’t included.
      </p>

      <div className="snapshots-toolbar">
        <button className="btn primary small" onClick={() => void snapNow()}>
          <Camera size={13} /> Snapshot now
        </button>
        <div className="snapshots-interval">
          <span className="settings-hint" style={{ marginRight: 6 }}>Auto every</span>
          <div className="codesearch-tabs" style={{ margin: 0 }}>
            {INTERVALS.map((iv) => (
              <button
                key={iv.min}
                className={`codesearch-tab ${minutes === iv.min ? 'active' : ''}`}
                onClick={() => update((s) => ({ ...s, wipSnapshotMinutes: iv.min }))}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn ghost small" onClick={() => void reload()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <p className="settings-hint">{loading ? 'Loading…' : 'No snapshots yet. Take one now, or enable auto-snapshots above.'}</p>
      ) : (
        <div className="snapshots-list">
          {items.map((s) => (
            <div key={s.ref} className="snapshot-row">
              <span className="snapshot-icon">{s.auto ? <Zap size={14} /> : <Clock size={14} />}</span>
              <span className="snapshot-body">
                <span className="snapshot-when">{timeLabel(s.time)}</span>
                <span className="snapshot-meta">
                  {s.auto ? 'auto' : 'manual'} · {s.files} file{s.files === 1 ? '' : 's'} · {s.sha.slice(0, 7)}
                </span>
              </span>
              <button className="snapshot-action" title="Restore into working tree" onClick={() => restore(s)}>
                <RotateCcw size={14} />
              </button>
              <button className="snapshot-action danger" title="Delete snapshot" onClick={() => void del(s)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
