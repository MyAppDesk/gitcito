import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  /** Leading visual — a state icon, an avatar, etc. */
  icon?: React.ReactNode
}

/**
 * A funnel button in a graph column header that opens a small dropdown of
 * filter options. Each option may carry its own icon/avatar, so it renders its
 * own floating panel rather than reusing the text-only context menu.
 *
 * The first option is treated as the "all"/reset choice: the funnel lights up
 * whenever `active` differs from it.
 */
export function GraphHeaderFilter({
  active,
  options,
  onSelect,
  title
}: {
  active: string
  options: FilterOption[]
  onSelect: (value: string) => void
  title?: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isActive = options.length > 0 && active !== options[0].value

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
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

  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const left = Math.min(r.left, window.innerWidth - 200)
    setPos({ left, top: r.bottom + 2 })
    setOpen(true)
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`ghc-filter ${isActive ? 'active' : ''}`}
        title={title ?? 'Filter'}
        onClick={toggle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Filter size={11} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={panelRef} className="col-filter-menu" style={{ left: pos.left, top: pos.top }}>
            {options.map((o) => (
              <button
                key={o.value}
                className={`col-filter-item ${active === o.value ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(o.value)
                  setOpen(false)
                }}
              >
                <span className="col-filter-check">{active === o.value ? '✓' : ''}</span>
                {o.icon && <span className="col-filter-icon">{o.icon}</span>}
                <span className="col-filter-label">{o.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
