import { useEffect, useId, useState } from 'react'
import { useT, interp } from '../i18n'
import { readDraft, settleDraft } from '../lib/boundedNumber'

/**
 * A whole-number input with bounds that lets people type.
 *
 * The draft is exactly what was typed. A value inside the bounds is saved as
 * soon as it is typed, so the setting takes effect without leaving the field;
 * one outside them is flagged (red outline, a line saying the range) and left
 * alone until the field is left or Enter is pressed, when it snaps to the
 * nearest bound. Escape puts back the saved value.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  style,
  ariaLabel,
  title
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max?: number
  step?: number
  className?: string
  style?: React.CSSProperties
  ariaLabel?: string
  title?: string
}): React.JSX.Element {
  const t = useT()
  const hintId = useId()
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // A value changed elsewhere (another window, a reset) shows up — but never
  // overwrites what is being typed.
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const bounds = { min, max }
  const verdict = readDraft(draft, bounds)
  const outOfRange = verdict.status === 'out-of-range'

  const settle = (): void => {
    const next = settleDraft(draft, bounds, value)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        className={`${className ?? ''}${outOfRange ? ' is-invalid' : ''}`}
        style={style}
        aria-label={ariaLabel}
        title={title}
        aria-invalid={outOfRange || undefined}
        aria-describedby={outOfRange ? hintId : undefined}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setDraft(e.target.value)
          const next = readDraft(e.target.value, bounds)
          if (next.status === 'valid' && next.value !== value) onChange(next.value)
        }}
        onBlur={() => {
          setFocused(false)
          settle()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') settle()
          else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            setDraft(String(value))
          }
        }}
      />
      {outOfRange && (
        <span id={hintId} className="number-field-error" role="alert">
          {max === undefined
            ? interp(t('numberField.atLeast'), { min: min.toLocaleString() })
            : interp(t('numberField.range'), { min: min.toLocaleString(), max: max.toLocaleString() })}
        </span>
      )}
    </>
  )
}
