// Screenshot/automation bridge.
//
// Only loaded when the app is launched with `--shot` (see main.tsx). It exposes
// the app's zustand stores on `window.__shot` so an external Playwright driver
// (examples/screenshots/capture.mjs) can put the UI into an exact state —
// open a conflict, preview a file, show a settings page — and screenshot it,
// without depending on fragile click paths. It ships nothing in normal builds.
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { useUpdatesStore } from '../stores/updates'
import { useLaunchStore } from '../stores/launch'

export interface ShotBridge {
  settings: typeof useSettingsStore
  ui: typeof useUIStore
  repo: typeof useRepoStore
  updates: typeof useUpdatesStore
  launch: typeof useLaunchStore
  repoActions: typeof repoActions
  /** True once the bridge has attached; the driver polls for this. */
  ready: true
  /** Resolves once the given repo has finished its initial load. */
  waitForRepo(path: string, timeoutMs?: number): Promise<void>
}

declare global {
  interface Window {
    __shot?: ShotBridge
  }
}

export function installShotBridge(): void {
  const waitForRepo = (path: string, timeoutMs = 15000): Promise<void> =>
    new Promise((resolve, reject) => {
      const start = performance.now()
      const tick = (): void => {
        const repo = useRepoStore.getState().repos[path]
        if (repo && !repo.loading) return resolve()
        if (performance.now() - start > timeoutMs) return reject(new Error(`repo ${path} did not load`))
        setTimeout(tick, 80)
      }
      tick()
    })

  window.__shot = { settings: useSettingsStore, ui: useUIStore, repo: useRepoStore, updates: useUpdatesStore, launch: useLaunchStore, repoActions, ready: true, waitForRepo }
}
