import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Copy, Stethoscope } from 'lucide-react'
import type { EnvCheck } from '../../../shared/types'
import { envApi } from '../infrastructure/api'
import { envCheckDetailKey, envCheckNameKey } from '../lib/environmentCheck'
import { useUIStore } from '../stores/ui'
import { useT, interp, t as tNow } from '../i18n'

const ICONS = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }

/**
 * Settings → Environment. The machine-wide half of the doctor: git, LFS, the
 * native terminal, git's credential helper, the GitHub CLI's scopes and (on
 * Linux) the inotify limit. Read-only — a repair is a command to copy.
 */
export function EnvironmentPage(): React.JSX.Element {
  const t = useT()
  const [checks, setChecks] = useState<EnvCheck[] | null>(null)
  const [busy, setBusy] = useState(false)

  const runChecks = useCallback(async () => {
    setBusy(true)
    // The local rows show as soon as they are in; the GitHub CLI row goes to the
    // network and joins them when it answers.
    const network = envApi.checkNetwork().catch((): EnvCheck[] => [])
    try {
      setChecks(await envApi.check())
    } catch {
      setChecks([])
    }
    const extra = await network
    setChecks((cur) => [...(cur ?? []).filter((c) => !extra.some((e) => e.id === c.id)), ...extra])
    setBusy(false)
  }, [])

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  return (
    <div className="settings-general">
      <div className="settings-general-header">
        <h4>
          <Stethoscope size={14} /> {t('settings.environment')}
        </h4>
        <p className="settings-hint">{t('env.intro')}</p>
      </div>
      <div className="env-check-list">
        {checks === null ? (
          <p className="settings-hint">
            <Loader2 size={12} className="spin" /> {t('env.checking')}
          </p>
        ) : (
          checks.map((c) => <EnvCheckRow key={c.id} check={c} />)
        )}
      </div>
      <button className="btn ghost small" disabled={busy} onClick={() => void runChecks()}>
        {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} {t('env.recheck')}
      </button>
    </div>
  )
}

function EnvCheckRow({ check }: { check: EnvCheck }): React.JSX.Element {
  const t = useT()
  const Icon = ICONS[check.status]
  const copyFix = (fix: string): void => {
    void navigator.clipboard.writeText(fix)
    useUIStore.getState().toast('success', tNow('env.fixCopied'))
  }
  return (
    <div className={`rc-doctor-row env-check-row is-${check.status}`}>
      <Icon size={14} className="rc-doctor-icon" />
      <span className="rc-doctor-name">{t(envCheckNameKey(check.id))}</span>
      <span className="rc-doctor-detail">
        {interp(t(envCheckDetailKey(check)), { actual: check.actual ?? '' })}
        {check.fix && (
          <span className="env-check-fix">
            <code>{check.fix}</code>
            <button className="btn ghost small" title={t('env.copyFix')} onClick={() => copyFix(check.fix as string)}>
              <Copy size={12} />
            </button>
          </span>
        )}
      </span>
    </div>
  )
}
