import { create } from 'zustand'
import type { RegistryRepo, RepoScanRoot } from '../../../shared/types'
import { reposApi } from '../infrastructure/api'

// The registry, as the Repositories page sees it. Loaded on mount and after any
// mutation; nothing subscribes to it in the background, because nothing outside
// that page needs to know.

interface ReposState {
  entries: RegistryRepo[]
  loading: boolean
  scanning: boolean
  /** Whether the one-off backfill below has already run this app session. */
  seeded: boolean
  /** `seed` are paths worth indexing if the registry has never heard of them. */
  load: (seed?: string[]) => Promise<void>
  /** Resolves with how many entries the scan added. */
  scan: (roots: RepoScanRoot[]) => Promise<number>
  forget: (path: string) => Promise<void>
  locate: (oldPath: string, newPath: string) => Promise<void>
}

export const useReposStore = create<ReposState>((set, get) => ({
  entries: [],
  loading: false,
  scanning: false,
  seeded: false,

  load: async (seed) => {
    set({ loading: true })
    try {
      set({ entries: await reposApi.list() })
    } finally {
      set({ loading: false })
    }

    // Only `openRepoTab` and the CLI ever wrote to the registry, and neither
    // runs when tabs are restored at startup. Without this backfill an upgrading
    // user opens the page and is told they have no repositories, with five of
    // them open behind it. Once per session, and after the first paint.
    //
    // It runs every launch, so the caller must seed paths it can justify
    // re-indexing indefinitely — anything else undoes Forget on the next start.
    if (!seed || get().seeded) return
    set({ seeded: true })
    const known = new Set(get().entries.map((e) => e.path))
    const unknown = [...new Set(seed)].filter((p) => !known.has(p))
    if (unknown.length === 0) return
    // `remember` is an upsert and registry writes are serialized in main, so
    // firing them together is safe; the list afterwards is the merged result.
    await Promise.all(unknown.map((p) => reposApi.remember(p)))
    set({ entries: await reposApi.list() })
  },

  scan: async (roots) => {
    set({ scanning: true })
    try {
      const result = await reposApi.scan(roots)
      set({ entries: result.repos })
      return result.added
    } finally {
      set({ scanning: false })
    }
  },

  forget: async (path) => {
    set({ entries: await reposApi.forget(path) })
  },

  locate: async (oldPath, newPath) => {
    set({ entries: await reposApi.locate(oldPath, newPath) })
  }
}))
