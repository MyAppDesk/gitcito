import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,

  git: (method: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke('git', method, ...args),

  selectDirectory: (title?: string): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory', title),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  shell: {
    showItemInFolder: (fullPath: string): Promise<void> => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
    openPath: (fullPath: string): Promise<string> => ipcRenderer.invoke('shell:openPath', fullPath),
    writeFiles: (repoPath: string, files: unknown): Promise<void> =>
      ipcRenderer.invoke('shell:writeFiles', repoPath, files)
  },

  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
    set: (settings: unknown): Promise<void> => ipcRenderer.invoke('settings:set', settings)
  },

  ai: {
    commitMessage: (diff: string, cfg: unknown, ctx: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:commitMessage', diff, cfg, ctx),
    listModels: (cfg: unknown): Promise<unknown> => ipcRenderer.invoke('ai:listModels', cfg),
    explainCode: (code: string, lang: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:explainCode', code, lang, cfg),
    resolveConflict: (file: string, content: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:resolveConflict', file, content, cfg),
    generateConfig: (repoName: string, artifacts: unknown, context: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:generateConfig', repoName, artifacts, context, cfg),
    suggestArtifacts: (repoName: string, selectedTools: unknown, context: string, alreadySelected: unknown, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:suggestArtifacts', repoName, selectedTools, context, alreadySelected, cfg),
    smartStage: (files: unknown, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:smartStage', files, cfg)
  },

  hosting: {
    listRepos: (provider: string, token: string, org?: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listRepos', provider, token, org),
    listOwners: (provider: string, token: string, org?: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listOwners', provider, token, org),
    createRepo: (provider: string, token: string, opts: unknown, org?: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:createRepo', provider, token, opts, org),
    listPRs: (remoteUrl: string, tokens: unknown): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listPRs', remoteUrl, tokens),
    openCreatePR: (remoteUrl: string, source: string, target: string): Promise<boolean> =>
      ipcRenderer.invoke('hosting:openCreatePR', remoteUrl, source, target)
  },

  term: {
    create: (cwd: string, cols: number, rows: number): Promise<number> =>
      ipcRenderer.invoke('term:create', cwd, cols, rows),
    input: (id: number, data: string): void => ipcRenderer.send('term:input', id, data),
    resize: (id: number, cols: number, rows: number): void => ipcRenderer.send('term:resize', id, cols, rows),
    kill: (id: number): void => ipcRenderer.send('term:kill', id),
    onData: (id: number, cb: (data: string) => void): (() => void) => {
      const listener = (_e: unknown, data: string): void => cb(data)
      ipcRenderer.on(`term:data:${id}`, listener)
      return () => ipcRenderer.removeListener(`term:data:${id}`, listener)
    },
    onExit: (id: number, cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(`term:exit:${id}`, listener)
      return () => ipcRenderer.removeListener(`term:exit:${id}`, listener)
    }
  },

  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },

  watch: {
    repo: (path: string | null): Promise<void> => ipcRenderer.invoke('watch:repo', path),
    onChange: (cb: (payload: { path: string; light: boolean }) => void): (() => void) => {
      const listener = (_e: unknown, payload: { path: string; light: boolean }): void => cb(payload)
      ipcRenderer.on('repo:changed', listener)
      return () => ipcRenderer.removeListener('repo:changed', listener)
    }
  }
}

export type PreloadApi = typeof api

contextBridge.exposeInMainWorld('api', api)
