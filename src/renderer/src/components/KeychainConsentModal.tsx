import { useEffect, useRef, useState } from 'react'
import { Check, KeyRound, Laptop, Lock, ShieldOff } from 'lucide-react'
import type { KeychainReason } from '../../../shared/types'
import { keychainApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'

/**
 * Shown *before* the OS keychain prompt, never after.
 *
 * macOS asks "Gitcito wants to use your confidential information stored in your
 * keychain" with no context, which reads like spyware. This window says which
 * values are being encrypted, what Gitcito cannot reach, and that declining
 * leaves the app perfectly usable.
 */
export function KeychainConsentModal({
  reason,
  adopted
}: {
  reason: KeychainReason
  /** Already using the keychain from before this dialog existed — this is the
   *  explanation they never got, not a fresh decision. */
  adopted?: boolean
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const load = useSettingsStore((s) => s.load)
  const [busy, setBusy] = useState(false)
  const answered = useRef(false)
  const t = useT()

  // Escape or a backdrop click closes this like any other dialog — but the main
  // process is blocked waiting for an answer, so dismissing counts as "not now"
  // rather than leaving the save that triggered it hanging forever.
  useEffect(() => {
    return () => {
      if (!answered.current) void keychainApi.answer(false)
    }
  }, [])

  const answer = async (granted: boolean): Promise<void> => {
    setBusy(true)
    answered.current = true
    await keychainApi.answer(granted)
    // Tokens that were held in memory land on disk once access is granted, so
    // re-read what the main process now considers the truth.
    await load()
    closeModal()
  }

  return (
    <div className="kc-root">
      <div className="kc-head">
        <span className="kc-icon">
          <KeyRound size={18} />
        </span>
        <div>
          <h3>{t('keychain.title')}</h3>
          <span className="kc-sub">
            {adopted ? t('keychain.reasonAdopted') : t(`keychain.reason.${reason}` as 'keychain.reason.tokens')}
          </span>
        </div>
      </div>

      <ul className="kc-points">
        <li>
          <Lock size={13} className="kc-point-icon ok" />
          <span>{t('keychain.pointStore')}</span>
        </li>
        <li>
          <ShieldOff size={13} className="kc-point-icon no" />
          <span>{t('keychain.pointNoAccess')}</span>
        </li>
        <li>
          <Laptop size={13} className="kc-point-icon ok" />
          <span>{t('keychain.pointLocal')}</span>
        </li>
        <li>
          <Check size={13} className="kc-point-icon ok" />
          <span>{t('keychain.pointOptional')}</span>
        </li>
      </ul>

      <p className="kc-next">{adopted ? t('keychain.whatHappensAdopted') : t('keychain.whatHappens')}</p>

      <div className="kc-actions">
        <button className="btn ghost" disabled={busy} onClick={() => void answer(false)}>
          {t('keychain.decline')}
        </button>
        <button className="btn primary" disabled={busy} onClick={() => void answer(true)}>
          <KeyRound size={13} /> {t('keychain.accept')}
        </button>
      </div>
    </div>
  )
}
