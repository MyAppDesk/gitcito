import type { MenuItem } from '../stores/ui'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore, repoActions } from '../stores/repo'
import { useTerminalsStore } from '../stores/terminals'
import { shellApi } from '../infrastructure/api'
import { openInEditor } from './editorOpen'
import { githubRepoUrl } from './hosting'
import { canonicalRepoName, lookupRepoAlias } from './repoAlias'
import {
  repoMenuActionTarget,
  repoMenuEntries,
  type RepoMenuActionId,
  type RepoMenuCapabilities,
  type RepoMenuPlatform
} from './repositoryMenu'
import { t, interp } from '../i18n'
import { closeTabPrompt, repoCloseStatus, tabCloseStatus } from './tabClose'

function platformOf(): RepoMenuPlatform {
  const p = window.api.platform
  if (p === 'darwin' || p === 'win32') return p
  return 'linux'
}

export function repoMenuCapabilities(path: string): RepoMenuCapabilities {
  const settings = useSettingsStore.getState().settings
  const repo = useRepoStore.getState().repos[path]
  const alias = lookupRepoAlias(path, settings.repoAliases) ?? null
  return {
    path,
    canonicalName: canonicalRepoName(path),
    alias,
    pathAvailable: repo ? !repo.notGit : true,
    githubUrl: githubRepoUrl(repo?.remotes ?? []) ?? null,
    editorAvailable: !!settings.editor?.command,
    editorName: settings.editor?.name,
    terminalAvailable: true,
    gitBusy: !!repo?.mergeState,
    platform: platformOf()
  }
}

function promptAlias(path: string, current: string | null, canonical: string): void {
  useUIStore.getState().openModal({
    kind: 'input',
    title: t('repoMenu.aliasTitle'),
    label: t('repoMenu.aliasLabel'),
    initial: current ?? canonical,
    submitLabel: t('common.save'),
    onSubmit: (value) => useSettingsStore.getState().setRepoAlias(path, value.trim() || null)
  })
}

function focusRepo(path: string): void {
  const settings = useSettingsStore.getState()
  const tab = settings.settings.tabs.find((t) => t.kind !== 'page' && t.repos.some((r) => r.path === path))
  if (!tab) return
  settings.setActiveTab(tab.id)
  if (tab.kind === 'group') settings.setGroupActiveRepo(tab.id, path)
}

function showWorktrees(path: string): void {
  focusRepo(path)
  const settings = useSettingsStore.getState()
  settings.updateRepoLayout(path, (l) => {
    const hidden = l.sidebarHidden ?? settings.settings.sidebarHidden ?? []
    return {
      ...l,
      sidebarHidden: hidden.filter((id) => id !== 'worktrees'),
      sidebarExpanded: { ...(l.sidebarExpanded ?? {}), worktrees: true }
    }
  })
}

function promptNewWorktree(path: string): void {
  const repo = useRepoStore.getState().repos[path]
  useUIStore.getState().openModal({
    kind: 'input',
    title: t('sidebar.addWorktree'),
    label: t('sidebar.addWorktreeLabel'),
    placeholder: t('sidebar.addWorktreePlaceholder'),
    submitLabel: t('common.add'),
    onSubmit: (value) => {
      const parts = value.trim().split(/\s+/)
      const dir = parts[0]
      const branch = parts[1] ?? repo?.branches.current
      if (!dir || !branch) return
      const isExisting = repo?.branches.locals.some((b) => b.name === branch) ?? false
      void repoActions.worktreeAdd(path, dir, branch, !isExisting)
    }
  })
}

function openTerminal(path: string): void {
  focusRepo(path)
  useTerminalsStore.getState().ensureRepo(path, path)
  useUIStore.getState().setTerminalOpen(path, true)
}

function runAction(id: RepoMenuActionId, caps: RepoMenuCapabilities, onRemove: () => void): void {
  const target = repoMenuActionTarget(id, caps)
  switch (id) {
    case 'createAlias':
    case 'changeAlias':
      promptAlias(caps.path, caps.alias, caps.canonicalName)
      return
    case 'removeAlias':
      useSettingsStore.getState().setRepoAlias(caps.path, null)
      return
    case 'showWorktrees':
      showWorktrees(caps.path)
      return
    case 'newWorktree':
      promptNewWorktree(caps.path)
      return
    case 'copyName':
    case 'copyPath':
      if (target?.copy) void navigator.clipboard.writeText(target.copy)
      return
    case 'viewOnGitHub':
      if (target?.url) void shellApi.openExternal(target.url)
      return
    case 'openTerminal':
      openTerminal(caps.path)
      return
    case 'reveal':
      void shellApi.revealInFolder(caps.path)
      return
    case 'openEditor': {
      const editor = useSettingsStore.getState().settings.editor
      if (editor) void openInEditor(editor, { path: caps.path, isDir: true })
      return
    }
    case 'remove':
      onRemove()
  }
}

/** Shared repository-scoped context menu. `extras` are appended after Remove. */
export function repositoryMenuItems(path: string, onRemove: () => void, extras?: MenuItem[]): MenuItem[] {
  const caps = repoMenuCapabilities(path)
  const items: MenuItem[] = repoMenuEntries(caps).map((entry) => {
    if (entry.kind === 'separator') return { separator: true }
    return {
      label: entry.vars ? interp(t(entry.labelKey), entry.vars) : t(entry.labelKey),
      disabled: entry.disabled,
      danger: entry.danger,
      onClick: () => runAction(entry.id, caps, onRemove)
    }
  })
  if (extras?.length) items.push({ separator: true }, ...extras)
  return items
}

/** Close/remove a grouped repo using the same dirty-worktree warning as the chip X. */
export function confirmRemoveRepoFromGroup(groupTabId: string, repoPath: string): void {
  const settingsStore = useSettingsStore.getState()
  const warn = settingsStore.settings.warnOnClose ?? 'always'
  const status = repoCloseStatus(useRepoStore.getState().repos[repoPath])
  const shouldWarn = warn === 'always' || (warn === 'wip' && status !== null)
  if (!shouldWarn) {
    settingsStore.removeRepoFromGroup(groupTabId, repoPath)
    return
  }
  const message =
    status === 'conflict'
      ? t('titlebar.removeRepoConflicts')
      : status === 'wip'
        ? t('titlebar.removeRepoWip')
        : t('titlebar.removeRepoConfirm')
  useUIStore.getState().openModal({
    kind: 'confirm',
    title: t('titlebar.removeRepoTitle'),
    message,
    danger: true,
    confirmLabel: t('common.remove'),
    onConfirm: () => settingsStore.removeRepoFromGroup(groupTabId, repoPath)
  })
}

/** Close a tab through the same configured confirmation path used by its X button. */
export function requestCloseTab(tabId: string): void {
  const settingsStore = useSettingsStore.getState()
  const tab = settingsStore.settings.tabs.find((candidate) => candidate.id === tabId)
  if (!tab) return

  const status =
    tab.kind === 'page' ? null : tabCloseStatus(tab.repos, useRepoStore.getState().repos)
  const prompt = closeTabPrompt(tab, status, settingsStore.settings.warnOnClose)
  if (!prompt) {
    settingsStore.closeTab(tab.id)
    return
  }

  useUIStore.getState().openModal({
    kind: 'confirm',
    title: t(prompt.titleKey),
    message: prompt.vars
      ? interp(t(prompt.messageKey), {
          ...prompt.vars,
          ...(prompt.reasonKey ? { reason: t(prompt.reasonKey) } : {})
        })
      : t(prompt.messageKey),
    danger: true,
    confirmLabel: t('common.close'),
    autoFocusConfirm: prompt.autoFocusConfirm,
    onConfirm: () => settingsStore.closeTab(tab.id)
  })
}

export function confirmRemoveRecentRepo(repoPath: string): void {
  const settingsStore = useSettingsStore.getState()
  settingsStore.update((s) => ({
    ...s,
    recentRepos: s.recentRepos.filter((r) => r.path !== repoPath)
  }))
}
