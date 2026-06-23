import { app, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { defaultSettings, type AppSettings, type RepoHost } from '../shared/types'

const settingsPath = (): string => join(app.getPath('userData'), 'gitcito-settings.json')

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    // Existing install without the key → treat as already onboarded.
    return { ...defaultSettings(), onboardingCompleted: true, ...parsed }
  } catch {
    return defaultSettings()
  }
}

const TOKEN_FIELD: Record<RepoHost, 'githubToken' | 'gitlabToken' | 'bitbucketToken' | 'azureToken'> = {
  github: 'githubToken',
  gitlab: 'gitlabToken',
  bitbucket: 'bitbucketToken',
  azure: 'azureToken'
}

/**
 * The active profile's personal access token for a given host, or undefined when
 * none is configured. Used by network git operations (push/pull/fetch) to
 * authenticate non-interactively, mirroring how clone resolves its token.
 */
export async function activeProfileToken(host: RepoHost): Promise<string | undefined> {
  const settings = await readSettings()
  const profile =
    settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0]
  const token = profile?.[TOKEN_FIELD[host]]
  return token && token.trim() ? token.trim() : undefined
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
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
