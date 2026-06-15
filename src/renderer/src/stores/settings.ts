import { create } from 'zustand'
import {
  defaultProfile,
  defaultSettings,
  type AppSettings,
  type Profile,
  type RepoRef,
  type TabState
} from '../../../shared/types'
import { settingsApi } from '../infrastructure/api'

const uid = (): string => Math.random().toString(36).slice(2, 10)

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
  createGroupTab(name: string): void
  addRepoToGroup(tabId: string, repo: RepoRef): void
  removeRepoFromGroup(tabId: string, path: string): void
  renameRepoInGroup(tabId: string, path: string, newName: string): void
  reorderReposInGroup(tabId: string, fromPath: string, toPath: string): void
  setGroupActiveRepo(tabId: string, path: string | null): void
  closeTab(tabId: string): void
  setActiveTab(tabId: string): void
  renameTab(tabId: string, name: string): void

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
    settings.autoFetchMinutes = settings.autoFetchMinutes ?? sd.autoFetchMinutes
    settings.confirmForcePush = settings.confirmForcePush ?? sd.confirmForcePush
    settings.sidebarOrder =
      settings.sidebarOrder && settings.sidebarOrder.length ? settings.sidebarOrder : sd.sidebarOrder
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

  createGroupTab: (name) =>
    get().update((s) => {
      const tab: TabState = { id: uid(), kind: 'group', name, repos: [], activeRepoPath: null }
      return { ...s, tabs: [...s.tabs, tab], activeTabId: tab.id }
    }),

  addRepoToGroup: (tabId, repo) =>
    get().update((s) => ({
      ...s,
      recentRepos: [repo, ...s.recentRepos.filter((r) => r.path !== repo.path)].slice(0, 8),
      tabs: s.tabs.map((t) =>
        t.id === tabId && !t.repos.some((r) => r.path === repo.path)
          ? { ...t, repos: [...t.repos, repo], activeRepoPath: t.activeRepoPath ?? repo.path }
          : t
      )
    })),

  removeRepoFromGroup: (tabId, path) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t
        const repos = t.repos.filter((r) => r.path !== path)
        const activeRepoPath = t.activeRepoPath === path ? (repos[0]?.path ?? null) : t.activeRepoPath
        return { ...t, repos, activeRepoPath }
      })
    })),

  renameRepoInGroup: (tabId, path, newName) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? { ...t, repos: t.repos.map((r) => (r.path === path ? { ...r, name: newName } : r)) }
          : t
      )
    })),

  reorderReposInGroup: (tabId, fromPath, toPath) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t
        const repos = [...t.repos]
        const fromIdx = repos.findIndex((r) => r.path === fromPath)
        const toIdx = repos.findIndex((r) => r.path === toPath)
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return t
        const [item] = repos.splice(fromIdx, 1)
        repos.splice(toIdx, 0, item)
        return { ...t, repos }
      })
    })),

  setGroupActiveRepo: (tabId, path) =>
    get().update((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, activeRepoPath: path } : t))
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

  activeTab: () => {
    const { settings } = get()
    return settings.tabs.find((t) => t.id === settings.activeTabId) ?? null
  },

  activeRepo: () => {
    const tab = get().activeTab()
    if (!tab || !tab.activeRepoPath) return null
    return tab.repos.find((r) => r.path === tab.activeRepoPath) ?? null
  }
}))
