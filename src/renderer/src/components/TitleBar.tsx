import { useRef, useState } from 'react'
import { Plus, FolderGit2, X, Minus, Square, Settings, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settings'
import { useUIStore, type MenuItem } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import type { GroupTab, TabState } from '../../../shared/types'
import gitcitoMark from '../assets/gitcito-mark.png'

type TabStatus = 'conflict' | 'wip' | null

// ── drag types ──────────────────────────────────────────────────────────────
type DragItem =
  | { kind: 'tab'; tabId: string }
  | { kind: 'repo'; tabId: string; repoPath: string }

type DropTarget =
  | { kind: 'before-tab' | 'after-tab'; tabId: string }
  | { kind: 'into-group'; tabId: string }
  | { kind: 'before-repo' | 'after-repo'; tabId: string; repoPath: string }
  | { kind: 'eject-at'; insertBeforeTabId: string | null }

export function TitleBar(): React.JSX.Element {
  const {
    settings, setGroupActiveRepo, closeTab, setActiveTab, renameTab,
    setTabColor, toggleTabCollapsed, removeRepoFromGroup,
    reorderTabs, moveTabIntoGroup, ejectRepoFromGroup,
    moveRepoBetweenGroups, reorderReposInGroup
  } = useSettingsStore()
  const { openContextMenu, openModal } = useUIStore()
  const repos = useRepoStore((s) => s.repos)
  const isMac = window.api.platform === 'darwin'

  // ── drag state ──────────────────────────────────────────────────────────
  const dragItem = useRef<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [draggingRepo, setDraggingRepo] = useState(false)

  const clearDrop = (): void => setDropTarget(null)

  const onDragStart = (item: DragItem) => (e: React.DragEvent) => {
    dragItem.current = item
    if (item.kind === 'repo') setDraggingRepo(true)
    e.dataTransfer.effectAllowed = 'move'
    e.stopPropagation()
  }

  const onDragEnd = (): void => {
    dragItem.current = null
    setDraggingRepo(false)
    clearDrop()
  }

  // Middle-click closes a tab/repo. preventDefault on mousedown suppresses
  // the browser autoscroll cursor.
  const middleClose = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    },
    onAuxClick: (e: React.MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      e.stopPropagation()
      fn()
    }
  })

  const sideOf = (e: React.DragEvent): 'before' | 'after' => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
  }

  const onDragOverTab = (tabId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = dragItem.current
    if (!d) return
    if (d.kind === 'tab' && d.tabId === tabId) return clearDrop()
    const tab = settings.tabs.find((t) => t.id === tabId)
    // Dragging repo onto a different group → add to group
    if (d.kind === 'repo' && tab?.kind === 'group' && d.tabId !== tabId) {
      setDropTarget({ kind: 'into-group', tabId })
      return
    }
    if (d.kind === 'tab' && tab?.kind === 'group') {
      const fromTab = settings.tabs.find((t) => t.id === d.tabId)
      if (fromTab?.kind === 'repo') {
        setDropTarget({ kind: 'into-group', tabId })
        return
      }
    }
    const side = sideOf(e)
    setDropTarget({ kind: side === 'before' ? 'before-tab' : 'after-tab', tabId })
  }

  const onDragOverRepo = (tabId: string, repoPath: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = dragItem.current
    if (!d) return
    if (d.kind === 'repo' && d.tabId === tabId && d.repoPath === repoPath) return clearDrop()
    const side = sideOf(e)
    setDropTarget({ kind: side === 'before' ? 'before-repo' : 'after-repo', tabId, repoPath })
  }

  // ── drop zones (eject to standalone) ────────────────────────────────────
  const onDragOverZone = (insertBeforeTabId: string | null) => (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragItem.current || dragItem.current.kind !== 'repo') return
    setDropTarget({ kind: 'eject-at', insertBeforeTabId })
  }

  const onDropZone = (insertBeforeTabId: string | null) => (e: React.DragEvent): void => {
    e.preventDefault()
    const d = dragItem.current
    if (!d || d.kind !== 'repo') return clearDrop()
    ejectRepoFromGroup(d.tabId, d.repoPath, insertBeforeTabId)
    clearDrop()
  }

  const isZoneActive = (insertBeforeTabId: string | null): boolean => {
    if (dropTarget?.kind !== 'eject-at') return false
    return insertBeforeTabId === null
      ? dropTarget.insertBeforeTabId === null
      : dropTarget.insertBeforeTabId === insertBeforeTabId
  }

  const onDropTab = (tabId: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    const d = dragItem.current
    const dt = dropTarget
    if (!d || !dt) return clearDrop()

    if (dt.kind === 'into-group') {
      if (d.kind === 'tab') moveTabIntoGroup(d.tabId, tabId)
      else if (d.kind === 'repo' && d.tabId !== tabId) moveRepoBetweenGroups(d.tabId, d.repoPath, tabId, null)
    } else if (dt.kind === 'before-tab' || dt.kind === 'after-tab') {
      if (d.kind === 'tab') {
        reorderTabs(d.tabId, tabId, dt.kind === 'before-tab')
      } else if (d.kind === 'repo') {
        if (dt.kind === 'before-tab') {
          ejectRepoFromGroup(d.tabId, d.repoPath, tabId)
        } else {
          const idx = settings.tabs.findIndex((t) => t.id === tabId)
          const next = settings.tabs[idx + 1]
          ejectRepoFromGroup(d.tabId, d.repoPath, next?.id ?? null)
        }
      }
    }
    clearDrop()
  }

  const onDropRepo = (tabId: string, repoPath: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    const d = dragItem.current
    const dt = dropTarget
    if (!d || !dt) return clearDrop()

    if (d.kind === 'repo') {
      if (d.tabId === tabId) {
        // Reorder within same group
        const group = settings.tabs.find((t): t is GroupTab => t.id === tabId && t.kind === 'group')
        const groupRepos = group?.repos ?? []
        const targetIdx = groupRepos.findIndex((r) => r.path === repoPath)
        if (dt.kind === 'after-repo') {
          const next = groupRepos[targetIdx + 1]
          reorderReposInGroup(tabId, d.repoPath, next?.path ?? null)
        } else {
          reorderReposInGroup(tabId, d.repoPath, repoPath)
        }
      } else {
        const insertBefore = dt.kind === 'before-repo' ? repoPath : null
        moveRepoBetweenGroups(d.tabId, d.repoPath, tabId, insertBefore)
      }
    } else if (d.kind === 'tab') {
      moveTabIntoGroup(d.tabId, tabId)
    }
    clearDrop()
  }

  const dropClass = (target: DropTarget | null, kind: DropTarget['kind'], tabId: string, repoPath?: string): string => {
    if (!target) return ''
    if (target.kind !== kind) return ''
    if ('tabId' in target && target.tabId !== tabId) return ''
    if ((target.kind === 'before-repo' || target.kind === 'after-repo') && target.repoPath !== repoPath) return ''
    return `drop-${kind}`
  }

  // ── status helpers ──────────────────────────────────────────────────────
  const tabStatus = (tab: TabState): TabStatus => {
    if (tab.kind === 'page') return null
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

  // ── menus ───────────────────────────────────────────────────────────────
  const plusMenu = (): void => openModal({ kind: 'launcher' })

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
    if (tab.kind === 'page') {
      return [{ label: 'Close tab', onClick: () => closeTab(tab.id) }]
    }
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

  const repoInGroupMenu = (groupTab: TabState, repoPath: string): MenuItem[] => [
    {
      label: 'Eject to standalone tab',
      onClick: () => ejectRepoFromGroup(groupTab.id, repoPath, null)
    },
    { separator: true },
    {
      label: 'Remove from group',
      danger: true,
      onClick: () => removeRepoFromGroup(groupTab.id, repoPath)
    }
  ]

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`titlebar ${isMac ? 'mac' : ''}`}>
      <div className="titlebar-logo">
        <img className="logo-mark" src={gitcitoMark} alt="" draggable={false} /> Gitcito
      </div>
      <div className="tabs" onDragOver={(e) => e.preventDefault()} onDrop={clearDrop}>
        {settings.tabs.flatMap((tab) => {
          // Drop zone placed BEFORE each top-level tab — only active while dragging a repo
          const zone = (
            <div
              key={`zone-${tab.id}`}
              className={`tab-drop-zone ${draggingRepo ? 'visible' : ''} ${isZoneActive(tab.id) ? 'active' : ''}`}
              onDragOver={onDragOverZone(tab.id)}
              onDrop={onDropZone(tab.id)}
              onDragLeave={clearDrop}
            />
          )

          if (tab.kind === 'repo') {
            const status = tabStatus(tab)
            const dc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)
            return [
              zone,
              <motion.div
                key={tab.id}
                layout
                className={`tab ${tab.id === settings.activeTabId ? 'active' : ''} ${dc}`}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id }) as any}
                onDragEnd={onDragEnd as any}
                onDragOver={onDragOverTab(tab.id)}
                onDrop={onDropTab(tab.id)}
                {...middleClose(() => confirmCloseGroup(tab))}
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
            ]
          }

          if (tab.kind === 'page') {
            const dc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)
            return [
              zone,
              <motion.div
                key={tab.id}
                layout
                className={`tab tab-page ${tab.id === settings.activeTabId ? 'active' : 'tab-shimmer'} ${dc}`}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id }) as any}
                onDragEnd={onDragEnd as any}
                onDragOver={onDragOverTab(tab.id)}
                onDrop={onDropTab(tab.id)}
                {...middleClose(() => closeTab(tab.id))}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, tabMenu(tab))
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Sparkles size={13} />
                <span className="tab-name">{tab.name}</span>
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ]
          }

          // group tab
          const groupColor = tab.color ?? '#6366f1'
          const isActiveGroup = tab.id === settings.activeTabId
          const groupStatus = tabStatus(tab)

          const handleGroupContext = (e: React.MouseEvent): void => {
            e.preventDefault()
            e.stopPropagation()
            openContextMenu(e.clientX, e.clientY, tabMenu(tab))
          }

          const visibleRepos = tab.collapsed
            ? tab.repos.filter((r) => isActiveGroup && r.path === tab.activeRepoPath)
            : tab.repos

          const chipDc = dropClass(dropTarget, 'into-group', tab.id)
          const wrapDc = dropClass(dropTarget, 'before-tab', tab.id) || dropClass(dropTarget, 'after-tab', tab.id)

          return [
            zone,
            <div
              key={tab.id}
              className={`tab-group-wrap ${tab.collapsed ? 'collapsed' : ''} ${isActiveGroup ? 'active-group' : ''} ${wrapDc}`}
              style={{ '--group-color': groupColor } as React.CSSProperties}
              onContextMenu={handleGroupContext}
              onDragOver={onDragOverTab(tab.id)}
              onDrop={onDropTab(tab.id)}
            >
              <button
                className={`tab-group-chip ${chipDc}`}
                title={tab.collapsed ? 'Expand group' : 'Collapse group'}
                draggable
                onDragStart={onDragStart({ kind: 'tab', tabId: tab.id })}
                onDragEnd={onDragEnd}
                {...middleClose(() => confirmCloseGroup(tab))}
                onClick={() => toggleTabCollapsed(tab.id)}
                onContextMenu={handleGroupContext}
              >
                {tab.name}
                {groupStatus && (
                  <span
                    className={`tab-status tab-status-${groupStatus}`}
                    title={groupStatus === 'conflict' ? 'Conflicts in progress' : 'Uncommitted changes'}
                  />
                )}
              </button>

              <AnimatePresence initial={false}>
                {visibleRepos.map((repo) => {
                  const isActiveRepo = isActiveGroup && tab.activeRepoPath === repo.path
                  const rs = repoStatus(repo.path)
                  const repoDc =
                    dropClass(dropTarget, 'before-repo', tab.id, repo.path) ||
                    dropClass(dropTarget, 'after-repo', tab.id, repo.path)
                  return (
                    <motion.div
                      key={repo.path}
                      layout
                      className={`tab in-group ${isActiveRepo ? 'active' : ''} ${repoDc}`}
                      draggable
                      onDragStart={onDragStart({ kind: 'repo', tabId: tab.id, repoPath: repo.path }) as any}
                      onDragEnd={onDragEnd as any}
                      onDragOver={onDragOverRepo(tab.id, repo.path)}
                      onDrop={onDropRepo(tab.id, repo.path)}
                      {...middleClose(() => removeRepoFromGroup(tab.id, repo.path))}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setGroupActiveRepo(tab.id, repo.path)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openContextMenu(e.clientX, e.clientY, repoInGroupMenu(tab, repo.path))
                      }}
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
          ]
        })}
        {/* trailing zone — drop here to eject to end of tab bar */}
        <div
          className={`tab-drop-zone ${draggingRepo ? 'visible' : ''} ${isZoneActive(null) ? 'active' : ''}`}
          onDragOver={onDragOverZone(null)}
          onDrop={onDropZone(null)}
          onDragLeave={clearDrop}
        />
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
