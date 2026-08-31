import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { useT, interp } from '../i18n'
import { highlightLine } from '../lib/highlight'
import type { GutterChange } from '../lib/diff'

const POPUP_WIDTH = 440

const LABEL_KEY = {
  add: 'fileViewer.gutterAdded',
  mod: 'fileViewer.gutterModified',
  del: 'fileViewer.gutterDeleted'
} as const

/** One colored bar in the change gutter, next to a line touched by an
 *  uncommitted edit. Clicking it opens the change popup at this mark. */
export function GutterMark({
  change,
  active,
  onClick
}: {
  change: GutterChange
  active: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}): React.JSX.Element {
  const t = useT()
  const label = t(LABEL_KEY[change.type])
  return (
    <button
      className={`code-gutter ${change.type}${change.type === 'del' ? ` edge-${change.edge}` : ''}${active ? ' active' : ''}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    />
  )
}

/** The peek popup a gutter mark opens: the hunk's removed/added lines, with
 *  next/prev to walk through every change in the file without closing it. */
export function ChangeGutterPopup({
  change,
  total,
  lang,
  anchorRect,
  onPrev,
  onNext,
  onClose
}: {
  change: GutterChange
  total: number
  lang: string
  anchorRect: DOMRect
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}): React.JSX.Element {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowUp') onPrev()
      else if (e.key === 'ArrowDown') onNext()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onPrev, onNext])

  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - POPUP_WIDTH - 8))
  const top = Math.min(anchorRect.bottom + 4, window.innerHeight - 160)

  return createPortal(
    <div ref={ref} className="change-gutter-popup" style={{ left, top, width: POPUP_WIDTH }}>
      <div className="change-gutter-popup-head">
        <span>{interp(t('fileViewer.gutterPopupCount'), { index: String(change.index + 1), total: String(total) })}</span>
        <div className="change-gutter-popup-nav">
          <button className="icon-btn tiny" title={t('fileViewer.gutterPrev')} disabled={total <= 1} onClick={onPrev}>
            <ChevronUp size={13} />
          </button>
          <button className="icon-btn tiny" title={t('fileViewer.gutterNext')} disabled={total <= 1} onClick={onNext}>
            <ChevronDown size={13} />
          </button>
          <button className="icon-btn tiny" title={t('common.close')} onClick={onClose}>
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="change-gutter-popup-body">
        {change.removed.map((l, i) => (
          <div
            key={`d${i}`}
            className="change-gutter-line del"
            dangerouslySetInnerHTML={{ __html: `<span class="ln-op">−</span>${highlightLine(l, lang) || '&nbsp;'}` }}
          />
        ))}
        {change.added.map((l, i) => (
          <div
            key={`a${i}`}
            className="change-gutter-line add"
            dangerouslySetInnerHTML={{ __html: `<span class="ln-op">+</span>${highlightLine(l, lang) || '&nbsp;'}` }}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}
