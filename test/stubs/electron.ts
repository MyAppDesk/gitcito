// Minimal electron stub so src/main/git.ts can be imported in a plain Node
// (vitest) environment. git.ts does `import { ipcMain } from 'electron'` at the
// top level; the gitService methods never touch ipcMain — only
// registerGitHandlers() does, which the tests don't call.
export const ipcMain = {
  handle(): void {}
}

export default { ipcMain }
