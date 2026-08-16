import { create } from 'zustand'
import { migrateAIConfig, needsAccountsNotice, resolveAI } from '../../../shared/aiAccounts'
import {
  defaultProfile,
  defaultSettings,
  defaultGraphStyle,
  type AIConfig,
  type AIFeature,
  type AppSettings,
  type GroupTab,
  type PageContent,
  type Profile,
  type RepoFolder,
  type RepoLayout,
  type RepoRef,
  type TabState,
  type Workspace
} from '../../../shared/types'
import {
  deleteFolder,
  detachPath,
  flattenFolders,
  insertFolder,
  movePathToFolder,
  moveFolder,
  pruneFolders,
  updateFolder
} from '../lib/repoFolders'
import { settingsApi } from '../infrastructure/api'
import { useUIStore } from './ui'

const uid = (): string => Math.random().toString(36).slice(2, 10)

// Mission control is a full-body overlay, not a tab: anything that focuses a
// tab has to dismiss it, including re-focusing the tab that is already active
// (an unchanged `activeTabId` renders no effect, so the click looks dead).
const leaveMission = (): void => useUIStore.getState().setMissionOpen(false)

export const GROUP_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#06b6d4'
]

// Map pre-dynamic-theme ids onto the new merged light/dark theme ids.
const LEGACY_APP_THEME_IDS: Record<string, string> = {
  'gitcito-light': 'gitcito',
  'gitcito-contrast': 'contrast',
  'solarized-dark': 'solarized',
  'github-light': 'github'
}
const LEGACY_CODE_THEME_IDS: Record<string, string> = {
  'gitcito-dark': 'gitcito',
  'gitcito-light-code': 'gitcito',
  'dracula-code': 'dracula',
  'github-code': 'github',
  'monokai-code': 'monokai',
  'nord-code': 'nord'
}

/** Edit one group tab's folder tree, then prune it against that group's repo
 *  list so a folder can never claim a repo the group no longer holds. */
function withGroupFolders(
  s: AppSettings,
  tabId: string,
  fn: (folders: RepoFolder[], tab: GroupTab) => RepoFolder[]
): AppSettings {
  return {
    ...s,
    tabs: s.tabs.map((t) => {
      if (t.id !== tabId || t.kind !== 'group') return t
      return { ...t, folders: pruneFolders(fn(t.folders ?? [], t), t.repos) }
    })
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function persist(settings: AppSettings): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void settingsApi.set(settings), 250)
}

/** Mirror the live `tabs`/`activeTabId` into the active workspace record so a
 *  workspace switch (or the next app launch) restores the exact tab strip.
 *  Runs on every settings mutation — cheap, and keeps the two in lockstep
 *  without every tab action needing to know about workspaces. */
function syncActiveWorkspace(s: AppSettings): AppSettings {
  if (!s.workspaces?.length) return s
  return {
    ...s,
    workspaces: s.workspaces.map((w) =>
      w.id === s.activeWorkspaceId ? { ...w, tabs: s.tabs, activeTabId: s.activeTabId } : w
    )
  }
}

interface SettingsState {
  settings: AppSettings
  loaded: boolean

  load(opts?: { unlock?: boolean }): Promise<void>
  update(mut: (s: AppSettings) => AppSettings): void

  activeProfile(): Profile
  /**
   * The active profile's AI config with the connection for `feature` resolved
   * onto it. Every AI call site uses this instead of `activeProfile().ai`, so
   * pointing one feature at a different account is a settings change and not a
   * code change.
   */
  aiFor(feature?: AIFeature): AIConfig
  setActiveProfile(id: string): void
  saveProfile(profile: Profile): void
  addProfile(name: string): void
  deleteProfile(id: string): void
  /** Bind a repo path to a profile (or clear with null). Drives auto-switch
   *  when that repo becomes active. */
  setRepoProfile(path: string, profileId: string | null): void
  /** Patch a repo's per-repo layout override (graph columns + sidebar sections),
   *  keyed by repo path. */
  updateRepoLayout(path: string, mut: (layout: RepoLayout) => RepoLayout): void

  openRepoTab(repo: RepoRef): void
  /** Open (or focus) a repo requested by the `gitcito` CLI shim. Unlike
   *  openRepoTab, this can target/create a named group and inserts brand-new
   *  standalone tabs at the front (leftmost) since a CLI-opened repo is the
   *  thing the user just asked for. */
  openFromCli(payload: { path: string; name?: string; group?: string }): void
  /** Open (or focus the existing) non-repo page tab, e.g. the changelog. */
  openPageTab(page: PageContent): void
  /** Replace an existing page tab's content in place (e.g. prev/next release). */
  navigatePageTab(tabId: string, page: PageContent): void
  createGroupTab(name: string): void
  addRepoToGroup(tabId: string, repo: RepoRef): void
  removeRepoFromGroup(tabId: string, path: string): void
  renameRepoInGroup(tabId: string, path: string, newName: string): void
  reorderReposInGroup(tabId: string, fromPath: string, toPath: string | null): void
  setGroupActiveRepo(tabId: string, path: string | null): void
  closeTab(tabId: string): void
  reopenClosedTab(): void
  setActiveTab(tabId: string): void
  renameTab(tabId: string, name: string): void
  setTabColor(tabId: string, color: string): void
  reorderTabs(fromId: string, toId: string, before: boolean): void
  moveTabIntoGroup(fromTabId: string, toGroupTabId: string): void
  ejectRepoFromGroup(tabId: string, repoPath: string, insertBeforeTabId: string | null): void
  moveRepoBetweenGroups(fromTabId: string, repoPath: string, toTabId: string, insertBeforeRepoPath: string | null): void
  toggleTabCollapsed(tabId: string): void

  /** Create a folder inside a group. `parentFolderId` null puts it at the
   *  group root; any folder id nests it, to any depth. */
  createFolder(tabId: string, name: string, parentFolderId: string | null): void
  renameFolder(tabId: string, folderId: string, name: string): void
  setFolderColor(tabId: string, folderId: string, color: string): void
  /** Delete a folder — its repos and subfolders move up to its parent, so no
   *  repository leaves the group. */
  removeFolder(tabId: string, folderId: string): void
  toggleFolderCollapsed(tabId: string, folderId: string): void
  /** File a repo into a folder (null = group root), optionally before another
   *  repo already in that folder. */
  moveRepoToFolder(tabId: string, repoPath: string, folderId: string | null, beforePath?: string | null): void
  /** Re-parent a folder. Moving into its own subtree is a no-op. */
  moveFolderToFolder(tabId: string, folderId: string, parentFolderId: string | null, beforeFolderId?: string | null): void

  /** Create a fresh, empty workspace and switch to it. */
  createWorkspace(name: string): void
  renameWorkspace(id: string, name: string): void
  /** Reorder the workspace list (drag & drop in the switcher menu). */
  reorderWorkspaces(fromId: string, toId: string, before: boolean): void
  /** Delete a workspace; no-op on the last one. If it was active, falls back
   *  to a neighbour and loads its tabs. */
  deleteWorkspace(id: string): void
  /** Swap the whole tab strip to another saved workspace. */
  switchWorkspace(id: string): void
  /** Move a tab/group out of the live strip and into another workspace's tabs. */
  moveTabToWorkspace(tabId: string, workspaceId: string): void

  activeTab(): TabState | null
  activeRepo(): RepoRef | null
}

/**
 * Set during `load` when a pre-accounts AI config was migrated and the user has
 * not been told yet. App reads it once after loading and opens the notice —
 * kept out of the store's state so it cannot re-trigger on an unrelated update.
 */
let pendingAccountsNotice = false

export function takeAccountsNotice(): boolean {
  const pending = pendingAccountsNotice
  pendingAccountsNotice = false
  return pending
}

/** Session-only stack of recently closed tabs, for reopen (⌘⇧T). */
const closedTabStack: { tab: TabState; idx: number }[] = []

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings(),
  loaded: false,

  load: async (opts) => {
    // `unlock` decrypts the stored tokens on the way — used when the user opens
    // Settings, never on start-up (that would pop the OS keychain dialog before
    // the window has even painted).
    const settings = opts?.unlock ? await settingsApi.unlock() : await settingsApi.get()
    if (!settings.profiles.length) settings.profiles = [defaultProfile()]
    // Backwards compatibility: merge in newly added fields. `migrateAIConfig`
    // also folds a pre-accounts provider/key into the first AI account, so a
    // settings file written by an older build keeps working untouched.
    const defaults = defaultProfile()
    // Checked before migrating, since migration is what makes the old shape
    // disappear — this is the only moment the upgrade is still visible.
    const upgraded = settings.profiles.some((p) => needsAccountsNotice(p.ai))
    settings.profiles = settings.profiles.map((p) => ({
      ...defaults,
      ...p,
      ai: migrateAIConfig({ ...defaults.ai, ...p.ai, accounts: p.ai?.accounts })
    }))
    if (upgraded && !settings.aiAccountsNoticeSeen) pendingAccountsNotice = true
    const sd = defaultSettings()
    settings.appThemeId = settings.appThemeId ?? sd.appThemeId
    settings.codeThemeId = settings.codeThemeId ?? sd.codeThemeId
    settings.themeMode = settings.themeMode ?? sd.themeMode
    // Migrate legacy single-mode theme ids to the new dynamic theme ids.
    settings.appThemeId = LEGACY_APP_THEME_IDS[settings.appThemeId] ?? settings.appThemeId
    settings.codeThemeId = LEGACY_CODE_THEME_IDS[settings.codeThemeId] ?? settings.codeThemeId
    settings.codeFontSize = settings.codeFontSize ?? sd.codeFontSize
    settings.customAppThemes = settings.customAppThemes ?? []
    settings.customCodeThemes = settings.customCodeThemes ?? []
    settings.language = settings.language ?? sd.language
    settings.initialCommitCount = settings.initialCommitCount ?? sd.initialCommitCount
    settings.loadMoreCount = settings.loadMoreCount ?? sd.loadMoreCount
    settings.autoLoadOnScroll = settings.autoLoadOnScroll ?? sd.autoLoadOnScroll
    settings.relativeDates = settings.relativeDates ?? sd.relativeDates
    settings.commitAvatars = settings.commitAvatars ?? sd.commitAvatars
    settings.fileListView = settings.fileListView ?? sd.fileListView
    settings.groupBranches = settings.groupBranches ?? sd.groupBranches
    settings.graphColumns = { ...sd.graphColumns, ...(settings.graphColumns ?? {}) }
    settings.graphStyle = { ...defaultGraphStyle(), ...(settings.graphStyle ?? {}) }
    // Keep the order list complete: drop unknown ids, append any newly-added
    // columns (e.g. `deployment`) that an older saved order is missing.
    {
      const valid = new Set(sd.graphColumnOrder)
      const saved = (settings.graphColumnOrder ?? []).filter((id) => valid.has(id))
      const seen = new Set(saved)
      settings.graphColumnOrder = [...saved, ...sd.graphColumnOrder.filter((id) => !seen.has(id))]
    }
    settings.autoFetchMinutes = settings.autoFetchMinutes ?? sd.autoFetchMinutes
    settings.confirmForcePush = settings.confirmForcePush ?? sd.confirmForcePush
    settings.mergeCommit = settings.mergeCommit ?? sd.mergeCommit
    settings.sidebarOrder =
      settings.sidebarOrder && settings.sidebarOrder.length ? settings.sidebarOrder : sd.sidebarOrder
    settings.sidebarHidden = settings.sidebarHidden ?? sd.sidebarHidden
    settings.autoOpenChangelog = settings.autoOpenChangelog ?? sd.autoOpenChangelog
    settings.wipSnapshotMinutes = settings.wipSnapshotMinutes ?? sd.wipSnapshotMinutes
    settings.maskSecrets = settings.maskSecrets ?? sd.maskSecrets
    settings.shortcuts = settings.shortcuts ?? sd.shortcuts
    settings.largeFileKb = settings.largeFileKb ?? sd.largeFileKb
    settings.warnOnClose = settings.warnOnClose ?? sd.warnOnClose
    settings.terminalPlacement = settings.terminalPlacement ?? sd.terminalPlacement
    settings.sidebarSide = settings.sidebarSide ?? sd.sidebarSide
    settings.rightPanelFullHeight = settings.rightPanelFullHeight ?? sd.rightPanelFullHeight
    settings.repoProfiles = settings.repoProfiles ?? sd.repoProfiles
    settings.repoLayouts = settings.repoLayouts ?? {}
    // Workspaces: wrap a pre-workspaces install's existing tabs into a default
    // workspace, then load the active workspace's tabs into the live view.
    // `defaultSettings()` (merged in by the main process on read) seeds an empty
    // `default` workspace, so a genuinely un-migrated file — one with live `tabs`
    // but no real workspace — shows up here as that pristine empty default. Treat
    // it the same as a missing `workspaces` and wrap the live tabs, or they'd be
    // discarded at the `settings.tabs = aw.tabs` step below.
    const pristineDefaultWs =
      settings.workspaces?.length === 1 &&
      settings.workspaces[0].id === 'default' &&
      !settings.workspaces[0].tabs?.length
    if (!settings.workspaces?.length || (pristineDefaultWs && settings.tabs?.length)) {
      settings.workspaces = [{ id: 'default', name: 'Gitcito', tabs: settings.tabs, activeTabId: settings.activeTabId }]
    } else if (
      settings.workspaces.length === 1 &&
      settings.workspaces[0].id === 'default' &&
      settings.workspaces[0].name === 'Default'
    ) {
      // Legacy auto-created workspace was named "Default". The logo now doubles
      // as the workspace switcher, so rebrand the lone default to the app name.
      settings.workspaces[0].name = 'Gitcito'
    }
    settings.activeWorkspaceId =
      settings.activeWorkspaceId && settings.workspaces.some((w) => w.id === settings.activeWorkspaceId)
        ? settings.activeWorkspaceId
        : settings.workspaces[0].id
    {
      const aw = settings.workspaces.find((w) => w.id === settings.activeWorkspaceId)!
      settings.tabs = aw.tabs
      settings.activeTabId = aw.activeTabId
    }
    // Group folders are organisation-only, so reconcile every tree with its
    // group's repo list on load: a repo removed by another build (or a
    // hand-edited settings file) must not leave a dangling folder entry.
    const normalizeTabs = (tabs: TabState[]): TabState[] =>
      tabs.map((t) =>
        t.kind === 'group' && t.folders?.length ? { ...t, folders: pruneFolders(t.folders, t.repos) } : t
      )
    settings.workspaces = settings.workspaces.map((w) => ({ ...w, tabs: normalizeTabs(w.tabs ?? []) }))
    settings.tabs = normalizeTabs(settings.tabs)
    set({ settings, loaded: true })
  },

  update: (mut) => {
    const settings = syncActiveWorkspace(mut(get().settings))
    set({ settings })
    persist(settings)
  },

  activeProfile: () => {
    const { settings } = get()
    return settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0] ?? defaultProfile()
  },

  aiFor: (feature) => resolveAI(get().activeProfile().ai, feature),

  setActiveProfile: (id) => get().update((s) => ({ ...s, activeProfileId: id })),

  saveProfile: (profile) =>
    get().update((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.id === profile.id ? profile : p))
    })),

  addProfile: (name) =>
    get().update((s) => {
      const profile: Profile = { ...defaultProfile(), id: uid(), name }
      return { ...s, profiles: [...s.profiles, profile], activeProfileId: profile.id }
    }),

  deleteProfile: (id) =>
    get().update((s) => {
      const profiles = s.profiles.filter((p) => p.id !== id)
      if (!profiles.length) profiles.push(defaultProfile())
      // Drop repo bindings that pointed at the deleted profile so they don't
      // resolve to a stale id on the next auto-switch.
      const repoProfiles = Object.fromEntries(
        Object.entries(s.repoProfiles).filter(([, pid]) => pid !== id)
      )
      return {
        ...s,
        profiles,
        repoProfiles,
        activeProfileId: s.activeProfileId === id ? profiles[0].id : s.activeProfileId
      }
    }),

  setRepoProfile: (path, profileId) =>
    get().update((s) => {
      const repoProfiles = { ...s.repoProfiles }
      if (profileId === null) delete repoProfiles[path]
      else repoProfiles[path] = profileId
      return { ...s, repoProfiles }
    }),

  updateRepoLayout: (path, mut) =>
    get().update((s) => ({
      ...s,
      repoLayouts: { ...(s.repoLayouts ?? {}), [path]: mut(s.repoLayouts?.[path] ?? {}) }
    })),

  openRepoTab: (repo) => {
    leaveMission()
    return get().update((s) => {
      const existing = s.tabs.find((t) => t.kind === 'repo' && t.activeRepoPath === repo.path)
      if (existing) return { ...s, activeTabId: existing.id }
      const tab: TabState = { id: uid(), kind: 'repo', name: repo.name, repos: [repo], activeRepoPath: repo.path }
      const recentRepos = [repo, ...s.recentRepos.filter((r) => r.path !== repo.path)].slice(0, 8)
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id, recentRepos }
    })
  },

  openFromCli: (payload) => {
    leaveMission()
    return get().update((s) => {
      const path = payload.path
      const displayName = payload.name?.trim() || path.split('/').pop() || path
      const groupName = payload.group?.trim()

      // Already open somewhere (standalone or inside a group) — just focus it,
      // matching by path since a repo can be renamed/moved independently.
      const existing = s.tabs.find((t) => t.kind !== 'page' && t.repos.some((r) => r.path === path))
      if (existing) {
        const tabs =
          existing.kind === 'group'
            ? s.tabs.map((t) => (t.id === existing.id ? { ...t, activeRepoPath: path } : t))
            : s.tabs
        return { ...s, tabs, activeTabId: existing.id }
      }

      const repo: RepoRef = { path, name: displayName }
      const recentRepos = [repo, ...s.recentRepos.filter((r) => r.path !== path)].slice(0, 8)

      if (groupName) {
        // Same-named group already open → drop the repo into it. Otherwise
        // spin up a fresh group tab (a new project name doesn't reuse another
        // path's tab, same as the no-group case below).
        const existingGroup = s.tabs.find(
          (t): t is Extract<TabState, { kind: 'group' }> =>
            t.kind === 'group' && t.name.toLowerCase() === groupName.toLowerCase()
        )
        if (existingGroup) {
          const tabs = s.tabs.map((t) =>
            t.id === existingGroup.id && t.kind === 'group'
              ? { ...t, repos: [...t.repos, repo], activeRepoPath: path }
              : t
          )
          return { ...s, tabs, activeTabId: existingGroup.id, recentRepos }
        }
        const groupCount = s.tabs.filter((t) => t.kind === 'group').length
        const color = GROUP_COLORS[groupCount % GROUP_COLORS.length]
        const tab: TabState = { id: uid(), kind: 'group', name: groupName, repos: [repo], activeRepoPath: path, color }
        return { ...s, tabs: [tab, ...s.tabs], activeTabId: tab.id, recentRepos }
      }

      // New standalone tab — inserted at the front so the repo the user just
      // asked to open is immediately visible, not buried after existing tabs.
      const tab: TabState = { id: uid(), kind: 'repo', name: displayName, repos: [repo], activeRepoPath: path }
      return { ...s, tabs: [tab, ...s.tabs], activeTabId: tab.id, recentRepos }
    })
  },

  openPageTab: (page) => {
    leaveMission()
    return get().update((s) => {
      // One tab per page identity — focus it if already open. Changelog is a
      // singleton; releases are keyed by release id so each opens its own tab.
      const existing = s.tabs.find(
        (t) =>
          t.kind === 'page' &&
          t.page.type === page.type &&
          (page.type !== 'release' || (t.page.type === 'release' && t.page.release.id === page.release.id)) &&
          (page.type !== 'issue' || (t.page.type === 'issue' && t.page.issue.number === page.issue.number)) &&
          (page.type !== 'milestone' ||
            (t.page.type === 'milestone' && t.page.milestone.number === page.milestone.number)) &&
          // A wiki belongs to one repo, so each repo gets its own tab.
          (page.type !== 'wiki' || (t.page.type === 'wiki' && t.page.repoPath === page.repoPath))
      )
      if (existing) return { ...s, activeTabId: existing.id }
      // No name is stored: page tabs label themselves at render time, in the
      // language the user is reading right now (see `pageTabLabel`).
      const tab: TabState = { id: uid(), kind: 'page', name: '', page }
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id }
    })
  },

  navigatePageTab: (tabId, page) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) =>
        t.id === tabId && t.kind === 'page' ? { ...t, page } : t
      )
    })),

  createGroupTab: (name) => {
    leaveMission()
    return get().update((s) => {
      const groupCount = s.tabs.filter((t) => t.kind === 'group').length
      const color = GROUP_COLORS[groupCount % GROUP_COLORS.length]
      const tab: TabState = { id: uid(), kind: 'group', name, repos: [], activeRepoPath: null, color }
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id }
    })
  },

  addRepoToGroup: (tabId, repo) =>
    get().update((s) => ({
      ...s,
      recentRepos: [repo, ...s.recentRepos.filter((r) => r.path !== repo.path)].slice(0, 8),
      tabs: s.tabs.map((t) =>
        t.id === tabId && t.kind !== 'page' && !t.repos.some((r) => r.path === repo.path)
          ? { ...t, repos: [...t.repos, repo], activeRepoPath: t.activeRepoPath ?? repo.path }
          : t
      )
    })),

  removeRepoFromGroup: (tabId, path) =>
    get().update((s) => {
      const mapped = s.tabs.map((t) => {
        if (t.id !== tabId || t.kind === 'page') return t
        const repos = t.repos.filter((r) => r.path !== path)
        const activeRepoPath = t.activeRepoPath === path ? (repos[0]?.path ?? null) : t.activeRepoPath
        if (t.kind !== 'group') return { ...t, repos, activeRepoPath }
        return { ...t, repos, activeRepoPath, folders: detachPath(t.folders ?? [], path) }
      })
      const found = mapped.find((t) => t.id === tabId)
      const isEmpty = found != null && found.kind !== 'page' && found.repos.length === 0
      if (!isEmpty) return { ...s, tabs: mapped }
      const idx = mapped.findIndex((t) => t.id === tabId)
      const tabs = mapped.filter((t) => t.id !== tabId)
      const activeTabId =
        s.activeTabId === tabId ? (tabs[Math.min(idx, tabs.length - 1)]?.id ?? null) : s.activeTabId
      return { ...s, tabs, activeTabId }
    }),

  renameRepoInGroup: (tabId, path, newName) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) =>
        t.id === tabId && t.kind !== 'page'
          ? { ...t, repos: t.repos.map((r) => (r.path === path ? { ...r, name: newName } : r)) }
          : t
      )
    })),

  reorderReposInGroup: (tabId, fromPath, toPath) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId || t.kind === 'page') return t
        const repos = [...t.repos]
        const fromIdx = repos.findIndex((r) => r.path === fromPath)
        if (fromIdx < 0) return t
        const [item] = repos.splice(fromIdx, 1)
        if (toPath === null) {
          repos.push(item)
        } else {
          const toIdx = repos.findIndex((r) => r.path === toPath)
          if (toIdx < 0) { repos.push(item) } else { repos.splice(toIdx, 0, item) }
        }
        return { ...t, repos }
      })
    })),

  setGroupActiveRepo: (tabId, path) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === tabId && t.kind !== 'page' ? { ...t, activeRepoPath: path } : t))
    })),

  closeTab: (tabId) =>
    get().update((s) => {
      const idx = s.tabs.findIndex((t) => t.id === tabId)
      const closed = s.tabs[idx]
      if (closed) closedTabStack.push({ tab: closed, idx }) // for ⌘⇧T
      if (closedTabStack.length > 10) closedTabStack.shift()
      const tabs = s.tabs.filter((t) => t.id !== tabId)
      const activeTabId =
        s.activeTabId === tabId ? (tabs[Math.min(idx, tabs.length - 1)]?.id ?? null) : s.activeTabId
      return { ...s, tabs, activeTabId }
    }),

  reopenClosedTab: () => {
    const last = closedTabStack.pop()
    if (!last) return
    get().update((s) => {
      // Skip if a tab with that id somehow already exists.
      if (s.tabs.some((t) => t.id === last.tab.id)) return { ...s, activeTabId: last.tab.id }
      const tabs = [...s.tabs]
      tabs.splice(Math.min(last.idx, tabs.length), 0, last.tab)
      return { ...s, tabs, activeTabId: last.tab.id }
    })
  },

  setActiveTab: (tabId) => {
    leaveMission()
    get().update((s) => ({ ...s, activeTabId: tabId }))
  },

  renameTab: (tabId, name) =>
    get().update((s) => ({
      ...s,
      // Renaming a page tab pins the name: from then on it is the user's, not a
      // label we derive.
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, name, ...(t.kind === 'page' ? { renamed: true } : {}) } : t))
    })),

  setTabColor: (tabId, color) =>
    get().update((s) => ({ ...s, tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, color } : t)) })),

  toggleTabCollapsed: (tabId) =>
    get().update((s) => ({ ...s, tabs: s.tabs.map((t) => (t.id === tabId && t.kind === 'group' ? { ...t, collapsed: !t.collapsed } : t)) })),

  reorderTabs: (fromId, toId, before) =>
    get().update((s) => {
      if (fromId === toId) return s
      const from = s.tabs.find((t) => t.id === fromId)
      if (!from) return s
      const tabs = s.tabs.filter((t) => t.id !== fromId)
      const toIdx = tabs.findIndex((t) => t.id === toId)
      if (toIdx < 0) return s
      tabs.splice(before ? toIdx : toIdx + 1, 0, from)
      return { ...s, tabs }
    }),

  moveTabIntoGroup: (fromTabId, toGroupTabId) =>
    get().update((s) => {
      const from = s.tabs.find((t) => t.id === fromTabId)
      const toGroup = s.tabs.find((t) => t.id === toGroupTabId)
      if (!from || from.kind !== 'repo' || !toGroup || toGroup.kind !== 'group') return s
      const repo = from.repos[0]
      if (!repo) return s
      const tabs = s.tabs
        .filter((t) => t.id !== fromTabId)
        .map((t) =>
          t.id === toGroupTabId && t.kind === 'group'
            ? { ...t, repos: [...t.repos, repo], activeRepoPath: t.activeRepoPath ?? repo.path }
            : t
        )
      const activeTabId = s.activeTabId === fromTabId ? toGroupTabId : s.activeTabId
      return { ...s, tabs, activeTabId }
    }),

  ejectRepoFromGroup: (tabId, repoPath, insertBeforeTabId) =>
    get().update((s) => {
      const group = s.tabs.find((t) => t.id === tabId)
      if (!group || group.kind !== 'group') return s
      const repo = group.repos.find((r) => r.path === repoPath)
      if (!repo) return s
      const repos = group.repos.filter((r) => r.path !== repoPath)
      const activeRepoPath = group.activeRepoPath === repoPath ? (repos[0]?.path ?? null) : group.activeRepoPath
      const updatedGroup =
        repos.length > 0 ? { ...group, repos, activeRepoPath, folders: detachPath(group.folders ?? [], repoPath) } : null
      const newTab: TabState = { id: uid(), kind: 'repo', name: repo.name, repos: [repo], activeRepoPath: repo.path }
      let tabs = s.tabs.map((t) => (t.id === tabId ? updatedGroup : t)).filter(Boolean) as TabState[]
      const insertIdx = insertBeforeTabId ? tabs.findIndex((t) => t.id === insertBeforeTabId) : -1
      if (insertIdx >= 0) tabs.splice(insertIdx, 0, newTab)
      else tabs.push(newTab)
      return { ...s, tabs }
    }),

  moveRepoBetweenGroups: (fromTabId, repoPath, toTabId, insertBeforeRepoPath) =>
    get().update((s) => {
      const fromGroup = s.tabs.find((t) => t.id === fromTabId)
      if (!fromGroup || fromGroup.kind !== 'group') return s
      const repo = fromGroup.repos.find((r) => r.path === repoPath)
      if (!repo) return s
      const fromRepos = fromGroup.repos.filter((r) => r.path !== repoPath)
      const fromActiveRepoPath = fromGroup.activeRepoPath === repoPath ? (fromRepos[0]?.path ?? null) : fromGroup.activeRepoPath
      const tabs = s.tabs
        .map((t) => {
          if (t.id === fromTabId)
            return fromRepos.length > 0
              ? {
                  ...t,
                  repos: fromRepos,
                  activeRepoPath: fromActiveRepoPath,
                  ...(t.kind === 'group' ? { folders: detachPath(t.folders ?? [], repoPath) } : {})
                }
              : null
          if (t.id === toTabId && t.kind === 'group') {
            const toRepos = [...t.repos]
            const insertIdx = insertBeforeRepoPath ? toRepos.findIndex((r) => r.path === insertBeforeRepoPath) : -1
            if (insertIdx >= 0) toRepos.splice(insertIdx, 0, repo)
            else toRepos.push(repo)
            return { ...t, repos: toRepos, activeRepoPath: t.activeRepoPath ?? repo.path }
          }
          return t
        })
        .filter(Boolean) as TabState[]
      return { ...s, tabs }
    }),

  createFolder: (tabId, name, parentFolderId) =>
    get().update((s) =>
      withGroupFolders(s, tabId, (folders) => {
        // Give each folder its own colour up front — inheriting the group's
        // would make every level look the same in the tab strip.
        const used = flattenFolders(folders).length
        const color = GROUP_COLORS[(used + 1) % GROUP_COLORS.length]
        const folder: RepoFolder = { id: uid(), name, color, paths: [], folders: [] }
        return insertFolder(folders, parentFolderId, folder)
      })
    ),

  renameFolder: (tabId, folderId, name) =>
    get().update((s) => withGroupFolders(s, tabId, (f) => updateFolder(f, folderId, (x) => ({ ...x, name })))),

  setFolderColor: (tabId, folderId, color) =>
    get().update((s) => withGroupFolders(s, tabId, (f) => updateFolder(f, folderId, (x) => ({ ...x, color })))),

  removeFolder: (tabId, folderId) =>
    get().update((s) => withGroupFolders(s, tabId, (f) => deleteFolder(f, folderId))),

  toggleFolderCollapsed: (tabId, folderId) =>
    get().update((s) =>
      withGroupFolders(s, tabId, (f) => updateFolder(f, folderId, (x) => ({ ...x, collapsed: !x.collapsed })))
    ),

  moveRepoToFolder: (tabId, repoPath, folderId, beforePath = null) =>
    get().update((s) => withGroupFolders(s, tabId, (f) => movePathToFolder(f, repoPath, folderId, beforePath))),

  moveFolderToFolder: (tabId, folderId, parentFolderId, beforeFolderId = null) =>
    get().update((s) => withGroupFolders(s, tabId, (f) => moveFolder(f, folderId, parentFolderId, beforeFolderId))),

  createWorkspace: (name) =>
    get().update((s) => {
      // Outgoing workspace is already mirrored (syncActiveWorkspace runs on
      // every update), so we only need to add the new one and clear the live
      // tab strip for a clean slate.
      const ws: Workspace = { id: uid(), name, tabs: [], activeTabId: null }
      return { ...s, workspaces: [...s.workspaces, ws], activeWorkspaceId: ws.id, tabs: [], activeTabId: null }
    }),

  renameWorkspace: (id, name) =>
    get().update((s) => ({
      ...s,
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w))
    })),

  reorderWorkspaces: (fromId, toId, before) =>
    get().update((s) => {
      if (fromId === toId) return s
      const from = s.workspaces.find((w) => w.id === fromId)
      if (!from) return s
      const workspaces = s.workspaces.filter((w) => w.id !== fromId)
      const toIdx = workspaces.findIndex((w) => w.id === toId)
      if (toIdx < 0) return s
      workspaces.splice(before ? toIdx : toIdx + 1, 0, from)
      return { ...s, workspaces }
    }),

  deleteWorkspace: (id) =>
    get().update((s) => {
      if (s.workspaces.length <= 1) return s
      const idx = s.workspaces.findIndex((w) => w.id === id)
      if (idx < 0) return s
      const workspaces = s.workspaces.filter((w) => w.id !== id)
      if (id !== s.activeWorkspaceId) return { ...s, workspaces }
      const next = workspaces[Math.min(idx, workspaces.length - 1)]
      return { ...s, workspaces, activeWorkspaceId: next.id, tabs: next.tabs, activeTabId: next.activeTabId }
    }),

  switchWorkspace: (id) =>
    get().update((s) => {
      if (id === s.activeWorkspaceId) return s
      const target = s.workspaces.find((w) => w.id === id)
      if (!target) return s
      return { ...s, activeWorkspaceId: id, tabs: target.tabs, activeTabId: target.activeTabId }
    }),

  moveTabToWorkspace: (tabId, workspaceId) =>
    get().update((s) => {
      if (workspaceId === s.activeWorkspaceId) return s
      const target = s.workspaces.find((w) => w.id === workspaceId)
      const tab = s.tabs.find((t) => t.id === tabId)
      if (!target || !tab) return s
      const wasActive = s.activeTabId === tabId
      const srcTabs = s.tabs.filter((t) => t.id !== tabId)
      const targetTabs = [...target.tabs, tab]
      // Mirror BOTH workspaces explicitly. syncActiveWorkspace only mirrors the
      // active workspace, and when we follow the moved tab we flip which one that
      // is — so the outgoing workspace's tab strip must be persisted here.
      const workspaces = s.workspaces.map((w) => {
        if (w.id === s.activeWorkspaceId)
          return { ...w, tabs: srcTabs, activeTabId: wasActive ? (srcTabs[0]?.id ?? null) : s.activeTabId }
        if (w.id === workspaceId)
          return { ...w, tabs: targetTabs, activeTabId: wasActive ? tabId : w.activeTabId }
        return w
      })
      // If the moved tab was selected, follow it into the target workspace and
      // land on it. Otherwise stay put in the current workspace.
      if (wasActive) {
        return { ...s, workspaces, activeWorkspaceId: workspaceId, tabs: targetTabs, activeTabId: tabId }
      }
      return { ...s, workspaces, tabs: srcTabs }
    }),

  activeTab: () => {
    const { settings } = get()
    return settings.tabs.find((t) => t.id === settings.activeTabId) ?? null
  },

  activeRepo: () => {
    const tab = get().activeTab()
    if (!tab || tab.kind === 'page' || !tab.activeRepoPath) return null
    return tab.repos.find((r) => r.path === tab.activeRepoPath) ?? null
  }
}))
