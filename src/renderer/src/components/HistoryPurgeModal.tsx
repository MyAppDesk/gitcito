import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Eraser, History, List, Loader2, Search, Trash2, Undo2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import type { HistoryPathEntry, HistoryPurgeBackup, HistoryPurgePreview } from '../../../shared/types'
import { useT, interp } from '../i18n'

/** Human-readable byte size. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

/**
 * Removing a path from every commit. The dialog's job is to make the cost
 * legible *before* the rewrite: how many commits change, which refs move, how
 * much space the blobs actually take. The rewrite itself is one command.
 */
export function HistoryPurgeModal({
  repoPath,
  initialPath
}: {
  repoPath: string
  initialPath?: string
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const refresh = useRepoStore((s) => s.refresh)

  const [path, setPath] = useState(initialPath ?? '')
  const [preview, setPreview] = useState<HistoryPurgePreview | null>(null)
  const [checking, setChecking] = useState(false)
  const [running, setRunning] = useState(false)
  const [backups, setBackups] = useState<HistoryPurgeBackup[]>([])

  // The picker: every path in history, heaviest first. Loaded on demand — it
  // walks the whole object database, which is not worth doing for someone who
  // already knows the path they came to remove.
  const [browsing, setBrowsing] = useState(false)
  const [entries, setEntries] = useState<HistoryPathEntry[] | null>(null)
  const [entryFilter, setEntryFilter] = useState('')
  const [loadingEntries, setLoadingEntries] = useState(false)

  const loadBackups = useCallback(async (): Promise<void> => {
    setBackups(await gitApi.historyPurgeBackups(repoPath).catch(() => []))
  }, [repoPath])
  useEffect(() => {
    void loadBackups()
  }, [loadBackups])

  const browse = async (): Promise<void> => {
    setBrowsing((open) => !open)
    if (entries || loadingEntries) return
    setLoadingEntries(true)
    try {
      setEntries(await gitApi.historyPaths(repoPath))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setEntries([])
    } finally {
      setLoadingEntries(false)
    }
  }

  /** Picking a row is the same as typing that path, so it measures straight away. */
  const pick = async (entry: HistoryPathEntry): Promise<void> => {
    setPath(entry.path)
    setBrowsing(false)
    await measure(entry.path)
  }

  const shown = (entries ?? []).filter((e) =>
    entryFilter.trim() ? e.path.toLowerCase().includes(entryFilter.trim().toLowerCase()) : true
  )

  const measure = useCallback(
    async (target: string): Promise<void> => {
      if (!target.trim()) return
      setChecking(true)
      try {
        setPreview(await gitApi.historyPurgePreview(repoPath, [target.trim()]))
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
        setPreview(null)
      } finally {
        setChecking(false)
      }
    },
    [repoPath, toast]
  )

  const check = (): Promise<void> => measure(path)

  // Arriving from a file's context menu, the path is already decided — making
  // the user press Measure to learn what they came to learn is a step for
  // nothing.
  useEffect(() => {
    if (initialPath?.trim()) void measure(initialPath)
  }, [initialPath, measure])

  const purge = (): void => {
    if (!preview || preview.blocked || !preview.commits) return
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('purge.confirmTitle'),
      message: interp(t('purge.confirmMessage'), {
        path: path.trim(),
        commits: String(preview.commits),
        refs: String(preview.branches.length + preview.tags.length)
      }),
      confirmLabel: t('purge.confirmOk'),
      onConfirm: () => {
        setRunning(true)
        void gitApi
          .historyPurge(repoPath, [path.trim()])
          .then(async (result) => {
            toast('success', interp(t('purge.done'), { refs: String(result.rewritten) }))
            setPreview(null)
            await loadBackups()
            await refresh(repoPath)
          })
          .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
          .finally(() => setRunning(false))
      }
    })
  }

  const restore = (backup: HistoryPurgeBackup): void => {
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('purge.restoreTitle'),
      message: t('purge.restoreMessage'),
      confirmLabel: t('purge.restoreOk'),
      onConfirm: () => {
        void gitApi
          .historyPurgeRestore(repoPath, backup.prefix)
          .then(async () => {
            toast('success', t('purge.restored'))
            await loadBackups()
            await refresh(repoPath)
          })
          .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
      }
    })
  }

  const drop = (backup: HistoryPurgeBackup): void => {
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('purge.dropTitle'),
      message: t('purge.dropMessage'),
      confirmLabel: t('purge.dropOk'),
      onConfirm: () => {
        void gitApi
          .historyPurgeDropBackup(repoPath, backup.prefix)
          .then(async () => {
            toast('success', t('purge.dropped'))
            await loadBackups()
          })
          .catch((err) => toast('error', err instanceof Error ? err.message : String(err)))
      }
    })
  }

  return (
    <div className="purge-modal">
      <h3>
        <Eraser size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('purge.title')}
      </h3>
      <p className="settings-hint">{t('purge.intro')}</p>

      <label className="modal-label">{t('purge.pathLabel')}</label>
      <div className="repo-org-row">
        <input
          autoFocus
          className="modal-input"
          value={path}
          placeholder="config/credentials.env"
          onChange={(e) => {
            setPath(e.target.value)
            setPreview(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void check()
          }}
        />
        <button className="btn ghost" type="button" onClick={() => void browse()}>
          {loadingEntries ? <Loader2 size={14} className="spin" /> : <List size={14} />} {t('purge.browse')}
        </button>
        <button className="btn ghost" type="button" disabled={!path.trim() || checking} onClick={() => void check()}>
          {checking ? <Loader2 size={14} className="spin" /> : <History size={14} />} {t('purge.check')}
        </button>
      </div>

      {browsing && (
        <div className="purge-picker">
          <div className="purge-picker-search">
            <Search size={13} />
            <input
              className="modal-input"
              value={entryFilter}
              placeholder={t('purge.filterPlaceholder')}
              onChange={(e) => setEntryFilter(e.target.value)}
            />
          </div>
          <p className="settings-hint">{t('purge.browseHint')}</p>
          <div className="purge-picker-list">
            {loadingEntries && <p className="settings-hint">{t('common.loading')}</p>}
            {!loadingEntries && shown.length === 0 && <p className="settings-hint">{t('purge.noPaths')}</p>}
            {shown.map((entry) => (
              <button key={entry.path} className="purge-picker-row" type="button" onClick={() => void pick(entry)}>
                <span className="purge-picker-path">{entry.path}</span>
                {entry.deleted && <span className="purge-picker-tag">{t('purge.deleted')}</span>}
                <span className="purge-picker-versions">
                  {interp(t('purge.versions'), { n: String(entry.versions) })}
                </span>
                <span className="purge-picker-size">{fmtBytes(entry.bytes)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="purge-preview">
          {preview.commits === 0 ? (
            <p className="settings-hint">{t('purge.noCommits')}</p>
          ) : (
            <>
              <div className="purge-stats">
                <span>
                  <strong>{preview.commits}</strong> {t('purge.commits')}
                </span>
                <span>
                  <strong>{preview.branches.length}</strong> {t('purge.branches')}
                </span>
                <span>
                  <strong>{preview.tags.length}</strong> {t('purge.tags')}
                </span>
                <span>
                  <strong>{fmtBytes(preview.bytes)}</strong> {t('purge.inBlobs')}
                </span>
              </div>
              {preview.firstCommit && (
                <p className="settings-hint">
                  {interp(t('purge.fromCommit'), {
                    sha: preview.firstCommit.sha.slice(0, 7),
                    subject: preview.firstCommit.subject
                  })}
                </p>
              )}
              <div className="purge-warning">
                <AlertTriangle size={14} />
                <span>{t('purge.rotateWarning')}</span>
              </div>
              {preview.blocked && <p className="modal-hint">{preview.blocked}</p>}
            </>
          )}
        </div>
      )}

      {backups.length > 0 && (
        <div className="purge-backups">
          <h4>{t('purge.backupsTitle')}</h4>
          <p className="settings-hint">{t('purge.backupsHint')}</p>
          {backups.map((backup) => (
            <div key={backup.prefix} className="purge-backup">
              <div className="purge-backup-head">
                <strong>{new Date(backup.at * 1000).toLocaleString()}</strong>
                <span className="settings-hint">
                  {interp(t('purge.backupMeta'), { refs: String(backup.refs), paths: backup.paths.join(', ') })}
                </span>
              </div>
              <div className="purge-backup-actions">
                <button className="btn ghost small" onClick={() => restore(backup)}>
                  <Undo2 size={12} /> {t('purge.restore')}
                </button>
                <button className="btn danger small" onClick={() => drop(backup)}>
                  <Trash2 size={12} /> {t('purge.drop')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" type="button" onClick={closeModal} disabled={running}>
          {t('common.close')}
        </button>
        <button
          className="btn danger"
          type="button"
          disabled={!preview || !!preview.blocked || !preview.commits || running}
          onClick={purge}
        >
          {running ? <Loader2 size={14} className="spin" /> : <Eraser size={14} />} {t('purge.run')}
        </button>
      </div>
    </div>
  )
}
