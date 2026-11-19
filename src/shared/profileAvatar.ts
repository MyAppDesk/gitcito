import type { ProfileAvatar, RepoHost } from './types'

/**
 * A profile's avatar: where its picture comes from, and the pure rules both
 * processes share. The image itself never lives in the settings JSON — it is a
 * PNG in the user-data folder, keyed by profile id (see main/profileAvatar.ts) —
 * so settings stay small and a picture is only shipped when the user exports.
 */

/** Longest side an avatar is stored at. The largest place it is drawn is the
 *  settings preview at 64 px; 256 keeps it sharp at 4× without bloating exports. */
export const AVATAR_MAX_SIDE = 256

/** A stored image larger than this is refused on import — a 256 px PNG is far smaller. */
export const AVATAR_MAX_BYTES = 1024 * 1024

/** Icon ids offered for an icon avatar. Ids, not components: settings are JSON,
 *  and the renderer maps each id to its glyph (components/ProfileAvatar.tsx). */
export const PROFILE_AVATAR_ICONS = [
  'user',
  'smile',
  'briefcase',
  'home',
  'code',
  'terminal',
  'rocket',
  'bug',
  'zap',
  'flame',
  'star',
  'heart',
  'coffee',
  'gamepad',
  'music',
  'palette',
  'leaf',
  'sun',
  'moon',
  'ghost',
  'cat',
  'dog',
  'bird',
  'shield'
] as const

export type ProfileAvatarIcon = (typeof PROFILE_AVATAR_ICONS)[number]

/** Background colours for an icon avatar — each readable under a white glyph. */
export const PROFILE_AVATAR_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22a06b',
  '#d97706',
  '#e5484d',
  '#d6409f',
  '#8e4ec6',
  '#64748b'
] as const

/**
 * Whether `id` is safe to use as a file name under the avatars folder. Profile
 * ids are generated, but they also arrive in imported settings files, so a
 * `../` or a path separator must never reach the filesystem.
 */
export function isProfileAvatarId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)
}

const DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/

/**
 * The base64 payload of an imported avatar, or null. Only PNG data URLs within
 * the size limit pass; the main process still decodes it as an image before
 * writing anything, so this is the cheap gate, not the only one.
 */
export function avatarDataUrlPayload(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = DATA_URL.exec(value)
  if (!m) return null
  // base64 inflates by 4/3; reject before decoding anything that large.
  if ((m[1].length * 3) / 4 > AVATAR_MAX_BYTES) return null
  return m[1]
}

/** The size to scale an image to so its longest side is at most `max`. Never upscales. */
export function avatarFitSize(width: number, height: number, max = AVATAR_MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max || longest <= 0) return { width, height }
  const scale = max / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * A well-formed avatar setting, or undefined. Settings files are imported and
 * hand-edited, so an unknown icon or a colour that is not a hex value falls
 * back instead of reaching the DOM as a style.
 */
export function validProfileAvatar(value: unknown): ProfileAvatar | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const color = typeof v.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : undefined
  switch (v.source) {
    case 'auto':
      return { source: 'auto' }
    case 'image':
      return { source: 'image' }
    case 'icon': {
      const icon = (PROFILE_AVATAR_ICONS as readonly string[]).includes(v.icon as string) ? (v.icon as string) : 'user'
      return { source: 'icon', icon, color: color ?? PROFILE_AVATAR_COLORS[0] }
    }
    case 'account': {
      const host = v.accountHost === 'github' || v.accountHost === 'gitlab' ? v.accountHost : undefined
      const url = typeof v.accountUrl === 'string' && /^https:\/\//.test(v.accountUrl) ? v.accountUrl : undefined
      return host && url ? { source: 'account', accountHost: host, accountUrl: url } : undefined
    }
    default:
      return undefined
  }
}

/**
 * The address hosting sites keep private for an account. A commit carries only
 * a name and an email; GitHub and GitLab show their account picture on commits
 * whose email belongs to that account — and this one always does, without
 * publishing the real address. Other hosts have no such address.
 */
export function noreplyEmail(host: RepoHost, id: number | undefined, login: string): string | null {
  if (!id || !Number.isInteger(id) || id <= 0 || !/^[A-Za-z0-9._-]+$/.test(login)) return null
  if (host === 'github') return `${id}+${login}@users.noreply.github.com`
  if (host === 'gitlab') return `${id}-${login}@users.noreply.gitlab.com`
  return null
}
