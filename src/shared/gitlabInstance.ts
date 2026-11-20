/**
 * GitLab instances: gitlab.com plus the self-managed ones profiles point at.
 *
 * A self-managed GitLab lives at a host of its owner's choosing, sometimes under
 * a path (`https://example.com/gitlab`). An instance is kept as its normalized
 * base URL — https, no trailing slash, no credentials — and a remote belongs to
 * it when the host matches and, for https, the path sits under the base.
 *
 * This is also the security boundary for GitLab tokens: a profile's token is
 * issued by one instance and may only ever be sent to that one.
 */

export const GITLAB_COM = 'https://gitlab.com'

/**
 * A typed-in instance URL in canonical form, or null when it is not one.
 * A bare host gets https. Plain http is refused: the token would cross the
 * network in clear text.
 */
export function normalizeInstanceUrl(raw: string | undefined): string | null {
  const s = raw?.trim()
  if (!s) return null
  let u: URL
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || !u.hostname) return null
  const path = u.pathname.replace(/\/+$/, '')
  return `https://${u.host.toLowerCase()}${path}`
}

/** Kept for readability at GitLab call sites. */
export const normalizeGitlabUrl = normalizeInstanceUrl

/** The instance a profile's GitLab token belongs to: its own URL, else gitlab.com. */
export function profileGitlabBase(gitlabUrl: string | undefined): string {
  return normalizeGitlabUrl(gitlabUrl) ?? GITLAB_COM
}

/** Host and path of a remote URL, https or ssh (`git@host:path`, `ssh://git@host[:port]/path`). */
function remoteParts(url: string): { scheme: 'https' | 'ssh'; host: string; path: string } | null {
  const scp = /^[\w.-]+@([\w.-]+):(?!\/\/)(.+)$/.exec(url)
  if (scp) return { scheme: 'ssh', host: scp[1].toLowerCase(), path: scp[2].replace(/^\/+/, '') }
  try {
    const u = new URL(url)
    const scheme = u.protocol === 'https:' ? 'https' : u.protocol === 'ssh:' ? 'ssh' : null
    if (!scheme) return null
    return { scheme, host: (scheme === 'https' ? u.host : u.hostname).toLowerCase(), path: decodeURIComponent(u.pathname).replace(/^\/+/, '') }
  } catch {
    return null
  }
}

/**
 * Which of `bases` a remote belongs to, and the project path inside it
 * (`group/sub/repo`, `.git` dropped). Provider-neutral: GitLab and Forgejo
 * instances are matched the same way.
 *
 * Over ssh the instance's base path does not appear in the remote (the ssh
 * server serves projects at the root), so only the host is compared.
 */
export function instanceOf(remoteUrl: string, bases: readonly string[]): { base: string; path: string } | null {
  const r = remoteParts(remoteUrl)
  if (!r) return null
  // Longest base first: `example.com/gitlab` must win over `example.com`.
  const sorted = [...new Set(bases)].sort((a, b) => b.length - a.length)
  for (const base of sorted) {
    const b = new URL(base)
    if ((r.scheme === 'https' ? b.host : b.hostname).toLowerCase() !== r.host) continue
    let path = r.path
    if (r.scheme === 'https') {
      const prefix = b.pathname.replace(/^\/+/, '')
      if (prefix) {
        if (!path.startsWith(`${prefix}/`)) continue
        path = path.slice(prefix.length + 1)
      }
    }
    path = path.replace(/\.git$/, '').replace(/\/+$/, '')
    if (!path.includes('/')) continue
    return { base, path }
  }
  return null
}

/** `instanceOf` with gitlab.com always known. */
export function gitlabInstanceOf(
  remoteUrl: string,
  instances: readonly string[]
): { base: string; path: string } | null {
  return instanceOf(remoteUrl, [GITLAB_COM, ...instances])
}

/** Whether a remote sits on the given instance — the check before a token is sent. */
export function remoteIsOnGitlab(remoteUrl: string, base: string): boolean {
  return gitlabInstanceOf(remoteUrl, [base])?.base === base
}

/**
 * Where to create a token for a profile's instance, pre-filled. `api` covers
 * merge requests (create, approve, merge); `write_repository` is what a push
 * over https needs — a read-only token would connect fine and then fail on the
 * first push.
 */
export function gitlabTokenUrl(gitlabUrl: string | undefined): string {
  return `${profileGitlabBase(gitlabUrl)}/-/user_settings/personal_access_tokens?name=Gitcito&scopes=api,write_repository`
}

// ─── Forgejo / Gitea ────────────────────────────────────────────────────────
// Always at an address of its owner's choosing (codeberg.org is just a public
// one), so unlike GitLab there is no default instance.

/** The Forgejo instance a profile's token belongs to, or null when it names none. */
export function profileForgejoBase(forgejoUrl: string | undefined): string | null {
  return normalizeInstanceUrl(forgejoUrl)
}

/** Which configured Forgejo a remote is on, and its `owner/repo`. */
export function forgejoInstanceOf(remoteUrl: string, instances: readonly string[]): { base: string; path: string } | null {
  const hit = instanceOf(remoteUrl, instances)
  // Forgejo repositories are exactly owner/repo — no subgroups.
  return hit && hit.path.split('/').length === 2 ? hit : null
}

/** Whether a remote sits on the given Forgejo — the check before its token is sent. */
export function remoteIsOnForgejo(remoteUrl: string, base: string | null): boolean {
  return !!base && forgejoInstanceOf(remoteUrl, [base])?.base === base
}

/** Where to create a token on a Forgejo instance. */
export function forgejoTokenUrl(forgejoUrl: string | undefined): string | null {
  const base = profileForgejoBase(forgejoUrl)
  return base ? `${base}/user/settings/applications` : null
}
