import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { SubscriptionCli, SubscriptionTest } from '../../../shared/types'
import { aiApi, shellApi } from '../infrastructure/api'
import { interp, useT, type TranslationKey } from '../i18n'

const PLANS = {
  codex: { label: 'ChatGPT (Codex)', login: 'codex login', guide: 'https://developers.openai.com/codex/cli/' }, // i18n-ignore product names
  claude: { label: 'Claude (Claude Code)', login: 'claude auth login', guide: 'https://code.claude.com/docs/en/quickstart' } // i18n-ignore product names
}

const STATUS: Record<SubscriptionTest, TranslationKey> = {
  connected: 'settings.connected',
  missing: 'settings.cliNotFound',
  login: 'settings.planLogin',
  limit: 'settings.planLimit',
  failed: 'settings.planFailed'
}

export function SubscriptionSetup({ onConnect }: {
  onConnect: (binary: SubscriptionCli, label: string, path: string) => void
}): React.JSX.Element {
  const t = useT()
  const [binary, setBinary] = useState<SubscriptionCli>('codex')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<SubscriptionTest>()
  const request = useRef<string | null>(null)
  const plan = PLANS[binary]

  useEffect(() => () => {
    if (request.current) void aiApi.cancelSubscriptionSignIn(request.current).catch(() => undefined)
    request.current = null
  }, [])

  const connect = async (signIn: boolean): Promise<void> => {
    const id = crypto.randomUUID()
    request.current = id
    setBusy(true)
    setStatus(undefined)
    try {
      if (signIn) {
        const result = await aiApi.signInSubscription(binary, path, id)
        if (request.current !== id) return
        if (result !== 'connected') {
          setStatus(result)
          return
        }
      }
      const result = await aiApi.testSubscription(binary, path)
      if (request.current === id) setStatus(result)
    } catch {
      if (request.current === id) setStatus('failed')
    } finally {
      if (request.current === id) {
        request.current = null
        setBusy(false)
      }
    }
  }

  const cancel = (): void => {
    if (request.current) void aiApi.cancelSubscriptionSignIn(request.current).catch(() => undefined)
    request.current = null
    setBusy(false)
    setStatus(undefined)
  }

  return (
    <div className="ai-account subscription-setup" role="group" aria-label={t('settings.usePlan')}>
      <label>
        {t('settings.provider')}
        <select value={binary} disabled={busy} onChange={(event) => {
          setBinary(event.target.value as SubscriptionCli)
          setStatus(undefined)
          setPath('')
        }}>
          {Object.entries(PLANS).map(([id, entry]) => <option key={id} value={id}>{entry.label}</option>)}
        </select>
      </label>
      <span className="settings-hint">{interp(t('settings.planLogin'), { command: plan.login })}</span>
      <button type="button" className="btn ghost small" onClick={() => void shellApi.openExternal(plan.guide)}>
        {t('infoField.docs')}
      </button>
      <label>
        {t('settings.cliPath')}
        <input value={path} disabled={busy} spellCheck={false}
          placeholder={binary}
          onChange={(event) => { setPath(event.target.value); setStatus(undefined) }} />
      </label>
      <span className="settings-hint">{t('settings.planTestHint')}</span>
      <div className="ai-accounts-bar">
        <button type="button" disabled={busy} className="btn primary small" onClick={() => void connect(true)}>
          {interp(t('modal.connect'), { service: plan.label })}
        </button>
        {busy && <button type="button" className="btn ghost small" onClick={cancel}>
          {t('common.cancel')}
        </button>}
        <button type="button" disabled={busy} className="btn ghost small" onClick={() => void connect(false)}>
          {busy && <Loader2 size={13} className="spin" />} {t('ssh.test')}
        </button>
        {status === 'connected' && (
          <button type="button" className="btn primary small" onClick={() => onConnect(binary, plan.label, path.trim())}>
            {t('settings.addAccount')}
          </button>
        )}
      </div>
      {status && <span role="status" className={status === 'connected' ? 'settings-hint' : 'settings-hint warn'}>
        {interp(t(STATUS[status]), { command: plan.login })}
      </span>}
    </div>
  )
}
