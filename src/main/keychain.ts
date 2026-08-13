import { BrowserWindow, ipcMain, safeStorage, app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

/**
 * Consent gate in front of the OS keychain.
 *
 * Electron's safeStorage asks the OS for an encryption key, and on macOS that
 * pops the alarming "Gitcito wants to use your confidential information stored
 * in your keychain" dialog — with no explanation of what for. Every keychain
 * touch therefore goes through here: nothing reaches safeStorage until the user
 * has seen our own window saying what is stored, what is not, and that none of
 * it leaves the machine.
 *
 * The answer lives in its own tiny file rather than in the settings JSON, so
 * reading it can never depend on the very code path it is meant to gate.
 */
import type { KeychainConsent, KeychainReason } from '../shared/types'

export type { KeychainConsent, KeychainReason }

const consentPath = (): string => join(app.getPath('userData'), 'gitcito-keychain.json')

interface ConsentFile {
  consent: KeychainConsent
  /** Whether the user has actually seen our explanation (see adoptExistingConsent). */
  explained: boolean
}

let cached: ConsentFile | null = null
let asking: Promise<boolean> | null = null
let answer: ((granted: boolean) => void) | null = null

async function readFileState(): Promise<ConsentFile> {
  if (cached) return cached
  try {
    const parsed = JSON.parse(await readFile(consentPath(), 'utf-8')) as Partial<ConsentFile>
    const consent = parsed.consent === 'granted' || parsed.consent === 'declined' ? parsed.consent : 'unset'
    cached = { consent, explained: parsed.explained === true }
  } catch {
    cached = { consent: 'unset', explained: false }
  }
  return cached
}

async function writeFileState(next: ConsentFile): Promise<void> {
  cached = next
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(consentPath(), JSON.stringify(next, null, 2), 'utf-8')
}

export async function getConsent(): Promise<KeychainConsent> {
  return (await readFileState()).consent
}

export async function setConsent(value: KeychainConsent): Promise<void> {
  await writeFileState({ consent: value, explained: true })
}

/**
 * Someone who already has encrypted data on disk answered the OS prompt long
 * before this gate existed — re-asking them would look like a regression and
 * would hide their tokens until they clicked again. Adopt that as consent.
 */
export async function adoptExistingConsent(paths: string[]): Promise<void> {
  const state = await readFileState()
  if (state.consent !== 'unset') return
  // `explained: false` — they keep their access, but still get the explanation
  // once, before the system dialog can appear out of nowhere.
  if (paths.some((p) => existsSync(p))) await writeFileState({ consent: 'granted', explained: false })
}

/** True when the keychain may be used right now, without asking anything. */
export async function canUseKeychain(): Promise<boolean> {
  if ((await getConsent()) !== 'granted') return false
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

/**
 * Ask the renderer to show the explainer, once, and wait for the answer.
 * Concurrent callers share the same dialog. With no window to ask in (headless
 * runs, tests) the answer is "no" — never a silent keychain prompt.
 */
function askUser(reason: KeychainReason, adopted: boolean): Promise<boolean> {
  if (asking) return asking
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win || win.isDestroyed()) return Promise.resolve(false)

  asking = new Promise<boolean>((resolve) => {
    answer = resolve
    win.webContents.send('keychain:ask', { reason, adopted })
    // If the window goes away mid-question, don't leave callers hanging.
    win.once('closed', () => answer?.(false))
  }).then(async (granted) => {
    await setConsent(granted ? 'granted' : 'declined')
    asking = null
    answer = null
    return granted
  })
  return asking
}

/**
 * Gate for any operation that needs the keychain. Returns false when the user
 * says no — callers must degrade (keep secrets in memory, leave the vault
 * locked) rather than write anything sensitive to disk in the clear.
 */
export async function ensureKeychain(reason: KeychainReason): Promise<boolean> {
  const { consent, explained } = await readFileState()
  if (consent === 'declined') return false
  // Granted but never explained: an install that predates this gate. Show the
  // explanation before the OS dialog, so it can still be turned down.
  if (consent === 'granted' && explained) return canUseKeychain()
  if (!(await askUser(reason, consent === 'granted'))) return false
  // First real safeStorage call — the OS prompt now arrives right after our own
  // explanation, which is the whole point.
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function registerKeychainHandlers(): void {
  ipcMain.handle('keychain:answer', (_e, granted: boolean) => {
    answer?.(!!granted)
  })
  ipcMain.handle('keychain:status', async () => {
    const { consent, explained } = await readFileState()
    return { consent, explained, available: consent === 'granted' ? await canUseKeychain() : null }
  })
  // Settings → Security: turn it on or off after the fact.
  ipcMain.handle('keychain:set', async (_e, granted: boolean) => {
    if (!granted) {
      await setConsent('declined')
      return false
    }
    // Turning it on from Settings → Security is itself an informed choice, so
    // it counts as explained: no dialog on the next keychain use.
    await setConsent('granted')
    return canUseKeychain()
  })
}
