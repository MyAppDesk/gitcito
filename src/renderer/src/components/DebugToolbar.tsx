import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, RotateCcw, Square, ChevronDown, X, GripVertical } from 'lucide-react'
import { useLaunchStore } from '../stores/launch'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'

const POS_KEY = 'gitcito.debugToolbarPos'
// Must match the CSS `top` of .debug-toolbar — offsets are relative to it.
const BASE_TOP = 10
const EDGE_MARGIN = 6

/**
 * VS Code-style floating debug bar. Shown whenever the active repo has at least
 * one launch session. Controls the active session (pause/resume, restart, stop)
 * and switches between sessions via a dropdown. Sits centred over the graph
 * pane until dragged by its grip, after which the dropped spot is remembered.
 * Rendered through a portal so ancestor transforms (the animated panes) cannot
 * re-anchor its fixed positioning — a zero-size probe left in the normal tree
 * is how it still finds the graph pane it was mounted in.
 */
export function DebugToolbar({ repoPath }: { repoPath: string }): React.JSX.Element | null {
  const sessions = useLaunchStore((s) => s.sessions)
  const activeId = useLaunchStore((s) => s.activeId)
  const togglePause = useLaunchStore((s) => s.togglePause)
  const restart = useLaunchStore((s) => s.restart)
  const stop = useLaunchStore((s) => s.stop)
  const setActive = useLaunchStore((s) => s.setActive)
  const clearExited = useLaunchStore((s) => s.clearExited)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const t = useT()

  const barRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  // null = default placement (centred over the graph pane); set once dragged.
  const [custom, setCustom] = useState<{ x: number; y: number } | null>(() => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null')
      if (
        typeof v === 'object' &&
        v !== null &&
        Number.isFinite((v as { x: unknown }).x) &&
        Number.isFinite((v as { y: unknown }).y)
      ) {
        return { x: (v as { x: number }).x, y: (v as { y: number }).y }
      }
    } catch {
      // Corrupt entry — fall through to the default position.
    }
    return null
  })
  const [defaultPos, setDefaultPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  posRef.current = custom ?? defaultPos

  const hasSessions = sessions.some((x) => x.repoPath === repoPath)

  // The bar's CSS anchor is the window's top centre; keep it fully on screen.
  const clampToViewport = (p: { x: number; y: number }): { x: number; y: number } => {
    const bar = barRef.current
    if (!bar) return p
    const maxX = Math.max(0, (window.innerWidth - bar.offsetWidth) / 2 - EDGE_MARGIN)
    const minY = EDGE_MARGIN - BASE_TOP
    const maxY = Math.max(minY, window.innerHeight - bar.offsetHeight - BASE_TOP - EDGE_MARGIN)
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(minY, p.y))
    }
  }

  // Track the graph pane so the default placement follows it through sidebar
  // resizes and layout changes; a ResizeObserver fires on those because the
  // pane flexes with them.
  useLayoutEffect(() => {
    if (!hasSessions) return
    const pane = probeRef.current?.closest('.graph-pane')
    const measure = (): void => {
      if (!(pane instanceof HTMLElement)) return
      const r = pane.getBoundingClientRect()
      setDefaultPos({ x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top })
      // A custom position saved on a larger window could be stranded off-screen.
      setCustom((p) => (p ? clampToViewport(p) : p))
    }
    measure()
    const ro = pane instanceof HTMLElement ? new ResizeObserver(measure) : null
    if (pane instanceof HTMLElement) ro?.observe(pane)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSessions])

  const startDrag = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const start = posRef.current
    const move = (ev: PointerEvent): void => {
      setCustom(clampToViewport({ x: start.x + ev.clientX - startX, y: start.y + ev.clientY - startY }))
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const p = posRef.current
      localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) }))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }

  const resetDrag = (): void => {
    setCustom(null)
    localStorage.removeItem(POS_KEY)
  }

  const repoSessions = sessions.filter((x) => x.repoPath === repoPath)
  if (repoSessions.length === 0) return null

  // A compound member is labelled "Compound › member", mirroring VS Code.
  const nameOf = (s: (typeof repoSessions)[number]): string =>
    s.compound ? `${s.compound.compoundName} › ${s.configName}` : s.configName

  const active = repoSessions.find((x) => x.launchId === activeId) ?? repoSessions[repoSessions.length - 1]
  const paused = active.status === 'paused'
  const exited = active.status === 'exited'

  const openSwitcher = (e: React.MouseEvent): void => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(
      r.left,
      r.bottom,
      repoSessions
        .slice()
        .reverse()
        .map((s) => ({
          label: `${nameOf(s)}${s.status === 'exited' ? '  ·  exited' : s.status === 'paused' ? '  ·  paused' : ''}`,
          icon: <Play size={13} />,
          onClick: () => setActive(s.launchId)
        }))
    )
  }

  const pos = custom ?? defaultPos
  return (
    <>
      <span ref={probeRef} style={{ display: 'none' }} />
      {createPortal(
        <div
          ref={barRef}
          className="debug-toolbar"
          style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
        >
          <div
            className="debug-grip"
            title={t('launch.dragHint')}
            onPointerDown={startDrag}
            onDoubleClick={resetDrag}
          >
            <GripVertical size={14} />
          </div>
          <button className="debug-switcher" onClick={openSwitcher} title={t('launch.switchSession')}>
            <span className={`debug-dot ${active.status}`} />
            <span className="debug-name">{nameOf(active)}</span>
            <ChevronDown size={13} />
          </button>
          <span className="debug-sep" />
          <button
            className="icon-btn debug-btn"
            title={paused ? t('launch.resume') : t('launch.pause')}
            disabled={exited}
            onClick={() => togglePause(active.launchId)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button className="icon-btn debug-btn" title={t('launch.restart')} onClick={() => void restart(active.launchId)}>
            <RotateCcw size={14} />
          </button>
          {exited ? (
            <button className="icon-btn debug-btn danger" title={t('launch.close')} onClick={() => clearExited(active.launchId)}>
              <X size={14} />
            </button>
          ) : (
            <button
              className="icon-btn debug-btn danger"
              title={active.compound?.stopAll ? t('launch.stopAll') : t('launch.stop')}
              onClick={() => stop(active.launchId)}
            >
              <Square size={14} fill="currentColor" />
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
