import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Language } from '../../../shared/types'
import { LANGUAGES } from '../i18n'
import { FlagIcon } from './FlagIcon'

/**
 * The interface-language field.
 *
 * A native `<select>` cannot hold an `<option>` with an icon in it, so this is
 * the same button-plus-popup shape as `RefPicker`. Each row shows the language
 * in its own name — a reader looking for their language is not reading the
 * one they cannot read.
 */
export function LanguagePicker({
  value,
  onChange
}: {
  value: Language
  onChange: (lang: Language) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.id === value) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Open on the active language rather than the top of a 16-row list.
  useLayoutEffect(() => {
    if (!open) return
    listRef.current?.querySelector('.langpick-opt.active')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, open])

  const pick = (lang: Language): void => {
    onChange(lang)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setCursor(LANGUAGES.findIndex((l) => l.id === value))
        return
      }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setCursor((c) => Math.min(LANGUAGES.length - 1, Math.max(0, c + step)))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) pick(LANGUAGES[cursor].id)
      else {
        setCursor(LANGUAGES.findIndex((l) => l.id === value))
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation() // keep Escape from closing the settings panel too
      setOpen(false)
    }
  }

  return (
    <div className="langpick" ref={rootRef}>
      <button
        type="button"
        className="langpick-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={onKeyDown}
        onClick={() => {
          setCursor(LANGUAGES.findIndex((l) => l.id === value))
          setOpen((o) => !o)
        }}
      >
        <FlagIcon lang={current.id} />
        <span className="langpick-label">{current.label}</span>
        <ChevronDown size={13} className="langpick-chevron" />
      </button>
      {open && (
        <div className="langpick-pop" role="listbox" ref={listRef}>
          {LANGUAGES.map((l, i) => (
            <div
              key={l.id}
              role="option"
              aria-selected={l.id === value}
              className={`langpick-opt ${i === cursor ? 'active' : ''} ${l.id === value ? 'current' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(l.id)
              }}
            >
              <FlagIcon lang={l.id} />
              <span className="langpick-label">{l.label}</span>
              {l.id === value && <Check size={12} className="langpick-check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
