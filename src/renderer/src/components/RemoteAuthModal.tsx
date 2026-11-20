import { useCallback, useEffect, useState } from 'react'
import { KeyRound, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import type { RemoteAuthCheck } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { remoteAuthFindings, remoteAuthSourceKey, remoteAuthStatus } from '../lib/remoteAuth'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useT, interp } from '../i18n'

const ICONS = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }

/**
 * "Which account will this push use, and can it?" for every remote of a
 * repository. Read-only: it resolves the credential exactly as a push would
 * and asks the host about it — no sign-in window, nothing written.
 */
export function RemoteAuthModal({ spec }: { spec: Extract<ModalSpec, { kind: 'remoteAuth' }> }): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const [checks, setChecks] = useState<RemoteAuthCheck[] | null>(null)
  const [busy, setBusy] = useState(false)

  const runChecks = useCallback(async () => {
    setBusy(true)
    try {
      const all = await gitApi.remoteAuthChecks(spec.path)
      // The remote the menu was opened on goes first.
      setChecks(spec.remote ? [...all].sort((a, b) => Number(b.remote === spec.remote) - Number(a.remote === spec.remote)) : all)
    } catch {
      setChecks([])
    } finally {
      setBusy(false)
    }
  }, [spec.path, spec.remote])

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  return (
    <>
      <h3 className="modal-title-row">
        <KeyRound size={17} /> {t('remoteAuth.title')}
      </h3>
      <p className="modal-message">{t('remoteAuth.intro')}</p>
      <div className="remote-auth-list">
        {checks === null ? (
          <p className="settings-hint">
            <Loader2 size={12} className="spin" /> {t('remoteAuth.checking')}
          </p>
        ) : checks.length === 0 ? (
          <p className="settings-hint">{t('remoteAuth.empty')}</p>
        ) : (
          checks.map((c, i) => <RemoteAuthCard key={JSON.stringify([c.remote, c.url, i])} check={c} />)
        )}
      </div>
      <div className="modal-actions">
        <button className="btn ghost" type="button" disabled={busy} onClick={() => void runChecks()}>
          {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} {t('remoteAuth.recheck')}
        </button>
        <button className="btn primary" type="button" onClick={closeModal}>
          {t('common.close')}
        </button>
      </div>
    </>
  )
}

function RemoteAuthCard({ check }: { check: RemoteAuthCheck }): React.JSX.Element {
  const t = useT()
  const status = remoteAuthStatus(check)
  const Icon = ICONS[status]
  const profile = check.profile ?? ''
  return (
    <section className={`remote-auth-card is-${status}`}>
      <header className="remote-auth-head">
        <Icon size={15} className="rc-doctor-icon" />
        <strong>{check.remote}</strong>
        <code className="remote-auth-url">{check.url}</code>
      </header>
      <p className="remote-auth-line">{interp(t(remoteAuthSourceKey(check)), { profile })}</p>
      {check.profile && (
        <p className="remote-auth-line remote-auth-muted">
          {interp(t(check.bound ? 'remoteAuth.boundNote' : 'remoteAuth.activeNote'), { profile })}
        </p>
      )}
      {check.login && <p className="remote-auth-line">{interp(t('remoteAuth.account'), { login: check.login })}</p>}
      {check.scopes && (
        <p className="remote-auth-line remote-auth-muted">
          {interp(t('remoteAuth.scopes'), { scopes: check.scopes.join(', ') || '—' })}
        </p>
      )}
      <ul className="remote-auth-findings">
        {remoteAuthFindings(check).map((f) => {
          const FIcon = ICONS[f.status]
          return (
            <li key={f.key} className={`rc-doctor-row is-${f.status}`}>
              <FIcon size={13} className="rc-doctor-icon" />
              <span className="rc-doctor-detail">{interp(t(f.key), f.vars ?? {})}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
