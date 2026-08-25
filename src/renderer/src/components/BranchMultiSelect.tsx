import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useT, interp } from '../i18n'

/** A chip multi-select: pick from the repo's branches or type a free value. */
export function BranchMultiSelect({
  options,
  value,
  onChange,
  placeholder
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}): React.JSX.Element {
  const t = useT()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const available = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(text.toLowerCase()))
  const canAddTyped = text.trim() && !value.includes(text.trim())

  const add = (b: string): void => {
    const v = b.trim()
    if (!v || value.includes(v)) return
    onChange([...value, v])
    setText('')
    setOpen(false)
  }
  const remove = (b: string): void => onChange(value.filter((x) => x !== b))

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="bms" ref={ref}>
      <div className="bms-control" onClick={() => setOpen(true)}>
        {value.map((b) => (
          <span key={b} className="bms-chip">
            {b}
            <button className="bms-chip-x" onClick={(e) => { e.stopPropagation(); remove(b) }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="bms-input"
          value={text}
          placeholder={value.length ? '' : (placeholder ?? t('repoSettings.addBranch'))}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canAddTyped) { e.preventDefault(); add(text) }
            else if (e.key === 'Backspace' && !text && value.length) remove(value[value.length - 1])
          }}
        />
      </div>
      {open && (available.length > 0 || canAddTyped) && (
        <div className="bms-menu">
          {available.map((o) => (
            <button key={o} className="bms-opt" onClick={() => add(o)}>
              {o}
            </button>
          ))}
          {canAddTyped && (
            <button className="bms-opt add" onClick={() => add(text)}>
              {interp(t('common.addQuoted'), { value: text.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
