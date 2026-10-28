import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore, type MenuItem, type MenuSwatches } from '../stores/ui'

/** Focus the first enabled item inside a menu container. */
function focusFirstItem(container: ParentNode | null): void {
  container?.querySelector<HTMLButtonElement>('.menu-item:not(:disabled), .menu-swatch[data-stop]')?.focus()
}

/** A row of colour dots, as Finder shows its tags. Arrow keys up and down treat
 *  the row as one stop (the dot carrying `data-stop`); left and right move
 *  along it. */
function SwatchRow({ swatches, close }: { swatches: MenuSwatches; close: () => void }): React.JSX.Element {
  const { colors, current, label, nameOf, onPick } = swatches
  const [stop, setStop] = useState(() => Math.max(0, colors.indexOf(current ?? '')))
  const rowRef = useRef<HTMLDivElement>(null)

  const move = (to: number): void => {
    const next = (to + colors.length) % colors.length
    setStop(next)
    rowRef.current?.querySelectorAll<HTMLButtonElement>('.menu-swatch')[next]?.focus()
  }

  return (
    <div
      ref={rowRef}
      className="menu-swatches"
      role="group"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        e.stopPropagation()
        const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
        move(stop + ((e.key === 'ArrowRight') !== rtl ? 1 : -1))
      }}
    >
      {colors.map((c, i) => (
        <button
          key={c}
          className={`menu-swatch ${c === current ? 'selected' : ''}`}
          role="menuitemradio"
          aria-checked={c === current}
          aria-label={nameOf(c)}
          title={nameOf(c)}
          data-stop={i === stop ? '' : undefined}
          tabIndex={i === stop ? 0 : -1}
          style={{ background: c }}
          onFocus={() => setStop(i)}
          onClick={() => {
            close()
            onPick(c)
          }}
        />
      ))}
    </div>
  )
}

/** A single menu row. Rows with a `submenu` open a flyout on hover; leaf rows
 *  close the whole menu and run their `onClick`.
 *
 *  The flyout is portalled to <body> with fixed positioning rather than nested
 *  inside the menu: the parent `.context-menu` has `overflow-y:auto` (for long
 *  menus), and per CSS that forces `overflow-x:auto` too, which would clip a
 *  nested absolutely-positioned flyout and trigger scroll jank. Keyboard events
 *  from the flyout still bubble through the React tree, so the root's arrow-key
 *  handler covers it. */
function MenuRow({ item, close }: { item: MenuItem; close: () => void }): React.JSX.Element {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const rowRef = useRef<HTMLButtonElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
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

  if (item.swatches) return <SwatchRow swatches={item.swatches} close={close} />

  if (!item.submenu) {
    return (
      <button
        className={`menu-item ${item.danger ? 'danger' : ''}`}
        role="menuitem"
        disabled={item.disabled}
        title={item.title}
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

  const openSubAndFocus = (): void => {
    openSub()
    // The flyout mounts on the next paint; move focus once it exists.
    requestAnimationFrame(() => focusFirstItem(subRef.current))
  }

  return (
    <div className="menu-item-sub" onMouseEnter={openSub} onMouseLeave={scheduleClose}>
      <button
        ref={rowRef}
        className={`menu-item ${item.danger ? 'danger' : ''}`}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        disabled={item.disabled}
        title={item.title}
        onClick={openSubAndFocus}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            e.stopPropagation()
            openSubAndFocus()
          }
        }}
      >
        {item.icon && <span className="menu-item-icon">{item.icon}</span>}
        <span className="menu-item-label">{item.label}</span>
        <ChevronRight size={13} className="menu-item-chevron" aria-hidden="true" />
      </button>
      {pos &&
        createPortal(
          <div
            ref={subRef}
            className="context-menu submenu"
            role="menu"
            style={{ position: 'fixed', left: pos.left, top: pos.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                e.stopPropagation()
                setPos(null)
                rowRef.current?.focus()
              }
            }}
          >
            {item.submenu.map((sub, j) =>
              sub.separator ? (
                <div key={j} className="menu-separator" role="separator" />
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

  // Move focus into the menu on open, so arrow keys and screen readers land on
  // the first action instead of staying on whatever was behind the menu.
  useEffect(() => {
    if (contextMenu) requestAnimationFrame(() => focusFirstItem(ref.current))
  }, [contextMenu])

  const clampedPos = (): { left: number; top: number } => {
    if (!contextMenu) return { left: 0, top: 0 }
    // Cap the estimated height to the viewport — long menus (e.g. gitmoji) scroll
    // instead of being pushed off the bottom of the window.
    const menuH = Math.min(contextMenu.items.length * 30 + 12, window.innerHeight - 16)
    const left = Math.min(contextMenu.x, window.innerWidth - 240)
    const top = Math.min(contextMenu.y, window.innerHeight - menuH)
    return { left, top: Math.max(8, top) }
  }

  // Arrow-key movement, scoped to the menu the focus is currently in (root or
  // flyout — flyout key events bubble here through the React tree).
  const onMenuKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const scope = (document.activeElement as HTMLElement | null)?.closest('.context-menu') ?? ref.current
    if (!scope) return
    const items = Array.from(
      scope.querySelectorAll<HTMLButtonElement>(
        ':scope > .menu-item:not(:disabled), :scope > .menu-item-sub > .menu-item:not(:disabled), :scope > .menu-swatches > .menu-swatch[data-stop]'
      )
    )
    if (items.length === 0) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : e.key === 'ArrowDown'
            ? (at + 1) % items.length
            : (at - 1 + items.length) % items.length
    items[next].focus()
  }

  return (
    <AnimatePresence>
      {contextMenu && (
        <motion.div
          ref={ref}
          className="context-menu"
          role="menu"
          style={clampedPos()}
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          onKeyDown={onMenuKey}
        >
          {contextMenu.items.map((item, i) =>
            item.separator ? (
              <div key={i} className="menu-separator" role="separator" />
            ) : (
              <MenuRow key={i} item={item} close={closeContextMenu} />
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
