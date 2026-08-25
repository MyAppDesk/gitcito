/**
 * Keeps the native application menu in sync with the app.
 *
 * The menu is a snapshot: Electron builds it once and it stays as built, so
 * anything it reflects — the language, whether a repository is open, what is
 * undoable — has to be pushed again when it changes. Every selector here
 * narrows to a primitive so a routine repository refresh does not rebuild the
 * menu bar.
 */

import { useEffect } from 'react'
import { tabActiveRepoPath } from '../../shared/types'
import { useSettingsStore } from './stores/settings'
import { useRepoStore } from './stores/repo'
import { useT } from './i18n'
import { buildMenuSpec } from './lib/appMenu'
import { effectiveBindings } from './lib/shortcuts'
import { menuApi } from './infrastructure/api'
import { runAppCommand } from './appCommands'

// i18n-ignore product name
const APP_NAME = 'Gitcito'

export function useAppMenu(): void {
  const t = useT()
  const language = useSettingsStore((s) => s.settings.language)
  const shortcuts = useSettingsStore((s) => s.settings.shortcuts)
  const recentRepos = useSettingsStore((s) => s.settings.recentRepos)
  const editorName = useSettingsStore((s) => s.settings.editor?.name ?? null)
  const hasTabs = useSettingsStore((s) => s.settings.tabs.length > 0)
  const repoPath = useSettingsStore((s) => {
    const tab = s.settings.tabs.find((x) => x.id === s.settings.activeTabId)
    return tab ? tabActiveRepoPath(tab) : null
  })
  const hasRepo = useRepoStore((s) => {
    const repo = repoPath ? s.repos[repoPath] : null
    return !!repo && !repo.notGit
  })
  const canUndo = useRepoStore((s) => {
    const repo = repoPath ? s.repos[repoPath] : null
    return !!repo && repo.undoStack.length > 0
  })

  useEffect(() => {
    if (window.api.platform !== 'darwin') return
    void menuApi.set(
      buildMenuSpec(
        {
          appName: APP_NAME,
          isDev: import.meta.env.DEV,
          hasTabs,
          hasRepo,
          canUndo,
          editorName,
          bindings: effectiveBindings(shortcuts),
          recent: recentRepos.map((r) => ({ path: r.path, name: r.name }))
        },
        t
      )
    )
    // `t` is recreated on every render; the language it closes over is the dep
    // that actually matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, shortcuts, recentRepos, editorName, hasTabs, hasRepo, canUndo])

  useEffect(() => menuApi.onCommand((id) => void runAppCommand(id)), [])
}
