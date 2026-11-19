import { useEffect, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { keychainApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'
import type { KeychainConsent } from '../../../shared/types'

/**
 * Under a token field: say so when what is typed there will not survive a
 * restart. With the keychain declined, a token is held in memory only — by
 * design, rather than written in the clear — and the only place that said so
 * was the Security page, so a token simply "did not save". Turning the keychain
 * on from here also writes the token already typed (main/settings.ts,
 * persistSessionSecrets), so nothing has to be pasted again.
 */
export function TokenKeychainNotice(): React.JSX.Element | null {
  const t = useT()
  const load = useSettingsStore((s) => s.load)
  const [status, setStatus] = useState<{ consent: KeychainConsent; available: boolean | null } | null>(null)
  const [enabling, setEnabling] = useState(false)

  const refresh = (): void => {
    void keychainApi
      .status()
      .then(setStatus)
      .catch(() => setStatus(null))
  }
  useEffect(refresh, [])

  const enable = async (): Promise<void> => {
    setEnabling(true)
    try {
      await keychainApi.set(true)
      // Same as Settings → Security: re-read with the store unlocked.
      await load({ unlock: true })
    } finally {
      setEnabling(false)
      refresh()
    }
  }

  if (!status) return null
  const noKeyring = status.consent === 'granted' && status.available === false
  if (status.consent !== 'declined' && !noKeyring) return null

  return (
    <div className="token-keychain-notice" role="note">
      <KeyRound size={13} />
      <span>{t(noKeyring ? 'keychain.tokenNoKeyring' : 'keychain.tokenSessionOnly')}</span>
      {!noKeyring && (
        <button type="button" className="btn ghost small" disabled={enabling} onClick={() => void enable()}>
          {enabling && <Loader2 size={12} className="spin" />}
          {t('keychain.enable')}
        </button>
      )}
    </div>
  )
}
