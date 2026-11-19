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

/** Largest side and pixel count an image may declare before it is decoded. The
 *  file-size cap alone does not bound memory: a tiny PNG can claim 50 000 × 50 000. */
export const AVATAR_MAX_DECODE_SIDE = 4096
export const AVATAR_MAX_DECODE_PIXELS = 16 * 1024 * 1024

/**
 * The dimensions a PNG or JPEG declares in its header, read without decoding
 * anything. Null for any other format, or a header too short to say — and
 * nativeImage decodes only these two, so null means "not an avatar".
 */
export function imageHeaderSize(buf: Uint8Array): { width: number; height: number } | null {
  const u32 = (i: number): number => ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]) >>> 0
  const u16 = (i: number): number => (buf[i] << 8) | buf[i + 1]
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buf.length >= 24 && PNG.every((b, i) => buf[i] === b)) {
    // IHDR is always the first chunk: length, 'IHDR', width, height.
    if (String.fromCharCode(buf[12], buf[13], buf[14], buf[15]) !== 'IHDR') return null
    return { width: u32(16), height: u32(20) }
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 3 < buf.length) {
      if (buf[i] !== 0xff) return null
      const marker = buf[i + 1]
      // Fill bytes, and the markers that carry no length.
      if (marker === 0xff) {
        i++
        continue
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2
        continue
      }
      const len = u16(i + 2)
      if (len < 2) return null
      // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC), which share the range.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (i + 9 > buf.length) return null
        return { width: u16(i + 7), height: u16(i + 5) }
      }
      if (marker === 0xda || marker === 0xd9) return null
      i += 2 + len
    }
  }
  return null
}

/** Whether an image's header is one nativeImage can be trusted to decode within bounds. */
export function avatarHeaderOk(buf: Uint8Array): boolean {
  if (buf.length > AVATAR_MAX_BYTES) return false
  const size = imageHeaderSize(buf)
  if (!size || size.width <= 0 || size.height <= 0) return false
  if (size.width > AVATAR_MAX_DECODE_SIDE || size.height > AVATAR_MAX_DECODE_SIDE) return false
  return size.width * size.height <= AVATAR_MAX_DECODE_PIXELS
}

/**
 * Hosts an account picture may be loaded from, per integration — the ones the
 * account lookup in main/hosting.ts actually returns. The URL is drawn as an
 * <img>, and settings files are imported, so an arbitrary https URL would make
 * the app fetch from whatever host the file names.
 */
const ACCOUNT_AVATAR_HOSTS: Record<'github' | 'gitlab', readonly string[]> = {
  github: ['avatars.githubusercontent.com'],
  // gitlab.com serves uploaded pictures itself and falls back to Gravatar.
  gitlab: ['gitlab.com', 'secure.gravatar.com', 'www.gravatar.com']
}

export function isAccountAvatarUrl(host: 'github' | 'gitlab', value: unknown): value is string {
  if (typeof value !== 'string') return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  return ACCOUNT_AVATAR_HOSTS[host].includes(url.hostname)
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
      const url = host && isAccountAvatarUrl(host, v.accountUrl) ? v.accountUrl : undefined
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
