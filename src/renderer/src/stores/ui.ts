import { create } from 'zustand'
import type { ReactNode } from 'react'
import type { CiState } from '../../../shared/types'

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
  | { kind: 'clone'; onClone: (repo: { path: string; name: string }) => void }
  | { kind: 'create-branch'; path: string; currentBranch?: string; description?: string }
  | { kind: 'settings'; page?: 'profile' | 'integrations' | 'ai' | 'themes' | 'general' }
  | { kind: 'launcher'; groupId?: string }
  | { kind: 'create-repo'; onCreate: (repo: { path: string; name: string }) => void }
  | { kind: 'ai-config-wizard'; repoPath: string; repoName: string }
  | { kind: 'interactive-rebase'; repoPath: string; base: string; baseSubject: string }
  | { kind: 'branch-compare'; repoPath: string; branchA: string; branchB: string }
  | { kind: 'ai-pr-review'; repoPath: string; prTitle: string; sourceBranch: string; targetBranch: string }
  | { kind: 'group-color'; tabId: string; current?: string; onSelect: (color: string) => void }
  | { kind: 'reflog'; repoPath: string }
  | { kind: 'code-search'; repoPath: string }
  | { kind: 'stack'; repoPath: string }
  | { kind: 'bisect'; repoPath: string }
  | { kind: 'hooks'; repoPath: string }
  | { kind: 'lfs'; repoPath: string }
  | { kind: 'sparse'; repoPath: string }
  | { kind: 'ignore'; repoPath: string; targetPath: string; isFolder: boolean }
  | { kind: 'pr-detail'; repoPath: string; remoteUrl: string; number: number }
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
  terminalListWidth: number
  terminalListCollapsed: boolean
  composerUnstagedRatio: number
  composerConflictedCollapsed: boolean
  composerUnstagedCollapsed: boolean
  composerStagedCollapsed: boolean
}

const LAYOUT_KEY = 'gitcito-layout'
const DEFAULT_LAYOUT: PanelLayout = {
  sidebarWidth: 248,
  panelWidth: 420,
  terminalHeight: 260,
  terminalListWidth: 220,
  terminalListCollapsed: false,
  composerUnstagedRatio: 0.5,
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
  terminalOpen: boolean
  graphFilter: string
  ciFilter: CiFilter
  authorFilter: string | null
  busy: string | null
  fileView: FileViewState | null
  conflictView: ConflictViewState | null
  fileSearch: FileSearchState | null
  scrollToHash: string | null
  layout: PanelLayout
  /** True while the in-app file editor holds unsaved changes — drives the
   *  discard guard before navigating away. */
  editorDirty: boolean

  openContextMenu(x: number, y: number, items: MenuItem[]): void
  closeContextMenu(): void
  openModal(modal: ModalSpec): void
  closeModal(): void
  setCommandPalette(open: boolean): void
  toggleCommandPalette(): void
  toast(kind: Toast['kind'], message: string): void
  dismissToast(id: number): void
  toggleTerminal(): void
  setGraphFilter(filter: string): void
  setCiFilter(filter: CiFilter): void
  setAuthorFilter(author: string | null): void
  setBusy(label: string | null): void
  setFileView(view: FileViewState | null): void
  setEditorDirty(dirty: boolean): void
  setConflictView(view: ConflictViewState | null): void
  setFileSearch(search: FileSearchState | null): void
  requestScrollTo(hash: string | null): void
  setLayout(partial: Partial<PanelLayout>): void
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  contextMenu: null,
  modal: null,
  toasts: [],
  commandPaletteOpen: false,
  terminalOpen: false,
  graphFilter: '',
  ciFilter: 'all',
  authorFilter: null,
  busy: null,
  fileView: null,
  conflictView: null,
  fileSearch: null,
  scrollToHash: null,
  layout: loadLayout(),
  editorDirty: false,

  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  setCommandPalette: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),

  toast: (kind, message) => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleTerminal: () => set({ terminalOpen: !get().terminalOpen }),
  setGraphFilter: (graphFilter) => set({ graphFilter }),
  setCiFilter: (ciFilter) => set({ ciFilter }),
  setAuthorFilter: (authorFilter) => set({ authorFilter }),
  setBusy: (busy) => set({ busy }),
  setFileView: (fileView) => set({ fileView }),
  setEditorDirty: (editorDirty) => set({ editorDirty }),
  setConflictView: (conflictView) => set({ conflictView }),
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
  }
}))
