import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GitMerge, FolderOpen, Download, ArrowDownToLine, Bug, LifeBuoy, MessageSquare, X } from 'lucide-react'
import { takeAccountsNotice, useSettingsStore } from './stores/settings'
import { useRepoStore, repoActions, type RepoData } from './stores/repo'
import { useUIStore } from './stores/ui'
import { tabActiveRepoPath, tabRepos, type ConflictOpKind, type GroupTab, type PageTab } from '../../shared/types'
import { useT, t as tr, interp } from './i18n'
import { applyDirection } from './i18n/direction'
import { applyAppTheme, applyCodeTheme, findAppTheme, findCodeTheme } from './theme/themes'
import { TitleBar, requestCloseTab } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { GraphView } from './components/GraphView'
import { FileViewer } from './components/FileViewer'
import { ConflictResolver } from './components/ConflictResolver'
import { CommitDetails } from './components/CommitDetails'
import { StashDetails } from './components/StashDetails'
import { CommitComposer } from './components/CommitComposer'
import { TerminalContainer } from './components/TerminalContainer'
import { DebugToolbar } from './components/DebugToolbar'
import { ContextMenu } from './components/ContextMenu'
import { ModalHost } from './components/ModalHost'
import { CommandPalette } from './components/CommandPalette'
import { Toasts } from './components/Toasts'
import { UpdateBanner } from './components/UpdateBanner'
import { RepoCosmos } from './components/cosmos/RepoCosmos'
import { useUpdatesStore, hasPendingUpdate } from './stores/updates'
import { Welcome, LauncherPanel, type LauncherItem } from './components/Welcome'
import { OnboardingWizard } from './components/OnboardingWizard'
import { ChangelogPage } from './components/ChangelogPage'
import { LicensesPage } from './components/LicensesPage'
import { MissionControlPage } from './components/MissionControlPage'
import { HelpPage } from './components/HelpPage'
import { LogsPage } from './components/LogsPage'
import { NotificationsPage } from './components/NotificationsPage'
import { InsightsPage } from './components/InsightsPage'
import { WikiPageView } from './components/WikiPageView'
import { VaultPage } from './components/VaultPage'
import { ReleasePage } from './components/ReleasePage'
import { IssueDetailPage } from './components/IssueDetailPage'
import { MilestoneDetailPage } from './components/MilestoneDetailPage'
import { ResizeHandle } from './components/ResizeHandle'
import { ZoomControl } from './components/ZoomControl'
import { RepoChatPanel } from './components/RepoChatPanel'
import gitcitoLaunch from './assets/gitcito-launch.png'
import { matchShortcut, effectiveBindings, tabActionFromEvent, tabIndexFromEvent } from './lib/shortcuts'
import { terminalShortcutFromEvent } from './lib/terminalShortcuts'
import { repoChatAvailable, rightPanelDetailsState, rightPanelToggleAction } from './lib/repoChatUI'
import { folderOpenMenuItems } from './lib/openWith'
import { hostingApi, gitApi, cliApi, keychainApi } from './infrastructure/api'

function InitRepo({ path }: { path: string }): React.JSX.Element {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const init = async (): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.initHere(path)
      await useRepoStore.getState().refresh(path)
    } catch (err) {
      useUIStore.getState().toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }
  return (
    <div className="welcome">
      <div className="welcome-card">
        <h1>{t('initRepo.title')}</h1>
        <p>
          {interp(t('initRepo.body'), { path })}
        </p>
        <button className="btn primary" disabled={busy} onClick={() => void init()}>
          {busy ? t('initRepo.initializing') : t('initRepo.initialize')}
        </button>
      </div>
    </div>
  )
}

function GroupView({ tab }: { tab: GroupTab }): React.JSX.Element {
  const t = useT()
  const { settings, addRepoToGroup, removeRepoFromGroup, renameRepoInGroup, reorderReposInGroup, setGroupActiveRepo } = useSettingsStore()
  const openModal = useUIStore((s) => s.openModal)

  const openRepo = async (): Promise<void> => {
    const path = await window.api.selectDirectory()
    if (!path) return
    addRepoToGroup(tab.id, { path, name: path.split('/').pop() ?? path })
  }

  const cloneRepo = (): void => {
    openModal({ kind: 'clone', onClone: (repo) => addRepoToGroup(tab.id, repo) })
  }

  const createRepo = (): void => {
    openModal({ kind: 'create-repo', onCreate: (repo) => addRepoToGroup(tab.id, repo) })
  }

  const items: LauncherItem[] = tab.repos.map((r) => ({
    name: r.name,
    path: r.path,
    onSelect: () => setGroupActiveRepo(tab.id, r.path),
    onRemove: () => removeRepoFromGroup(tab.id, r.path),
    onRename: (newName) => renameRepoInGroup(tab.id, r.path, newName)
  }))

  const recentItems: LauncherItem[] = settings.recentRepos
    .filter((r) => !tab.repos.some((gr) => gr.path === r.path))
    .map((r) => ({
      name: r.name,
      path: r.path,
      onSelect: () => addRepoToGroup(tab.id, r)
    }))

  return (
    <div className="welcome">
      <motion.div
        className="welcome-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div className="welcome-logo">
          <img className="welcome-art" src={gitcitoLaunch} alt="" draggable={false} />
        </div>
        <h1>{tab.name}</h1>
        <p>{t('group.manageHint')}</p>
        {tab.repos.length > 0 && (
          <div className="group-batch-row">
            <button className="btn ghost small" onClick={() => void repoActions.batch(tab.repos.map((r) => r.path), 'fetch')}>
              <Download size={13} /> Fetch all ({tab.repos.length})
            </button>
            <button className="btn ghost small" onClick={() => void repoActions.batch(tab.repos.map((r) => r.path), 'pull')}>
              <ArrowDownToLine size={13} /> Pull all
            </button>
          </div>
        )}
        <LauncherPanel
          onOpen={() => void openRepo()}
          onClone={cloneRepo}
          onCreate={createRepo}
          onReorder={(from, to) => reorderReposInGroup(tab.id, from, to)}
          items={items}
          listTitle={tab.repos.length > 0 ? 'REPOSITORIES' : undefined}
          emptyMessage="No repositories yet."
          recentItems={recentItems}
        />
      </motion.div>
    </div>
  )
}

/** Renders a non-repo page tab. Dispatches on the page type so new page
 *  kinds (docs, etc.) are a single added case. */
function PageView({ tab }: { tab: PageTab }): React.JSX.Element {
  switch (tab.page.type) {
    case 'changelog':
      return <ChangelogPage />
    case 'logs':
      return <LogsPage />
    case 'notifications':
      return <NotificationsPage />
    case 'insights':
      return <InsightsPage repoPath={tab.page.repoPath} />
    case 'wiki':
      return <WikiPageView repoPath={tab.page.repoPath} />
    case 'vault':
      return <VaultPage />
    case 'help':
      return <HelpPage initialPage={tab.page.page} />
    case 'licenses':
      return <LicensesPage />
    case 'release':
      return <ReleasePage tab={tab} />
    case 'issue':
      return <IssueDetailPage page={tab.page} />
    case 'milestone':
      return <MilestoneDetailPage page={tab.page} />
    default:
      return <Welcome />
  }
}

function ConflictBanner({ repo }: { repo: RepoData }): React.JSX.Element | null {
  const t = useT()
  const setConflictView = useUIStore((s) => s.setConflictView)
  const select = useRepoStore((s) => s.select)
  if (!repo.mergeState) return null
  const conflicted = repo.status?.conflicted ?? []
  const verbs: Record<ConflictOpKind, string> = {
    merge: t('conflict.opMerge'),
    'cherry-pick': t('conflict.opCherryPick'),
    rebase: t('conflict.opRebase'),
    revert: t('conflict.opRevert')
  }
  const ctx = repo.conflictContext
  return (
    <div className="conflict-banner">
      <GitMerge size={15} />
      <span>
        {ctx?.source && ctx?.target ? (
          <strong className="conflict-merging">
            {verbs[ctx.kind]} <span className="conflict-ref src">{ctx.source}</span>{' '}
            {ctx.kind === 'rebase' ? t('conflict.onto') : t('conflict.into')}{' '}
            <span className="conflict-ref tgt">{ctx.target}</span>
          </strong>
        ) : (
          <strong>{interp(t('conflict.inProgress'), { kind: verbs[repo.mergeState] })}</strong>
        )}
        {conflicted.length > 0
          ? ` — ${interp(t('conflict.toResolve'), { n: String(conflicted.length) })}`
          : ` — ${interp(t('conflict.readyToContinue'), { kind: verbs[repo.mergeState] })}`}
      </span>
      <div className="conflict-banner-actions">
        <button
          className="btn ghost small"
          disabled={conflicted.length === 0}
          onClick={() => {
            select(repo.path, { type: 'wip' })
            if (conflicted[0]) setConflictView({ repoPath: repo.path, file: conflicted[0].path })
          }}
        >
          {t('conflict.resolveFiles')}
        </button>
        <button
          className="btn primary small"
          disabled={conflicted.length > 0}
          title={conflicted.length > 0 ? t('conflict.resolveFirst') : interp(t('conflict.continueTitle'), { kind: verbs[repo.mergeState] })}
          onClick={() => void repoActions.conflictContinue(repo.path, repo.mergeState!)}
        >
          {t('conflict.continue')}
        </button>
        <button
          className="btn danger small"
          onClick={() => void repoActions.conflictAbort(repo.path, repo.mergeState!)}
        >
          {t('conflict.abort')}
        </button>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const t = useT()
  const settingsLoaded = useSettingsStore((s) => s.loaded)
  const settings = useSettingsStore((s) => s.settings)
  // Chat is only a surface while its provider is configured to answer.
  const activeProfile = useSettingsStore((s) => s.activeProfile())
  const ensure = useRepoStore((s) => s.ensure)
  const terminalOpenByRepo = useUIStore((s) => s.terminalOpenByRepo)
  const fileView = useUIStore((s) => s.fileView)
  const conflictView = useUIStore((s) => s.conflictView)
  const layout = useUIStore((s) => s.layout)
  const setLayout = useUIStore((s) => s.setLayout)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const chatPanelOpen = useUIStore((s) => s.chatPanelOpen)
  const rightPanelTab = useUIStore((s) => s.rightPanelTab)
  const openChatPanel = useUIStore((s) => s.openChatPanel)
  const closeChatPanel = useUIStore((s) => s.closeChatPanel)
  const showDetailsPanel = useUIStore((s) => s.showDetailsPanel)
  const [resizing, setResizing] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const updateStatus = useUpdatesStore((s) => s.status)
  const updateInfo = useUpdatesStore((s) => s.info)
  const revealUpdate = useUpdatesStore((s) => s.reveal)
  const pendingUpdate = hasPendingUpdate(
    { status: updateStatus, info: updateInfo } as never,
    settings.skippedUpdateVersion
  )

  useEffect(() => {
    void useSettingsStore.getState().load().then(() => {
      // Only fires on the launch that migrated a pre-accounts AI config.
      if (takeAccountsNotice()) useUIStore.getState().openModal({ kind: 'ai-accounts-notice' })
    })
  }, [])

  useEffect(() => {
    void window.api.appVersion().then(setAppVersion)
  }, [])

  // Subscribe to update events and kick the first check.
  useEffect(() => {
    useUpdatesStore.getState().init()
  }, [])

  // `gitcito <dir> [-n name] [-g group]` (installed CLI shim) asks this window
  // to open a folder — on cold launch or when a second `gitcito` invocation
  // hands off to this already-running instance (both routed through the same
  // main-process IPC event, see src/main/index.ts). The event can arrive
  // before settings finish loading from disk (load() resolves asynchronously
  // and its `set(...)` would otherwise clobber a tab added too early), so any
  // payload received pre-load is queued and flushed once settingsLoaded flips.
  useEffect(() => {
    const pending: { path: string; name?: string; group?: string }[] = []
    const flush = (): void => {
      if (!useSettingsStore.getState().loaded) return
      while (pending.length) useSettingsStore.getState().openFromCli(pending.shift()!)
    }
    const off = cliApi.onOpenPath((payload) => {
      pending.push(payload)
      flush()
    })
    const unsub = useSettingsStore.subscribe((s) => {
      if (s.loaded) flush()
    })
    return () => {
      off()
      unsub()
    }
  }, [])

  // The main process never touches the OS keychain without asking first: it
  // fires this, we explain why, and only the user's answer unblocks it.
  useEffect(() => {
    return keychainApi.onAsk(({ reason, adopted }) => {
      useUIStore.getState().openModal({ kind: 'keychain-consent', reason, adopted })
    })
  }, [])

  // Global keyboard shortcuts, dispatched from the central registry so bindings
  // stay user-customizable (settings.shortcuts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const typing = !!target?.closest('input, textarea, [contenteditable="true"]')
      const st = useSettingsStore.getState()
      const ui = useUIStore.getState()
      const activeRepoPath = (): string | null => {
        const tab = st.settings.tabs.find((t) => t.id === st.settings.activeTabId)
        return tab ? tabActiveRepoPath(tab) : null
      }

      // Physical Control+` toggles the integrated terminal on every platform.
      // Terminal-focused events are caught earlier by TerminalContainer so
      // xterm never sends this chord to the shell.
      if (terminalShortcutFromEvent(e, false) === 'toggle' && !ui.modal) {
        const path = activeRepoPath()
        if (path) {
          e.preventDefault()
          ui.toggleTerminal(path)
        }
        return
      }

      // `?` opens the shortcut cheatsheet (when not typing).
      if (!typing && e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        ui.openModal({ kind: 'cheatsheet' })
        return
      }

      // Reopen the last closed tab (⌘⇧T).
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        st.reopenClosedTab()
        return
      }

      // Open the new-tab launcher or close the active tab (Cmd/Ctrl+T/W). Held back
      // while a modal owns the screen or the caret sits in an editor or terminal —
      // there ⌘W would close a tab the user is not even looking at.
      const tabAction = tabActionFromEvent(e)
      if (tabAction && !typing && !ui.modal) {
        e.preventDefault()
        if (tabAction === 'new') ui.openModal({ kind: 'launcher' })
        else if (st.settings.activeTabId) requestCloseTab(st.settings.activeTabId)
        // Nothing left to close: fall through to closing the window, which is what
        // the native accelerator the main process suppresses would have done.
        else if (st.settings.tabs.length === 0) window.api.window.close()
        return
      }

      // Switch to a tab by its visible position (Cmd/Ctrl+1…9).
      const tabIndex = tabIndexFromEvent(e)
      if (tabIndex !== null) {
        e.preventDefault()
        const tab = st.settings.tabs[tabIndex]
        if (tab) st.setActiveTab(tab.id)
        return
      }

      const id = matchShortcut(e, effectiveBindings(st.settings.shortcuts))
      if (!id) return
      if (id === 'command-palette') {
        e.preventDefault()
        ui.toggleCommandPalette()
      } else if (id === 'code-search') {
        const path = activeRepoPath()
        if (path) {
          e.preventDefault()
          ui.openModal({ kind: 'code-search', repoPath: path })
        }
      } else if (id === 'vault') {
        e.preventDefault()
        st.openPageTab({ type: 'vault' })
      } else if (id === 'settings') {
        e.preventDefault()
        ui.openModal({ kind: 'settings' })
      } else if (id === 'toggle-left-sidebar') {
        const path = activeRepoPath()
        if (path) {
          e.preventDefault()
          ui.toggleSidebar()
        }
      } else if (id === 'toggle-right-panel') {
        const path = activeRepoPath()
        const activeRepo = path ? useRepoStore.getState().repos[path] : null
        if (path && activeRepo && !activeRepo.notGit) {
          e.preventDefault()
          const forceConflict = !!activeRepo.mergeState && (activeRepo.status?.conflicted.length ?? 0) > 0
          const action = rightPanelToggleAction(
            !!activeRepo.selected,
            forceConflict,
            ui.chatPanelOpen,
            repoChatAvailable(useSettingsStore.getState().activeProfile().ai)
          )
          if (action === 'open-chat') {
            ui.openChatPanel()
          } else if (action === 'show-required-details') {
            ui.closeChatPanel()
          } else {
            if (activeRepo.selected) useRepoStore.getState().select(path, null)
            ui.closeChatPanel()
          }
        }
      } else if (id === 'open-repository') {
        e.preventDefault()
        void window.api.selectDirectory().then((path) => {
          if (!path) return
          const name = path.split(/[\\/]/).filter(Boolean).pop() ?? path
          useSettingsStore.getState().openRepoTab({ path, name })
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Open http(s) links in the user's default browser instead of navigating
  // inside the app window. Catches plain <a href> clicks (e.g. rendered
  // changelog/markdown) which the main-process window-open handler misses.
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
      const anchor = (e.target as HTMLElement | null)?.closest('a')
      const href = anchor?.getAttribute('href')
      if (!href || !/^https?:\/\//i.test(href)) return
      e.preventDefault()
      void window.api.openExternal(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Detect app upgrades. The first run that records a version is silent; any
  // later version change opens the changelog tab (unless the user disabled it).
  useEffect(() => {
    if (!settingsLoaded) return
    let cancelled = false
    void window.api.appVersion().then((v) => {
      if (cancelled) return
      const store = useSettingsStore.getState()
      const seen = store.settings.lastSeenVersion
      if (seen === v) return
      store.update((s) => ({ ...s, lastSeenVersion: v }))
      if (seen !== undefined && store.settings.autoOpenChangelog) {
        store.openPageTab({ type: 'changelog' })
      }
    })
    return () => {
      cancelled = true
    }
  }, [settingsLoaded])

  // Writing direction follows the interface language, not the OS: a user on a
  // Hebrew system who picked English wants an LTR app.
  useEffect(() => {
    applyDirection(settings.language ?? 'en')
  }, [settings.language])

  // Apply selected app + code themes whenever they change. When the appearance
  // mode is "auto" we also react to live OS light/dark changes.
  useEffect(() => {
    const apply = (): void => {
      applyAppTheme(findAppTheme(settings.appThemeId, settings.customAppThemes), settings.themeMode)
      applyCodeTheme(
        findCodeTheme(settings.codeThemeId, settings.customCodeThemes),
        settings.themeMode,
        settings.codeFontSize
      )
    }
    apply()
    if (settings.themeMode !== 'auto') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [
    settings.appThemeId,
    settings.codeThemeId,
    settings.themeMode,
    settings.codeFontSize,
    settings.customAppThemes,
    settings.customCodeThemes
  ])

  const missionOpen = useUIStore((s) => s.missionOpen)
  const setMissionOpen = useUIStore((s) => s.setMissionOpen)
  const activeTab = settings.tabs.find((t) => t.id === settings.activeTabId) ?? null
  const activeRepoPath = activeTab ? tabActiveRepoPath(activeTab) : null

  // Clicking any tab (or switching workspace) leaves mission control — the
  // dashboard is a detour, not somewhere the tab strip can point at.
  useEffect(() => {
    if (missionOpen) setMissionOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.activeTabId, settings.activeWorkspaceId])

  useEffect(() => {
    if (!activeRepoPath) return
    // First switch to a repo loads it; switching back to an already-loaded
    // repo re-refreshes so the graph reflects changes made elsewhere.
    const repo = useRepoStore.getState().repos[activeRepoPath]
    if (repo && !repo.loading) void useRepoStore.getState().refresh(activeRepoPath)
    else void ensure(activeRepoPath)
  }, [activeRepoPath, ensure])

  // Auto-switch the active profile to the one bound to the active repo. Keeps
  // tokens / git identity / AI config in sync as you move between repo tabs.
  useEffect(() => {
    if (!activeRepoPath) return
    const { settings: s, setActiveProfile } = useSettingsStore.getState()
    const bound = s.repoProfiles[activeRepoPath]
    if (bound && bound !== s.activeProfileId && s.profiles.some((p) => p.id === bound)) {
      setActiveProfile(bound)
    }
  }, [activeRepoPath])

  // Ensure all repos across all tabs have at least a light status load so
  // group tab status dots are populated even for non-active repos.
  useEffect(() => {
    for (const tab of settings.tabs) {
      for (const ref of tabRepos(tab)) {
        if (ref.path !== activeRepoPath) void ensure(ref.path)
      }
    }
  }, [settings.tabs, ensure, activeRepoPath])

  // Refresh the active repo whenever the window regains focus / visibility,
  // so changes made outside the app (editor, terminal) show up immediately.
  useEffect(() => {
    if (!activeRepoPath) return
    const refresh = (): void => void useRepoStore.getState().refresh(activeRepoPath, { light: true })
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activeRepoPath])

  // Periodic light refresh of the active repo (status + branches drift).
  useEffect(() => {
    if (!activeRepoPath) return
    const interval = setInterval(
      () => void useRepoStore.getState().refresh(activeRepoPath, { light: true }),
      20000
    )
    return () => clearInterval(interval)
  }, [activeRepoPath])

  // Periodic silent refresh of hosting data (PRs + releases). Tied to the same
  // user-configured cadence as the background remote fetch — these live behind
  // the network/token, change in lockstep with what a fetch would surface, and
  // must not toast on failure, so they stay quiet and follow autoFetchMinutes.
  useEffect(() => {
    const minutes = settings.autoFetchMinutes ?? 0
    if (!activeRepoPath || minutes <= 0) return
    const poll = (): void => {
      void useRepoStore.getState().refreshPRs(activeRepoPath, { silent: true })
      void useRepoStore.getState().refreshReleases(activeRepoPath, { silent: true })
    }
    const interval = setInterval(poll, minutes * 60_000)
    return () => clearInterval(interval)
  }, [activeRepoPath, settings.autoFetchMinutes])

  // Near real-time refresh driven by a file system watcher on the repo. The
  // main process watches the working tree and .git directory and pushes change
  // events; .git changes (branches/commits/merge) trigger a full refresh while
  // working-tree edits only need a light (status) refresh.
  useEffect(() => {
    if (!activeRepoPath) return
    void window.api.watch.repo(activeRepoPath)
    const off = window.api.watch.onChange(({ path, light }) => {
      if (path !== activeRepoPath) return
      void useRepoStore.getState().refresh(activeRepoPath, { light })
    })
    return () => {
      off()
      void window.api.watch.repo(null)
    }
  }, [activeRepoPath])

  // Optional automatic background fetch of remotes.
  useEffect(() => {
    const minutes = settings.autoFetchMinutes ?? 0
    if (!activeRepoPath || minutes <= 0) return
    const interval = setInterval(() => void repoActions.fetchAll(activeRepoPath), minutes * 60_000)
    return () => clearInterval(interval)
  }, [activeRepoPath, settings.autoFetchMinutes])

  // Poll the GitHub notifications inbox for an unread count (toolbar bell badge).
  // Initial fetch on load + repeat on the auto-fetch cadence; silent on failure.
  // Optionally raises an OS notification for new review-requested / CI items.
  const notifSeen = useRef<Set<string>>(new Set())
  const notifPrimed = useRef(false)
  useEffect(() => {
    const token = useSettingsStore.getState().activeProfile().githubToken
    // Reset the per-profile seen-set so switching accounts doesn't leak IDs and
    // doesn't replay the new account's whole inbox as desktop notifications.
    notifSeen.current = new Set()
    notifPrimed.current = false
    if (!token) {
      useUIStore.getState().setGithubUnread(0)
      return
    }
    const poll = (): void => {
      void hostingApi
        .listNotifications(token, false)
        .then((items) => {
          useUIStore.getState().setGithubUnread(items.length)
          const notify = useSettingsStore.getState().settings.desktopNotifications
          for (const n of items) {
            if (notifSeen.current.has(n.id)) continue
            notifSeen.current.add(n.id)
            // Don't fire on the first poll (would dump the existing backlog).
            if (!notifPrimed.current || !notify) continue
            if (n.reason !== 'review_requested' && n.reason !== 'ci_activity') continue
            const heading =
              n.reason === 'review_requested' ? tr('notif.reviewRequested') : tr('notif.ciActivity')
            try {
              const note = new Notification(`${heading} · ${n.repoFullName}`, { body: n.title })
              note.onclick = () => void window.api.openExternal(n.url)
            } catch {
              // OS notifications unavailable / denied — ignore, keep polling.
            }
          }
          notifPrimed.current = true
        })
        .catch(() => {})
    }
    poll()
    const minutes = Math.max(settings.autoFetchMinutes ?? 0, 5)
    const interval = setInterval(poll, minutes * 60_000)
    return () => clearInterval(interval)
  }, [settings.autoFetchMinutes, settings.activeProfileId])

  // Optional periodic WIP snapshot — a silent safety net for uncommitted work.
  useEffect(() => {
    const minutes = settings.wipSnapshotMinutes ?? 0
    if (!activeRepoPath || minutes <= 0) return
    const interval = setInterval(
      () => void window.api.git('createSnapshot', activeRepoPath, 'auto').catch(() => {}),
      minutes * 60_000
    )
    return () => clearInterval(interval)
  }, [activeRepoPath, settings.wipSnapshotMinutes])

  // Subscribe to ONLY the active repo, not the whole `repos` record — a patch to
  // a background repo (or a cheap field on any repo) no longer re-renders the
  // active view (Toolbar/Sidebar/GraphView…). TitleBar owns its own repos
  // subscription for the per-tab status dots.
  const repo = useRepoStore((s) => (activeRepoPath ? s.repos[activeRepoPath] ?? null : null))
  const forceConflictPanel = !!repo?.mergeState && (repo.status?.conflicted.length ?? 0) > 0

  // The center-workspace + terminal region, arranged per the layout settings:
  //   • terminalPlacement — bottom (full width) | center (under graph only) | right (own column)
  //   • sidebarSide       — dock the sidebar left or right
  //   • rightPanelFullHeight — in bottom mode, keep the terminal out from under
  //     the right panel so that panel spans the full height.
  // Toolbar (above) and the status bar (below) stay put in the main return.
  const placement = settings.terminalPlacement
  const sbSide = settings.sidebarSide
  const rpFull = settings.rightPanelFullHeight
  const workspaceBody =
    repo && !repo.notGit
      ? ((): React.JSX.Element => {
          const termOpen = !!terminalOpenByRepo[repo.path]
          const termIsSide = placement === 'right'
          const terminalNode = (
            <AnimatePresence>
              {termOpen && (
                <motion.div
                  className={`terminal-pane terminal-pane--${placement}`}
                  initial={termIsSide ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={
                    termIsSide
                      ? { width: layout.terminalWidth, opacity: 1 }
                      : { height: layout.terminalHeight, opacity: 1 }
                  }
                  exit={termIsSide ? { width: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={resizing ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
                >
                  <ResizeHandle
                    axis={termIsSide ? 'x' : 'y'}
                    value={termIsSide ? layout.terminalWidth : layout.terminalHeight}
                    min={termIsSide ? 280 : 120}
                    max={termIsSide ? 900 : 600}
                    invert
                    onChange={(v) => setLayout(termIsSide ? { terminalWidth: v } : { terminalHeight: v })}
                    onDragging={setResizing}
                  />
                  <TerminalContainer cwd={repo.path} />
                </motion.div>
              )}
            </AnimatePresence>
          )

          // The sidebar collapses to zero width with the same spring the right
          // panel uses. Only the sidebar body animates (overflow-clipped); the
          // drag handle is gated on the open state so it doesn't linger at the
          // edge mid-collapse.
          const sidebarHandle = (
            <ResizeHandle
              axis="x"
              value={layout.sidebarWidth}
              min={180}
              max={460}
              invert={sbSide === 'right'}
              onChange={(v) => setLayout({ sidebarWidth: v })}
              onDragging={setResizing}
            />
          )
          const sidebarBlock = (
            <>
              {!sidebarCollapsed && sbSide === 'right' && sidebarHandle}
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.div
                    key="sidebar"
                    className="sidebar-anim"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: layout.sidebarWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={resizing ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
                  >
                    <Sidebar repo={repo} />
                  </motion.div>
                )}
              </AnimatePresence>
              {!sidebarCollapsed && sbSide === 'left' && sidebarHandle}
            </>
          )

          const centerCol = (
            <div className="center-col">
              <main className="graph-pane">
                <ConflictBanner repo={repo} />
                <DebugToolbar repoPath={repo.path} />
                {conflictView && conflictView.repoPath === repo.path ? (
                  <ConflictResolver key={conflictView.file} view={conflictView} />
                ) : fileView && fileView.repoPath === repo.path ? (
                  <FileViewer key={`${fileView.file}`} view={fileView} />
                ) : (
                  <GraphView repo={repo} />
                )}
              </main>
              {placement === 'center' && terminalNode}
            </div>
          )

          const selectedDetailsAvailable = !!repo.selected || forceConflictPanel
          const detailsState = rightPanelDetailsState(!!repo.selected, forceConflictPanel, repo.status)
          const detailsAvailable = detailsState.available
          const chatAvailable = repoChatAvailable(activeProfile.ai)
          const chatOpen = chatPanelOpen && chatAvailable
          const activeRightPanelTab =
            rightPanelTab === 'chat' && chatOpen
              ? 'chat'
              : detailsAvailable
                ? 'details'
                : 'chat'
          const closeRightPanel = (): void => {
            if (activeRightPanelTab === 'chat') {
              closeChatPanel()
              return
            }
            useRepoStore.getState().select(repo.path, null)
            if (chatOpen) openChatPanel()
          }
          const rightPanelNode = (
            <AnimatePresence>
              {(selectedDetailsAvailable || chatOpen) && (
                <motion.section
                  className="right-panel"
                  aria-label={t('chat.panelTabs')}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: layout.panelWidth, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={resizing ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 32 }}
                >
                  <ResizeHandle
                    axis="x"
                    value={layout.panelWidth}
                    min={300}
                    max={720}
                    invert
                    onChange={(v) => setLayout({ panelWidth: v })}
                    onDragging={setResizing}
                  />
                  <div className="right-panel-tabs" role="tablist" aria-label={t('chat.panelTabs')}>
                    <button
                      type="button"
                      role="tab"
                      id="right-panel-tab-details"
                      aria-selected={activeRightPanelTab === 'details'}
                      aria-controls="right-panel-body"
                      className={`right-panel-tab ${activeRightPanelTab === 'details' ? 'active' : ''}`}
                      disabled={!detailsAvailable}
                      onClick={() => {
                        if (detailsState.selectWip) useRepoStore.getState().select(repo.path, { type: 'wip' })
                        else showDetailsPanel()
                      }}
                    >
                      {t('chat.tabDetails')}
                    </button>
                    {chatAvailable && (
                      <button
                        type="button"
                        role="tab"
                        id="right-panel-tab-chat"
                        aria-selected={activeRightPanelTab === 'chat'}
                        aria-controls="right-panel-body"
                        className={`right-panel-tab ${activeRightPanelTab === 'chat' ? 'active' : ''}`}
                        onClick={openChatPanel}
                      >
                        <MessageSquare size={13} /> {t('chat.tabChat')}
                      </button>
                    )}
                  </div>
                  {/* The close button lives outside the tablist — a non-tab child
                      inside role="tablist" corrupts the announced tab count. */}
                  {!(forceConflictPanel && activeRightPanelTab === 'details') && (
                    <button
                      type="button"
                      className="right-panel-close"
                      title={t('app.closePanel')}
                      aria-label={t('app.closePanel')}
                      onClick={closeRightPanel}
                    >
                      <X size={15} />
                    </button>
                  )}
                  <div
                    className="right-panel-inner"
                    id="right-panel-body"
                    role="tabpanel"
                    aria-labelledby={activeRightPanelTab === 'chat' ? 'right-panel-tab-chat' : 'right-panel-tab-details'}
                    tabIndex={-1}
                    style={{ width: layout.panelWidth }}
                  >
                    {activeRightPanelTab === 'chat' && chatAvailable ? (
                      <RepoChatPanel key={repo.path} repoPath={repo.path} repoName={repo.name} />
                    ) : forceConflictPanel ? (
                      <CommitComposer key={repo.path} repo={repo} />
                    ) : repo.selected?.type === 'wip' ? (
                      <CommitComposer key={repo.path} repo={repo} />
                    ) : repo.selected?.type === 'stash' ? (
                      <StashDetails repo={repo} sha={repo.selected.sha} />
                    ) : repo.selected?.type === 'commit' ? (
                      <CommitDetails repo={repo} hash={repo.selected.hash} />
                    ) : (
                      <div className="panel-empty">{t('app.selectRow')}</div>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          )

          const wsClass = `workspace placement-${placement} sidebar-${sbSide}${rpFull ? ' rp-full' : ''}`
          const wsStyle = { ['--sidebar-w' as string]: `${layout.sidebarWidth}px` }

          // bottom + right-panel-full-height: the terminal sits below only the
          // sidebar+center stack, letting the right panel run the full height.
          if (placement === 'bottom' && rpFull) {
            return (
              <div className={wsClass} style={wsStyle}>
                <div className="main-col">
                  <div className="main-row">
                    {sbSide === 'left' && sidebarBlock}
                    {centerCol}
                    {sbSide === 'right' && sidebarBlock}
                  </div>
                  {terminalNode}
                </div>
                {rightPanelNode}
              </div>
            )
          }

          return (
            <>
              <div className={wsClass} style={wsStyle}>
                {sbSide === 'left' && sidebarBlock}
                {centerCol}
                {rightPanelNode}
                {placement === 'right' && terminalNode}
                {sbSide === 'right' && sidebarBlock}
              </div>
              {placement === 'bottom' && terminalNode}
            </>
          )
        })()
      : null

  if (!settingsLoaded) {
    return (
      <div className="app booting">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      <TitleBar />

      {!settings.onboardingCompleted && <OnboardingWizard />}

      {/* Mission control takes over the whole body while it is on — the
          title-bar button is its "tab", so the strip stays untouched. */}
      {/* display:contents keeps the flex layout while giving non-repo views a
          main landmark; skipped for the repo workspace, which has its own <main>. */}
      {!(!missionOpen && activeTab && repo && !repo.notGit) && (
        <main style={{ display: 'contents' }}>
          {missionOpen && <MissionControlPage />}

          {!missionOpen && !activeTab && <Welcome />}
          {!missionOpen && activeTab && activeTab.kind === 'group' && !repo && <GroupView tab={activeTab} />}
          {!missionOpen && activeTab && activeTab.kind === 'page' && <PageView tab={activeTab} />}

          {!missionOpen && activeTab && repo && repo.notGit && <InitRepo path={repo.path} />}
        </main>
      )}

      {!missionOpen && activeTab && repo && !repo.notGit && (
        <>
          <Toolbar repo={repo} />
          {workspaceBody}
          <footer className="statusbar">
            <button
              className="status-path status-path-btn"
              title={t('sidebar.openFolder')}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const items = folderOpenMenuItems(
                  repo.path,
                  settings.defaultOpenApp,
                  {
                    openFolder: t('sidebar.openFolder'),
                    openWithDefault: (name) => interp(t('sidebar.openWithApp'), { name }),
                    openWith: t('sidebar.openFolderWith'),
                    copyPath: t('common.copyFolderPath')
                  },
                  settings.editor
                )
                useUIStore.getState().openContextMenu(r.left, r.top - 6 - items.length * 28, items)
              }}
            >
              <FolderOpen size={11} className="status-path-icon" />
              {repo.path}
            </button>
            <span className="status-right">
              <ZoomControl compact />
              <span className="status-sep" />
              <button
                className="status-branch-profile status-branch-btn"
                title={t('app.switchBranch')}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const items = repo.branches.locals.map((b) => ({
                    label: `${b.isCurrent ? '✓ ' : '   '}${b.name}`,
                    onClick: () => {
                      if (!b.isCurrent) void repoActions.checkout(repo.path, b.name)
                    }
                  }))
                  useUIStore.getState().openContextMenu(rect.left, rect.top - 6 - items.length * 28, items)
                }}
              >
                {repo.branches.current}
              </button>
              {appVersion && (
                <>
                  <span className="status-sep" />
                  <button
                    className="status-issue-btn"
                    title={t('help.title')}
                    onClick={() => useSettingsStore.getState().openPageTab({ type: 'help' })}
                  >
                    <LifeBuoy size={12} />
                    <span>{t('help.open')}</span>
                  </button>
                  <span className="status-sep" />
                  <button
                    className="status-issue-btn"
                    title={t('app.reportIssueTitle')}
                    onClick={() => void window.api.openExternal('https://github.com/MyAppDesk/gitcito/issues/new')}
                  >
                    <Bug size={12} />
                    <span>{t('app.reportIssue')}</span>
                  </button>
                  <span className="status-sep" />
                  <button
                    className="status-version status-version-btn"
                    title={t('app.viewChangelog')}
                    onClick={() => useSettingsStore.getState().openPageTab({ type: 'changelog' })}
                  >
                    v{appVersion}
                  </button>
                  {pendingUpdate && updateInfo && (
                    <button
                      className="status-update-badge"
                      title={interp(t('app.updateAvailable'), { version: updateInfo.version })}
                      onClick={revealUpdate}
                    >
                      <Download size={12} />
                      <span className="status-update-dot" />
                    </button>
                  )}
                </>
              )}
            </span>
          </footer>
        </>
      )}

      <ContextMenu />
      <ModalHost />
      <CommandPalette />
      <Toasts />
      <UpdateBanner />
      <RepoCosmos />
    </div>
  )
}
