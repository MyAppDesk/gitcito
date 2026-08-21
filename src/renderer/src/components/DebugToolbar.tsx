import { useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Square, ChevronDown, X, GripVertical } from 'lucide-react'
import { useLaunchStore } from '../stores/launch'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'

const OFFSET_KEY = 'gitcito.debugToolbarX'

/**
 * VS Code-style floating debug bar. Shown whenever the active repo has at least
 * one launch session. Controls the active session (pause/resume, restart, stop)
 * and switches between sessions via a dropdown. Draggable horizontally by its
 * grip so it can be moved off whatever it happens to cover.
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
  const offsetRef = useRef(0)
  const [offset, setOffset] = useState<number>(() => {
    const v = Number(localStorage.getItem(OFFSET_KEY))
    return Number.isFinite(v) ? v : 0
  })
  offsetRef.current = offset

  const startDrag = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    const bar = barRef.current
    if (!bar) return
    // Clamp so the bar never leaves its pane; the bar is centred, so the
    // allowed offset is symmetric around zero.
    const pane = bar.offsetParent as HTMLElement | null
    const max = pane ? Math.max(0, (pane.clientWidth - bar.offsetWidth) / 2 - 6) : Number.MAX_SAFE_INTEGER
    const startX = e.clientX
    const startOffset = offsetRef.current
    const move = (ev: PointerEvent): void => {
      setOffset(Math.min(max, Math.max(-max, startOffset + ev.clientX - startX)))
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      localStorage.setItem(OFFSET_KEY, String(Math.round(offsetRef.current)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }

  const resetDrag = (): void => {
    setOffset(0)
    localStorage.removeItem(OFFSET_KEY)
  }

  const repoSessions = sessions.filter((x) => x.repoPath === repoPath)
  if (repoSessions.length === 0) return null

  // A compound member is labelled "Compound › member", mirroring VS Code.
  const nameOf = (s: (typeof repoSessions)[number]): string =>
    s.compound ? `${s.compound.compoundName} › ${s.configName}` : s.configName

  const active = repoSessions.find((x) => x.launchId === activeId) ?? repoSessions[repoSessions.length - 1]
  const running = active.status === 'running'
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

  return (
    <div
      ref={barRef}
      className="debug-toolbar"
      style={{ transform: `translateX(calc(-50% + ${offset}px))` }}
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
      {running && <span className="debug-status-pill">{t('launch.running')}</span>}
      {paused && <span className="debug-status-pill paused">{t('launch.paused')}</span>}
      {exited && <span className="debug-status-pill exited">{t('launch.exited')}</span>}
    </div>
  )
}
