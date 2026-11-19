import { create } from 'zustand'
import { profileAvatarApi } from '../infrastructure/api'
import { t } from '../i18n'

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
  /** Ask for a file and store it. Resolves `'unreadable'` or `'tooLarge'` when it was refused. */
  pickProfileImage(id: string): Promise<'picked' | 'cancelled' | 'unreadable' | 'tooLarge'>
  removeProfileImage(id: string): Promise<void>
  /** Forget what is in memory, so the next render reads the stored files again (after an import). */
  reloadProfileImages(): void
}

const loading = new Set<string>()

// Bumped by every pick and remove. A load started before one of those must not
// land after it and put the old picture back, so it only applies when the
// generation it started under is still current.
const generation = new Map<string, number>()
const bump = (id: string): void => void generation.set(id, (generation.get(id) ?? 0) + 1)

export const useProfileAvatarsStore = create<ProfileAvatarsState>((set, get) => ({
  images: {},

  ensureProfileImage: (id) => {
    if (get().images[id] !== undefined || loading.has(id)) return
    loading.add(id)
    const started = generation.get(id) ?? 0
    void profileAvatarApi
      .get(id)
      .catch(() => null)
      .then((url) => {
        if ((generation.get(id) ?? 0) === started) set((s) => ({ images: { ...s.images, [id]: url } }))
      })
      .finally(() => loading.delete(id))
  },

  pickProfileImage: async (id) => {
    const result = await profileAvatarApi.pick(id, t('profileAvatar.dialogTitle'), t('profileAvatar.dialogFilter'))
    if (result === null) return 'cancelled'
    if (typeof result !== 'string') return result.error === 'tooLarge' ? 'tooLarge' : 'unreadable'
    bump(id)
    set((s) => ({ images: { ...s.images, [id]: result } }))
    return 'picked'
  },

  removeProfileImage: async (id) => {
    await profileAvatarApi.remove(id)
    bump(id)
    set((s) => ({ images: { ...s.images, [id]: null } }))
  },

  reloadProfileImages: () => set({ images: {} })
}))
