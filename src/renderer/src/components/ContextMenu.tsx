import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from '../stores/ui'

export function ContextMenu(): React.JSX.Element {
  const { contextMenu, closeContextMenu } = useUIStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeContextMenu()
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
              <button
                key={i}
                className={`menu-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  closeContextMenu()
                  item.onClick?.()
                }}
              >
                {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
