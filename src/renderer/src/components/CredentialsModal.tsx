import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions } from '../stores/repo'
import type { CredentialStatus } from '../../../shared/types'
import { useT, interp } from '../i18n'

/**
 * Git's own credential store — the third one, and the one nobody configures.
 *
 * Gitcito keeps tokens in the OS keychain and can hold your SSH keys, but
 * `git push` over https asks *git*, and git asks whatever `credential.helper`
 * names. When that is unset you are typing a password every time; when it is
 * `store` your password is sitting in a plain file. Both are invisible until
 * someone looks, which is what this dialog is for.
 *
 * Nothing here reads a credential. `git credential fill` would print one to
 * stdout, so it is never called — only config is read, and forgetting goes
 * through `git credential reject`.
 */
export function CredentialsModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const [status, setStatus] = useState<CredentialStatus | null>(null)
  const [scope, setScope] = useState<'global' | 'repo'>('global')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setStatus(await gitApi.credentialStatus(repoPath).catch(() => null))
  }, [repoPath])

  useEffect(() => {
    void load()
  }, [load])

  const effective = status?.helpers.filter((h) => h.scope === scope).map((h) => h.value) ?? []

  const apply = (value: string): void => {
    setBusy(true)
    void repoActions
      .setCredentialHelper(repoPath, value, scope, effective[0] ?? '')
      .then(() => load())
      .finally(() => setBusy(false))
  }

  const forget = (host: string): void =>
    openModal({
      kind: 'confirm',
      danger: true,
      title: t('creds.forgetTitle'),
      message: interp(t('creds.forgetMessage'), { host }),
      confirmLabel: t('creds.forget'),
      onConfirm: () => {
        setBusy(true)
        void repoActions
          .forgetCredential(repoPath, host)
          .then(() => load())
          .finally(() => setBusy(false))
      }
    })

  return (
    <div className="creds-modal">
      <h3>
        <KeyRound size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('creds.title')}
      </h3>
      <p className="settings-hint">{t('creds.intro')}</p>

      {!status ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : (
        <>
          <div className="creds-current">
            {status.helpers.length === 0 ? (
              <p className="creds-warn">
                <AlertTriangle size={12} /> {t('creds.none')}
              </p>
            ) : (
              status.helpers.map((helper) => (
                <div key={`${helper.scope}:${helper.value}`} className="creds-row">
                  <span className="creds-scope">{helper.scope}</span>
                  <code className="creds-value">{helper.value}</code>
                  {helper.plaintext && (
                    <span className="creds-flag danger">
                      <AlertTriangle size={11} /> {t('creds.plaintext')}
                    </span>
                  )}
                  {!helper.available && (
                    <span className="creds-flag">
                      <AlertTriangle size={11} /> {t('creds.missing')}
                    </span>
                  )}
                  {helper.available && !helper.plaintext && (
                    <span className="creds-flag ok">
                      <ShieldCheck size={11} /> {t('creds.ok')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {status.urlRules.length > 0 && (
            <div className="creds-section">
              <div className="creds-section-head">{t('creds.perUrl')}</div>
              <p className="settings-hint">{t('creds.perUrlHint')}</p>
              {status.urlRules.map((rule) => (
                <div key={`${rule.scope}:${rule.url}`} className="creds-row">
                  <span className="creds-scope">{rule.scope}</span>
                  <code className="creds-value">{rule.url}</code>
                  <code className="creds-rule">
                    {[rule.helper && `helper=${rule.helper}`, rule.username && `username=${rule.username}`]
                      .filter(Boolean)
                      .join(' ')}
                  </code>
                </div>
              ))}
            </div>
          )}

          <div className="creds-section">
            <div className="creds-section-head">{t('creds.changeTitle')}</div>
            <div className="creds-scope-pick">
              <label className="export-radio">
                <input type="radio" checked={scope === 'global'} onChange={() => setScope('global')} />
                <span>{t('creds.scopeGlobal')}</span>
              </label>
              <label className="export-radio">
                <input type="radio" checked={scope === 'repo'} onChange={() => setScope('repo')} />
                <span>{t('creds.scopeRepo')}</span>
              </label>
            </div>
            <div className="creds-candidates">
              {status.candidates.map((candidate) => (
                <button
                  key={candidate.name}
                  className={`btn ${effective.includes(candidate.name) ? 'primary' : 'ghost'} small`}
                  disabled={busy || !candidate.available}
                  title={
                    candidate.available
                      ? candidate.name === 'store'
                        ? t('creds.storeWarning')
                        : undefined
                      : t('creds.missing')
                  }
                  onClick={() => apply(candidate.name)}
                >
                  {busy ? <Loader2 size={12} className="spin" /> : null} {candidate.name}
                  {candidate.recommended ? ` · ${t('creds.recommended')}` : ''}
                </button>
              ))}
              <button className="btn ghost small" disabled={busy || !effective.length} onClick={() => apply('')}>
                {t('creds.clear')}
              </button>
            </div>
          </div>

          {status.plaintextFile.exists && (
            <p className="creds-warn">
              <AlertTriangle size={12} />{' '}
              {interp(t('creds.plaintextFile'), {
                path: status.plaintextFile.path,
                n: String(status.plaintextFile.entries)
              })}
            </p>
          )}

          {status.httpsHosts.length > 0 && (
            <div className="creds-section">
              <div className="creds-section-head">{t('creds.forgetHeading')}</div>
              <p className="settings-hint">{t('creds.forgetHint')}</p>
              {status.httpsHosts.map((host) => (
                <div key={host} className="creds-row">
                  <code className="creds-value">{host}</code>
                  <button className="btn ghost small" disabled={busy} onClick={() => forget(host)}>
                    <Trash2 size={12} /> {t('creds.forget')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
