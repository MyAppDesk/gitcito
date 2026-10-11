import { tabRepos, type RepoRef } from '../../shared/types'
import { gitApi, shellApi } from './infrastructure/api'
import { useUIStore } from './stores/ui'
import { useSettingsStore } from './stores/settings'
import { canonicalRepoPath } from './lib/repoAlias'
import { planRepositoryPick } from './lib/repositoryPick'
import { t, interp } from './i18n'

/** Open in any tab, standalone or inside a group. */
export function isRepositoryOpen(path: string): boolean {
  const key = canonicalRepoPath(path)
  return useSettingsStore
    .getState()
    .settings.tabs.some((tab) => tabRepos(tab).some((r) => canonicalRepoPath(r.path) === key))
}

/**
 * The Open repository picker, which takes several folders at once. Electron's
 * dialog cannot grey out folders in the panel itself (there is no NSOpenPanel
 * delegate), so open repositories and plain folders are sorted out after the
 * pick instead — see `planRepositoryPick`.
 */
export async function chooseRepositories(isOpen: (path: string) => boolean = isRepositoryOpen): Promise<RepoRef[]> {
  const paths = await shellApi.selectDirectories()
  const several = paths.length > 1
  const picked = await Promise.all(
    paths.map(async (path) => {
      const open = several && isOpen(path)
      // Only a multi-pick needs the check; a single folder keeps its old path.
      const repo = !several || open || (await gitApi.isRepository(path).catch(() => false))
      return { path, open, repo }
    })
  )
  const plan = planRepositoryPick(picked)
  for (const n of plan.notices) useUIStore.getState().toast('info', interp(t(n.key), n.vars))
  return plan.open
}
