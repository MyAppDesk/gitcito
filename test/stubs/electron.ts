import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

// Minimal electron stub so src/main/git.ts can be imported in a plain Node
// (vitest) environment. git.ts does `import { ipcMain } from 'electron'` at the
// top level; the gitService methods never touch ipcMain — only
// registerGitHandlers() does, which the tests don't call.
export const ipcMain = {
  handle(): void {}
}

// secureShare.ts imports dialog at the top level; its testable functions
// (candidate walk, bundle apply) never open a dialog.
export const dialog = {
  showOpenDialog: (): Promise<never> => Promise.reject(new Error('dialog stubbed')),
  showSaveDialog: (): Promise<never> => Promise.reject(new Error('dialog stubbed'))
}

// git.ts uses shell.trashItem for its recoverable deletes (fsDelete, and the
// "Replace" branch of a tree drop). There is no Trash in a test run, so the stub
// removes the path outright — the assertions only care that it is gone.
export const shell = {
  trashItem: async (target: string): Promise<void> => {
    await rm(target, { recursive: true, force: true })
  }
}

// semantic.ts asks `app.isPackaged` to find resources/tree-sitter; under test
// the repo checkout is the app root, so "not packaged" is the right answer.
export const app = {
  isPackaged: false,
  getPath: (): string => tmpdir()
}

// keychain.ts (imported via settings.ts) reaches for these at call time only.
// Under test there is no window to ask and no keyring to use, so the consent
// gate resolves to "no keychain" — exactly the degraded path we want covered.
export const BrowserWindow = {
  getFocusedWindow: (): null => null,
  getAllWindows: (): never[] => []
}

export const safeStorage = {
  isEncryptionAvailable: (): boolean => false,
  encryptString: (): never => {
    throw new Error('safeStorage stubbed')
  },
  decryptString: (): never => {
    throw new Error('safeStorage stubbed')
  }
}

export default { ipcMain, dialog, shell, app, BrowserWindow, safeStorage }
