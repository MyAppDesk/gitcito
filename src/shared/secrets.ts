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
  aiApiKey?: string
}

/** Secrets for every profile that has any, keyed by profile id. */
export type SecretStore = Record<string, ProfileSecrets>

/** Profile fields holding a host access token. */
export const TOKEN_FIELDS = ['githubToken', 'azureToken', 'gitlabToken', 'bitbucketToken'] as const

export function hasSettingsSecrets(settings: AppSettings | null | undefined): boolean {
  return (settings?.profiles ?? []).some(
    (p) => TOKEN_FIELDS.some((f) => !!p[f]) || !!p.ai?.apiKey
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
      ai: p.ai ? { ...p.ai, apiKey: '' } : p.ai
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
    if (p.ai?.apiKey) secrets.aiApiKey = p.ai.apiKey
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
      if (secrets.aiApiKey && restored.ai) restored.ai = { ...restored.ai, apiKey: secrets.aiApiKey }
      return restored
    })
  }
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
