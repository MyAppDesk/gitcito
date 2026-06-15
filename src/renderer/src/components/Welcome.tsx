import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderGit2, Download, Plus, X, Pencil, GripVertical } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import gitcitoLaunch from '../assets/gitcito-launch.png'

export interface LauncherItem {
  name: string
  path: string
  onSelect?: () => void
  onRemove?: () => void
  onRename?: (newName: string) => void
}

function ItemList({
  items,
  title,
  renamingPath,
  renameVal,
  onStartRename,
  onRenameVal,
  onConfirmRename,
  onCancelRename,
  onReorder
}: {
  items: LauncherItem[]
  title?: string
  renamingPath: string | null
  renameVal: string
  onStartRename: (item: LauncherItem) => void
  onRenameVal: (v: string) => void
  onConfirmRename: (item: LauncherItem) => void
  onCancelRename: () => void
  onReorder?: (fromPath: string, toPath: string) => void
}): React.JSX.Element {
  const [dragPath, setDragPath] = useState<string | null>(null)
  const [overPath, setOverPath] = useState<string | null>(null)

  return (
    <div className="launcher-list">
      {title && <div className="recent-title">{title}</div>}
      {items.map((item) => {
        const renaming = renamingPath === item.path
        const dragging = dragPath === item.path
        const dragOver = overPath === item.path && dragPath !== null && dragPath !== item.path
        return (
          <div
            key={item.path}
            className={`launcher-item${item.onSelect && !renaming ? ' clickable' : ''}${dragging ? ' dragging' : ''}${dragOver ? ' drag-over' : ''}`}
            draggable={!!onReorder}
            onClick={!renaming ? item.onSelect : undefined}
            onDragStart={onReorder ? () => setDragPath(item.path) : undefined}
            onDragEnd={onReorder ? () => { setDragPath(null); setOverPath(null) } : undefined}
            onDragOver={onReorder ? (e) => { e.preventDefault(); if (dragPath && dragPath !== item.path) setOverPath(item.path) } : undefined}
            onDrop={onReorder ? (e) => { e.preventDefault(); if (dragPath && dragPath !== item.path) onReorder(dragPath, item.path); setDragPath(null); setOverPath(null) } : undefined}
          >
            {onReorder && (
              <span className="launcher-grip" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={12} />
              </span>
            )}
            <FolderGit2 size={13} className="launcher-item-icon" />
            <div className="launcher-item-info">
              {renaming ? (
                <input
                  autoFocus
                  className="launcher-rename-input"
                  value={renameVal}
                  onChange={(e) => onRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') onConfirmRename(item)
                    if (e.key === 'Escape') onCancelRename()
                  }}
                  onBlur={() => onConfirmRename(item)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <strong>{item.name}</strong>
                  <span>{item.path}</span>
                </>
              )}
            </div>
            {!renaming && item.onRename && (
              <button
                className="icon-btn"
                title="Rename"
                onClick={(e) => { e.stopPropagation(); onStartRename(item) }}
              >
                <Pencil size={11} />
              </button>
            )}
            {!renaming && item.onRemove && (
              <button
                className="icon-btn"
                title="Remove"
                onClick={(e) => { e.stopPropagation(); item.onRemove!() }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function LauncherPanel({
  onOpen,
  onClone,
  onCreate,
  onCreateGroup,
  onReorder,
  items,
  listTitle,
  emptyMessage,
  recentItems
}: {
  onOpen: () => void
  onClone: () => void
  onCreate: () => void
  onCreateGroup?: () => void
  onReorder?: (fromPath: string, toPath: string) => void
  items: LauncherItem[]
  listTitle?: string
  emptyMessage?: string
  recentItems?: LauncherItem[]
}): React.JSX.Element {
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  const startRename = (item: LauncherItem): void => {
    setRenamingPath(item.path)
    setRenameVal(item.name)
  }

  const confirmRename = (item: LauncherItem): void => {
    if (renameVal.trim() && renameVal.trim() !== item.name) item.onRename?.(renameVal.trim())
    setRenamingPath(null)
  }

  const listProps = {
    renamingPath,
    renameVal,
    onStartRename: startRename,
    onRenameVal: setRenameVal,
    onConfirmRename: confirmRename,
    onCancelRename: () => setRenamingPath(null)
  }

  return (
    <div className="launcher-panel">
      <div className="launcher-actions">
        <button className="btn ghost" onClick={onOpen}>
          <FolderGit2 size={14} /> Open
        </button>
        <button className="btn ghost" onClick={onClone}>
          <Download size={14} /> Clone
        </button>
        <button className="btn ghost" onClick={onCreate}>
          <Plus size={14} /> Create
        </button>
      </div>
      {onCreateGroup && (
        <button className="btn ghost launcher-create-group" onClick={onCreateGroup}>
          <Plus size={14} /> Create group
        </button>
      )}
      {(items.length > 0 || emptyMessage !== undefined) && (
        <>
          {emptyMessage && items.length === 0 ? (
            <div className="launcher-list">
              {listTitle && <div className="recent-title">{listTitle}</div>}
              <div className="launcher-empty">{emptyMessage}</div>
            </div>
          ) : (
            <ItemList items={items} title={listTitle} onReorder={onReorder} {...listProps} />
          )}
        </>
      )}
      {recentItems && recentItems.length > 0 && (
        <ItemList items={recentItems} title="RECENT" {...listProps} />
      )}
    </div>
  )
}

export function Welcome(): React.JSX.Element {
  const { settings, openRepoTab, createGroupTab } = useSettingsStore()
  const openModal = useUIStore((s) => s.openModal)
  const t = useT()

  const openRepo = async (): Promise<void> => {
    const path = await window.api.selectDirectory()
    if (path) openRepoTab({ path, name: path.split('/').pop() ?? path })
  }

  const cloneRepo = (): void => {
    openModal({ kind: 'clone', onClone: (repo) => openRepoTab(repo) })
  }

  const createRepo = (): void => {
    openModal({ kind: 'create-repo', onCreate: (repo) => openRepoTab(repo) })
  }

  const createGroup = (): void => {
    openModal({
      kind: 'input',
      title: 'New group',
      label: 'Group name',
      placeholder: 'My projects',
      submitLabel: 'Create',
      onSubmit: (name) => createGroupTab(name)
    })
  }

  const recentItems: LauncherItem[] = settings.recentRepos.map((r) => ({
    name: r.name,
    path: r.path,
    onSelect: () => openRepoTab(r)
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
        <h1>Gitcito</h1>
        <p>{t('welcome.tagline')}</p>
        <LauncherPanel
          onOpen={() => void openRepo()}
          onClone={cloneRepo}
          onCreate={createRepo}
          onCreateGroup={createGroup}
          items={recentItems}
          listTitle={recentItems.length > 0 ? t('welcome.recent').toUpperCase() : undefined}
        />
      </motion.div>
    </div>
  )
}
