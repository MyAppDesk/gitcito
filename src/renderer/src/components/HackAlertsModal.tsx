import { AlertTriangle, FileWarning, KeyRound, Radar, Sparkles, Trash2 } from 'lucide-react'
import { useHackStore, type HackAlert } from '../stores/hack'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'

function icon(kind: HackAlert['kind']): React.JSX.Element {
  if (kind === 'contract') return <FileWarning size={13} />
  if (kind === 'semantic') return <Sparkles size={13} />
  if (kind === 'wip') return <KeyRound size={13} />
  if (kind === 'freeze') return <AlertTriangle size={13} />
  return <Radar size={13} />
}

function ago(at: number): string {
  const m = Math.round((Date.now() - at) / 60_000)
  return m < 1 ? '·' : `${m}m`
}

/**
 * Everything the session has caught, newest first.
 *
 * A log rather than a stream of dialogs: during an event the useful question is
 * "what have I not looked at yet", and interrupting six times to ask it is how
 * a warning system gets ignored.
 */
export function HackAlertsModal(): React.JSX.Element {
  const t = useT()
  const alerts = useHackStore((s) => s.alerts)
  const dismiss = useHackStore((s) => s.dismissAlert)
  const clear = useHackStore((s) => s.clearAlerts)
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div className="hack-alerts">
      <div className="hack-modal-head">
        <AlertTriangle size={15} />
        <h3>{t('hack.alertsTitle')}</h3>
        {alerts.length > 0 && (
          <button className="btn ghost small" onClick={clear}>
            <Trash2 size={12} /> {t('hack.clearAlerts')}
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="settings-hint">{t('hack.noAlerts')}</p>
      ) : (
        <div className="hack-alert-list">
          {alerts.map((a) => (
            <div key={a.id} className={`hack-alert hack-alert--${a.kind}`}>
              <span className="hack-alert-icon">{icon(a.kind)}</span>
              <div className="hack-alert-body">
                <span className="hack-alert-msg">{a.message}</span>
                {a.files.length > 0 && (
                  <span className="settings-hint">{a.files.slice(0, 6).join(', ')}</span>
                )}
              </div>
              <span className="hack-alert-age">{ago(a.at)}</span>
              <button
                className="btn ghost small"
                onClick={() => openModal({ kind: 'teammate-radar', repoPath: a.repoPath })}
              >
                {t('hack.openRadar')}
              </button>
              <button className="btn ghost small" onClick={() => dismiss(a.id)}>
                {t('common.dismiss')}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="settings-hint">{interp(t('hack.alertsFoot'), { n: String(alerts.length) })}</p>
    </div>
  )
}
