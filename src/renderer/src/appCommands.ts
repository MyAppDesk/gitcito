/**
 * One table for the app-level commands the native menu and the global keyboard
 * shortcuts both trigger.
 *
 * Before the menu existed, these lived inline in `App.tsx`'s keydown listener.
 * They are here now so the two entry points cannot drift: a menu item and its
 * accelerator run exactly the same code, and adding a command means adding one
 * case rather than remembering to add it twice.
 *
 * Everything is read from stores at call time — the caller never passes state
 * in — because a menu click arrives long after the menu was built.
 */

import { tabActiveRepoPath } from '../../shared/types'
import { useSettingsStore } from './stores/settings'
import { useRepoStore, repoActions } from './stores/repo'
import { useUIStore } from './stores/ui'
import { useUpdatesStore } from './stores/updates'
import { shellApi } from './infrastructure/api'
import { openInEditor } from './lib/editorOpen'
import { requestCloseTab } from './lib/repositoryMenuItems'
import { repoChatAvailable, rightPanelToggleAction } from './lib/repoChatUI'

const ISSUES_URL = 'https://github.com/myappdesk/gitcito/issues/new'

/** The repository the active tab is currently showing, or null. */
export function activeRepoPath(): string | null {
  const st = useSettingsStore.getState()
  const tab = st.settings.tabs.find((t) => t.id === st.settings.activeTabId)
  return tab ? tabActiveRepoPath(tab) : null
}

/** The active repository, but only when it is a real git repository. */
function activeGitRepo(): { path: string } | null {
  const path = activeRepoPath()
  if (!path) return null
  const repo = useRepoStore.getState().repos[path]
  return repo && !repo.notGit ? repo : null
}

/** Cycle the right-hand panel the way the ⌥⌘B shortcut does. */
function toggleRightPanel(): void {
  const repo = activeGitRepo()
  if (!repo) return
  const data = useRepoStore.getState().repos[repo.path]
  if (!data) return
  const ui = useUIStore.getState()
  const forceConflict = !!data.mergeState && (data.status?.conflicted.length ?? 0) > 0
  const action = rightPanelToggleAction(
    !!data.selected,
    forceConflict,
    ui.chatPanelOpen,
    repoChatAvailable(useSettingsStore.getState().activeProfile().ai)
  )
  if (action === 'open-chat') {
    ui.openChatPanel()
  } else if (action === 'show-required-details') {
    ui.closeChatPanel()
  } else {
    if (data.selected) useRepoStore.getState().select(repo.path, null)
    ui.closeChatPanel()
  }
}

function openRepositoryDialog(): void {
  void window.api.selectDirectory().then((path) => {
    if (!path) return
    const name = path.split(/[\\/]/).filter(Boolean).pop() ?? path
    useSettingsStore.getState().openRepoTab({ path, name })
  })
}

/**
 * Run an app command by id. Returns false when the command exists but its
 * preconditions do not hold (no repository open, nothing to close) — the
 * keyboard handler uses that to decide whether to swallow the key event.
 */
export function runAppCommand(id: string): boolean {
  const ui = useUIStore.getState()
  const st = useSettingsStore.getState()

  // Recent repositories carry their path in the id; there is one command per
  // entry rather than one command taking an argument, because a menu item can
  // only send an id.
  if (id.startsWith('open-recent:')) {
    const path = id.slice('open-recent:'.length)
    const repo = st.settings.recentRepos.find((r) => r.path === path)
    if (!repo) return false
    st.openRepoTab(repo)
    return true
  }

  switch (id) {
    // ── Application ──
    case 'settings':
      ui.openModal({ kind: 'settings' })
      return true
    case 'check-updates':
      useUpdatesStore.getState().reveal()
      useUpdatesStore.getState().check()
      return true

    // ── Tabs and repositories ──
    case 'new-tab':
      ui.openModal({ kind: 'launcher' })
      return true
    case 'open-repository':
      openRepositoryDialog()
      return true
    case 'clone':
      ui.openModal({ kind: 'clone', onClone: (repo) => useSettingsStore.getState().openRepoTab(repo) })
      return true
    case 'close-tab':
      if (!st.settings.activeTabId) return false
      requestCloseTab(st.settings.activeTabId)
      return true
    case 'reopen-tab':
      st.reopenClosedTab()
      return true

    // ── Views ──
    case 'command-palette':
      ui.toggleCommandPalette()
      return true
    case 'code-search': {
      const repo = activeGitRepo()
      if (!repo) return false
      ui.openModal({ kind: 'code-search', repoPath: repo.path })
      return true
    }
    case 'toggle-left-sidebar':
      if (!activeRepoPath()) return false
      ui.toggleSidebar()
      return true
    case 'toggle-right-panel':
      if (!activeGitRepo()) return false
      toggleRightPanel()
      return true
    case 'toggle-terminal': {
      const path = activeRepoPath()
      if (!path) return false
      ui.toggleTerminal(path)
      return true
    }
    case 'mission-control':
      ui.setMissionOpen(true)
      return true
    case 'vault':
      st.openPageTab({ type: 'vault' })
      return true

    // ── Repository ──
    case 'fetch': {
      const repo = activeGitRepo()
      if (!repo) return false
      void repoActions.fetchAll(repo.path)
      return true
    }
    case 'pull': {
      const repo = activeGitRepo()
      if (!repo) return false
      void repoActions.pull(repo.path, 'default')
      return true
    }
    case 'push': {
      const repo = activeGitRepo()
      if (!repo) return false
      void repoActions.push(repo.path)
      return true
    }
    case 'commit': {
      const repo = activeGitRepo()
      if (!repo) return false
      useRepoStore.getState().select(repo.path, { type: 'wip' })
      return true
    }
    case 'stash': {
      const repo = activeGitRepo()
      if (!repo) return false
      void repoActions.stash(repo.path)
      return true
    }
    case 'create-branch': {
      const repo = activeGitRepo()
      if (!repo) return false
      const data = useRepoStore.getState().repos[repo.path]
      ui.openModal({ kind: 'create-branch', path: repo.path, currentBranch: data?.branches.current })
      return true
    }
    case 'create-pr': {
      const repo = activeGitRepo()
      if (!repo) return false
      const data = useRepoStore.getState().repos[repo.path]
      ui.openModal({ kind: 'create-pr', repoPath: repo.path, source: data?.branches.current })
      return true
    }
    case 'undo-last': {
      const repo = activeGitRepo()
      if (!repo) return false
      void useRepoStore.getState().undo(repo.path)
      return true
    }
    case 'reveal': {
      const path = activeRepoPath()
      if (!path) return false
      void shellApi.revealInFolder(path)
      return true
    }
    case 'open-in-editor': {
      const path = activeRepoPath()
      const editor = st.settings.editor
      if (!path || !editor?.command) return false
      void openInEditor(editor, { path, isDir: true })
      return true
    }
    case 'repo-settings': {
      const repo = activeGitRepo()
      if (!repo) return false
      ui.openModal({ kind: 'repo-settings', repoPath: repo.path })
      return true
    }

    // ── Help ──
    case 'help':
      st.openPageTab({ type: 'help' })
      return true
    case 'cheatsheet':
      ui.openModal({ kind: 'cheatsheet' })
      return true
    case 'changelog':
      st.openPageTab({ type: 'changelog' })
      return true
    case 'licenses':
      st.openPageTab({ type: 'licenses' })
      return true
    case 'report-issue':
      void shellApi.openExternal(ISSUES_URL)
      return true

    default:
      return false
  }
}
