import { create } from 'zustand'
import type { ReactNode } from 'react'
import type { CiState, KeychainReason } from '../../../shared/types'

export type CiFilter = 'all' | CiState

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
}

export interface MenuItem {
  label?: string
  icon?: ReactNode
  danger?: boolean
  separator?: boolean
  disabled?: boolean
  onClick?: () => void
  /** Nested items — renders a flyout submenu on hover instead of a click action. */
  submenu?: MenuItem[]
}

export interface ContextMenuState {
  x: number
  y: number
  items: MenuItem[]
}

export type ModalSpec =
  | {
      kind: 'input'
      title: string
      label: string
      placeholder?: string
      initial?: string
      submitLabel?: string
      allowEmpty?: boolean
      onSubmit: (value: string) => void
    }
  | {
      kind: 'confirm'
      title: string
      message: string
      danger?: boolean
      confirmLabel?: string
      autoFocusConfirm?: boolean
      onConfirm: () => void
      secondaryLabel?: string
      secondaryDanger?: boolean
      onSecondary?: () => void
    }
  | {
      kind: 'addRemote'
      path: string
      defaultName: string
      existingNames: string[]
      matchName?: string
    }
  | {
      kind: 'editRemote'
      path: string
      name: string
      url: string
      pushUrl?: string
    }
  | {
      kind: 'diverged-checkout'
      localName: string
      fullName: string
      ahead: number
      behind: number
      onResolve: (strategy: 'rebase' | 'merge' | 'reset', backup: boolean) => void
    }
  | { kind: 'clone'; onClone: (repo: { path: string; name: string }) => void }
  | { kind: 'create-branch'; path: string; currentBranch?: string; description?: string }
  | { kind: 'settings'; page?: 'profile' | 'layout' | 'integrations' | 'ai' | 'themes' | 'general' | 'security' | 'shortcuts' | 'data'; themeTab?: 'theme' | 'graph' }
  | { kind: 'launcher'; groupId?: string }
  | { kind: 'create-repo'; onCreate: (repo: { path: string; name: string }) => void }
  | { kind: 'ai-config-wizard'; repoPath: string; repoName: string; initialTab?: 'ask' | 'config' }
  | { kind: 'interactive-rebase'; repoPath: string; base: string; baseSubject: string }
  | { kind: 'branch-compare'; repoPath: string; branchA: string; branchB: string }
  | { kind: 'conflict-radar'; repoPath: string; base?: string }
  | { kind: 'keychain-consent'; reason: KeychainReason; adopted?: boolean }
  | { kind: 'range-diff'; repoPath: string; branch: string; initialOld?: string }
  | { kind: 'absorb'; repoPath: string }
  | { kind: 'time-machine'; repoPath: string }
  | { kind: 'timelapse'; repoPath: string }
  | { kind: 'ai-pr-review'; repoPath: string; prTitle: string; sourceBranch: string; targetBranch: string }
  | { kind: 'group-color'; tabId: string; current?: string; onSelect: (color: string) => void }
  | { kind: 'reflog'; repoPath: string }
  | { kind: 'code-search'; repoPath: string }
  | { kind: 'stack'; repoPath: string }
  | { kind: 'gitflow'; repoPath: string }
  | { kind: 'history-purge'; repoPath: string; initialPath?: string }
  | { kind: 'subtree'; repoPath: string }
  | { kind: 'clean'; repoPath: string }
  | { kind: 'export'; repoPath: string; tab?: 'bundle' | 'archive' }
  | { kind: 'maintenance'; repoPath: string }
  | { kind: 'merge-options'; repoPath: string; source?: string }
  | { kind: 'objects'; repoPath: string; rev?: string }
  | { kind: 'attributes'; repoPath: string }
  | { kind: 'credentials'; repoPath: string }
  | { kind: 'replace'; repoPath: string; commit?: string }
  | { kind: 'changelog-gen'; repoPath: string }
  | { kind: 'snapshots'; repoPath: string }
  | { kind: 'stash-partial'; repoPath: string }
  | { kind: 'create-tag'; repoPath: string; hash?: string; at?: string }
  | { kind: 'cheatsheet' }
  | { kind: 'create-issue'; repoPath: string; remoteUrl: string }
  | { kind: 'repo-settings'; repoPath: string; tab?: 'general' | 'info' | 'vault' | 'analytics' | 'insights' | 'history' | 'logs' }
  | { kind: 'secure-share'; repoPath: string; initialMode?: 'export' | 'import' }
  | { kind: 'secure-workspace'; initialMode?: 'export' | 'import' }
  | { kind: 'bisect'; repoPath: string }
  | { kind: 'hooks'; repoPath: string }
  | { kind: 'lfs'; repoPath: string }
  | { kind: 'sparse'; repoPath: string }
  | { kind: 'ignore'; repoPath: string; targetPath: string; isFolder: boolean }
  | { kind: 'pr-detail'; repoPath: string; remoteUrl: string; number: number }
  | { kind: 'pr-preview'; repoPath: string; number?: number; remote?: string; branch?: string }
  | {
      kind: 'create-pr'
      repoPath: string
      remoteUrl?: string
      source?: string
      target?: string
      defaultTitle?: string
      defaultBody?: string
    }

export type FileViewSource =
  | { type: 'wip'; staged: boolean; untracked: boolean }
  | { type: 'commit'; hash: string }
  | { type: 'stash'; sha: string; untracked: boolean }
  // A plain working-tree file opened from the project tree. Read from disk
  // (no git ref) and editable in place.
  | { type: 'tree' }

export type FileViewMode = 'preview' | 'diff' | 'file' | 'blame' | 'history'

export interface FileViewState {
  repoPath: string
  file: string
  source: FileViewSource
  mode: FileViewMode
  /** Line to scroll to and flash once the file is rendered (search results). */
  line?: number
  /** Bumped by `setFileView` per request, so re-opening the same line re-scrolls. */
  revealSeq?: number
}

export interface ConflictViewState {
  repoPath: string
  file: string
}

/** Active content-search term, mirrored from the commit panel so the center
 *  file/diff view can highlight matches. null = nothing to highlight. */
export interface FileSearchState {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

export interface PanelLayout {
  sidebarWidth: number
  panelWidth: number
  terminalHeight: number
  /** Width of the terminal pane when docked as a right-hand column. */
  terminalWidth: number
  terminalListWidth: number
  terminalListCollapsed: boolean
  composerUnstagedRatio: number
  /** Conflict editor: share of the width taken by the left (ours) side. */
  conflictSideRatio: number
  /** Conflict editor: share of the height taken by the two side panes. */
  conflictFilesRatio: number
  composerConflictedCollapsed: boolean
  composerUnstagedCollapsed: boolean
  composerStagedCollapsed: boolean
}

const LAYOUT_KEY = 'gitcito-layout'
const SIDEBAR_KEY = 'gitcito-sidebar-collapsed'
const DEFAULT_LAYOUT: PanelLayout = {
  sidebarWidth: 248,
  panelWidth: 420,
  terminalHeight: 260,
  terminalWidth: 480,
  terminalListWidth: 220,
  terminalListCollapsed: false,
  composerUnstagedRatio: 0.5,
  conflictSideRatio: 0.5,
  conflictFilesRatio: 0.55,
  composerConflictedCollapsed: false,
  composerUnstagedCollapsed: false,
  composerStagedCollapsed: false
}

function loadLayout(): PanelLayout {
  try {
    return { ...DEFAULT_LAYOUT, ...(JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Partial<PanelLayout>) }
  } catch {
    return DEFAULT_LAYOUT
  }
}

interface UIState {
  contextMenu: ContextMenuState | null
  modal: ModalSpec | null
  toasts: Toast[]
  /** Cmd/Ctrl+K command palette — fuzzy jump to branches, commits, files, actions. */
  commandPaletteOpen: boolean
  /**
   * Mission control is showing. It is a view, not a tab: the title-bar button
   * swaps the whole workspace body for the dashboard and swaps it back, so no
   * extra tab is ever created for it.
   */
  missionOpen: boolean
  /** Unread GitHub notification count for the toolbar bell badge. */
  githubUnread: number
  /** Terminal-pane visibility, per repo path. Switching to a tab that never
   *  opened its terminal keeps the pane closed; reopening the tab restores it.
   *  In-memory only — resets to all-closed on cold start. */
  terminalOpenByRepo: Record<string, boolean>
  /** Left sidebar (branches/files) collapsed. Global workspace preference —
   *  hides the sidebar column so the graph gets the full width. */
  sidebarCollapsed: boolean
  graphFilter: string
  ciFilter: CiFilter
  authorFilter: string | null
  /** Dim commits that didn't touch this path (file/folder). null = off. */
  pathFilter: string | null
  busy: string | null
  /** Which toolbar operation is in flight, so the spinner can render on the
   *  relevant tool button instead of a layout-shifting label on the right. */
  busyOp: 'push' | 'pull' | 'fetch' | null
  /** Count of mutating git ops queued or running. > 0 gates the UI: action
   *  buttons and mutating keyboard shortcuts are disabled until it drops to 0,
   *  so the user can't fire a second action before the first has settled. */
  inflight: number
  fileView: FileViewState | null
  conflictView: ConflictViewState | null
  /** File whose "why this conflicts" strip is open. Lives here rather than in
   *  the resolver so a background refresh, which remounts it, does not close it. */
  conflictWhy: string | null
  fileSearch: FileSearchState | null
  scrollToHash: string | null
  layout: PanelLayout
  /** True while the in-app file editor holds unsaved changes — drives the
   *  discard guard before navigating away. */
  editorDirty: boolean
  /** RepoCosmos 3D visualization easter egg — a fullscreen overlay mounted
   *  as a sibling to the modal stack, since it must cover the modal that
   *  triggered it. null = closed. */
  cosmos: { repoPath: string } | null

  openContextMenu(x: number, y: number, items: MenuItem[]): void
  closeContextMenu(): void
  openModal(modal: ModalSpec): void
  closeModal(): void
  setCommandPalette(open: boolean): void
  setMissionOpen(open: boolean): void
  toggleCommandPalette(): void
  setGithubUnread(n: number): void
  toast(kind: Toast['kind'], message: string): void
  dismissToast(id: number): void
  toggleTerminal(repoPath: string): void
  setTerminalOpen(repoPath: string, open: boolean): void
  toggleSidebar(): void
  setSidebarCollapsed(collapsed: boolean): void
  setGraphFilter(filter: string): void
  setCiFilter(filter: CiFilter): void
  setAuthorFilter(author: string | null): void
  setPathFilter(path: string | null): void
  setBusy(label: string | null, op?: 'push' | 'pull' | 'fetch' | null): void
  beginInflight(): void
  endInflight(): void
  setFileView(view: FileViewState | null): void
  setEditorDirty(dirty: boolean): void
  setConflictView(view: ConflictViewState | null): void
  setConflictWhy(file: string | null): void
  setFileSearch(search: FileSearchState | null): void
  requestScrollTo(hash: string | null): void
  setLayout(partial: Partial<PanelLayout>): void
  /** Reset all persisted panel sizes (widths/heights/collapse) to defaults. */
  resetLayout(): void
  openCosmos(repoPath: string): void
  closeCosmos(): void
}

let toastId = 0
let revealSeq = 0

export const useUIStore = create<UIState>((set, get) => ({
  contextMenu: null,
  modal: null,
  toasts: [],
  commandPaletteOpen: false,
  missionOpen: false,
  githubUnread: 0,
  terminalOpenByRepo: {},
  sidebarCollapsed: (() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })(),
  graphFilter: '',
  ciFilter: 'all',
  authorFilter: null,
  pathFilter: null,
  busy: null,
  busyOp: null,
  inflight: 0,
  fileView: null,
  conflictView: null,
  conflictWhy: null,
  fileSearch: null,
  scrollToHash: null,
  layout: loadLayout(),
  editorDirty: false,
  cosmos: null,

  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  setCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setMissionOpen: (missionOpen) => set({ missionOpen }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),
  setGithubUnread: (githubUnread) => set({ githubUnread }),

  toast: (kind, message) => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleTerminal: (repoPath) =>
    set((s) => ({ terminalOpenByRepo: { ...s.terminalOpenByRepo, [repoPath]: !s.terminalOpenByRepo[repoPath] } })),
  setTerminalOpen: (repoPath, open) =>
    set((s) => ({ terminalOpenByRepo: { ...s.terminalOpenByRepo, [repoPath]: open } })),
  toggleSidebar: () => get().setSidebarCollapsed(!get().sidebarCollapsed),
  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed })
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore quota errors */
    }
  },
  setGraphFilter: (graphFilter) => set({ graphFilter }),
  setCiFilter: (ciFilter) => set({ ciFilter }),
  setAuthorFilter: (authorFilter) => set({ authorFilter }),
  setPathFilter: (pathFilter) => set({ pathFilter }),
  setBusy: (busy, op = null) => set({ busy, busyOp: op }),
  beginInflight: () => set((s) => ({ inflight: s.inflight + 1 })),
  endInflight: () => set((s) => ({ inflight: Math.max(0, s.inflight - 1) })),
  setFileView: (fileView) =>
    set({
      // Stamp each line-targeted open so clicking the same search hit twice
      // scrolls again instead of being deduped away by identical state.
      fileView: fileView?.line != null ? { ...fileView, revealSeq: ++revealSeq } : fileView
    }),
  setEditorDirty: (editorDirty) => set({ editorDirty }),
  setConflictView: (conflictView) => set({ conflictView }),
  setConflictWhy: (conflictWhy) => set({ conflictWhy }),
  setFileSearch: (fileSearch) => set({ fileSearch }),
  requestScrollTo: (scrollToHash) => set({ scrollToHash }),
  setLayout: (partial) => {
    const layout = { ...get().layout, ...partial }
    set({ layout })
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
    } catch {
      /* ignore quota errors */
    }
  },
  resetLayout: () => {
    set({ layout: DEFAULT_LAYOUT })
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(DEFAULT_LAYOUT))
    } catch {
      /* ignore quota errors */
    }
  },
  openCosmos: (repoPath) => set({ cosmos: { repoPath } }),
  closeCosmos: () => set({ cosmos: null })
}))
