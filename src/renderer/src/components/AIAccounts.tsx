import React, { useEffect, useState } from 'react'
import { Bot, Check, List, Loader2, Plus, RefreshCw, Terminal, Trash2, TriangleAlert } from 'lucide-react'
import {
  AI_FEATURES,
  AI_PROVIDERS,
  aiProviderPreset,
  type AIAccount,
  type AICliBinary,
  type AIConfig,
  type AIFeature,
  type AIProvider,
  type DetectedCli,
  type ModelCatalog
} from '../../../shared/types'
import { accountLabel, accountNeedsKey, modelFor, newAccount } from '../../../shared/aiAccounts'
import { aiApi } from '../infrastructure/api'
import { useModelCatalogs } from './useModelCatalogs'
import { useUIStore } from '../stores/ui'
import { interp, useT, type TranslationKey } from '../i18n'

/**
 * The AI accounts editor.
 *
 * Gitcito held one provider, one key and one model. That made "use Claude for
 * chat and a cheap OpenAI model for commit messages" impossible, and it made
 * the model picker a list frozen at release time. An account is now a named
 * connection, several can coexist, and each AI surface points at one of them.
 *
 * Model lists come from the provider itself (`aiApi.listModels`), cached for a
 * day. Every model control is an `<input list>` over a datalist rather than a
 * `<select>`, so a model the provider has not listed — a preview, a private
 * deployment, a freshly pulled Ollama tag — is always typeable.
 */

const CLI_BINARIES: { id: AICliBinary; labelKey: TranslationKey }[] = [
  { id: 'claude', labelKey: 'settings.cliClaude' },
  { id: 'gemini', labelKey: 'settings.cliGemini' },
  { id: 'codex', labelKey: 'settings.cliCodex' }
]

const FEATURE_LABELS: Record<AIFeature, TranslationKey> = {
  commit: 'settings.featureCommit',
  chat: 'settings.featureChat',
  explain: 'settings.featureExplain',
  review: 'settings.featureReview',
  conflict: 'settings.featureConflict',
  wiki: 'settings.featureWiki',
  theme: 'settings.featureTheme'
}

/** Sentinel options: neither is a model, so both use a value no id can hold. */
const CUSTOM = '\u0000custom'
const SHOW_ALL = '\u0000all'

/**
 * A model picker: the provider's list, plus a way out of it.
 *
 * This was an `<input list>` over a datalist, which looked like a combo box and
 * behaved like an autocomplete — the browser filters the suggestions by what is
 * already typed, so an account sitting on `gpt-4o-mini` only ever offered the
 * four models whose names contain it. A `<select>` shows the whole list; the
 * "Custom…" entry keeps a model the provider never advertised typeable.
 */
function ModelSelect({
  value,
  placeholder,
  models,
  allModels,
  emptyLabel,
  onChange
}: {
  value: string
  placeholder: string
  models: string[]
  /** Everything the provider listed, revealed by the "show all" option. */
  allModels?: string[]
  /** Shown as the first option when an empty value is meaningful. */
  emptyLabel?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const t = useT()
  const [showAll, setShowAll] = useState(false)
  const full = allModels ?? models
  // A value that only exists in the full list expands it rather than looking
  // like the picker forgot what is selected.
  const shown = showAll || (value !== '' && !models.includes(value) && full.includes(value)) ? full : models
  const known = value === '' || shown.includes(value)
  const [custom, setCustom] = useState(!known)
  const hasMore = full.length > models.length

  if (custom) {
    return (
      <div className="model-custom">
        <input
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn ghost small"
          title={t('settings.useModelList')}
          onClick={() => {
            setCustom(false)
            // Dropping back to the list with an unlisted model selected would
            // silently show the wrong row, so the value goes back to empty.
            if (!full.includes(value)) onChange('')
          }}
        >
          <List size={13} />
        </button>
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          setCustom(true)
          return
        }
        if (e.target.value === SHOW_ALL) {
          setShowAll(true)
          return
        }
        onChange(e.target.value)
      }}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {shown.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
      {hasMore && !showAll && (
        <option value={SHOW_ALL}>
          {interp(t('settings.showAllModels'), { count: String(full.length - models.length) })}
        </option>
      )}
      <option value={CUSTOM}>{t('settings.customModel')}</option>
    </select>
  )
}

function CatalogNote({ catalog }: { catalog: ModelCatalog | undefined }): React.JSX.Element | null {
  const t = useT()
  if (!catalog) return null
  if (catalog.source === 'live') {
    return <span className="settings-hint">{interp(t('settings.modelsLive'), { count: String(catalog.models.length) })}</span>
  }
  if (catalog.source === 'cache') {
    const when = catalog.fetchedAt ? new Date(catalog.fetchedAt).toLocaleString() : ''
    return <span className="settings-hint">{interp(t('settings.modelsCached'), { when })}</span>
  }
  // The provider's own error body is deliberately not shown here: a raw 401
  // payload in a settings pane is noise. Refresh surfaces it as a toast, where
  // the user asked for it and can act on it.
  return (
    <span className="settings-hint warn">
      <TriangleAlert size={12} /> {t('settings.modelsFallback')}
    </span>
  )
}

function AccountCard({
  ai,
  account,
  catalog,
  loading,
  clis,
  onEdit,
  onDelete,
  onMakeDefault,
  onRefresh
}: {
  ai: AIConfig
  account: AIAccount
  catalog: ModelCatalog | undefined
  loading: boolean
  clis: DetectedCli[]
  onEdit: (next: AIAccount) => void
  onDelete: () => void
  onMakeDefault: () => void
  onRefresh: () => void
}): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const preset = aiProviderPreset(account.provider)
  const isDefault = ai.defaultAccountId === account.id
  const models = catalog?.models ?? preset.models
  const detected = clis.find((c) => c.binary === (account.cli ?? 'claude'))

  const setProvider = (id: AIProvider): void => {
    const next = aiProviderPreset(id)
    onEdit({
      ...account,
      provider: id,
      endpoint: next.endpoint,
      model: next.defaultModel,
      // A label the user never renamed should follow the provider rather than
      // leaving "OpenAI" sitting on an Anthropic account.
      label: account.label === preset.label ? next.label : account.label,
      ...(id === 'cli' ? { cli: account.cli ?? 'claude' } : {})
    })
  }

  return (
    <div className="ai-account">
      <div className="ai-account-head">
        <input
          className="ai-account-name"
          value={account.label}
          placeholder={preset.label}
          onChange={(e) => onEdit({ ...account, label: e.target.value })}
        />
        {isDefault ? (
          <span className="ai-account-badge">
            <Check size={12} /> {t('settings.defaultAccount')}
          </span>
        ) : (
          <button type="button" className="btn ghost small" onClick={onMakeDefault}>
            {t('settings.makeDefault')}
          </button>
        )}
        <button
          type="button"
          className="btn ghost small danger"
          title={t('settings.deleteAccount')}
          disabled={(ai.accounts ?? []).length < 2}
          onClick={() =>
            // Deleting an account drops its API key from the keychain with it,
            // and nothing here can put it back.
            openModal({
              kind: 'confirm',
              title: t('settings.deleteAccount'),
              message: interp(t('settings.deleteAccountConfirm'), { name: accountLabel(account) }),
              danger: true,
              confirmLabel: t('settings.deleteAccountAction'),
              onConfirm: onDelete
            })
          }
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="form-row two">
        <label>
          {t('settings.provider')}
          <select value={account.provider} onChange={(e) => setProvider(e.target.value as AIProvider)}>
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {account.provider === 'cli' ? (
          <label>
            {t('settings.cliBinary')}
            <select
              value={account.cli ?? 'claude'}
              onChange={(e) => onEdit({ ...account, cli: e.target.value as AICliBinary, model: '' })}
            >
              {CLI_BINARIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.labelKey)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            {preset.needsKey ? t('settings.apiKey') : t('settings.apiKeyOptional')}
            <input
              type="password"
              value={account.apiKey}
              placeholder={preset.needsKey ? 'sk-…' : t('settings.notRequired')}
              onChange={(e) => onEdit({ ...account, apiKey: e.target.value })}
            />
          </label>
        )}
      </div>

      {account.provider === 'cli' ? (
        <>
          <label>
            {t('settings.cliPath')}
            <input
              value={account.cliPath ?? ''}
              placeholder={detected?.path ?? account.cli ?? 'claude'}
              spellCheck={false}
              onChange={(e) => onEdit({ ...account, cliPath: e.target.value })}
            />
          </label>
          <span className={detected ? 'settings-hint' : 'settings-hint warn'}>
            {detected ? (
              <>
                <Terminal size={12} /> {interp(t('settings.cliFound'), { path: detected.path })}
              </>
            ) : (
              <>
                <TriangleAlert size={12} /> {t('settings.cliNotFound')}
              </>
            )}
          </span>
          <span className="settings-hint">{t('settings.cliPrivacyHint')}</span>
        </>
      ) : (
        preset.keyUrl && <span className="settings-hint">{interp(t('settings.getKey'), { url: preset.keyUrl })}</span>
      )}

      <label>
        {t('settings.model')}
        <div className="model-row">
          <ModelSelect
            value={account.model}
            placeholder={preset.defaultModel || 'model-name'}
            models={models}
            allModels={catalog?.allModels}
            onChange={(model) => onEdit({ ...account, model })}
          />
          <button
            type="button"
            className="btn ghost small"
            disabled={loading}
            title={t('settings.fetchModelsTitle')}
            onClick={onRefresh}
          >
            {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} {t('settings.fetchModels')}
          </button>
        </div>
      </label>
      <CatalogNote catalog={catalog} />

      {accountNeedsKey(account) && (
        <span className="settings-hint warn">
          <TriangleAlert size={12} /> {t('settings.accountNeedsKey')}
        </span>
      )}

      {account.provider === 'custom' && (
        <label>
          {t('settings.endpoint')}
          <input
            value={account.endpoint}
            placeholder="https://api.openai.com/v1"
            spellCheck={false}
            onChange={(e) => onEdit({ ...account, endpoint: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}

export function AIAccountsEditor({
  ai,
  onChange
}: {
  ai: AIConfig
  onChange: (next: AIConfig) => void
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const [clis, setClis] = useState<DetectedCli[]>([])
  const accounts = ai.accounts ?? []
  const { catalogs, loading, refresh } = useModelCatalogs(ai)
  // Only one account is edited at a time — a column of expanded cards turns
  // into a scroll the moment a second provider exists.
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = accounts.find((a) => a.id === editingId) ?? accounts.find((a) => a.id === ai.defaultAccountId) ?? accounts[0]

  const reload = async (accountId: string): Promise<void> => {
    const catalog = await refresh(accountId)
    if (catalog?.error) toast('info', catalog.error)
  }

  useEffect(() => {
    void aiApi.detectCli().then(setClis)
  }, [])

  const editAccount = (next: AIAccount): void => {
    onChange({ ...ai, accounts: accounts.map((a) => (a.id === next.id ? next : a)) })
  }

  const addAccount = (): void => {
    const account = newAccount(accounts, 'openai')
    // Adding one is only useful if it is also the one now on screen.
    setEditingId(account.id)
    onChange({ ...ai, accounts: [...accounts, account] })
  }

  const deleteAccount = (id: string): void => {
    const remaining = accounts.filter((a) => a.id !== id)
    if (remaining.length === 0) return
    // Assignments pointing at the removed account fall back to the default
    // rather than silently keeping a model that no longer has a connection.
    const assignments = { ...(ai.assignments ?? {}) }
    for (const feature of AI_FEATURES) {
      if (assignments[feature]?.accountId === id) delete assignments[feature]
    }
    onChange({
      ...ai,
      accounts: remaining,
      defaultAccountId: ai.defaultAccountId === id ? remaining[0].id : ai.defaultAccountId,
      assignments
    })
  }

  return (
    <>
      <h4>
        <Bot size={14} /> {t('settings.aiAccounts')}
      </h4>
      <span className="settings-hint">{t('settings.aiAccountsHint')}</span>

      <div className="ai-accounts-bar">
        {accounts.length > 1 && (
          <select
            value={editing?.id ?? ''}
            aria-label={t('settings.selectAccount')}
            onChange={(e) => setEditingId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id === ai.defaultAccountId
                  ? interp(t('settings.accountIsDefault'), { name: accountLabel(a) })
                  : accountLabel(a)}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="btn ghost small" onClick={addAccount}>
          <Plus size={13} /> {t('settings.addAccount')}
        </button>
      </div>

      {editing && (
        <AccountCard
          key={editing.id}
          ai={ai}
          account={editing}
          catalog={catalogs[editing.id]}
          loading={loading.includes(editing.id)}
          clis={clis}
          onEdit={editAccount}
          onDelete={() => {
            setEditingId(null)
            deleteAccount(editing.id)
          }}
          onMakeDefault={() => onChange({ ...ai, defaultAccountId: editing.id })}
          onRefresh={() => void reload(editing.id)}
        />
      )}

      <h4>{t('settings.featureModels')}</h4>
      <span className="settings-hint">{t('settings.featureModelsHint')}</span>
      <div className="ai-assignments">
        {AI_FEATURES.map((feature) => {
          const assignment = ai.assignments?.[feature]
          const accountId = assignment?.accountId ?? ''
          const resolvedId = accountId || ai.defaultAccountId
          const models = catalogs[resolvedId]?.models ?? aiProviderPreset(ai.provider).models
          return (
            <div className="ai-assignment" key={feature}>
              <span className="ai-assignment-label">{t(FEATURE_LABELS[feature])}</span>
              <select
                value={accountId}
                onChange={(e) => {
                  const next = { ...(ai.assignments ?? {}) }
                  if (!e.target.value) delete next[feature]
                  else next[feature] = { accountId: e.target.value, model: assignment?.model ?? '' }
                  onChange({ ...ai, assignments: next })
                }}
              >
                <option value="">{t('settings.useDefaultAccount')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </select>
              <ModelSelect
                value={assignment?.model ?? ''}
                placeholder={modelFor(ai, feature)}
                models={models}
                allModels={catalogs[resolvedId]?.allModels}
                emptyLabel={interp(t('settings.accountDefaultModel'), { model: modelFor(ai, feature) })}
                onChange={(model) => {
                  const next = { ...(ai.assignments ?? {}) }
                  if (!model && !accountId) delete next[feature]
                  else next[feature] = { accountId: resolvedId, model }
                  onChange({ ...ai, assignments: next })
                }}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
