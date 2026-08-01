import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import gitcitoMark from '../assets/gitcito-mark.png'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'

/**
 * Title-bar brand + workspace selector. A workspace is a saved tab layout;
 * switching swaps the whole tab strip. This control lives where the app logo
 * sits: the gitcito mark plus the active workspace name (the lone default
 * workspace is named "Gitcito", so with one workspace it just reads as the
 * brand). Clicking opens the switcher to create/rename/delete/switch.
 */
export function WorkspaceSwitcher(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const switchWorkspace = useSettingsStore((s) => s.switchWorkspace)
  const createWorkspace = useSettingsStore((s) => s.createWorkspace)
  const renameWorkspace = useSettingsStore((s) => s.renameWorkspace)
  const deleteWorkspace = useSettingsStore((s) => s.deleteWorkspace)
  const reorderWorkspaces = useSettingsStore((s) => s.reorderWorkspaces)
  const openModal = useUIStore((s) => s.openModal)
  const t = useT()

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Drag & drop reorder of the workspace rows. `dragId` is a ref (the drag
  // payload survives re-renders); `drop` drives the insertion line.
  const dragId = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ id: string; before: boolean } | null>(null)

  const workspaces = settings.workspaces ?? []
  const active = workspaces.find((w) => w.id === settings.activeWorkspaceId) ?? workspaces[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!active) return <></>

  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ left: r.left, top: r.bottom + 4 })
    setOpen(true)
  }

  const fallbackName = (): string => interp(t('ws.placeholder'), { n: workspaces.length + 1 })

  const create = (): void => {
    setOpen(false)
    openModal({
      kind: 'input',
      title: t('ws.new'),
      label: t('ws.name'),
      placeholder: fallbackName(),
      submitLabel: t('ws.create'),
      onSubmit: (name) => createWorkspace(name.trim() || fallbackName())
    })
  }

  const rename = (id: string, current: string): void => {
    setOpen(false)
    openModal({
      kind: 'input',
      title: t('ws.rename'),
      label: t('ws.name'),
      initial: current,
      submitLabel: t('ws.renameAction'),
      onSubmit: (name) => renameWorkspace(id, name.trim() || current)
    })
  }

  const remove = (id: string, name: string): void => {
    setOpen(false)
    openModal({
      kind: 'confirm',
      title: t('ws.delete'),
      message: interp(t('ws.deleteConfirm'), { name }),
      danger: true,
      confirmLabel: t('ws.deleteAction'),
      onConfirm: () => deleteWorkspace(id)
    })
  }

  const endDrag = (): void => {
    dragId.current = null
    setDragging(null)
    setDrop(null)
  }

  const onDragStart = (id: string) => (e: React.DragEvent): void => {
    dragId.current = id
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
    // Needed for the drag to actually start in some Chromium builds.
    e.dataTransfer.setData('text/plain', id)
  }

  const onDragOver = (id: string) => (e: React.DragEvent): void => {
    if (!dragId.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragId.current === id) return setDrop(null)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDrop({ id, before: e.clientY < r.top + r.height / 2 })
  }

  const onDrop = (id: string) => (e: React.DragEvent): void => {
    e.preventDefault()
    const from = dragId.current
    const before = drop?.id === id ? drop.before : true
    endDrag()
    if (from && from !== id) reorderWorkspaces(from, id, before)
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`titlebar-logo workspace-switcher ${open ? 'open' : ''}`}
        title={interp(t('ws.switcherTitle'), { name: active.name })}
        onClick={toggle}
      >
        <img className="logo-mark" src={gitcitoMark} alt="" draggable={false} />
        <span className="workspace-switcher-name">{active.name}</span>
        <ChevronDown size={13} className="profile-switcher-chevron" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={panelRef} className="profile-switcher-menu" style={{ left: pos.left, top: pos.top }}>
            {workspaces.map((w) => (
              <div
                key={w.id}
                className={`workspace-switcher-row${dragging === w.id ? ' dragging' : ''}${
                  drop?.id === w.id ? (drop.before ? ' drop-before' : ' drop-after') : ''
                }`}
                draggable={workspaces.length > 1}
                onDragStart={onDragStart(w.id)}
                onDragOver={onDragOver(w.id)}
                onDrop={onDrop(w.id)}
                onDragEnd={endDrag}
              >
                {workspaces.length > 1 && (
                  <span className="workspace-row-grip" title={t('ws.reorderHint')}>
                    <GripVertical size={13} />
                  </span>
                )}
                <button
                  className={`profile-switcher-item ${w.id === active.id ? 'selected' : ''}`}
                  onClick={() => {
                    switchWorkspace(w.id)
                    setOpen(false)
                  }}
                >
                  <span className="profile-switcher-check">{w.id === active.id ? '✓' : ''}</span>
                  <span className="profile-switcher-label">{w.name}</span>
                </button>
                <span className="workspace-row-actions">
                  <button className="workspace-row-btn" title={t('ws.renameAction')} onClick={() => rename(w.id, w.name)}>
                    <Pencil size={13} />
                  </button>
                  {workspaces.length > 1 && (
                    <button className="workspace-row-btn danger" title={t('ws.deleteAction')} onClick={() => remove(w.id, w.name)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </div>
            ))}
            <div className="profile-switcher-sep" />
            <button className="profile-switcher-item" onClick={create}>
              <span className="profile-switcher-check" />
              <span className="profile-switcher-plus">
                <Plus size={14} />
              </span>
              <span className="profile-switcher-label">{t('ws.new')}</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
