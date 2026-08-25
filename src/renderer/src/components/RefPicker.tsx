import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Cloud, GitBranch, Tag } from 'lucide-react'

export type RefKind = 'local' | 'remote' | 'tag'

export interface RefOption {
  value: string
  kind: RefKind
}

const ICON: Record<RefKind, typeof GitBranch> = { local: GitBranch, remote: Cloud, tag: Tag }

/**
 * A ref (branch / tag / raw SHA) field with a styled dropdown.
 *
 * Replaces the native `<datalist>`, which renders as an unstyled OS popup that
 * ignores the app theme. Typing filters; ↑/↓/Enter pick; anything typed that
 * isn't in the list is still accepted, so raw SHAs keep working.
 */
export function RefPicker({
  value,
  options,
  placeholder,
  className = '',
  onChange,
  onCommit
}: {
  value: string
  options: RefOption[]
  placeholder?: string
  className?: string
  onChange: (v: string) => void
  /** Fired when the user settles on a value (picked a row or pressed Enter). */
  onCommit?: (v: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  /** Where to draw the popup, in viewport coordinates — see the portal below. */
  const [rect, setRect] = useState<{ left: number; top: number; width: number; drop: 'down' | 'up' } | null>(null)

  // While the popup is open the typed text filters it; reopening from the
  // chevron shows everything again.
  const [query, setQuery] = useState<string | null>(null)
  const filtered = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.value.toLowerCase().includes(q))
  }, [options, query])

  // The popup is drawn into a portal on <body> rather than inside the field,
  // because every caller so far lives in a scrolling dialog that would clip it.
  // That trades the automatic position for this measurement.
  const place = (): void => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const drop = below < 200 && r.top > below ? 'up' : 'down'
    setRect({
      left: r.left,
      top: drop === 'down' ? r.bottom + 4 : Math.max(8, r.top - 4 - Math.min(240, filtered.length * 26 + 8)),
      width: r.width,
      drop
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    // Any ancestor scroll moves the field out from under a fixed popup, so the
    // capture phase catches them all; a resize invalidates the measurement too.
    const onMove = (): void => place()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keep the highlighted row in view when arrowing past the visible window.
  useLayoutEffect(() => {
    if (!open) return
    listRef.current?.querySelector('.refpick-opt.active')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, open])

  const pick = (v: string): void => {
    onChange(v)
    onCommit?.(v)
    setOpen(false)
    setQuery(null)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setCursor(0)
        return
      }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setCursor((c) => Math.min(filtered.length - 1, Math.max(0, c + step)))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[cursor]) pick(filtered[cursor].value)
      else {
        setOpen(false)
        onCommit?.(value)
      }
      return
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation() // keep Escape from closing the whole modal
      setOpen(false)
      setQuery(null)
    }
  }

  return (
    <div className={`refpick ${className}`} ref={rootRef}>
      <input
        className="modal-input refpick-input"
        value={value}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setQuery(e.target.value)
          setCursor(0)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery(null)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="refpick-toggle"
        tabIndex={-1}
        onClick={() => {
          setQuery(null)
          setCursor(0)
          setOpen((o) => !o)
        }}
      >
        <ChevronDown size={13} />
      </button>
      {open &&
        filtered.length > 0 &&
        rect &&
        createPortal(
          <div
            className="refpick-pop"
            ref={listRef}
            style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width }}
          >
            {filtered.map((o, i) => {
              const Icon = ICON[o.kind]
              return (
                <div
                  key={`${o.kind}:${o.value}`}
                  className={`refpick-opt ${i === cursor ? 'active' : ''} ${o.value === value ? 'current' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => {
                    e.preventDefault() // don't blur the input before the click lands
                    pick(o.value)
                  }}
                >
                  <Icon size={12} className={`refpick-icon ${o.kind}`} />
                  <span className="refpick-value" title={o.value}>
                    {o.value}
                  </span>
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}
