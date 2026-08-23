import type { AppSettings } from './types'

/**
 * The credentials a profile can hold. They are kept out of the settings JSON on
 * disk (see main/settings.ts, which stores them with the OS keychain instead)
 * and out of exported settings files unless the user opts in.
 */
export interface ProfileSecrets {
  githubToken?: string
  azureToken?: string
  gitlabToken?: string
  bitbucketToken?: string
  /** Legacy single AI key, written before accounts existed. Still read. */
  aiApiKey?: string
  /** One API key per AI account id. */
  aiKeys?: Record<string, string>
}

/** Secrets for every profile that has any, keyed by profile id. */
export type SecretStore = Record<string, ProfileSecrets>

/** Profile fields holding a host access token. */
export const TOKEN_FIELDS = ['githubToken', 'azureToken', 'gitlabToken', 'bitbucketToken'] as const

export function hasSettingsSecrets(settings: AppSettings | null | undefined): boolean {
  return (settings?.profiles ?? []).some(
    (p) =>
      TOKEN_FIELDS.some((f) => !!p[f]) ||
      !!p.ai?.apiKey ||
      (p.ai?.accounts ?? []).some((a) => !!a.apiKey)
  )
}

/** The same settings with every credential blanked out. */
export function stripSettingsSecrets(settings: AppSettings): AppSettings {
  return {
    ...settings,
    profiles: (settings.profiles ?? []).map((p) => ({
      ...p,
      githubToken: '',
      azureToken: '',
      gitlabToken: '',
      bitbucketToken: '',
      ai: p.ai
        ? {
            ...p.ai,
            apiKey: '',
            accounts: (p.ai.accounts ?? []).map((a) => ({ ...a, apiKey: '' }))
          }
        : p.ai
    }))
  }
}

/** Pulls every non-empty credential out, keyed by profile id. */
export function extractSecrets(settings: AppSettings): SecretStore {
  const store: SecretStore = {}
  for (const p of settings.profiles ?? []) {
    const secrets: ProfileSecrets = {}
    for (const field of TOKEN_FIELDS) {
      const value = p[field]
      if (value) secrets[field] = value
    }
    const aiKeys: Record<string, string> = {}
    for (const account of p.ai?.accounts ?? []) {
      if (account.apiKey) aiKeys[account.id] = account.apiKey
    }
    if (Object.keys(aiKeys).length > 0) secrets.aiKeys = aiKeys
    // Only written when the config predates accounts; migration folds it into
    // `aiKeys` the first time the settings are saved afterwards.
    else if (p.ai?.apiKey) secrets.aiApiKey = p.ai.apiKey
    if (Object.keys(secrets).length > 0) store[p.id] = secrets
  }
  return store
}

/** Puts stored credentials back on their profiles, leaving the rest untouched. */
export function applySecrets(settings: AppSettings, store: SecretStore): AppSettings {
  return {
    ...settings,
    profiles: (settings.profiles ?? []).map((p) => {
      const secrets = store[p.id]
      if (!secrets) return p
      const restored = { ...p }
      for (const field of TOKEN_FIELDS) {
        if (secrets[field]) restored[field] = secrets[field] as string
      }
      if (!restored.ai) return restored

      const accounts = restored.ai.accounts ?? []
      if (accounts.length > 0) {
        const keys = secrets.aiKeys ?? {}
        // A pre-accounts key belongs to the account the migration built from it.
        const legacyOwner = restored.ai.defaultAccountId || accounts[0].id
        restored.ai = {
          ...restored.ai,
          accounts: accounts.map((a) => {
            const key = keys[a.id] ?? (a.id === legacyOwner ? secrets.aiApiKey : undefined)
            return key ? { ...a, apiKey: key } : a
          })
        }
      }

      // Keep the resolved field in step so a config used before migration still
      // authenticates.
      const resolvedKey =
        secrets.aiKeys?.[restored.ai.accountId ?? restored.ai.defaultAccountId ?? ''] ??
        secrets.aiKeys?.[accounts[0]?.id ?? ''] ??
        secrets.aiApiKey
      if (resolvedKey) restored.ai = { ...restored.ai, apiKey: resolvedKey }
      return restored
    })
  }
}

/**
 * Overlays `next` onto `stored` without dropping credentials `next` never had.
 * Used for saves coming from a renderer that was hydrated before the store was
 * unlocked: such a save can add or replace a credential, but an absence in it
 * means "I was never given this", not "the user cleared it".
 */
export function mergeSecretStores(stored: SecretStore, next: SecretStore): SecretStore {
  const out: SecretStore = { ...stored }
  for (const [id, secrets] of Object.entries(next)) {
    const base = out[id] ?? {}
    const aiKeys = { ...(base.aiKeys ?? {}), ...(secrets.aiKeys ?? {}) }
    out[id] = {
      ...base,
      ...secrets,
      ...(Object.keys(aiKeys).length > 0 ? { aiKeys } : {})
    }
  }
  return out
}

/** Drops entries for profiles that no longer exist. */
export function pruneSecrets(store: SecretStore, profileIds: string[]): SecretStore {
  const keep = new Set(profileIds)
  const out: SecretStore = {}
  for (const [id, secrets] of Object.entries(store)) {
    if (keep.has(id)) out[id] = secrets
  }
  return out
}
