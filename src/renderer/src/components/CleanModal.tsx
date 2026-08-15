import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Folder, FolderGit2, File, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import type { CleanEntry, CleanPreview } from '../../../shared/types'
import { useT, interp } from '../i18n'

/** Human-readable byte size. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

/**
 * Removing untracked files.
 *
 * The only destructive git operation with nothing behind it: the content was
 * never in an object, so there is no reflog, no stash and no undo to lean on.
 * So the dialog is a dry run first — everything git would remove, sized, with
 * ignored paths listed apart and unselected — and the trash is the default
 * destination, which is the one route that stays recoverable.
 */
export function CleanModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const [preview, setPreview] = useState<CleanPreview | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [trash, setTrash] = useState(true)
  const [running, setRunning] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    const found = await gitApi.cleanPreview(repoPath).catch(() => ({ entries: [], truncated: false }))
    setPreview(found)
    // Untracked paths start selected, ignored ones never do: an ignored path is
    // as often a local .env as it is build output.
    setChosen(new Set(found.entries.filter((e) => !e.ignored).map((e) => e.path)))
  }, [repoPath])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = (path: string): void =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (!next.delete(path)) next.add(path)
      return next
    })

  const entries = preview?.entries ?? []
  const untracked = entries.filter((e) => !e.ignored)
  const ignored = entries.filter((e) => e.ignored)
  const selected = entries.filter((e) => chosen.has(e.path))
  const bytes = selected.reduce((sum, e) => sum + e.bytes, 0)

  const remove = (): void => {
    const paths = selected.map((e) => e.path)
    if (!paths.length) return
    const go = (): void => {
      setRunning(true)
      void repoActions
        .clean(repoPath, paths, trash)
        .then(() => load())
        .finally(() => setRunning(false))
    }
    // Going to the trash is recoverable by the user, so it asks nothing extra.
    // Deleting is not, and the count and the size are what makes that concrete.
    if (trash) {
      go()
      return
    }
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('clean.confirmTitle'),
      message: interp(t('clean.confirmMessage'), { n: String(paths.length), size: fmtBytes(bytes) }),
      confirmLabel: t('clean.confirmOk'),
      onConfirm: go
    })
  }

  const row = (entry: CleanEntry): React.JSX.Element => (
    <label key={entry.path} className="clean-row">
      <input type="checkbox" checked={chosen.has(entry.path)} onChange={() => toggle(entry.path)} />
      {entry.nested ? (
        <FolderGit2 size={13} className="clean-icon" />
      ) : entry.kind === 'dir' ? (
        <Folder size={13} className="clean-icon" />
      ) : (
        <File size={13} className="clean-icon" />
      )}
      <span className="clean-path">{entry.path}</span>
      {entry.nested && <span className="clean-tag warn">{t('clean.nested')}</span>}
      <span className="clean-size">{fmtBytes(entry.bytes)}</span>
    </label>
  )

  return (
    <div className="clean-modal">
      <h3>
        <Trash2 size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('clean.title')}
      </h3>
      <p className="settings-hint">{t('clean.intro')}</p>

      {preview === null ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="settings-hint">{t('clean.none')}</p>
      ) : (
        <div className="clean-list">
          {untracked.length > 0 && (
            <>
              <div className="clean-section">{t('clean.untracked')}</div>
              {untracked.map(row)}
            </>
          )}
          {ignored.length > 0 && (
            <>
              <div className="clean-section">
                {t('clean.ignored')}
                <span className="clean-section-hint">{t('clean.ignoredHint')}</span>
              </div>
              {ignored.map(row)}
            </>
          )}
          {preview.truncated && (
            <p className="settings-hint">
              <AlertTriangle size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {t('clean.truncated')}
            </p>
          )}
        </div>
      )}

      <label className="clone-partial">
        <input type="checkbox" checked={trash} onChange={(e) => setTrash(e.target.checked)} />
        <span>
          {t('clean.toTrash')}
          <span className="modal-hint">{t('clean.toTrashHint')}</span>
        </span>
      </label>

      <div className="modal-actions">
        <span className="settings-hint clean-total">
          {interp(t('clean.selected'), { n: String(selected.length), size: fmtBytes(bytes) })}
        </span>
        <button className="btn ghost" type="button" disabled={running} onClick={() => void load()}>
          <RefreshCw size={13} /> {t('clean.rescan')}
        </button>
        <button className="btn danger" type="button" disabled={!selected.length || running} onClick={remove}>
          {running ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}{' '}
          {trash ? t('clean.moveToTrash') : t('clean.delete')}
        </button>
      </div>
    </div>
  )
}
