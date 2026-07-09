import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, LayoutGrid, Pencil, Trash2 } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'

/**
 * Title-bar workspace selector. A workspace is a saved tab layout; switching
 * swaps the whole tab strip. Rendered only when more than one workspace exists
 * — with just the single "Default" workspace there is nothing to choose, so the
 * control stays hidden (new workspaces are created from Settings → General).
 */
export function WorkspaceSwitcher(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const switchWorkspace = useSettingsStore((s) => s.switchWorkspace)
  const createWorkspace = useSettingsStore((s) => s.createWorkspace)
  const renameWorkspace = useSettingsStore((s) => s.renameWorkspace)
  const deleteWorkspace = useSettingsStore((s) => s.deleteWorkspace)
  const openModal = useUIStore((s) => s.openModal)

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Only one workspace → nothing to switch between; keep the title bar clean.
  if (workspaces.length <= 1 || !active) return <></>

  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ right: window.innerWidth - r.right, top: r.bottom + 4 })
    setOpen(true)
  }

  const create = (): void => {
    setOpen(false)
    openModal({
      kind: 'input',
      title: 'New workspace',
      label: 'Name',
      placeholder: `Workspace ${workspaces.length + 1}`,
      submitLabel: 'Create',
      onSubmit: (name) => createWorkspace(name.trim() || `Workspace ${workspaces.length + 1}`)
    })
  }

  const rename = (id: string, current: string): void => {
    setOpen(false)
    openModal({
      kind: 'input',
      title: 'Rename workspace',
      label: 'Name',
      initial: current,
      submitLabel: 'Rename',
      onSubmit: (name) => renameWorkspace(id, name.trim() || current)
    })
  }

  const remove = (id: string, name: string): void => {
    setOpen(false)
    openModal({
      kind: 'confirm',
      title: 'Delete workspace',
      message: `Delete "${name}"? Its tab layout will be discarded (the repositories themselves are untouched).`,
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: () => deleteWorkspace(id)
    })
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`workspace-switcher ${open ? 'open' : ''}`}
        title={`Workspace: ${active.name}`}
        onClick={toggle}
      >
        <LayoutGrid size={15} />
        <span className="profile-switcher-name">{active.name}</span>
        <ChevronDown size={13} className="profile-switcher-chevron" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={panelRef} className="profile-switcher-menu" style={{ right: pos.right, top: pos.top }}>
            {workspaces.map((w) => (
              <div key={w.id} className="workspace-switcher-row">
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
                  <button className="workspace-row-btn" title="Rename" onClick={() => rename(w.id, w.name)}>
                    <Pencil size={13} />
                  </button>
                  {workspaces.length > 1 && (
                    <button className="workspace-row-btn danger" title="Delete" onClick={() => remove(w.id, w.name)}>
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
              <span className="profile-switcher-label">New workspace</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
