import { create } from 'zustand'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
}

export interface MenuItem {
  label?: string
  icon?: string
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
  | { kind: 'settings'; page?: 'profile' | 'integrations' | 'ai' | 'themes' | 'general' }
  | { kind: 'launcher'; groupId?: string }
  | { kind: 'create-repo'; onCreate: (repo: { path: string; name: string }) => void }
  | { kind: 'ai-config-wizard'; repoPath: string; repoName: string }

export type FileViewSource =
  | { type: 'wip'; staged: boolean; untracked: boolean }
  | { type: 'commit'; hash: string }
  | { type: 'stash'; sha: string; untracked: boolean }

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
  terminalOpen: boolean
  graphFilter: string
  busy: string | null
  fileView: FileViewState | null
  conflictView: ConflictViewState | null
  scrollToHash: string | null
  layout: PanelLayout

  openContextMenu(x: number, y: number, items: MenuItem[]): void
  closeContextMenu(): void
  openModal(modal: ModalSpec): void
  closeModal(): void
  toast(kind: Toast['kind'], message: string): void
  dismissToast(id: number): void
  toggleTerminal(): void
  setGraphFilter(filter: string): void
  setBusy(label: string | null): void
  setFileView(view: FileViewState | null): void
  setConflictView(view: ConflictViewState | null): void
  requestScrollTo(hash: string | null): void
  setLayout(partial: Partial<PanelLayout>): void
}

let toastId = 0

export const useUIStore = create<UIState>((set, get) => ({
  contextMenu: null,
  modal: null,
  toasts: [],
  terminalOpen: false,
  graphFilter: '',
  busy: null,
  fileView: null,
  conflictView: null,
  scrollToHash: null,
  layout: loadLayout(),

  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  toast: (kind, message) => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  toggleTerminal: () => set({ terminalOpen: !get().terminalOpen }),
  setGraphFilter: (graphFilter) => set({ graphFilter }),
  setBusy: (busy) => set({ busy }),
  setFileView: (fileView) => set({ fileView }),
  setConflictView: (conflictView) => set({ conflictView }),
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
