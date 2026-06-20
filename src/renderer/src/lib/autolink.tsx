import type { ReactNode } from 'react'

/** Convert a git remote URL (ssh or https) to its web base, or undefined. */
export function remoteWebUrl(url?: string): string | undefined {
  if (!url) return undefined
  const m = /^(?:git@|https?:\/\/(?:[^@/]+@)?)([^:/]+)[:/](.+?)(?:\.git)?\/?$/.exec(url.trim())
  if (m) return `https://${m[1]}/${m[2]}`
  return url.startsWith('http') ? url.replace(/\.git$/, '') : undefined
}

const TOKEN = /(#\d+)|(\B@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)/g

/**
 * Turn `#123` issue/PR refs and `@user` mentions in free text into links to the
 * hosting provider. Plain http(s) URLs in the text are left to the app's global
 * external-link handler. Returns a ReactNode (string when nothing to link).
 */
export function autolink(text: string, repoWebUrl?: string): ReactNode {
  if (!text || !repoWebUrl) return text
  let origin: string
  try {
    origin = new URL(repoWebUrl).origin
  } catch {
    return text
  }
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  let i = 0
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      const n = m[1].slice(1)
      out.push(
        <a key={i++} href={`${repoWebUrl}/issues/${n}`}>
          {m[1]}
        </a>
      )
    } else {
      const user = m[2].slice(1)
      out.push(
        <a key={i++} href={`${origin}/${user}`}>
          {m[2]}
        </a>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : text
}
