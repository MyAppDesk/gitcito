import { useEffect, useMemo, useState } from 'react'
import { Blobatar } from 'blobatar/react'
import { happy, idle, mad, sad, scared, sick, sleepy, thinking, unsure } from 'blobatar/expression'
import { useSettingsStore } from '../stores/settings'
import { generatedAvatar, gravatarUrl } from '../lib/avatar'
import type { Mood } from '../lib/repoMood'

interface AvatarProps {
  email?: string
  name?: string
  size?: number
  className?: string
  title?: string
  /**
   * Which pose the generated fallback holds. Omitted everywhere but the
   * title-bar profile avatar: a pose costs inline SVG instead of a cached
   * `<img>`, and a commit author from three years ago has no opinion about
   * today's working tree.
   */
  mood?: Mood
  /** Idle motion. Only honoured alongside `mood`, for the same reason. */
  animate?: boolean
}

// Poses are values rather than names so the ones nobody imports stay out of the
// bundle — blobatar's core carries no pose code at all.
const POSES = { idle, happy, sad, mad, thinking, scared, unsure, sick, sleepy }

/**
 * A person avatar. Shows a Gravatar when available (and enabled in settings),
 * otherwise a deterministic generated avatar derived from the email/name.
 */
export function Avatar({
  email,
  name,
  size = 24,
  className,
  title,
  mood,
  animate
}: AvatarProps): React.JSX.Element {
  const enabled = useSettingsStore((s) => s.settings.commitAvatars ?? true)
  const seed = (email || name || '?').toLowerCase()
  const gen = useMemo(() => generatedAvatar(seed), [seed])
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setPhoto(null)
    if (!enabled || !email) return
    void gravatarUrl(email, Math.round(size * 2)).then((u) => {
      if (alive) setPhoto(u)
    })
    return () => {
      alive = false
    }
  }, [email, size, enabled])

  // An expressive blob is inline SVG, which a photo cannot be — so a Gravatar
  // still wins, and the pose is what you get when there is none.
  const expressive = mood && !photo

  return (
    <span
      className={`ava${className ? ` ${className}` : ''}`}
      title={title ?? email ?? name}
      // The background is the static blob; with a pose the SVG paints itself.
      style={{ width: size, height: size, backgroundImage: expressive ? undefined : `url("${gen}")` }}
    >
      {expressive && (
        <Blobatar
          name={seed}
          background="circle"
          expression={POSES[mood]}
          // `animate` has to be absent, not false: the prop union switches
          // rendering mode on its presence.
          {...(animate ? ({ animate: 'always' } as const) : {})}
        />
      )}
      {photo && (
        <img src={photo} alt="" loading="lazy" draggable={false} onError={() => setPhoto(null)} />
      )}
    </span>
  )
}
