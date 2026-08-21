import type { TabState } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

export type RepoMenuPlatform = 'darwin' | 'win32' | 'linux'

export type RepoMenuActionId =
  | 'createAlias'
  | 'changeAlias'
  | 'removeAlias'
  | 'showWorktrees'
  | 'newWorktree'
  | 'copyName'
  | 'copyPath'
  | 'viewOnGitHub'
  | 'openTerminal'
  | 'reveal'
  | 'openEditor'
  | 'remove'

export interface RepoMenuCapabilities {
  path: string
  canonicalName: string
  alias: string | null
  /** False when the directory is missing, not a git repo, or otherwise unusable. */
  pathAvailable: boolean
  githubUrl: string | null
  editorAvailable: boolean
  editorName?: string
  terminalAvailable: boolean
  /** Merge / rebase / cherry-pick / revert (or another exclusive git op) is in flight. */
  gitBusy: boolean
  platform: RepoMenuPlatform
}

export type RepoMenuEntry =
  | {
      kind: 'action'
      id: RepoMenuActionId
      labelKey: TranslationKey
      vars?: Record<string, string>
      disabled: boolean
      danger?: boolean
    }
  | { kind: 'separator' }

export function repoMenuIds(entries: RepoMenuEntry[]): RepoMenuActionId[] {
  return entries.filter((e): e is Extract<RepoMenuEntry, { kind: 'action' }> => e.kind === 'action').map((e) => e.id)
}

export function revealLabelKey(platform: RepoMenuPlatform): TranslationKey {
  if (platform === 'darwin') return 'repoMenu.revealFinder'
  if (platform === 'win32') return 'repoMenu.revealExplorer'
  return 'repoMenu.revealFileManager'
}

export function repoMenuEntries(caps: RepoMenuCapabilities): RepoMenuEntry[] {
  const hasAlias = !!caps.alias
  const inspect = !caps.pathAvailable
  const mutateWorktrees = inspect || caps.gitBusy
  const editorLabel: TranslationKey = caps.editorAvailable && caps.editorName ? 'editor.openIn' : 'repoMenu.openEditor'
  const editorVars = caps.editorName ? { app: caps.editorName } : undefined

  const aliasItems: RepoMenuEntry[] = hasAlias
    ? [
        { kind: 'action', id: 'changeAlias', labelKey: 'repoMenu.changeAlias', disabled: false },
        { kind: 'action', id: 'removeAlias', labelKey: 'repoMenu.removeAlias', disabled: false }
      ]
    : [{ kind: 'action', id: 'createAlias', labelKey: 'repoMenu.createAlias', disabled: false }]

  return [
    ...aliasItems,
    { kind: 'action', id: 'showWorktrees', labelKey: 'repoMenu.showWorktrees', disabled: inspect },
    { kind: 'action', id: 'newWorktree', labelKey: 'repoMenu.newWorktree', disabled: mutateWorktrees },
    { kind: 'action', id: 'copyName', labelKey: 'repoMenu.copyName', disabled: false },
    { kind: 'action', id: 'copyPath', labelKey: 'repoMenu.copyPath', disabled: false },
    { kind: 'separator' },
    { kind: 'action', id: 'viewOnGitHub', labelKey: 'repoMenu.viewOnGitHub', disabled: !caps.githubUrl },
    {
      kind: 'action',
      id: 'openTerminal',
      labelKey: 'repoMenu.openTerminal',
      disabled: inspect || !caps.terminalAvailable
    },
    { kind: 'action', id: 'reveal', labelKey: revealLabelKey(caps.platform), disabled: inspect },
    {
      kind: 'action',
      id: 'openEditor',
      labelKey: editorLabel,
      vars: editorVars,
      disabled: inspect || !caps.editorAvailable
    },
    { kind: 'separator' },
    { kind: 'action', id: 'remove', labelKey: 'repoMenu.remove', disabled: false, danger: true }
  ]
}

export function repoMenuActionTarget(
  id: RepoMenuActionId,
  caps: RepoMenuCapabilities
): { copy?: string; url?: string; path?: string } | null {
  switch (id) {
    case 'copyName':
      return { copy: caps.canonicalName }
    case 'copyPath':
      return { copy: caps.path }
    case 'viewOnGitHub':
      return caps.githubUrl ? { url: caps.githubUrl } : null
    case 'openTerminal':
    case 'reveal':
    case 'openEditor':
    case 'showWorktrees':
    case 'newWorktree':
      return { path: caps.path }
    default:
      return null
  }
}

/** One row in the toolbar repository switcher — standalone tabs and group members. */
export type RepoSwitcherEntry = {
  tabId: string
  tabKind: 'repo' | 'group'
  groupName: string | null
  path: string
  name: string
}

export function openRepoSwitcherEntries(tabs: TabState[]): RepoSwitcherEntry[] {
  const out: RepoSwitcherEntry[] = []
  for (const tab of tabs) {
    if (tab.kind !== 'repo' && tab.kind !== 'group') continue
    for (const r of tab.repos) {
      out.push({
        tabId: tab.id,
        tabKind: tab.kind,
        groupName: tab.kind === 'group' ? tab.name : null,
        path: r.path,
        name: r.name
      })
    }
  }
  return out
}
