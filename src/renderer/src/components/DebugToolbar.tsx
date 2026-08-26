import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  ChevronDown,
  X,
  GripVertical,
  Zap,
  RefreshCw,
  ListRestart,
  ListX,
  Camera,
  LayoutList,
  Bug,
  Globe,
  Eraser,
  Paintbrush,
  Gauge,
  Smartphone,
  Wrench,
  Link,
  Cloud,
  Ellipsis
} from 'lucide-react'
import { useLaunchStore } from '../stores/launch'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'
import {
  detectHotRuntime,
  primaryActions,
  overflowActions,
  type HotAction,
  type HotIcon
} from '../lib/launchActions'

const POS_KEY = 'gitcito.debugToolbarPos'
// Must match the CSS `top` of .debug-toolbar — offsets are relative to it.
const BASE_TOP = 10
const EDGE_MARGIN = 6

/** One glyph per hot-action kind — the toolbar's only vocabulary for them. */
function hotIcon(icon: HotIcon, size = 14): React.JSX.Element {
  switch (icon) {
    case 'restart':
      return <RefreshCw size={size} />
    case 'rerun':
      return <ListRestart size={size} />
    case 'failed':
      return <ListX size={size} />
    case 'snapshot':
      return <Camera size={size} />
    case 'menu':
      return <LayoutList size={size} />
    case 'debugger':
      return <Bug size={size} />
    case 'browser':
      return <Globe size={size} />
    case 'clear':
      return <Eraser size={size} />
    case 'paint':
      return <Paintbrush size={size} />
    case 'perf':
      return <Gauge size={size} />
    case 'platform':
      return <Smartphone size={size} />
    case 'devtools':
      return <Wrench size={size} />
    case 'urls':
      return <Link size={size} />
    case 'cloud':
      return <Cloud size={size} />
    default:
      return <Zap size={size} />
  }
}

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
  const hot = useLaunchStore((s) => s.hot)
  const groupsByRepo = useLaunchStore((s) => s.groupsByRepo)
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
  // The keystroke goes out silently and the process answers in its terminal —
  // the pressed button lights up briefly so the toolbar confirms it itself.
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)
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

  const sendHot = (launchId: number, action: HotAction): void => {
    hot(launchId, action.send)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    setFlash(action.id)
    flashTimer.current = window.setTimeout(() => setFlash(null), 450)
  }

  const repoSessions = sessions.filter((x) => x.repoPath === repoPath)
  if (repoSessions.length === 0) return null

  // A compound member is labelled "Compound › member", mirroring VS Code.
  const nameOf = (s: (typeof repoSessions)[number]): string =>
    s.compound ? `${s.compound.compoundName} › ${s.configName}` : s.configName

  const active = repoSessions.find((x) => x.launchId === activeId) ?? repoSessions[repoSessions.length - 1]
  const paused = active.status === 'paused'
  const exited = active.status === 'exited'

  // Hot actions — the keys this runtime already listens for. A hot reload beats
  // a restart: it keeps the app's state and skips every preLaunchTask.
  const scripts = (groupsByRepo[repoPath] ?? []).find((g) => g.dir === active.dir)?.scripts ?? {}
  const runtime = detectHotRuntime(active.config, scripts)
  const hotPrimary = runtime ? primaryActions(runtime) : []
  const hotMore = runtime ? overflowActions(runtime) : []
  const hotLabel = (a: HotAction): string => a.label ?? (a.labelKey ? t(a.labelKey) : a.id)
  const hotTitle = (a: HotAction): string =>
    interp(t('launch.hotTitle'), { runtime: runtime?.name ?? '', label: hotLabel(a), key: a.keyHint })

  const openHotMenu = (e: React.MouseEvent): void => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(
      r.left,
      r.bottom,
      hotMore.map((a) => ({
        label: `${hotLabel(a)}   ${a.keyHint}`,
        icon: hotIcon(a.icon, 13),
        onClick: () => sendHot(active.launchId, a)
      }))
    )
  }

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
          {runtime && hotPrimary.length > 0 && (
            <>
              <span className="debug-sep" />
              {hotPrimary.map((a) => (
                <button
                  key={a.id}
                  className={`icon-btn debug-btn hot${flash === a.id ? ' flashed' : ''}`}
                  title={hotTitle(a)}
                  disabled={exited || paused}
                  onClick={() => sendHot(active.launchId, a)}
                >
                  {hotIcon(a.icon)}
                </button>
              ))}
              {hotMore.length > 0 && (
                <button
                  className="icon-btn debug-btn hot"
                  title={t('launch.hotMore')}
                  disabled={exited || paused}
                  onClick={openHotMenu}
                >
                  <Ellipsis size={14} />
                </button>
              )}
            </>
          )}
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
