import { useEffect, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { keychainApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import type { KeychainConsent } from '../../../shared/types'

/**
 * Under a token field: say so when what is typed there will not survive a
 * restart. With the keychain declined, a token is held in memory only — by
 * design, rather than written in the clear — and the only place that said so
 * was the Security page, so a token simply "did not save". Turning the keychain
 * on from here also writes the token already typed (main/settings.ts,
 * persistSessionSecrets), so nothing has to be pasted again. The notice stays
 * up until that move has really happened, even with the keychain on.
 */
export function TokenKeychainNotice(): React.JSX.Element | null {
  const t = useT()
  const load = useSettingsStore((s) => s.load)
  const toast = useUIStore((s) => s.toast)
  const [status, setStatus] = useState<{
    consent: KeychainConsent
    available: boolean | null
    sessionOnly: boolean
  } | null>(null)
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
    } catch {
      // The tokens are still in memory; the refreshed status keeps the notice up.
      toast('error', t('keychain.enableFailed'))
    } finally {
      setEnabling(false)
      refresh()
    }
  }

  if (!status) return null
  const noKeyring = status.consent === 'granted' && status.available === false
  // Keychain on and usable, but an earlier move of the typed tokens failed.
  const notMoved = status.consent === 'granted' && status.available === true && status.sessionOnly
  if (status.consent !== 'declined' && !noKeyring && !notMoved) return null

  const message = noKeyring
    ? 'keychain.tokenNoKeyring'
    : notMoved
      ? 'keychain.tokenNotMoved'
      : 'keychain.tokenSessionOnly'
  return (
    <div className="token-keychain-notice" role="note">
      <KeyRound size={13} />
      <span>{t(message)}</span>
      {!noKeyring && (
        <button type="button" className="btn ghost small" disabled={enabling} onClick={() => void enable()}>
          {enabling && <Loader2 size={12} className="spin" />}
          {t(notMoved ? 'modal.retry' : 'keychain.enable')}
        </button>
      )}
    </div>
  )
}
