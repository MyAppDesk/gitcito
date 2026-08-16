import React from 'react'
import { Bot } from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'

/**
 * The one-time notice shown after an install is migrated to AI accounts.
 *
 * The upgrade is lossless — the provider and key that were configured become
 * the first account and nothing stops working — but the AI settings page looks
 * different enough that finding the key field again would otherwise be a small
 * mystery. Dismissing it sets `aiAccountsNoticeSeen`, so it appears once.
 */
export function AIAccountsNotice(): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const update = useSettingsStore((s) => s.update)

  const dismiss = (): void => {
    update((s) => ({ ...s, aiAccountsNoticeSeen: true }))
    closeModal()
  }

  return (
    <div className="modal-body">
      <h3>
        <Bot size={16} /> {t('aiNotice.title')}
      </h3>
      <p>{t('aiNotice.body')}</p>
      <ul className="settings-hint">
        <li>{t('aiNotice.pointOne')}</li>
        <li>{t('aiNotice.pointTwo')}</li>
        <li>{t('aiNotice.pointThree')}</li>
      </ul>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={dismiss}>
          {t('aiNotice.dismiss')}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            update((s) => ({ ...s, aiAccountsNoticeSeen: true }))
            openModal({ kind: 'settings', page: 'ai' })
          }}
        >
          {t('aiNotice.open')}
        </button>
      </div>
    </div>
  )
}
