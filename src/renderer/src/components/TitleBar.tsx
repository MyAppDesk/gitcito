import { Plus, FolderGit2, X, Minus, Square, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import type { TabState } from '../../../shared/types'
import gitcitoMark from '../assets/gitcito-mark.png'

type TabStatus = 'conflict' | 'wip' | null

export function TitleBar(): React.JSX.Element {
  const { settings, setGroupActiveRepo, closeTab, setActiveTab, renameTab, setTabColor, toggleTabCollapsed, removeRepoFromGroup } = useSettingsStore()
  const { openContextMenu, openModal } = useUIStore()
  const repos = useRepoStore((s) => s.repos)
  const isMac = window.api.platform === 'darwin'

  const tabStatus = (tab: TabState): TabStatus => {
    let wip = false
    for (const ref of tab.repos) {
      const data = repos[ref.path]
      if (!data) continue
      if (data.mergeState || (data.status?.conflicted.length ?? 0) > 0) return 'conflict'
      if ((data.status?.staged.length ?? 0) + (data.status?.unstaged.length ?? 0) > 0) wip = true
    }
    return wip ? 'wip' : null
  }

  const repoStatus = (path: string): TabStatus => {
    const data = repos[path]
    if (!data) return null
    if (data.mergeState || (data.status?.conflicted.length ?? 0) > 0) return 'conflict'
    if ((data.status?.staged.length ?? 0) + (data.status?.unstaged.length ?? 0) > 0) return 'wip'
    return null
  }

  const plusMenu = (): void => {
    openModal({ kind: 'launcher' })
  }

  const confirmCloseGroup = (tab: TabState): void => {
    if (tab.kind === 'group' && tab.repos.length > 1) {
      openModal({
        kind: 'confirm',
        title: 'Close group',
        message: `"${tab.name}" has ${tab.repos.length} repositories. Close it?`,
        danger: true,
        confirmLabel: 'Close',
        onConfirm: () => closeTab(tab.id)
      })
    } else {
      closeTab(tab.id)
    }
  }

  const tabMenu = (tab: TabState): MenuItem[] => {
    const items: MenuItem[] = []
    if (tab.kind === 'group') {
      items.push({
        label: 'Manage repositories…',
        onClick: () => openModal({ kind: 'launcher', groupId: tab.id })
      })
      items.push({
        label: 'Change color…',
        onClick: () =>
          openModal({
            kind: 'group-color',
            tabId: tab.id,
            current: tab.color,
            onSelect: (color) => setTabColor(tab.id, color)
          })
      })
      if (tab.activeRepoPath) {
        items.push({
          label: 'View group home',
          onClick: () => setGroupActiveRepo(tab.id, null)
        })
      }
      items.push({ separator: true })
    }
    items.push(
      {
        label: 'Rename…',
        onClick: () =>
          openModal({
            kind: 'input',
            title: 'Rename tab',
            label: 'Name',
            initial: tab.name,
            submitLabel: 'Rename',
            onSubmit: (name) => renameTab(tab.id, name)
          })
      },
      { separator: true },
      { label: 'Close tab', onClick: () => confirmCloseGroup(tab) }
    )
    return items
  }

  return (
    <div className={`titlebar ${isMac ? 'mac' : ''}`}>
      <div className="titlebar-logo">
        <img className="logo-mark" src={gitcitoMark} alt="" draggable={false} /> Gitcito
      </div>
      <div className="tabs">
        {settings.tabs.map((tab) => {
          if (tab.kind === 'repo') {
            const status = tabStatus(tab)
            return (
              <motion.div
                key={tab.id}
                layout
                className={`tab ${tab.id === settings.activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, tabMenu(tab))
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <FolderGit2 size={13} />
                <span className="tab-name">{tab.name}</span>
                {status && (
                  <span
                    className={`tab-status tab-status-${status}`}
                    title={status === 'conflict' ? 'Conflicts in progress' : 'Uncommitted changes'}
                  />
                )}
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmCloseGroup(tab)
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            )
          }

          // group tab
          const groupColor = tab.color ?? '#6366f1'
          const isActiveGroup = tab.id === settings.activeTabId

          const handleGroupContext = (e: React.MouseEvent): void => {
            e.preventDefault()
            e.stopPropagation()
            openContextMenu(e.clientX, e.clientY, tabMenu(tab))
          }

          const visibleRepos = tab.collapsed
            ? tab.repos.filter((r) => isActiveGroup && r.path === tab.activeRepoPath)
            : tab.repos

          return (
            <div
              key={tab.id}
              className={`tab-group-wrap ${tab.collapsed ? 'collapsed' : ''} ${isActiveGroup ? 'active-group' : ''}`}
              style={{ '--group-color': groupColor } as React.CSSProperties}
              onContextMenu={handleGroupContext}
            >
              <button
                className="tab-group-chip"
                title={tab.collapsed ? 'Expand group' : 'Collapse group'}
                onClick={() => toggleTabCollapsed(tab.id)}
                onContextMenu={handleGroupContext}
              >
                {tab.name}
              </button>

              <AnimatePresence initial={false}>
                {visibleRepos.map((repo) => {
                  const isActiveRepo = isActiveGroup && tab.activeRepoPath === repo.path
                  const rs = repoStatus(repo.path)
                  return (
                    <motion.div
                      key={repo.path}
                      layout
                      className={`tab in-group ${isActiveRepo ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setGroupActiveRepo(tab.id, repo.path)
                      }}
                      onContextMenu={handleGroupContext}
                      initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                      animate={{ opacity: 1, width: 'auto', paddingLeft: 12, paddingRight: 8 }}
                      exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      <FolderGit2 size={13} />
                      <span className="tab-name">{repo.name}</span>
                      {rs && (
                        <span
                          className={`tab-status tab-status-${rs}`}
                          title={rs === 'conflict' ? 'Conflicts in progress' : 'Uncommitted changes'}
                        />
                      )}
                      <button
                        className="tab-close"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRepoFromGroup(tab.id, repo.path)
                        }}
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

            </div>
          )
        })}
        <button className="tab-add" title="Open repository or group" onClick={() => plusMenu()}>
          <Plus size={15} />
        </button>
      </div>
      <button
        className="titlebar-action"
        title="Settings"
        onClick={() => openModal({ kind: 'settings' })}
      >
        <Settings size={16} />
      </button>
      {!isMac && (
        <div className="window-controls">
          <button onClick={() => window.api.window.minimize()}>
            <Minus size={14} />
          </button>
          <button onClick={() => window.api.window.maximize()}>
            <Square size={11} />
          </button>
          <button className="win-close" onClick={() => window.api.window.close()}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
