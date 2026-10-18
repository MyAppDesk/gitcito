import { useEffect, useState } from 'react'
import { FolderGit2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { lookupRepoImage, tabLabelParts } from '../lib/repoImage'

// One read per repository and path for the life of the window: every tab strip
// re-render would otherwise ship the image across IPC again. The settings
// modal passes `fresh` so a replaced file shows up without a restart.
const cache = new Map<string, Promise<string | null>>()
const refreshed = new Set<(key: string) => void>()

const cacheKey = (repoPath: string, file: string): string => `${repoPath}\n${file}`

export function loadRepoImage(repoPath: string, file: string, fresh = false): Promise<string | null> {
  const key = cacheKey(repoPath, file)
  if (fresh) cache.delete(key)
  let hit = cache.get(key)
  if (!hit) {
    hit = gitApi.repoImage(repoPath, file).catch(() => null)
    cache.set(key, hit)
    // Tabs already showing this key re-read it, so fixing a broken path by
    // adding the file is visible without touching the setting.
    if (fresh) void hit.then(() => refreshed.forEach((fn) => fn(key)))
  }
  return hit
}

/** The data URL of a repository's configured tab image; null while loading,
 *  when none is set, or when the path is broken. */
export function useRepoImage(repoPath: string | undefined): string | null {
  const file = useSettingsStore((s) => (repoPath ? lookupRepoImage(repoPath, s.settings.repoImages) : undefined))
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(null)
    if (!repoPath || !file) return
    let live = true
    const key = cacheKey(repoPath, file)
    const read = (): void => void loadRepoImage(repoPath, file).then((u) => live && setUrl(u))
    const onRefresh = (k: string): void => {
      if (k === key) read()
    }
    read()
    refreshed.add(onRefresh)
    return () => {
      live = false
      refreshed.delete(onRefresh)
    }
  }, [repoPath, file])
  return url
}

/** Icon-and-name of a repository tab, following the "repository tabs show"
 *  setting. The name moves into the image's tooltip when it is hidden. */
export function RepoTabLabel({
  repoPath,
  name,
  className,
  title
}: {
  repoPath: string | undefined
  name: string
  className: string
  title?: string
}): React.JSX.Element {
  const mode = useSettingsStore((s) => s.settings.tabRepoLabel)
  const url = useRepoImage(repoPath)
  const show = tabLabelParts(mode, url !== null)
  return (
    <>
      {show.image && url ? (
        <img
          className={`tab-repo-image ${show.name ? '' : 'solo'}`}
          src={url}
          alt={show.name ? '' : name}
          title={show.name ? undefined : (title ?? name)}
          draggable={false}
        />
      ) : (
        <FolderGit2 size={13} />
      )}
      {show.name && (
        <span className={className} title={title}>
          {name}
        </span>
      )}
    </>
  )
}
