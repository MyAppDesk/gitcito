import { create } from 'zustand'
import { profileAvatarApi } from '../infrastructure/api'

/**
 * Profile pictures stored as images, loaded once per profile and kept as data
 * URLs. The title bar redraws often (the avatar's mood follows the repository),
 * so the picture must come from memory, not from an IPC call per render.
 *
 * `undefined` = not loaded yet, `null` = the profile has no stored image.
 */
interface ProfileAvatarsState {
  images: Record<string, string | null | undefined>
  /** Load a profile's picture if it has not been loaded yet. */
  ensureProfileImage(id: string): void
  /** Ask for a file and store it. Resolves `'unreadable'` when it was not an image. */
  pickProfileImage(id: string): Promise<'picked' | 'cancelled' | 'unreadable'>
  removeProfileImage(id: string): Promise<void>
  /** Forget what is in memory, so the next render reads the stored files again (after an import). */
  reloadProfileImages(): void
}

const loading = new Set<string>()

export const useProfileAvatarsStore = create<ProfileAvatarsState>((set, get) => ({
  images: {},

  ensureProfileImage: (id) => {
    if (get().images[id] !== undefined || loading.has(id)) return
    loading.add(id)
    void profileAvatarApi
      .get(id)
      .catch(() => null)
      .then((url) => set((s) => ({ images: { ...s.images, [id]: url } })))
      .finally(() => loading.delete(id))
  },

  pickProfileImage: async (id) => {
    const result = await profileAvatarApi.pick(id)
    if (result === null) return 'cancelled'
    if (typeof result !== 'string') return 'unreadable'
    set((s) => ({ images: { ...s.images, [id]: result } }))
    return 'picked'
  },

  removeProfileImage: async (id) => {
    await profileAvatarApi.remove(id)
    set((s) => ({ images: { ...s.images, [id]: null } }))
  },

  reloadProfileImages: () => set({ images: {} })
}))
