import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { GITMOJI_LABELS, searchGitmoji } from '../lib/gitmoji'
import { findGitmoji } from '../../../shared/gitmoji'

const WIDTH = 320
const MAX_HEIGHT = 360

/**
 * The composer's gitmoji button and its searchable popover — all 75 gitmoji,
 * filtered by emoji, `:code:` or translated intent. The context menu cannot do
 * this: it has no search, and a 75-row menu with no way to narrow it is a list
 * nobody scrolls. Rendered in a portal so the composer's overflow cannot clip it.
 */
export function GitmojiPicker({
  value,
  onPick
}: {
  /** The gitmoji currently leading the subject, canonical form ('' if none). */
  value: string
  onPick: (emoji: string) => void
}): React.JSX.Element {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchGitmoji(query, t), [query, t])
  // "No gitmoji" leads the list only while browsing; a search is for an emoji.
  const showNone = !query.trim() && value !== ''
  const rowCount = results.length + (showNone ? 1 : 0)

  const openPicker = (): void => {
    const r = buttonRef.current?.getBoundingClientRect()
    if (r) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))
      const below = r.bottom + 4
      const top = below + MAX_HEIGHT > window.innerHeight - 8 ? Math.max(8, r.top - MAX_HEIGHT - 4) : below
      setPos({ left, top })
    }
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  const pick = (emoji: string): void => {
    onPick(emoji)
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Close on a click anywhere else, or when the window loses focus — the same
  // contract as the context menu. A resize closes it too: its position was
  // measured once, on open, and would otherwise float away from the button.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (popRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const close = (): void => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Keep the keyboard-highlighted row visible while arrowing through the list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      // Stop here: Escape in the composer would otherwise also clear the draft.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(rowCount - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showNone && active === 0) pick('')
      else {
        const g = results[active - (showNone ? 1 : 0)]
        if (g) pick(g.emoji)
      }
    }
  }

  const current = findGitmoji(value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="commit-type commit-gitmoji"
        title={current ? `${t('composer.gitmoji')} — ${t(GITMOJI_LABELS[current.code])}` : t('composer.gitmoji')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        {value || '🙂'}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="gitmoji-picker"
            style={{ left: pos.left, top: pos.top, width: WIDTH, maxHeight: MAX_HEIGHT }}
            onKeyDown={onKey}
          >
            <input
              className="gitmoji-search"
              autoFocus
              spellCheck={false}
              placeholder={t('gitmoji.search')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
            />
            <div className="gitmoji-list" role="listbox" ref={listRef}>
              {showNone && (
                <button
                  type="button"
                  data-row={0}
                  role="option"
                  aria-selected={active === 0}
                  className={`gitmoji-row${active === 0 ? ' active' : ''}`}
                  onMouseEnter={() => setActive(0)}
                  onClick={() => pick('')}
                >
                  <span className="gitmoji-emoji">🙂</span>
                  <span className="gitmoji-label">{t('gitmoji.none')}</span>
                </button>
              )}
              {results.map((g, i) => {
                const row = i + (showNone ? 1 : 0)
                return (
                  <button
                    key={g.code}
                    type="button"
                    data-row={row}
                    role="option"
                    aria-selected={active === row}
                    className={`gitmoji-row${active === row ? ' active' : ''}${g.emoji === current?.emoji ? ' current' : ''}`}
                    onMouseEnter={() => setActive(row)}
                    onClick={() => pick(g.emoji)}
                  >
                    <span className="gitmoji-emoji">{g.emoji}</span>
                    <span className="gitmoji-label">{t(GITMOJI_LABELS[g.code])}</span>
                    <code className="gitmoji-code">{`:${g.code}:`}</code>
                  </button>
                )
              })}
              {results.length === 0 && <div className="gitmoji-empty">{t('gitmoji.noResults')}</div>}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
