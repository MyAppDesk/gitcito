import { create } from 'zustand'
import {
  defaultProfile,
  defaultSettings,
  type AppSettings,
  type PageContent,
  type Profile,
  type RepoRef,
  type TabState
} from '../../../shared/types'
import { settingsApi } from '../infrastructure/api'

const uid = (): string => Math.random().toString(36).slice(2, 10)

/** Tab title for a page tab. Release tabs read "repo - version" so several
 *  releases from different repos stay distinguishable in the tab strip. */
function pageTabName(page: PageContent): string {
  if (page.type === 'logs') return 'Operation log'
  if (page.type === 'notifications') return 'Notifications'
  if (page.type === 'insights') return 'Insights'
  if (page.type === 'vault') return 'Vault'
  if (page.type === 'issue') return `#${page.issue.number} ${page.issue.title}`
  if (page.type === 'milestone') return `🏁 ${page.milestone.title}`
  if (page.type !== 'release') return "What's new"
  const repo = page.repoPath.split('/').pop() || page.repoPath
  const version = page.release.tag || page.release.name || `#${page.release.id}`
  return `${repo} - ${version}`
}

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

let saveTimer: ReturnType<typeof setTimeout> | null = null
function persist(settings: AppSettings): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void settingsApi.set(settings), 250)
}

interface SettingsState {
  settings: AppSettings
  loaded: boolean

  load(): Promise<void>
  update(mut: (s: AppSettings) => AppSettings): void

  activeProfile(): Profile
  setActiveProfile(id: string): void
  saveProfile(profile: Profile): void
  addProfile(name: string): void
  deleteProfile(id: string): void

  openRepoTab(repo: RepoRef): void
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
  setActiveTab(tabId: string): void
  renameTab(tabId: string, name: string): void
  setTabColor(tabId: string, color: string): void
  reorderTabs(fromId: string, toId: string, before: boolean): void
  moveTabIntoGroup(fromTabId: string, toGroupTabId: string): void
  ejectRepoFromGroup(tabId: string, repoPath: string, insertBeforeTabId: string | null): void
  moveRepoBetweenGroups(fromTabId: string, repoPath: string, toTabId: string, insertBeforeRepoPath: string | null): void
  toggleTabCollapsed(tabId: string): void

  activeTab(): TabState | null
  activeRepo(): RepoRef | null
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings(),
  loaded: false,

  load: async () => {
    const settings = await settingsApi.get()
    if (!settings.profiles.length) settings.profiles = [defaultProfile()]
    // Backwards compatibility: merge in newly added fields.
    const defaults = defaultProfile()
    settings.profiles = settings.profiles.map((p) => ({ ...defaults, ...p, ai: { ...defaults.ai, ...p.ai } }))
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
    settings.graphColumns = { ...sd.graphColumns, ...(settings.graphColumns ?? {}) }
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
    set({ settings, loaded: true })
  },

  update: (mut) => {
    const settings = mut(get().settings)
    set({ settings })
    persist(settings)
  },

  activeProfile: () => {
    const { settings } = get()
    return settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0] ?? defaultProfile()
  },

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
      return {
        ...s,
        profiles,
        activeProfileId: s.activeProfileId === id ? profiles[0].id : s.activeProfileId
      }
    }),

  openRepoTab: (repo) =>
    get().update((s) => {
      const existing = s.tabs.find((t) => t.kind === 'repo' && t.activeRepoPath === repo.path)
      if (existing) return { ...s, activeTabId: existing.id }
      const tab: TabState = { id: uid(), kind: 'repo', name: repo.name, repos: [repo], activeRepoPath: repo.path }
      const recentRepos = [repo, ...s.recentRepos.filter((r) => r.path !== repo.path)].slice(0, 8)
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id, recentRepos }
    }),

  openPageTab: (page) =>
    get().update((s) => {
      // One tab per page identity — focus it if already open. Changelog is a
      // singleton; releases are keyed by release id so each opens its own tab.
      const existing = s.tabs.find(
        (t) =>
          t.kind === 'page' &&
          t.page.type === page.type &&
          (page.type !== 'release' || (t.page.type === 'release' && t.page.release.id === page.release.id)) &&
          (page.type !== 'issue' || (t.page.type === 'issue' && t.page.issue.number === page.issue.number)) &&
          (page.type !== 'milestone' ||
            (t.page.type === 'milestone' && t.page.milestone.number === page.milestone.number))
      )
      if (existing) return { ...s, activeTabId: existing.id }
      const tab: TabState = { id: uid(), kind: 'page', name: pageTabName(page), page }
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id }
    }),

  navigatePageTab: (tabId, page) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) =>
        t.id === tabId && t.kind === 'page' ? { ...t, page, name: pageTabName(page) } : t
      )
    })),

  createGroupTab: (name) =>
    get().update((s) => {
      const groupCount = s.tabs.filter((t) => t.kind === 'group').length
      const color = GROUP_COLORS[groupCount % GROUP_COLORS.length]
      const tab: TabState = { id: uid(), kind: 'group', name, repos: [], activeRepoPath: null, color }
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id }
    }),

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
        return { ...t, repos, activeRepoPath }
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
      const tabs = s.tabs.filter((t) => t.id !== tabId)
      const activeTabId =
        s.activeTabId === tabId ? (tabs[Math.min(idx, tabs.length - 1)]?.id ?? null) : s.activeTabId
      return { ...s, tabs, activeTabId }
    }),

  setActiveTab: (tabId) => get().update((s) => ({ ...s, activeTabId: tabId })),

  renameTab: (tabId, name) =>
    get().update((s) => ({ ...s, tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)) })),

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
      const updatedGroup = repos.length > 0 ? { ...group, repos, activeRepoPath } : null
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
          if (t.id === fromTabId) return fromRepos.length > 0 ? { ...t, repos: fromRepos, activeRepoPath: fromActiveRepoPath } : null
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
