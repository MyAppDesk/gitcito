import { useState } from 'react'
import { Github, Gitlab, Cloud, Server } from 'lucide-react'

function parseRemoteOwner(url: string): { host: string; owner: string } | null {
  const u = url.trim()
  let m = u.match(/^https?:\/\/([^/]+)\/([^/]+)\//)
  if (m) return { host: m[1].toLowerCase(), owner: m[2] }
  m = u.match(/^[^@]+@([^:]+):([^/]+)\//)
  if (m) return { host: m[1].toLowerCase(), owner: m[2] }
  return null
}

export function remoteAvatarUrl(url?: string): string | null {
  if (!url) return null
  const parsed = parseRemoteOwner(url)
  if (!parsed) return null
  if (parsed.host.includes('github.com')) {
    return `https://avatars.githubusercontent.com/${parsed.owner}?s=32`
  }
  if (parsed.host.includes('gitlab')) {
    return `https://gitlab.com/${parsed.owner}.png`
  }
  return null
}

export function RemoteIcon({ url, size = 13 }: { url?: string; size?: number }): React.JSX.Element {
  const [imgFailed, setImgFailed] = useState(false)
  const avatarUrl = remoteAvatarUrl(url)
  const u = (url ?? '').toLowerCase()

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
        onError={() => setImgFailed(true)}
        draggable={false}
      />
    )
  }

  if (u.includes('github.com')) return <Github size={size} />
  if (u.includes('gitlab.com') || u.includes('gitlab')) return <Gitlab size={size} />
  if (u.includes('bitbucket.org') || u.includes('bitbucket')) return <Cloud size={size} />
  if (u.includes('dev.azure.com') || u.includes('visualstudio.com') || u.includes('azure')) return <Server size={size} />
  return <Cloud size={size} />
}
