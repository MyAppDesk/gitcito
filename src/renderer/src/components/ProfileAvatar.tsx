import { useEffect, useState } from 'react'
import {
  Bird,
  Bug,
  Briefcase,
  Cat,
  Code2,
  Coffee,
  Dog,
  Flame,
  Gamepad2,
  Ghost,
  Heart,
  House,
  Leaf,
  Moon,
  Music,
  Palette,
  Rocket,
  Shield,
  Smile,
  Star,
  Sun,
  Terminal,
  User,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { Avatar } from './Avatar'
import { useProfileAvatarsStore } from '../stores/profileAvatars'
import { validProfileAvatar, type ProfileAvatarIcon } from '../../../shared/profileAvatar'
import type { Profile } from '../../../shared/types'
import type { Mood } from '../lib/repoMood'

/** Glyph for each icon id a profile can store (shared/profileAvatar.ts). */
export const PROFILE_AVATAR_GLYPHS: Record<ProfileAvatarIcon, LucideIcon> = {
  user: User,
  smile: Smile,
  briefcase: Briefcase,
  home: House,
  code: Code2,
  terminal: Terminal,
  rocket: Rocket,
  bug: Bug,
  zap: Zap,
  flame: Flame,
  star: Star,
  heart: Heart,
  coffee: Coffee,
  gamepad: Gamepad2,
  music: Music,
  palette: Palette,
  leaf: Leaf,
  sun: Sun,
  moon: Moon,
  ghost: Ghost,
  cat: Cat,
  dog: Dog,
  bird: Bird,
  shield: Shield
}

/**
 * A profile's picture, from whichever source the profile chose. Anything that
 * cannot be shown — an image file that is gone, an account picture that fails
 * to load — falls back to the automatic avatar rather than an empty circle.
 *
 * `mood`/`animate` only reach the automatic avatar: a chosen picture is the
 * user's, and is shown as they chose it.
 */
export function ProfileAvatar({
  profile,
  size = 24,
  mood,
  animate,
  className
}: {
  profile: Profile
  size?: number
  mood?: Mood
  animate?: boolean
  className?: string
}): React.JSX.Element {
  const avatar = validProfileAvatar(profile.avatar) ?? { source: 'auto' as const }
  const image = useProfileAvatarsStore((s) => s.images[profile.id])
  const ensureProfileImage = useProfileAvatarsStore((s) => s.ensureProfileImage)
  // The URL that failed, not a flag: picking another account picture retries.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (avatar.source === 'image') ensureProfileImage(profile.id)
  }, [avatar.source, profile.id, ensureProfileImage])

  const frame = { width: size, height: size }
  const cls = `ava${className ? ` ${className}` : ''}`

  if (avatar.source === 'image' && image) {
    return (
      <span className={cls} style={frame}>
        <img src={image} alt="" draggable={false} />
      </span>
    )
  }
  if (avatar.source === 'account' && avatar.accountUrl !== failedUrl) {
    return (
      <span className={cls} style={frame}>
        <img src={avatar.accountUrl} alt="" draggable={false} onError={() => setFailedUrl(avatar.accountUrl)} />
      </span>
    )
  }
  if (avatar.source === 'icon') {
    const Glyph = PROFILE_AVATAR_GLYPHS[avatar.icon as ProfileAvatarIcon] ?? User
    return (
      <span className={`${cls} ava-icon`} style={{ ...frame, background: avatar.color }}>
        <Glyph size={Math.round(size * 0.58)} strokeWidth={2.2} />
      </span>
    )
  }
  return <Avatar email={profile.gitEmail} name={profile.name} size={size} mood={mood} animate={animate} className={className} />
}
