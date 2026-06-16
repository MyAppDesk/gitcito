/// <reference types="vite/client" />

interface TermApi {
  create(cwd: string, cols: number, rows: number): Promise<number>
  input(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  kill(id: number): void
  onData(id: number, cb: (data: string) => void): () => void
  onExit(id: number, cb: () => void): () => void
}

interface PreloadApi {
  platform: string
  git(method: string, ...args: unknown[]): Promise<unknown>
  selectDirectory(title?: string): Promise<string | null>
  openExternal(url: string): Promise<void>
  appVersion(): Promise<string>
  shell: {
    showItemInFolder(fullPath: string): Promise<void>
    openPath(fullPath: string): Promise<string>
  }
  settings: {
    get(): Promise<unknown>
    set(settings: unknown): Promise<void>
  }
  ai: {
    commitMessage(diff: string, cfg: unknown, ctx: unknown): Promise<unknown>
    listModels(cfg: unknown): Promise<unknown>
    explainCode(code: string, lang: string, cfg: unknown): Promise<unknown>
    resolveConflict(file: string, content: string, cfg: unknown): Promise<unknown>
  }
  hosting: {
    listRepos(provider: string, token: string, org?: string): Promise<unknown>
    listOwners(provider: string, token: string, org?: string): Promise<unknown>
    createRepo(provider: string, token: string, opts: unknown, org?: string): Promise<unknown>
    listPRs(remoteUrl: string, tokens: unknown): Promise<unknown>
    openCreatePR(remoteUrl: string, source: string, target: string): Promise<boolean>
  }
  term: TermApi
  window: {
    minimize(): void
    maximize(): void
    close(): void
  }
}

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
