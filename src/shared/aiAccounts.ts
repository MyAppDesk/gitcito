import {
  AI_FEATURES,
  aiProviderPreset,
  defaultAIConfig,
  type AIAccount,
  type AIConfig,
  type AIFeature,
  type AIProvider
} from './types'

/**
 * Accounts, migration and resolution — pure, so both processes and the test
 * suite can use them.
 *
 * Gitcito used to hold exactly one provider, one endpoint and one key per
 * profile. That is now the first entry of `ai.accounts`, and the old fields are
 * kept on `AIConfig` as the *resolved* connection for a single call. Every
 * main-process feature reads those same four fields, so accounts stayed out of
 * the IPC contract entirely.
 */

/** The endpoint an account actually talks to, falling back to its preset. */
export function accountEndpoint(account: AIAccount): string {
  const own = (account.endpoint ?? '').trim()
  return own || aiProviderPreset(account.provider).endpoint
}

/** What to show in a picker. Never empty, so a row is never a blank line. */
export function accountLabel(account: AIAccount): string {
  const own = (account.label ?? '').trim()
  return own || aiProviderPreset(account.provider).label
}

/** A stable id that does not collide with an existing one. */
export function nextAccountId(existing: AIAccount[], provider: AIProvider): string {
  const taken = new Set(existing.map((a) => a.id))
  for (let n = 1; ; n++) {
    const id = n === 1 ? provider : `${provider}-${n}`
    if (!taken.has(id)) return id
  }
}

export function newAccount(existing: AIAccount[], provider: AIProvider): AIAccount {
  const preset = aiProviderPreset(provider)
  return {
    id: nextAccountId(existing, provider),
    label: preset.label,
    provider,
    endpoint: preset.endpoint,
    apiKey: '',
    model: preset.defaultModel,
    ...(provider === 'cli' ? { cli: 'claude' as const } : {})
  }
}

/** True when the account cannot make a call until the user supplies something. */
export function accountNeedsKey(account: AIAccount): boolean {
  return aiProviderPreset(account.provider).needsKey && !(account.apiKey ?? '').trim()
}

export function findAccount(ai: AIConfig, accountId: string | undefined): AIAccount | undefined {
  if (!accountId) return undefined
  return (ai.accounts ?? []).find((a) => a.id === accountId)
}

/** The account a feature uses, falling back to the default and then to the first. */
export function accountFor(ai: AIConfig, feature?: AIFeature): AIAccount | undefined {
  const assigned = feature ? ai.assignments?.[feature]?.accountId : undefined
  return findAccount(ai, assigned) ?? findAccount(ai, ai.defaultAccountId) ?? (ai.accounts ?? [])[0]
}

/** The model a feature uses: its own override, else the account's default. */
export function modelFor(ai: AIConfig, feature?: AIFeature): string {
  const account = accountFor(ai, feature)
  const assignment = feature ? ai.assignments?.[feature] : undefined
  // An assignment only supplies the model when it names the account we resolved
  // to — otherwise a leftover model from a deleted account would win.
  if (assignment && account && assignment.accountId === account.id) {
    const own = (assignment.model ?? '').trim()
    if (own) return own
  }
  return (account?.model ?? '').trim() || aiProviderPreset(account?.provider ?? 'custom').defaultModel
}

/**
 * Flattens an account into the connection fields the main process reads.
 *
 * Call this at every renderer site that used to pass `activeProfile().ai`
 * straight through — the shape is unchanged, the connection is just the one the
 * user picked for that feature rather than the only one that existed.
 */
export function resolveAI(ai: AIConfig, feature?: AIFeature): AIConfig {
  const account = accountFor(ai, feature)
  if (!account) return ai
  const preset = aiProviderPreset(account.provider)
  return {
    ...ai,
    provider: account.provider,
    endpoint: accountEndpoint(account),
    apiKey: account.apiKey ?? '',
    model: modelFor(ai, feature),
    accountId: account.id,
    transport: preset.transport,
    cli: account.cli,
    cliPath: account.cliPath
  }
}

/**
 * Brings a stored config forward to the account model. Idempotent: a config
 * that already has accounts is only repaired, never rebuilt, so this is safe to
 * run on every settings read.
 *
 * The migration is deliberately lossless — the single provider/endpoint/key
 * becomes one account, and `repoChatModel` becomes the chat assignment — so a
 * user who never opens Settings keeps exactly the behaviour they had.
 */
export function migrateAIConfig(input: Partial<AIConfig> | undefined): AIConfig {
  const base = defaultAIConfig()
  const ai: AIConfig = { ...base, ...(input ?? {}) }

  // Read from `input`, never from the merged value: the defaults carry a
  // starter account, so merging first would make every pre-accounts config look
  // migrated and silently drop the key it already had.
  const stored = input?.accounts
  const accounts = Array.isArray(stored) ? stored.filter((a) => a && typeof a.id === 'string') : []
  /** True only for a config written before accounts existed. */
  const preAccounts = accounts.length === 0

  if (preAccounts) {
    // Pre-accounts install: fold the one connection it had into an account. A
    // blank provider means it never got that far, so the default stands.
    //
    // Endpoint and model come from `input`, not the merged value: taking them
    // from the defaults would hand, say, an Anthropic config OpenAI's endpoint.
    const provider = (input?.provider ?? 'openai') as AIProvider
    const preset = aiProviderPreset(provider)
    accounts.push({
      id: 'default',
      label: preset.label,
      provider,
      endpoint: (input?.endpoint ?? '').trim(),
      apiKey: input?.apiKey ?? '',
      model: (input?.model ?? '').trim() || preset.defaultModel
    })
  }

  const ids = new Set(accounts.map((a) => a.id))
  const defaultAccountId = ids.has(ai.defaultAccountId) ? ai.defaultAccountId : accounts[0].id

  // Drop assignments pointing at accounts that no longer exist rather than
  // letting a feature silently fall back with a stale model attached.
  const assignments: Partial<Record<AIFeature, AIAssignmentLike>> = {}
  for (const feature of AI_FEATURES) {
    const existing = ai.assignments?.[feature]
    if (existing && ids.has(existing.accountId)) assignments[feature] = existing
  }

  // The old chat-only model override becomes a chat assignment on whichever
  // account the migration just created. Only on a pre-accounts config: once
  // accounts exist, a dropped assignment means the user deleted that account,
  // and reviving it from a leftover field would undo their change.
  const legacyChatModel = preAccounts ? (ai.repoChatModel ?? '').trim() : ''
  if (legacyChatModel && !assignments.chat) {
    assignments.chat = { accountId: defaultAccountId, model: legacyChatModel }
  }

  const migrated: AIConfig = {
    ...ai,
    accounts,
    defaultAccountId,
    assignments: assignments as AIConfig['assignments'],
    // Cleared once folded into the chat assignment: leaving it set would let
    // the old value win over the account the user has since chosen.
    repoChatModel: ''
  }
  return resolveAI(migrated)
}

type AIAssignmentLike = { accountId: string; model: string }

/** True when the stored config predates accounts and the user should be told. */
export function needsAccountsNotice(input: Partial<AIConfig> | undefined): boolean {
  if (!input) return false
  const hadConnection = !!(input.apiKey ?? '').trim() || !!(input.provider && input.provider !== 'openai')
  return hadConnection && !(Array.isArray(input.accounts) && input.accounts.length > 0)
}
