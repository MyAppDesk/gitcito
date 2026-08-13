import { app, ipcMain, dialog, safeStorage } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { defaultSettings, type AppSettings, type RepoHost } from '../shared/types'
import {
  applySecrets,
  extractSecrets,
  hasSettingsSecrets,
  pruneSecrets,
  stripSettingsSecrets,
  type SecretStore
} from '../shared/secrets'
import { adoptExistingConsent, canUseKeychain, ensureKeychain } from './keychain'

const settingsPath = (): string => join(app.getPath('userData'), 'gitcito-settings.json')
const secretsPath = (): string => join(app.getPath('userData'), 'gitcito-secrets.enc')

// Profile tokens and the AI API key used to sit in the settings JSON in plain
// text. They now live in a separate file encrypted with the OS keychain, the
// same mechanism the vault uses. Reads hydrate them back onto the profiles, so
// nothing downstream — renderer, export, git auth — sees a difference.
// Where the OS offers no encryption (a Linux box with no keyring), settings
// keep working exactly as before rather than losing the user's credentials.

/**
 * Tokens the user typed while the keychain was unavailable or refused. They
 * stay in this process only: the app keeps working for the session, and the
 * settings file on disk never gains a plaintext token behind the user's back.
 */
let sessionSecrets: SecretStore = {}

/**
 * Decrypted secrets for this run, or null while they are still on disk.
 *
 * Nothing hydrates them at start-up: reading the encrypted file means calling
 * safeStorage, and on macOS that pops the system keychain dialog before the
 * window has even painted — exactly the unexplained prompt this whole gate
 * exists to prevent. They are decrypted on the first operation that genuinely
 * needs a token (a push, a PR listing, opening Settings) instead.
 */
let secretCache: SecretStore | null = null

async function canEncrypt(): Promise<boolean> {
  // Never triggers an OS prompt: it only reports a consent already given.
  return canUseKeychain()
}

async function loadSecrets(): Promise<SecretStore> {
  try {
    const b64 = await readFile(secretsPath(), 'utf-8')
    return JSON.parse(safeStorage.decryptString(Buffer.from(b64, 'base64'))) as SecretStore
  } catch {
    return {} // missing, corrupt, or the keychain entry changed
  }
}

async function saveSecrets(store: SecretStore): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const enc = safeStorage.encryptString(JSON.stringify(store))
  await writeFile(secretsPath(), enc.toString('base64'), 'utf-8')
}

/** The settings JSON, with whatever secrets are already in memory applied. */
async function readSettings(): Promise<AppSettings> {
  let settings: AppSettings
  try {
    const raw = await readFile(settingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    // Existing install without the key → treat as already onboarded.
    settings = { ...defaultSettings(), onboardingCompleted: true, ...parsed }
  } catch {
    return defaultSettings()
  }
  return applySecrets(settings, { ...(secretCache ?? {}), ...sessionSecrets })
}

/**
 * Same, but decrypts the stored secrets first — asking for keychain access if
 * that has not been settled yet. Only call this from something the user just
 * did (opening Settings, a network git operation), never from start-up.
 */
async function readSettingsWithSecrets(reason: 'tokens' | 'settings' = 'tokens'): Promise<AppSettings> {
  const settings = await readSettings()
  if (secretCache) return settings

  // An install that already has an encrypted secrets file predates the consent
  // gate — its owner answered the OS prompt long ago, so they are not asked to
  // decide again, only shown the explanation once.
  await adoptExistingConsent([secretsPath()])
  if (!(await ensureKeychain(reason))) return settings

  const stored = await loadSecrets()
  if (hasSettingsSecrets(settings)) {
    // Upgrade from a plaintext settings file: the values on disk win, since
    // they are what the user last saved. Rewrite the JSON without them.
    const ids = (settings.profiles ?? []).map((p) => p.id)
    const merged = pruneSecrets({ ...stored, ...extractSecrets(settings) }, ids)
    await saveSecrets(merged)
    await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
    secretCache = merged
    return applySecrets(settings, merged)
  }
  secretCache = stored
  return applySecrets(settings, { ...stored, ...sessionSecrets })
}

const TOKEN_FIELD: Record<RepoHost, 'githubToken' | 'gitlabToken' | 'bitbucketToken' | 'azureToken'> = {
  github: 'githubToken',
  gitlab: 'gitlabToken',
  bitbucket: 'bitbucketToken',
  azure: 'azureToken'
}

/**
 * The personal access token for a given host, or undefined when none is
 * configured. Used by network git operations (push/pull/fetch) to authenticate
 * non-interactively, mirroring how clone resolves its token.
 *
 * A repository explicitly bound to a profile uses that profile's token, even
 * when a different one is active — otherwise a background fetch on one repo
 * would authenticate as whichever repo the user happens to be looking at.
 */
export async function activeProfileToken(host: RepoHost, repoPath?: string): Promise<string | undefined> {
  const settings = await readSettingsWithSecrets('tokens')
  const boundId = repoPath ? settings.repoProfiles?.[repoPath] : undefined
  const profile =
    (boundId ? settings.profiles.find((p) => p.id === boundId) : undefined) ??
    settings.profiles.find((p) => p.id === settings.activeProfileId) ??
    settings.profiles[0]
  const token = profile?.[TOKEN_FIELD[host]]
  return token && token.trim() ? token.trim() : undefined
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const secrets = extractSecrets(settings)
  const hasSecrets = Object.keys(secrets).length > 0

  // Saving anything else while the secrets are still encrypted on disk must not
  // wipe them: the caller simply never had them to send back.
  if (!hasSecrets && !secretCache) {
    await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
    return
  }

  // Saving a token is the moment worth asking about — and only then. A settings
  // write with nothing sensitive in it never goes near the keychain.
  const allowed = hasSecrets ? await ensureKeychain('tokens') : await canEncrypt()

  if (!allowed) {
    // Refused (or no keyring): hold the secrets in memory for this session and
    // keep them out of the file, rather than writing them in the clear.
    if (hasSecrets) sessionSecrets = secrets
    await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
    return
  }
  // Secrets first: if the keychain write fails, the JSON on disk still holds the
  // previous values instead of being stripped with nowhere to read them from.
  // Clearing a token in the UI removes it here too; so does deleting a profile.
  await saveSecrets(secrets)
  secretCache = secrets
  sessionSecrets = {}
  await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:set', (_e, settings: AppSettings) => writeSettings(settings))
  // Called when the user opens Settings: that is an explicit "show me my
  // credentials", so it is a fair moment to decrypt (and to ask, if needed).
  ipcMain.handle('settings:unlock', () => readSettingsWithSecrets('settings'))

  ipcMain.handle('settings:importFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return null
    try {
      const raw = await readFile(filePaths[0], 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  ipcMain.handle('settings:exportFile', async (_e, data: unknown) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Settings',
      defaultPath: 'gitcito-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return false
    try {
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  })
}
