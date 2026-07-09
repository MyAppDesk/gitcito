import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore, type MenuItem } from '../stores/ui'

/** A single menu row. Rows with a `submenu` open a flyout on hover; leaf rows
 *  close the whole menu and run their `onClick`.
 *
 *  The flyout is portalled to <body> with fixed positioning rather than nested
 *  inside the menu: the parent `.context-menu` has `overflow-y:auto` (for long
 *  menus), and per CSS that forces `overflow-x:auto` too, which would clip a
 *  nested absolutely-positioned flyout and trigger scroll jank. */
function MenuRow({ item, close }: { item: MenuItem; close: () => void }): React.JSX.Element {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const rowRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const scheduleClose = (): void => {
    cancelClose()
    closeTimer.current = setTimeout(() => setPos(null), 120)
  }
  useEffect(() => cancelClose, [])

  if (!item.submenu) {
    return (
      <button
        className={`menu-item ${item.danger ? 'danger' : ''}`}
        disabled={item.disabled}
        onClick={() => {
          close()
          item.onClick?.()
        }}
      >
        {item.icon && <span className="menu-item-icon">{item.icon}</span>}
        <span className="menu-item-label">{item.label}</span>
      </button>
    )
  }

  const openSub = (): void => {
    cancelClose()
    const r = rowRef.current?.getBoundingClientRect()
    if (!r) return
    const subW = 220
    // Flip to the left of the row when there isn't room on the right.
    const left = r.right + subW > window.innerWidth - 8 ? r.left - subW - 2 : r.right + 2
    const subH = (item.submenu?.length ?? 0) * 32 + 10
    const top = Math.max(8, Math.min(r.top - 6, window.innerHeight - subH - 8))
    setPos({ left, top })
  }

  return (
    <div className="menu-item-sub" onMouseEnter={openSub} onMouseLeave={scheduleClose}>
      <button
        ref={rowRef}
        className={`menu-item ${item.danger ? 'danger' : ''}`}
        disabled={item.disabled}
        onClick={openSub}
      >
        {item.icon && <span className="menu-item-icon">{item.icon}</span>}
        <span className="menu-item-label">{item.label}</span>
        <ChevronRight size={13} className="menu-item-chevron" />
      </button>
      {pos &&
        createPortal(
          <div
            className="context-menu submenu"
            style={{ position: 'fixed', left: pos.left, top: pos.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {item.submenu.map((sub, j) =>
              sub.separator ? (
                <div key={j} className="menu-separator" />
              ) : (
                <MenuRow key={j} item={sub} close={close} />
              )
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

export function ContextMenu(): React.JSX.Element {
  const { contextMenu, closeContextMenu } = useUIStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      const target = e.target as HTMLElement
      // Submenus are portalled to <body>, outside `ref`. Treat a click inside
      // any `.context-menu` (root or flyout) as inside, so submenu items fire
      // their onClick instead of the menu closing out from under them.
      if (target.closest?.('.context-menu')) return
      if (ref.current && !ref.current.contains(target)) closeContextMenu()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeContextMenu()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', closeContextMenu)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', closeContextMenu)
    }
  }, [closeContextMenu])

  const clampedPos = (): { left: number; top: number } => {
    if (!contextMenu) return { left: 0, top: 0 }
    // Cap the estimated height to the viewport — long menus (e.g. gitmoji) scroll
    // instead of being pushed off the bottom of the window.
    const menuH = Math.min(contextMenu.items.length * 30 + 12, window.innerHeight - 16)
    const left = Math.min(contextMenu.x, window.innerWidth - 240)
    const top = Math.min(contextMenu.y, window.innerHeight - menuH)
    return { left, top: Math.max(8, top) }
  }

  return (
    <AnimatePresence>
      {contextMenu && (
        <motion.div
          ref={ref}
          className="context-menu"
          style={clampedPos()}
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
        >
          {contextMenu.items.map((item, i) =>
            item.separator ? (
              <div key={i} className="menu-separator" />
            ) : (
              <MenuRow key={i} item={item} close={closeContextMenu} />
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
