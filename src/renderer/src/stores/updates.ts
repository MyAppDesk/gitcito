import { create } from 'zustand'
import type { UpdateState } from '../../../shared/types'
import { useSettingsStore } from './settings'

interface UpdatesState extends UpdateState {
  /** Session-only: user dismissed the banner with "Later". Resets on relaunch. */
  dismissed: boolean
  /** True once the initial subscription + check has been kicked off. */
  started: boolean

  init(): void
  check(): void
  download(): void
  install(): void
  dismiss(): void
  /** Re-show a "Later"-dismissed banner (from the status-bar badge). */
  reveal(): void
  /** Hide this version for good (persists skippedUpdateVersion) and dismiss. */
  skip(): void
}

export const useUpdatesStore = create<UpdatesState>((set, get) => ({
  status: 'idle',
  info: null,
  progress: null,
  error: null,
  supported: true,
  dismissed: false,
  started: false,

  init: () => {
    if (get().started) return
    set({ started: true })
    window.api.updates.onEvent((state) => {
      // A freshly-offered version clears a stale "Later" dismissal so the user
      // sees the newer one; skip-for-good is handled separately via settings.
      set((prev) => ({
        ...state,
        dismissed: prev.info?.version === state.info?.version ? prev.dismissed : false
      }))
    })
    void window.api.updates.getState().then((state) => set({ ...state }))
    get().check()
  },

  check: () => void window.api.updates.check(),

  download: () => {
    const { supported, info } = get()
    if (supported) {
      void window.api.updates.download()
    } else if (info?.url) {
      void window.api.openExternal(info.url)
    }
  },

  install: () => window.api.updates.install(),

  dismiss: () => set({ dismissed: true }),

  reveal: () => set({ dismissed: false }),

  skip: () => {
    const version = get().info?.version
    if (version) {
      useSettingsStore.getState().update((s) => ({ ...s, skippedUpdateVersion: version }))
    }
    set({ dismissed: true })
  }
}))

/** Whether a new version is ready to surface (available or downloaded) and not
 *  the one the user permanently skipped. Pass the persisted skipped version. */
export function hasPendingUpdate(s: UpdatesState, skippedVersion?: string): boolean {
  if (s.status !== 'available' && s.status !== 'downloading' && s.status !== 'downloaded') return false
  if (!s.info) return false
  return s.info.version !== skippedVersion
}
