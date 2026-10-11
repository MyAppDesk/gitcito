import { useState } from 'react'
import { FolderSearch } from 'lucide-react'
import { gitApi, reposApi, shellApi } from '../infrastructure/api'
import { useRepoStore } from '../stores/repo'
import { useReposStore } from '../stores/repos'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

/**
 * A restored tab whose folder is gone — moved, deleted, or on a drive that is
 * not mounted. The tab is kept rather than dropped: the folder often comes
 * back (a USB disk, a network share), and closing it is one click anyway.
 */
export function MissingRepository({ path }: { path: string }): React.JSX.Element {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const name = path.split(/[\\/]/).pop() || path
      const chosen = await shellApi.selectDirectory(interp(t('repos.locateTitle'), { name }))
      if (!chosen) return
      // Refuse a folder that is not a repository before re-pointing anything.
      await gitApi.open(chosen)
      // The tab may predate the registry, so the new path is indexed either way.
      await useReposStore.getState().locate(path, chosen)
      if (!useReposStore.getState().entries.some((r) => r.path === chosen)) await reposApi.remember(chosen)
      useSettingsStore.getState().repathRepo(path, chosen)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const retry = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await useRepoStore.getState().refresh(path)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="welcome missing-repository">
      <div className="welcome-card">
        <FolderSearch size={28} aria-hidden="true" />
        <h1>{t('repos.missingTitle')}</h1>
        <p>{t('repos.missingBody')}</p>
        <code className="missing-repository-path">{path}</code>
        {error && <p role="alert">{error}</p>}
        <div className="missing-repository-actions">
          <button className="btn primary" disabled={busy} onClick={() => void locate()}>
            {t('repos.locate')}
          </button>
          <button className="btn" disabled={busy} onClick={() => void retry()}>
            {t('modal.retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
