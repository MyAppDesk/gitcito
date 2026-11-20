import { apiToken, credentialFor, providerOfHost } from './credentials'
import { activeProfileAuth, boundProfileAuth, readSettings } from './settings'
import { pickHostAuth } from '../shared/hostToken'
import { parseRemoteUrl } from './hosting'
import type { RemoteAuthCheck, RepoHost } from '../shared/types'

/**
 * "Which account will this push use, and can it?" — per remote.
 *
 * Resolves the credential the same way a push does (`withRemoteAuth` in
 * git.ts), then asks the host about it: GitHub reports a token's scopes in
 * `X-OAuth-Scopes`, GitLab describes a PAT at `/personal_access_tokens/self`.
 * Read-only on both sides. A token is only ever sent to the host it belongs to
 * — the provider is derived from the remote's own hostname — and never leaves
 * the main process: the renderer sees the login and the scopes, nothing else.
 */

const TIMEOUT_MS = 8000

// ─── Pure readings (tested) ─────────────────────────────────────────────────

/** The URL with any `user:password@` removed — what is safe to show. */
export function urlWithoutUserinfo(url: string): string {
  try {
    const u = new URL(url)
    if (!u.username && !u.password) return url
    u.username = ''
    u.password = ''
    return u.toString()
  } catch {
    return url
  }
}

/** ssh, an https URL with a password in it, or plain https. */
export function remoteUrlKind(url: string): 'ssh' | 'embedded' | 'https' | 'other' {
  if (/^ssh:\/\//i.test(url) || /^[\w.-]+@[\w.-]+:/.test(url)) return 'ssh'
  if (!/^https?:\/\//i.test(url)) return 'other'
  try {
    return new URL(url).password ? 'embedded' : 'https'
  } catch {
    return 'other'
  }
}

/** `X-OAuth-Scopes: repo, workflow` → ['repo', 'workflow']. Null when the header is absent. */
export function parseScopeHeader(header: string | null): string[] | null {
  if (header === null) return null
  return header
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * What GitHub scopes allow. Absent header → a fine-grained token or an app
 * token, whose permissions the API does not list: unknown, not "no".
 */
export function githubScopeVerdict(scopes: string[] | null): Pick<RemoteAuthCheck, 'scopes' | 'canPush' | 'canPushWorkflows'> {
  if (!scopes) return {}
  return {
    scopes,
    canPush: scopes.includes('repo') || scopes.includes('public_repo'),
    canPushWorkflows: scopes.includes('workflow')
  }
}

/** GitLab: `write_repository` (or the all-purpose `api`) is what a push needs. */
export function gitlabScopeVerdict(scopes: string[] | null): Pick<RemoteAuthCheck, 'scopes' | 'canPush'> {
  if (!scopes) return {}
  return { scopes, canPush: scopes.includes('write_repository') || scopes.includes('api') }
}

// ─── Asking the host ────────────────────────────────────────────────────────

async function get(url: string, headers: Record<string, string>): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'Gitcito', ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch {
    return null
  }
}

type HostVerdict = Pick<RemoteAuthCheck, 'login' | 'rejected' | 'scopes' | 'canPush' | 'canPushWorkflows'>

async function askGithub(token: string): Promise<HostVerdict> {
  const res = await get('https://api.github.com/user', {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json'
  })
  if (!res) return {}
  if (res.status === 401) return { rejected: true }
  if (!res.ok) return {}
  const body = (await res.json().catch(() => ({}))) as { login?: unknown }
  return {
    ...(typeof body.login === 'string' ? { login: body.login } : {}),
    ...githubScopeVerdict(parseScopeHeader(res.headers.get('x-oauth-scopes')))
  }
}

async function askGitlab(base: string, token: string): Promise<HostVerdict> {
  // The instance's own base — a self-managed GitLab may live under a path.
  const api = `${base}/api/v4`
  const user = await get(`${api}/user`, { Authorization: `Bearer ${token}` })
  if (!user) return {}
  if (user.status === 401) return { rejected: true }
  if (!user.ok) return {}
  const body = (await user.json().catch(() => ({}))) as { username?: unknown }
  const login = typeof body.username === 'string' ? { login: body.username } : {}
  // Only a personal/project/group access token describes itself; an OAuth
  // token gets a 4xx here and its scopes stay unknown.
  const self = await get(`${api}/personal_access_tokens/self`, { 'PRIVATE-TOKEN': token })
  if (!self?.ok) return login
  const info = (await self.json().catch(() => ({}))) as { scopes?: unknown }
  const scopes = Array.isArray(info.scopes) ? info.scopes.filter((s): s is string => typeof s === 'string') : null
  return { ...login, ...gitlabScopeVerdict(scopes) }
}

/** Forgejo lists no token scopes over its API: who it is, or that it was refused. */
async function askForgejo(base: string, token: string): Promise<HostVerdict> {
  const res = await get(`${base}/api/v1/user`, { Authorization: `token ${token}`, Accept: 'application/json' })
  if (!res) return {}
  if (res.status === 401) return { rejected: true }
  if (!res.ok) return {}
  const body = (await res.json().catch(() => ({}))) as { login?: unknown }
  return typeof body.login === 'string' ? { login: body.login } : {}
}

/**
 * Ask the host the token belongs to. `remoteUrl` decides the instance: the
 * caller already made sure the token is that instance's (`profileAuth`).
 */
function askHost(provider: RepoHost, remoteUrl: string, host: string, token: string): Promise<HostVerdict> {
  const base = parseRemoteUrl(remoteUrl)?.base
  if (provider === 'github') return askGithub(token)
  if (provider === 'gitlab') return askGitlab(base ?? `https://${host}`, token)
  if (provider === 'forgejo' && base) return askForgejo(base, token)
  // Azure DevOps and Bitbucket do not report a token's scopes in a way worth a
  // round-trip here: the source and profile are still shown.
  return Promise.resolve({})
}

// ─── Per remote ─────────────────────────────────────────────────────────────

async function profileName(repoPath: string): Promise<{ name?: string; bound: boolean }> {
  const s = await readSettings()
  const boundId = s.repoProfiles?.[repoPath]
  const bound = !!boundId && s.profiles.some((p) => p.id === boundId)
  const id = bound ? boundId : s.activeProfileId
  const p = s.profiles.find((x) => x.id === id) ?? s.profiles[0]
  return { name: p?.name, bound }
}

export async function checkRemoteAuth(repoPath: string, remote: string, pushUrl: string): Promise<RemoteAuthCheck> {
  const url = urlWithoutUserinfo(pushUrl)
  const kind = remoteUrlKind(pushUrl)
  if (kind === 'ssh' || kind === 'other') return { remote, url, source: kind === 'ssh' ? 'ssh' : 'none' }

  let host: string | undefined
  try {
    host = new URL(pushUrl).host
  } catch {
    host = undefined
  }
  const provider = host ? providerOfHost(new URL(pushUrl).hostname) : undefined
  const base = { remote, url, ...(provider ? { provider } : {}) }

  // git uses a password in the URL before asking any helper.
  if (kind === 'embedded') {
    const password = decodeURIComponent(new URL(pushUrl).password)
    return { ...base, source: 'embedded', ...(provider && host ? await askHost(provider, pushUrl, host, password) : {}) }
  }

  if (provider && host) {
    const auth = await pickHostAuth({
      // The remote's URL is what lets profileAuth refuse a token from another
      // GitLab/Forgejo instance — without it, the check would ask the wrong server.
      bound: await boundProfileAuth(provider, repoPath, pushUrl),
      active: () => activeProfileAuth(provider, pushUrl)
    })
    if (auth.token || auth.link) {
      const who = await profileName(repoPath)
      const profile = { ...(who.name ? { profile: who.name } : {}), bound: who.bound }
      if (auth.token) return { ...base, ...profile, source: 'token', ...(await askHost(provider, pushUrl, host, auth.token)) }
      const link = auth.link as NonNullable<typeof auth.link>
      const linked = await apiToken(pushUrl, { link }).catch(() => null)
      if (!linked) return { ...base, ...profile, source: link.source, login: link.login, linkMissing: true }
      return { ...base, ...profile, source: link.source, login: link.login, ...(await askHost(provider, pushUrl, host, linked.token)) }
    }
  }

  // No profile credential: git's own helper answers, if it has anything.
  const cred = await credentialFor(pushUrl, { repoPath }).catch(() => null)
  if (!cred) return { ...base, source: 'none' }
  return {
    ...base,
    source: 'helper',
    ...(cred.username ? { login: cred.username } : {}),
    ...(provider && host ? await askHost(provider, pushUrl, host, cred.password) : {})
  }
}
