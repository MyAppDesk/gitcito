import { Plus, FolderGit2, Layers, X, ChevronDown, Minus, Square, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type MenuItem } from '../stores/ui'
import type { TabState } from '../../../shared/types'
import gitcitoMark from '../assets/gitcito-mark.png'

export function TitleBar(): React.JSX.Element {
  const { settings, setGroupActiveRepo, closeTab, setActiveTab, renameTab } = useSettingsStore()
  const { openContextMenu, openModal } = useUIStore()
  const isMac = window.api.platform === 'darwin'

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

  const groupRepoMenu = (tab: TabState, e: React.MouseEvent): void => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const items: MenuItem[] = tab.repos.map((r) => ({
      label: r.name + (tab.activeRepoPath === r.path ? '   ✓' : ''),
      onClick: () => setGroupActiveRepo(tab.id, r.path)
    }))
    items.push({ separator: true })
    items.push({
      label: 'Manage repositories…',
      onClick: () => openModal({ kind: 'launcher', groupId: tab.id })
    })
    if (tab.activeRepoPath) {
      items.push({ label: 'View group home', onClick: () => setGroupActiveRepo(tab.id, null) })
    }
    openContextMenu(rect.left, rect.bottom + 4, items)
  }

  return (
    <div className={`titlebar ${isMac ? 'mac' : ''}`}>
      <div className="titlebar-logo">
        <img className="logo-mark" src={gitcitoMark} alt="" draggable={false} /> Gitcito
      </div>
      <div className="tabs">
        {settings.tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layout
            className={`tab ${tab.id === settings.activeTabId ? 'active' : ''}`}
            onClick={() => {
              if (tab.id === settings.activeTabId && tab.kind === 'group' && tab.activeRepoPath) {
                setGroupActiveRepo(tab.id, null)
              } else {
                setActiveTab(tab.id)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e.clientX, e.clientY, tabMenu(tab))
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab.kind === 'group' ? <Layers size={13} /> : <FolderGit2 size={13} />}
            <span className="tab-name">
              {tab.name}
              {tab.kind === 'group' && tab.activeRepoPath && (
                <span className="tab-repo">
                  {' ▸ '}
                  {tab.repos.find((r) => r.path === tab.activeRepoPath)?.name}
                </span>
              )}
            </span>
            {tab.kind === 'group' && (
              <button className="tab-chevron" title="Switch repository" onClick={(e) => groupRepoMenu(tab, e)}>
                <ChevronDown size={12} />
              </button>
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
        ))}
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
