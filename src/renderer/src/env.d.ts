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
  shotMode: boolean
  git(method: string, ...args: unknown[]): Promise<unknown>
  selectDirectory(title?: string): Promise<string | null>
  savePatch(defaultName: string, content: string): Promise<string | null>
  openPatch(): Promise<{ path: string; content: string } | null>
  openExternal(url: string): Promise<void>
  appVersion(): Promise<string>
  appReleases(): Promise<import('../../shared/types').AppRelease[]>
  shell: {
    showItemInFolder(fullPath: string): Promise<void>
    openPath(fullPath: string): Promise<string>
    writeFiles(repoPath: string, files: unknown[]): Promise<void>
  }
  settings: {
    get(): Promise<unknown>
    set(settings: unknown): Promise<void>
    importFile(): Promise<unknown>
    exportFile(settings: unknown): Promise<boolean>
  }
  ai: {
    commitMessage(diff: string, cfg: unknown, ctx: unknown): Promise<unknown>
    listModels(cfg: unknown): Promise<unknown>
    explainCode(code: string, lang: string, cfg: unknown): Promise<unknown>
    resolveConflict(file: string, content: string, cfg: unknown): Promise<unknown>
    generateConfig(repoName: string, artifacts: unknown[], context: string, cfg: unknown): Promise<unknown>
    suggestArtifacts(repoName: string, selectedTools: string[], context: string, alreadySelected: unknown[], cfg: unknown): Promise<unknown>
    smartStage(files: unknown[], cfg: unknown): Promise<unknown>
    generateAppTheme(prompt: string, cfg: unknown): Promise<unknown>
    generateCodeTheme(prompt: string, cfg: unknown): Promise<unknown>
    generateBranchName(description: string, cfg: unknown, ctx: unknown): Promise<unknown>
    reviewPR(diff: string, cfg: unknown): Promise<unknown>
    prDescription(commits: string, diff: string, cfg: unknown): Promise<unknown>
    planActions(prompt: string, status: unknown, cfg: unknown): Promise<unknown>
  }
  analytics: {
    get(): Promise<unknown>
    clear(): Promise<unknown>
    setRetention(days: number): Promise<unknown>
  }
  vault: {
    list(repoPath: string): Promise<unknown>
    upsert(scope: string, repoPath: string, entry: unknown): Promise<unknown>
    remove(scope: string, repoPath: string, id: string): Promise<unknown>
    exportAll(): Promise<unknown>
    importAll(data: unknown): Promise<unknown>
  }
  info: {
    list(repoPath: string): Promise<unknown>
    upsert(repoPath: string, entry: unknown): Promise<unknown>
    remove(repoPath: string, id: string): Promise<unknown>
    reorder(repoPath: string, ids: string[]): Promise<unknown>
    exportAll(): Promise<unknown>
    importAll(data: unknown): Promise<unknown>
  }
  log: {
    get(): Promise<unknown>
    clear(): Promise<unknown>
  }
  hosting: {
    listRepos(provider: string, token: string, org?: string): Promise<unknown>
    listOwners(provider: string, token: string, org?: string): Promise<unknown>
    createRepo(provider: string, token: string, opts: unknown, org?: string): Promise<unknown>
    listPRs(remoteUrl: string, tokens: unknown): Promise<unknown>
    listReleases(remoteUrl: string, tokens: unknown): Promise<unknown>
    ciStatuses(remoteUrl: string, shas: string[], token: string): Promise<unknown>
    openCreatePR(remoteUrl: string, source: string, target: string): Promise<boolean>
    createPR(remoteUrl: string, tokens: unknown, opts: unknown): Promise<unknown>
    prDetail(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
    prComment(remoteUrl: string, tokens: unknown, number: number, body: string): Promise<unknown>
    prReplyReviewComment(remoteUrl: string, tokens: unknown, number: number, inReplyTo: number, body: string): Promise<unknown>
    prChecks(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
    prFiles(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
    prReview(remoteUrl: string, tokens: unknown, number: number, event: string, body: string): Promise<unknown>
    prMerge(remoteUrl: string, tokens: unknown, number: number, method: string): Promise<unknown>
    listNotifications(token: string, all?: boolean): Promise<unknown>
    markNotificationRead(token: string, id: string): Promise<unknown>
    markAllNotificationsRead(token: string): Promise<unknown>
    listIssues(remoteUrl: string, tokens: unknown): Promise<unknown>
    issueDetail(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
    setIssueState(remoteUrl: string, tokens: unknown, number: number, state: string): Promise<unknown>
    createIssue(remoteUrl: string, tokens: unknown, opts: unknown): Promise<unknown>
    applyPrMeta(remoteUrl: string, tokens: unknown, number: number, meta: unknown): Promise<unknown>
    listMilestones(remoteUrl: string, tokens: unknown): Promise<unknown>
    milestoneIssues(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
  }
  term: TermApi
  window: {
    minimize(): void
    maximize(): void
    close(): void
  }
  zoom: {
    get(): number
    set(factor: number): void
  }
  watch: {
    repo(path: string | null): Promise<void>
    onChange(cb: (payload: { path: string; light: boolean }) => void): () => void
  }
  updates: {
    getState(): Promise<import('../../shared/types').UpdateState>
    check(): Promise<void>
    download(): Promise<void>
    install(): void
    onEvent(cb: (state: import('../../shared/types').UpdateState) => void): () => void
  }
}

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
