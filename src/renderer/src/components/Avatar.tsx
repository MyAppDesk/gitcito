import { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../stores/settings'
import { generatedAvatar, gravatarUrl } from '../lib/avatar'

interface AvatarProps {
  email?: string
  name?: string
  size?: number
  className?: string
  title?: string
}

/**
 * A person avatar. Shows a Gravatar when available (and enabled in settings),
 * otherwise a deterministic generated avatar derived from the email/name.
 */
export function Avatar({ email, name, size = 24, className, title }: AvatarProps): React.JSX.Element {
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

  return (
    <span
      className={`ava${className ? ` ${className}` : ''}`}
      title={title ?? email ?? name}
      style={{ width: size, height: size, backgroundImage: `url("${gen}")` }}
    >
      {photo && (
        <img src={photo} alt="" loading="lazy" draggable={false} onError={() => setPhoto(null)} />
      )}
    </span>
  )
}
