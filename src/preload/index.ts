import { contextBridge, ipcRenderer, webFrame } from 'electron'

const api = {
  platform: process.platform,

  // True when launched with `--shot` (forwarded by the main process via
  // webPreferences.additionalArguments). Gates the screenshot-automation bridge.
  shotMode: process.argv.includes('--shot'),

  git: (method: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke('git', method, ...args),

  selectDirectory: (title?: string): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory', title),
  savePatch: (defaultName: string, content: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:savePatch', defaultName, content),
  openPatch: (): Promise<{ path: string; content: string } | null> => ipcRenderer.invoke('dialog:openPatch'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  appReleases: (): Promise<unknown> => ipcRenderer.invoke('app:releases'),

  shell: {
    showItemInFolder: (fullPath: string): Promise<void> => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
    openPath: (fullPath: string): Promise<string> => ipcRenderer.invoke('shell:openPath', fullPath),
    writeFiles: (repoPath: string, files: unknown): Promise<void> =>
      ipcRenderer.invoke('shell:writeFiles', repoPath, files)
  },

  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
    set: (settings: unknown): Promise<void> => ipcRenderer.invoke('settings:set', settings),
    importFile: (): Promise<unknown> => ipcRenderer.invoke('settings:importFile'),
    exportFile: (settings: unknown): Promise<boolean> => ipcRenderer.invoke('settings:exportFile', settings)
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
      ipcRenderer.invoke('ai:smartStage', files, cfg),
    generateAppTheme: (prompt: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:generateAppTheme', prompt, cfg),
    generateCodeTheme: (prompt: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:generateCodeTheme', prompt, cfg),
    generateBranchName: (description: string, cfg: unknown, ctx: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:generateBranchName', description, cfg, ctx),
    reviewPR: (diff: string, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:reviewPR', diff, cfg),
    planActions: (prompt: string, status: unknown, cfg: unknown): Promise<unknown> =>
      ipcRenderer.invoke('ai:planActions', prompt, status, cfg)
  },

  analytics: {
    get: (): Promise<unknown> => ipcRenderer.invoke('analytics:get'),
    clear: (): Promise<unknown> => ipcRenderer.invoke('analytics:clear'),
    setRetention: (days: number): Promise<unknown> => ipcRenderer.invoke('analytics:setRetention', days)
  },

  log: {
    get: (): Promise<unknown> => ipcRenderer.invoke('log:get'),
    clear: (): Promise<unknown> => ipcRenderer.invoke('log:clear')
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
    listReleases: (remoteUrl: string, tokens: unknown): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listReleases', remoteUrl, tokens),
    ciStatuses: (remoteUrl: string, shas: string[], token: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:ciStatuses', remoteUrl, shas, token),
    openCreatePR: (remoteUrl: string, source: string, target: string): Promise<boolean> =>
      ipcRenderer.invoke('hosting:openCreatePR', remoteUrl, source, target),
    createPR: (remoteUrl: string, tokens: unknown, opts: unknown): Promise<unknown> =>
      ipcRenderer.invoke('hosting:createPR', remoteUrl, tokens, opts),
    prDetail: (remoteUrl: string, tokens: unknown, number: number): Promise<unknown> =>
      ipcRenderer.invoke('hosting:prDetail', remoteUrl, tokens, number),
    prComment: (remoteUrl: string, tokens: unknown, number: number, body: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:prComment', remoteUrl, tokens, number, body),
    prReplyReviewComment: (remoteUrl: string, tokens: unknown, number: number, inReplyTo: number, body: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:prReplyReviewComment', remoteUrl, tokens, number, inReplyTo, body),
    prReview: (remoteUrl: string, tokens: unknown, number: number, event: string, body: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:prReview', remoteUrl, tokens, number, event, body),
    prMerge: (remoteUrl: string, tokens: unknown, number: number, method: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:prMerge', remoteUrl, tokens, number, method),
    listNotifications: (token: string, all?: boolean): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listNotifications', token, all),
    markNotificationRead: (token: string, id: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:markNotificationRead', token, id),
    markAllNotificationsRead: (token: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:markAllNotificationsRead', token),
    listIssues: (remoteUrl: string, tokens: unknown): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listIssues', remoteUrl, tokens),
    issueDetail: (remoteUrl: string, tokens: unknown, number: number): Promise<unknown> =>
      ipcRenderer.invoke('hosting:issueDetail', remoteUrl, tokens, number),
    setIssueState: (remoteUrl: string, tokens: unknown, number: number, state: string): Promise<unknown> =>
      ipcRenderer.invoke('hosting:setIssueState', remoteUrl, tokens, number, state),
    listMilestones: (remoteUrl: string, tokens: unknown): Promise<unknown> =>
      ipcRenderer.invoke('hosting:listMilestones', remoteUrl, tokens),
    milestoneIssues: (remoteUrl: string, tokens: unknown, number: number): Promise<unknown> =>
      ipcRenderer.invoke('hosting:milestoneIssues', remoteUrl, tokens, number)
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

  zoom: {
    get: (): number => webFrame.getZoomFactor(),
    set: (factor: number): void => webFrame.setZoomFactor(factor)
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
