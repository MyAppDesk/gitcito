import { Play, Pause, RotateCcw, Square, ChevronDown, X } from 'lucide-react'
import { useLaunchStore } from '../stores/launch'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'

/**
 * VS Code-style floating debug bar. Shown whenever the active repo has at least
 * one launch session. Controls the active session (pause/resume, restart, stop)
 * and switches between sessions via a dropdown.
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

  const repoSessions = sessions.filter((x) => x.repoPath === repoPath)
  if (repoSessions.length === 0) return null

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
          label: `${s.configName}${s.status === 'exited' ? '  ·  exited' : s.status === 'paused' ? '  ·  paused' : ''}`,
          icon: <Play size={13} />,
          onClick: () => setActive(s.launchId)
        }))
    )
  }

  return (
    <div className="debug-toolbar">
      <button className="debug-switcher" onClick={openSwitcher} title={t('launch.switchSession')}>
        <span className={`debug-dot ${active.status}`} />
        <span className="debug-name">{active.configName}</span>
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
        <button className="icon-btn debug-btn danger" title={t('launch.stop')} onClick={() => stop(active.launchId)}>
          <Square size={14} fill="currentColor" />
        </button>
      )}
      {running && <span className="debug-status-pill">{t('launch.running')}</span>}
      {paused && <span className="debug-status-pill paused">{t('launch.paused')}</span>}
      {exited && <span className="debug-status-pill exited">{t('launch.exited')}</span>}
    </div>
  )
}
