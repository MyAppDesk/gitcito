import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// A token typed while the keychain is off lives in memory only. Turning the
// keychain on used to change nothing until another setting was saved, so
// quitting first lost the token again. Real handlers, a fake keyring.
const dir = mkdtempSync(join(tmpdir(), 'gitcito-keychain-'))
const handlers = new Map<string, (...args: unknown[]) => unknown>()
const keyring = { broken: false }

vi.mock('electron', () => ({
  app: { getPath: () => dir, isPackaged: false },
  ipcMain: { handle: (channel: string, fn: (...args: unknown[]) => unknown) => handlers.set(channel, fn), on: () => undefined },
  dialog: {},
  shell: {},
  BrowserWindow: { getFocusedWindow: () => null, getAllWindows: () => [] },
  // Reversible and obviously fake: enough to see what reaches the file.
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => {
      if (keyring.broken) throw new Error('keyring refused the write')
      return Buffer.from(`enc:${s}`)
    },
    decryptString: (b: Buffer) => b.toString().replace(/^enc:/, '')
  }
}))

const call = (channel: string, ...args: unknown[]): Promise<unknown> =>
  Promise.resolve(handlers.get(channel)!({}, ...args))

describe('turning the keychain on', () => {
  beforeAll(async () => {
    writeFileSync(join(dir, 'gitcito-keychain.json'), JSON.stringify({ consent: 'declined', explained: true }))
    const { registerSettingsHandlers } = await import('../src/main/settings')
    const { registerKeychainHandlers } = await import('../src/main/keychain')
    registerSettingsHandlers()
    registerKeychainHandlers()
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('keeps a token typed while it was off in memory only, never in the clear', async () => {
    const settings = (await call('settings:get')) as { profiles: Array<Record<string, unknown>> }
    settings.profiles[0].azureToken = 'TYPED-WHILE-OFF'
    await call('settings:set', settings)

    expect(existsSync(join(dir, 'gitcito-secrets.enc'))).toBe(false)
    expect(readFileSync(join(dir, 'gitcito-settings.json'), 'utf8')).not.toContain('TYPED-WHILE-OFF')
    const reread = (await call('settings:get')) as { profiles: Array<Record<string, unknown>> }
    expect(reread.profiles[0].azureToken).toBe('TYPED-WHILE-OFF')
  })

  it('fails the call, and keeps saying so, when the token cannot be moved', async () => {
    keyring.broken = true
    try {
      await expect(call('keychain:set', true)).rejects.toThrow('keyring refused the write')
    } finally {
      keyring.broken = false
    }

    expect(existsSync(join(dir, 'gitcito-secrets.enc'))).toBe(false)
    expect(await call('keychain:status')).toMatchObject({ consent: 'granted', sessionOnly: true })
    const reread = (await call('settings:get')) as { profiles: Array<Record<string, unknown>> }
    expect(reread.profiles[0].azureToken).toBe('TYPED-WHILE-OFF')
  })

  it('writes that token to the encrypted store as soon as it is turned on', async () => {
    expect(await call('keychain:set', true)).toBe(true)
    expect(await call('keychain:status')).toMatchObject({ sessionOnly: false })

    const file = join(dir, 'gitcito-secrets.enc')
    expect(existsSync(file)).toBe(true)
    const stored = Buffer.from(readFileSync(file, 'utf8'), 'base64').toString().replace(/^enc:/, '')
    expect(stored).toContain('TYPED-WHILE-OFF')
    expect(readFileSync(join(dir, 'gitcito-settings.json'), 'utf8')).not.toContain('TYPED-WHILE-OFF')
  })
})
