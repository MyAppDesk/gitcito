import type { RepoRef } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

/** One folder from the Open repository picker, with what is known about it. */
export interface PickedFolder {
  path: string
  /** Already open in a tab, standalone or in the target group. */
  open: boolean
  /** A Git repository (or inside one). */
  repo: boolean
}

export interface PickNotice {
  /** Dictionary key; render with `interp(t(key), vars)`. */
  key: TranslationKey
  vars: Record<string, string | number>
}

export interface PickPlan {
  open: RepoRef[]
  notices: PickNotice[]
}

export function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function notice(names: string[], one: TranslationKey, many: TranslationKey): PickNotice[] {
  if (!names.length) return []
  return [
    names.length === 1
      ? { key: one, vars: { name: names[0] } }
      : { key: many, vars: { n: names.length, names: names.join(', ') } }
  ]
}

/**
 * What to do with a pick. A single folder goes through untouched — the tab
 * focuses an open repository and offers to initialise a plain folder, as it
 * always has. In a pick of several, open repositories and plain folders are
 * skipped and named, so one stray folder neither blocks the rest nor
 * duplicates a tab.
 */
export function planRepositoryPick(picked: PickedFolder[]): PickPlan {
  const ref = (p: PickedFolder): RepoRef => ({ path: p.path, name: folderName(p.path) })
  if (picked.length <= 1) return { open: picked.map(ref), notices: [] }
  const alreadyOpen = picked.filter((p) => p.open)
  const notRepo = picked.filter((p) => !p.open && !p.repo)
  return {
    open: picked.filter((p) => !p.open && p.repo).map(ref),
    notices: [
      ...notice(alreadyOpen.map((p) => folderName(p.path)), 'repos.skippedOpenOne', 'repos.skippedOpenMany'),
      ...notice(notRepo.map((p) => folderName(p.path)), 'repos.skippedNotRepoOne', 'repos.skippedNotRepoMany')
    ]
  }
}
