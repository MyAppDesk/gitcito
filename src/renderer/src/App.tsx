import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GitMerge, FolderOpen } from 'lucide-react'
import { useSettingsStore } from './stores/settings'
import { useRepoStore, repoActions, type RepoData } from './stores/repo'
import { useUIStore } from './stores/ui'
import { tabActiveRepoPath, tabRepos, type GroupTab, type PageTab } from '../../shared/types'
import { applyAppTheme, applyCodeTheme, findAppTheme, findCodeTheme } from './theme/themes'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { GraphView } from './components/GraphView'
import { FileViewer } from './components/FileViewer'
import { ConflictResolver } from './components/ConflictResolver'
import { CommitDetails } from './components/CommitDetails'
import { StashDetails } from './components/StashDetails'
import { CommitComposer } from './components/CommitComposer'
import { TerminalContainer } from './components/TerminalContainer'
import { ContextMenu } from './components/ContextMenu'
import { ModalHost } from './components/ModalHost'
import { CommandPalette } from './components/CommandPalette'
import { Toasts } from './components/Toasts'
import { Welcome, LauncherPanel, type LauncherItem } from './components/Welcome'
import { OnboardingWizard } from './components/OnboardingWizard'
import { ChangelogPage } from './components/ChangelogPage'
import { LogsPage } from './components/LogsPage'
import { NotificationsPage } from './components/NotificationsPage'
import { ReleasePage } from './components/ReleasePage'
import { IssueDetailPage } from './components/IssueDetailPage'
import { MilestoneDetailPage } from './components/MilestoneDetailPage'
import { ResizeHandle } from './components/ResizeHandle'
import { ZoomControl } from './components/ZoomControl'
import gitcitoLaunch from './assets/gitcito-launch.png'

function GroupView({ tab }: { tab: GroupTab }): React.JSX.Element {
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
        <p>Manage repositories in this group.</p>
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
  if (!repo.mergeState) return null
  const conflicted = repo.status?.conflicted ?? []
  const labels: Record<string, string> = {
    merge: 'Merge',
    'cherry-pick': 'Cherry-pick',
    rebase: 'Rebase',
    revert: 'Revert'
  }
  const setConflictView = useUIStore((s) => s.setConflictView)
  const select = useRepoStore((s) => s.select)
  return (
    <div className="conflict-banner">
      <GitMerge size={15} />
      <span>
        <strong>{labels[repo.mergeState]} in progress</strong>
        {conflicted.length > 0
          ? ` — ${conflicted.length} conflicted file${conflicted.length === 1 ? '' : 's'} to resolve`
          : ' — all conflicts resolved'}
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
          Resolve files
        </button>
        <button
          className="btn primary small"
          disabled={conflicted.length > 0}
          title={conflicted.length > 0 ? 'Resolve all conflicts first' : `Continue the ${repo.mergeState}`}
          onClick={() => void repoActions.conflictContinue(repo.path, repo.mergeState!)}
        >
          Continue
        </button>
        <button
          className="btn danger small"
          onClick={() => void repoActions.conflictAbort(repo.path, repo.mergeState!)}
        >
          Abort
        </button>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const settingsLoaded = useSettingsStore((s) => s.loaded)
  const settings = useSettingsStore((s) => s.settings)
  const repos = useRepoStore((s) => s.repos)
  const ensure = useRepoStore((s) => s.ensure)
  const terminalOpen = useUIStore((s) => s.terminalOpen)
  const fileView = useUIStore((s) => s.fileView)
  const conflictView = useUIStore((s) => s.conflictView)
  const layout = useUIStore((s) => s.layout)
  const setLayout = useUIStore((s) => s.setLayout)
  const [resizing, setResizing] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    void useSettingsStore.getState().load()
  }, [])

  useEffect(() => {
    void window.api.appVersion().then(setAppVersion)
  }, [])

  // Global command palette toggle (Cmd/Ctrl+K).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        const st = useSettingsStore.getState()
        const tab = st.settings.tabs.find((t) => t.id === st.settings.activeTabId)
        const path = tab ? tabActiveRepoPath(tab) : null
        if (path) {
          e.preventDefault()
          useUIStore.getState().openModal({ kind: 'code-search', repoPath: path })
        }
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

  const activeTab = settings.tabs.find((t) => t.id === settings.activeTabId) ?? null
  const activeRepoPath = activeTab ? tabActiveRepoPath(activeTab) : null

  useEffect(() => {
    if (!activeRepoPath) return
    // First switch to a repo loads it; switching back to an already-loaded
    // repo re-refreshes so the graph reflects changes made elsewhere.
    const repo = useRepoStore.getState().repos[activeRepoPath]
    if (repo && !repo.loading) void useRepoStore.getState().refresh(activeRepoPath)
    else void ensure(activeRepoPath)
  }, [activeRepoPath, ensure])

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

  const repo = activeRepoPath ? repos[activeRepoPath] : null
  const forceConflictPanel = !!repo?.mergeState && (repo.status?.conflicted.length ?? 0) > 0

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

      {!activeTab && <Welcome />}
      {activeTab && activeTab.kind === 'group' && !repo && <GroupView tab={activeTab} />}
      {activeTab && activeTab.kind === 'page' && <PageView tab={activeTab} />}

      {activeTab && repo && (
        <>
          <Toolbar repo={repo} />
          <div className="workspace" style={{ ['--sidebar-w' as string]: `${layout.sidebarWidth}px` }}>
            <Sidebar repo={repo} />
            <ResizeHandle
              axis="x"
              value={layout.sidebarWidth}
              min={180}
              max={460}
              onChange={(v) => setLayout({ sidebarWidth: v })}
              onDragging={setResizing}
            />
            <main className="graph-pane">
              <ConflictBanner repo={repo} />
              {conflictView && conflictView.repoPath === repo.path ? (
                <ConflictResolver key={conflictView.file} view={conflictView} />
              ) : fileView && fileView.repoPath === repo.path ? (
                <FileViewer key={`${fileView.file}`} view={fileView} />
              ) : (
                <GraphView repo={repo} />
              )}
            </main>
            <AnimatePresence>
              {(repo.selected || forceConflictPanel) && (
                <motion.section
                  className="right-panel"
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
                  <div className="right-panel-inner" style={{ width: layout.panelWidth }}>
                    {forceConflictPanel ? (
                      <CommitComposer key={repo.path} repo={repo} />
                    ) : repo.selected?.type === 'wip' ? (
                      <CommitComposer key={repo.path} repo={repo} />
                    ) : repo.selected?.type === 'stash' ? (
                      <StashDetails repo={repo} sha={repo.selected.sha} />
                    ) : repo.selected?.type === 'commit' ? (
                      <CommitDetails repo={repo} hash={repo.selected.hash} />
                    ) : (
                      <div className="panel-empty">Select a row to inspect details</div>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {terminalOpen && (
              <motion.div
                className="terminal-pane"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: layout.terminalHeight, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={resizing ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }}
              >
                <ResizeHandle
                  axis="y"
                  value={layout.terminalHeight}
                  min={120}
                  max={600}
                  invert
                  onChange={(v) => setLayout({ terminalHeight: v })}
                  onDragging={setResizing}
                />
                <TerminalContainer cwd={repo.path} />
              </motion.div>
            )}
          </AnimatePresence>
          <footer className="statusbar">
            <button
              className="status-path status-path-btn"
              title="Show in Finder"
              onClick={() => window.api.shell.showItemInFolder(repo.path)}
            >
              <FolderOpen size={11} className="status-path-icon" />
              {repo.path}
            </button>
            <span className="status-right">
              <ZoomControl compact />
              <span className="status-sep" />
              <button
                className="status-branch-profile status-branch-btn"
                title="Switch branch"
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
                    className="status-version status-version-btn"
                    title="View changelog"
                    onClick={() => useSettingsStore.getState().openPageTab({ type: 'changelog' })}
                  >
                    v{appVersion}
                  </button>
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
    </div>
  )
}
