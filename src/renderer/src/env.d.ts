/// <reference types="vite/client" />

interface TermApi {
  create(cwd: string, cols: number, rows: number): Promise<number>
  input(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  kill(id: number): void
  procName(id: number): Promise<string>
  onData(id: number, cb: (data: string) => void): () => void
  onExit(id: number, cb: () => void): () => void
}

interface LaunchApi {
  discover(repoPath: string): Promise<import('../../shared/types').LaunchGroup[]>
  run(payload: {
    dir: string
    config: import('../../shared/types').LaunchConfig
    configs?: import('../../shared/types').LaunchConfig[]
    tasks: import('../../shared/types').LaunchTask[]
    inputValues?: Record<string, string>
    skipTasks?: string[]
    cols: number
    rows: number
  }): Promise<{ id: number } | { error: string }>
  runTasks(payload: {
    dir: string
    tasks: import('../../shared/types').LaunchTask[]
    labels: string[]
    inputValues?: Record<string, string>
    cols: number
    rows: number
  }): Promise<{ id: number } | { error: string }>
  input(id: number, data: string): void
  resize(id: number, cols: number, rows: number): void
  signal(id: number, action: 'pause' | 'resume'): void
  stop(id: number): void
  onData(id: number, cb: (data: string) => void): () => void
  onExit(id: number, cb: (code: number) => void): () => void
}

interface PreloadApi {
  platform: string
  shotMode: boolean
  git(method: string, ...args: unknown[]): Promise<unknown>
  onCloneProgress(cb: (p: import('../../shared/types').CloneProgress) => void): () => void
  /** Live stdout/stderr of a running `git bisect run`. */
  onBisectOutput(cb: (chunk: string) => void): () => void
  localci: {
    status(): Promise<unknown>
    workflows(repoPath: string): Promise<unknown>
    run(repoPath: string, workflowFile: string): Promise<unknown>
    cancel(repoPath: string): Promise<unknown>
    record(repoPath: string, workflowFile: string, ok: boolean): Promise<unknown>
    verdicts(repoPath: string): Promise<unknown>
    runAt(repoPath: string, workflowFile: string, sha: string): Promise<unknown>
    resolveRange(repoPath: string, spec: string, limit: number): Promise<unknown>
    sweep(repoPath: string, workflowFile: string, shas: string[]): Promise<unknown>
    onData(cb: (p: { repoPath: string; chunk: string }) => void): () => void
    onSweepProgress(cb: (p: unknown) => void): () => void
  }
  getPathForFile(file: File): string
  keychain: {
    onAsk(cb: (payload: { reason: string; adopted: boolean }) => void): () => void
    answer(granted: boolean): Promise<void>
    status(): Promise<{
      consent: import('../../shared/types').KeychainConsent
      explained: boolean
      available: boolean | null
    }>
    set(granted: boolean): Promise<boolean>
  }
  selectDirectory(title?: string): Promise<string | null>
  savePatch(defaultName: string, content: string): Promise<string | null>
  openPatch(): Promise<{ path: string; content: string } | null>
  saveBinary(
    defaultName: string,
    data: Uint8Array,
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string | null>
  /** Pick a destination path; writes nothing (git produces the file). */
  choosePath(
    title: string,
    defaultName: string,
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string | null>
  /** Pick an existing file, by path only. */
  openFilePath(title: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null>
  openExternal(url: string): Promise<void>
  focusWindow(): Promise<void>
  appVersion(): Promise<string>
  appReleases(): Promise<import('../../shared/types').AppRelease[]>
  shell: {
    showItemInFolder(fullPath: string): Promise<void>
    openPath(fullPath: string): Promise<string>
    openWithPicker(fullPath: string): Promise<string>
    pickApplication(): Promise<{ name: string; path: string } | null>
    openWithApp(targetPath: string, appPath: string): Promise<string>
    writeFiles(repoPath: string, files: unknown[]): Promise<void>
  }
  difftool: {
    config(repoPath: string): Promise<import('../../shared/diffTools').DiffToolConfig>
    set(
      repoPath: string,
      values: { diffTool?: string; mergeTool?: string; keepBackup?: boolean },
      scope: 'global' | 'repo'
    ): Promise<void>
    diff(repoPath: string, file: string, rev?: string, tool?: string): Promise<string>
    merge(repoPath: string, file: string, tool?: string): Promise<string>
  }
  ssh: {
    status(): Promise<import('../../shared/sshKeys').SshStatus>
    generate(name: string, comment: string, passphrase: string): Promise<string>
    addToAgent(publicKeyPath: string, passphrase: string): Promise<string>
    test(host: string): Promise<import('../../shared/sshKeys').SshTest>
  }
  editor: {
    detect(): Promise<import('../../shared/editors').DetectedEditor[]>
    open(
      setting: import('../../shared/editors').EditorSetting,
      target: { path: string; line?: number; col?: number; isDir?: boolean; repo?: string }
    ): Promise<string>
  }
  settings: {
    get(): Promise<unknown>
    unlock(): Promise<unknown>
    set(settings: unknown): Promise<void>
    importFile(): Promise<unknown>
    exportFile(settings: unknown): Promise<boolean>
  }
  ai: {
    commitMessage(diff: string, cfg: unknown, ctx: unknown): Promise<unknown>
    listModels(cfg: unknown, force?: boolean): Promise<unknown>
    detectCli(): Promise<unknown>
    explainCode(code: string, lang: string, cfg: unknown): Promise<unknown>
    hoverExplain(req: unknown, cfg: unknown): Promise<unknown>
    resolveConflict(file: string, content: string, cfg: unknown): Promise<unknown>
    generateConfig(repoName: string, artifacts: unknown[], context: string, cfg: unknown): Promise<unknown>
    suggestArtifacts(repoName: string, selectedTools: string[], context: string, alreadySelected: unknown[], cfg: unknown): Promise<unknown>
    smartStage(files: unknown[], cfg: unknown): Promise<unknown>
    generateAppTheme(prompt: string, cfg: unknown): Promise<unknown>
    generateCodeTheme(prompt: string, cfg: unknown): Promise<unknown>
    generateGraphPalette(prompt: string, cfg: unknown): Promise<unknown>
    generateBranchName(description: string, cfg: unknown, ctx: unknown): Promise<unknown>
    reviewPR(diff: string, cfg: unknown): Promise<unknown>
    semanticCollision(localDiff: string, incomingDiff: string, cfg: unknown): Promise<unknown>
    activityDigest(
      sourceRepo: string,
      commits: unknown,
      myBranch: string,
      myFiles: unknown,
      cfg: unknown
    ): Promise<unknown>
    proposeSessionPlan(
      repoName: string,
      detected: unknown,
      hotspots: unknown,
      authors: unknown,
      cfg: unknown
    ): Promise<unknown>
    prDescription(commits: string, diff: string, cfg: unknown): Promise<unknown>
    planActions(prompt: string, status: unknown, cfg: unknown): Promise<unknown>
    repoChat(repoPath: string, messages: unknown, cfg: unknown, attachments: unknown): Promise<unknown>
    repoChatFinalize(repoPath: string, messages: unknown, result: unknown, cfg: unknown): Promise<unknown>
  }
  wiki: {
    facts(repoPath: string): Promise<unknown>
    imports(repoPath: string, depth: number): Promise<unknown>
    get(repoPath: string, model: string): Promise<unknown>
    generate(repoPath: string, cfg: unknown): Promise<unknown>
    export(repoPath: string): Promise<unknown>
    clear(repoPath: string): Promise<unknown>
    onProgress(cb: (payload: unknown) => void): () => void
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
  secureShare: {
    candidates(repoPath: string): Promise<unknown>
    export(repoPath: string, project: string, paths: string[], password: string): Promise<unknown>
    pick(): Promise<unknown>
    preview(bundlePath: string, password: string, repoPath: string): Promise<unknown>
    apply(bundlePath: string, password: string, repoPath: string, selected: string[]): Promise<unknown>
    exportV2(specs: unknown, project: string, password: string): Promise<unknown>
    openV2(bundlePath: string, password: string): Promise<unknown>
    previewRepoV2(
      bundlePath: string,
      password: string,
      sectionIndex: number,
      repoPath: string
    ): Promise<unknown>
    applyV2(bundlePath: string, password: string, plan: unknown): Promise<unknown>
    previewNotesV2(
      bundlePath: string,
      password: string,
      sectionIndex: number,
      repoPath: string
    ): Promise<unknown>
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
    uploadSshKey(token: string, title: string, publicKey: string): Promise<unknown>
    listOwners(provider: string, token: string, org?: string): Promise<unknown>
    whoAmI(provider: string, token: string, org?: string, interactive?: boolean): Promise<unknown>
    createRepo(provider: string, token: string, opts: unknown, org?: string): Promise<unknown>
    listPRs(remoteUrl: string, tokens: unknown): Promise<unknown>
    listReleases(remoteUrl: string, tokens: unknown): Promise<unknown>
    ciStatuses(remoteUrl: string, shas: string[], token: string): Promise<unknown>
    openCreatePR(remoteUrl: string, source: string, target: string): Promise<boolean>
    createPR(remoteUrl: string, tokens: unknown, opts: unknown): Promise<unknown>
    prDetail(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
    prComment(remoteUrl: string, tokens: unknown, number: number, body: string): Promise<unknown>
    prReplyReviewComment(remoteUrl: string, tokens: unknown, number: number, inReplyTo: number | string, body: string): Promise<unknown>
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
    updatePR(remoteUrl: string, tokens: unknown, number: number, patch: unknown): Promise<unknown>
    mergedPrHeads(remoteUrl: string, tokens: unknown, branches: string[]): Promise<unknown>
    listMilestones(remoteUrl: string, tokens: unknown): Promise<unknown>
    milestoneIssues(remoteUrl: string, tokens: unknown, number: number): Promise<unknown>
  }
  term: TermApi
  launch: LaunchApi
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
  cli: {
    isInstalled(): Promise<boolean>
    install(): Promise<{ ok: boolean; error?: string }>
    uninstall(): Promise<{ ok: boolean; error?: string }>
    onOpenPath(cb: (payload: import('../../shared/cli').CliOpenPayload) => void): () => void
  }
}

declare global {
  interface Window {
    api: PreloadApi
  }
}

export {}
