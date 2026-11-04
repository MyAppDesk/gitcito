import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, GitBranch, Search } from 'lucide-react'
import { useT } from '../i18n'

interface PickerPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

/** A form-field dropdown for picking a branch inside a modal: the trigger looks
 *  like a regular `.modal-input`, the popover reuses the sidebar branch-picker
 *  chrome, and a filter box at the top narrows long branch lists. */
export function BranchFieldPicker({
  branches,
  value,
  onChange,
  ariaLabel
}: {
  branches: { name: string; isCurrent?: boolean }[]
  value: string
  onChange: (name: string) => void
  ariaLabel?: string
}): React.JSX.Element {
  const t = useT()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState<PickerPosition | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const open = position !== null
  const q = query.trim().toLowerCase()
  const filtered = q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches

  const close = (): void => {
    setPosition(null)
    setQuery('')
    triggerRef.current?.focus()
  }

  const pick = (name: string): void => {
    onChange(name)
    close()
  }

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setPosition(null)
      setQuery('')
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setPosition(null)
        setQuery('')
        triggerRef.current?.focus()
      }
    }
    const onBlur = (): void => {
      setPosition(null)
      setQuery('')
    }
    window.addEventListener('mousedown', onMouseDown)
    // Capture phase: the modal itself closes on Escape — the picker must get
    // the key first so it dismisses only itself.
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [open])

  // Keep the highlighted row visible while arrow-keying through the list.
  useEffect(() => {
    popoverRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const toggle = (): void => {
    if (open) {
      setPosition(null)
      setQuery('')
      return
    }
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.max(r.width, 240)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    // Search box + padding ≈ 46px chrome on top of the scrollable list.
    const wanted = Math.min(46 + Math.max(1, branches.length) * 34 + 10, 340)
    const below = window.innerHeight - r.bottom - 8
    const above = r.top - 8
    const openAbove = below < wanted && above > below
    const maxHeight = Math.min(wanted, openAbove ? above : below)
    const top = openAbove ? Math.max(8, r.top - maxHeight - 4) : r.bottom + 4
    setPosition({ left, top, width, maxHeight })
    setQuery('')
    setActiveIndex(Math.max(0, branches.findIndex((b) => b.name === value)))
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const onSearchKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[Math.min(activeIndex, filtered.length - 1)]
      if (item) pick(item.name)
    }
  }

  const shown = filtered.map((b, i) => (
    <button
      key={b.name}
      type="button"
      role="option"
      aria-selected={b.name === value}
      data-idx={i}
      className={`branch-picker-item ${b.name === value ? 'active' : ''}`}
      onMouseEnter={() => setActiveIndex(i)}
      onClick={() => pick(b.name)}
    >
      <span className="branch-picker-check">{b.name === value && <Check size={15} />}</span>
      <GitBranch size={13} aria-hidden="true" />
      <span className="branch-picker-name">{b.name}</span>
      {b.isCurrent && <span className="branch-picker-current">{t('worktree.currentBadge')}</span>}
    </button>
  ))

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="modal-input modal-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !open) {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <span className="modal-select-label">
          <GitBranch size={13} aria-hidden="true" />
          {value}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {position &&
        createPortal(
          <div
            ref={popoverRef}
            className="branch-picker-popover branch-picker-field"
            role="listbox"
            aria-label={ariaLabel}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight
            }}
          >
            <div className="branch-picker-search">
              <Search size={13} aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder={t('worktree.branchSearch')}
                aria-label={t('worktree.branchSearch')}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onSearchKey}
              />
            </div>
            <div className="branch-picker-scroll">
              {shown.length > 0 ? (
                shown
              ) : (
                <div className="branch-picker-empty">{t('cmdp.noMatches')}</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
