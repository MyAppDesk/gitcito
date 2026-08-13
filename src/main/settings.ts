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

const settingsPath = (): string => join(app.getPath('userData'), 'gitcito-settings.json')
const secretsPath = (): string => join(app.getPath('userData'), 'gitcito-secrets.enc')

// Profile tokens and the AI API key used to sit in the settings JSON in plain
// text. They now live in a separate file encrypted with the OS keychain, the
// same mechanism the vault uses. Reads hydrate them back onto the profiles, so
// nothing downstream — renderer, export, git auth — sees a difference.
// Where the OS offers no encryption (a Linux box with no keyring), settings
// keep working exactly as before rather than losing the user's credentials.

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
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

  if (!canEncrypt()) return settings

  const stored = await loadSecrets()
  if (hasSettingsSecrets(settings)) {
    // Upgrade from a plaintext settings file: the values on disk win, since
    // they are what the user last saved. Rewrite the JSON without them.
    const ids = (settings.profiles ?? []).map((p) => p.id)
    const merged = pruneSecrets({ ...stored, ...extractSecrets(settings) }, ids)
    await saveSecrets(merged)
    await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
    return applySecrets(settings, merged)
  }
  return applySecrets(settings, stored)
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
  const settings = await readSettings()
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
  if (!canEncrypt()) {
    await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
    return
  }
  // Secrets first: if the keychain write fails, the JSON on disk still holds the
  // previous values instead of being stripped with nowhere to read them from.
  // Clearing a token in the UI removes it here too; so does deleting a profile.
  await saveSecrets(extractSecrets(settings))
  await writeFile(settingsPath(), JSON.stringify(stripSettingsSecrets(settings), null, 2), 'utf-8')
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:set', (_e, settings: AppSettings) => writeSettings(settings))

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
