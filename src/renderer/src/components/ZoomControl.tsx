import { useCallback, useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

/** Discrete zoom steps, mirroring the feel of browser zoom. 1 = 100%. */
const LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
const MIN = LEVELS[0]
const MAX = LEVELS[LEVELS.length - 1]
const ZOOM_KEY = 'gitcito-zoom'

function loadZoom(): number {
  const raw = Number(localStorage.getItem(ZOOM_KEY))
  if (!Number.isFinite(raw) || raw <= 0) return 1
  return Math.min(MAX, Math.max(MIN, raw))
}

/** Floating control in the bottom-right corner that adjusts the app zoom via
 *  Electron's webFrame. The level persists across sessions and also responds
 *  to the standard Cmd/Ctrl +/-/0 shortcuts. When `compact` is set it renders
 *  inline (e.g. inside the status bar) without the floating panel chrome. */
export function ZoomControl({
  raised = false,
  compact = false
}: {
  raised?: boolean
  compact?: boolean
}): React.JSX.Element {
  const [factor, setFactor] = useState(loadZoom)

  const apply = useCallback((next: number): void => {
    const clamped = Math.min(MAX, Math.max(MIN, next))
    setFactor(clamped)
    window.api.zoom?.set(clamped)
    try {
      localStorage.setItem(ZOOM_KEY, String(clamped))
    } catch {
      /* ignore quota errors */
    }
  }, [])

  // Restore the saved zoom on mount.
  useEffect(() => {
    window.api.zoom?.set(factor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const zoomIn = useCallback(
    () => apply(LEVELS.find((l) => l > factor + 0.001) ?? MAX),
    [apply, factor]
  )
  const zoomOut = useCallback(
    () => apply([...LEVELS].reverse().find((l) => l < factor - 0.001) ?? MIN),
    [apply, factor]
  )
  const reset = useCallback(() => apply(1), [apply])

  // Keyboard shortcuts: Cmd/Ctrl with +, -, or 0.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, reset])

  return (
    <div
      className={`zoom-control${compact ? ' compact' : ''}${raised ? ' raised' : ''}`}
    >
      <button
        className="zoom-btn"
        title="Zoom out"
        onClick={zoomOut}
        disabled={factor <= MIN + 0.001}
      >
        <Minus size={13} />
      </button>
      <button className="zoom-level" title="Reset zoom" onClick={reset}>
        {Math.round(factor * 100)}%
      </button>
      <button
        className="zoom-btn"
        title="Zoom in"
        onClick={zoomIn}
        disabled={factor >= MAX - 0.001}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
