// ─── Shared domain types (used by main, preload and renderer) ───────────────

export interface CommitAuthor {
  name: string
  email: string
}

export interface GraphCommit {
  hash: string
  parents: string[]
  author: string
  email: string
  date: number // unix seconds
  refs: string[]
  subject: string
  coAuthors?: CommitAuthor[]
}

export interface BranchInfo {
  name: string
  sha: string
  upstream: string | null
  ahead: number
  behind: number
  isCurrent: boolean
}

export interface RemoteBranchInfo {
  remote: string
  name: string
  fullName: string
  sha: string
}

export interface TagInfo {
  name: string
  sha: string
}

export interface BranchesPayload {
  current: string
  locals: BranchInfo[]
  remotes: RemoteBranchInfo[]
  tags: TagInfo[]
}

export type FileChangeKind = 'A' | 'M' | 'D' | 'R' | 'C' | 'U' | '?'

export interface FileEntry {
  path: string
  status: FileChangeKind
  untracked?: boolean
}

export interface RepoStatus {
  current: string
  tracking: string | null
  ahead: number
  behind: number
  staged: FileEntry[]
  unstaged: FileEntry[]
  conflicted: FileEntry[]
}

export type ConflictOpKind = 'merge' | 'cherry-pick' | 'rebase' | 'revert'
export type ConflictSide = 'ours' | 'theirs' | 'delete'

export interface ConflictVersions {
  content: string
  ours: string | null
  theirs: string | null
  base: string | null
}

export interface StashInfo {
  index: number
  sha: string
  parentSha: string
  untrackedSha: string | null
  message: string
  date: number
}

export interface RemoteInfo {
  name: string
  url: string
}

export interface RepoSummary {
  path: string
  name: string
  current: string
}

export interface PullRequest {
  id: number
  title: string
  author: string
  sourceBranch: string
  targetBranch: string
  url: string
  isDraft: boolean
}

export type HostingProvider = 'github' | 'azure' | null

export type RepoHost = 'github' | 'gitlab' | 'bitbucket' | 'azure'

export interface RemoteRepo {
  name: string // display name, e.g. owner/repo
  url: string // https clone url
  private?: boolean
  description?: string
  avatarUrl?: string // owner/namespace avatar from the provider
}

/** An account or organization/workspace a new repo can be created under. */
export interface RemoteOwner {
  id: string // login/slug (gh/bb), numeric namespace id (gitlab)
  login: string // display name and path segment
  avatarUrl?: string
  type: 'user' | 'org'
}

export interface CreateRepoOpts {
  owner: string // user login / org / workspace slug
  ownerType: 'user' | 'org'
  ownerId?: string // gitlab namespace id
  project?: string // azure project
  name: string
  description?: string
  private: boolean
}

export interface BlameLine {
  sha: string
  author: string
  date: number
  lineNo: number
  text: string
}

export interface FileHistoryEntry {
  hash: string
  author: string
  date: number
  subject: string
}

export interface WorktreeInfo {
  path: string
  branch: string | null
  head: string
  isMain: boolean
  isCurrent: boolean
  locked: boolean
  detached: boolean
}

// ─── Settings / profiles ─────────────────────────────────────────────────────

export type CommitStyle = 'auto' | 'conventional' | 'gitmoji' | 'ticket' | 'plain'

export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'mistral' | 'ollama' | 'custom'

export interface AIProviderPreset {
  id: AIProvider
  label: string
  endpoint: string
  defaultModel: string
  needsKey: boolean
  models: string[]
}

export const AI_PROVIDERS: AIProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-latest',
    needsKey: true,
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    needsKey: true,
    models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-haiku', 'anthropic/claude-3.5-sonnet']
  },
  {
    id: 'groq',
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    needsKey: true,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  {
    id: 'mistral',
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    needsKey: true,
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'codestral-latest']
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    needsKey: false,
    models: ['llama3.2', 'llama3.1', 'qwen2.5-coder', 'codellama', 'mistral']
  },
  { id: 'custom', label: 'Custom (OpenAI-compatible)', endpoint: '', defaultModel: '', needsKey: false, models: [] }
]

export interface AIConfig {
  provider: AIProvider
  endpoint: string
  apiKey: string
  model: string
  commitStyle: CommitStyle
  customInstructions: string
  generateDescription: boolean
  coAuthor: boolean
}

/** Co-author trailer appended when AIConfig.coAuthor is enabled (default on). */
export const MYAPPDESK_COAUTHOR = 'MyAppDesk <team@myappdesk.dev>'

export interface Profile {
  id: string
  name: string
  gitName: string
  gitEmail: string
  githubToken: string
  azureToken: string
  gitlabToken: string
  bitbucketToken: string
  ai: AIConfig
}

export interface RepoRef {
  path: string
  name: string
}

export interface TabState {
  id: string
  kind: 'repo' | 'group'
  name: string
  repos: RepoRef[]
  activeRepoPath: string | null
}

export interface AppSettings {
  profiles: Profile[]
  activeProfileId: string
  tabs: TabState[]
  activeTabId: string | null
  recentRepos: RepoRef[]
  appThemeId: string
  codeThemeId: string
  themeMode: ThemeMode
  codeFontSize: number
  customAppThemes: AppTheme[]
  customCodeThemes: CodeTheme[]
  language: Language
  initialCommitCount: number
  loadMoreCount: number
  autoLoadOnScroll: boolean
  relativeDates: boolean
  commitAvatars: boolean
  fileListView: 'path' | 'tree'
  graphColumns: GraphColumns
  autoFetchMinutes: number
  confirmForcePush: boolean
  /** Force a merge commit even when a fast-forward is possible. */
  mergeCommit: boolean
  sidebarOrder: string[]
}

export type Language = 'en' | 'es'

/** App appearance: a fixed mode or follow the operating system. */
export type ThemeMode = 'light' | 'dark' | 'auto'

export type GraphColumnId = 'branch' | 'graph' | 'message' | 'author' | 'date' | 'sha'

export interface GraphColumn {
  width: number // px; for 'message' it is a flex column and width is ignored; for 'graph' 0 = auto
  visible: boolean
}

export type GraphColumns = Record<GraphColumnId, GraphColumn>

export function defaultGraphColumns(): GraphColumns {
  return {
    branch: { width: 168, visible: true },
    graph: { width: 0, visible: true },
    message: { width: 0, visible: true },
    author: { width: 160, visible: true },
    date: { width: 80, visible: true },
    sha: { width: 74, visible: false }
  }
}

export interface AppThemeColors {
  bg0: string
  bg1: string
  bg2: string
  bg3: string
  bg4: string
  border: string
  borderSoft: string
  text0: string
  text1: string
  text2: string
  accent: string
  green: string
  red: string
  yellow: string
  purple: string
}

export interface AppTheme {
  id: string
  name: string
  builtin?: boolean
  light: AppThemeColors
  dark: AppThemeColors
}

export interface CodeThemeColors {
  bg: string
  text: string
  comment: string
  keyword: string
  string: string
  number: string
  function: string
  title: string
  variable: string
  type: string
  builtin: string
  attr: string
  tag: string
  operator: string
  meta: string
}

export interface CodeTheme {
  id: string
  name: string
  builtin?: boolean
  light: CodeThemeColors
  dark: CodeThemeColors
}

export function defaultProfile(): Profile {
  return {
    id: 'default',
    name: 'Default',
    gitName: '',
    gitEmail: '',
    githubToken: '',
    azureToken: '',
    gitlabToken: '',
    bitbucketToken: '',
    ai: {
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      commitStyle: 'auto',
      customInstructions: '',
      generateDescription: true,
      coAuthor: true
    }
  }
}

export function defaultSettings(): AppSettings {
  return {
    profiles: [defaultProfile()],
    activeProfileId: 'default',
    tabs: [],
    activeTabId: null,
    recentRepos: [],
    appThemeId: 'gitcito',
    codeThemeId: 'gitcito',
    themeMode: 'auto',
    codeFontSize: 12,
    customAppThemes: [],
    customCodeThemes: [],
    language: 'en',
    initialCommitCount: 400,
    loadMoreCount: 400,
    autoLoadOnScroll: true,
    relativeDates: true,
    commitAvatars: true,
    fileListView: 'path',
    graphColumns: defaultGraphColumns(),
    autoFetchMinutes: 0,
    confirmForcePush: true,
    mergeCommit: true,
    sidebarOrder: ['local', 'remotes', 'prs', 'tags', 'stashes', 'worktrees']
  }
}
