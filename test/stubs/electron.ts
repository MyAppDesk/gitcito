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

export default { ipcMain, dialog }
