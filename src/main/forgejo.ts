import type {
  ConnectedAccount,
  CreatePrOpts,
  CreatePrResult,
  CreateRepoOpts,
  PullRequest,
  RemoteOwner,
  RemoteRepo
} from '../shared/types'

/**
 * Forgejo (and Gitea, whose API it shares) — `/api/v1` on the instance's own
 * address. Every function takes the instance base explicitly: the caller has
 * already checked that the token belongs to it (settings.profileAuth).
 */

const api = (base: string): string => `${base}/api/v1`

/** One place for the auth header and Forgejo's `{ message }` errors. */
export async function fjJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    redirect: 'error',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>)
    }
  })
  if (!res.ok) {
    const d = (await res.json().catch(() => null)) as { message?: unknown } | null
    const msg = typeof d?.message === 'string' ? d.message.trim() : ''
    throw new Error(msg ? `Forgejo: ${msg}` : `Forgejo API error (${res.status})`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

interface FjPull {
  number: number
  title: string
  draft?: boolean
  html_url: string
  user?: { login?: string }
  head?: { ref?: string; sha?: string; repo?: { full_name?: string } | null }
  base?: { ref?: string }
}

/** Forgejo marks a draft with a title prefix on older versions, `draft` on newer ones. */
const WIP = /^\s*(?:\[wip\]|wip:|draft:)\s*/i

export function mapForgejoPull(p: FjPull): PullRequest {
  return {
    id: p.number,
    title: p.title,
    author: p.user?.login ?? 'unknown',
    sourceBranch: p.head?.ref ?? '',
    targetBranch: p.base?.ref ?? '',
    url: p.html_url,
    isDraft: !!p.draft || WIP.test(p.title),
    ...(p.head?.sha ? { headSha: p.head.sha } : {}),
    ...(p.head?.repo?.full_name ? { headRepo: p.head.repo.full_name } : {})
  }
}

export async function listForgejoPulls(base: string, owner: string, repo: string, token: string): Promise<PullRequest[]> {
  const data = await fjJson<FjPull[]>(
    `${api(base)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&limit=50`,
    token
  )
  return data.map(mapForgejoPull)
}

export async function createForgejoPull(
  base: string,
  owner: string,
  repo: string,
  token: string,
  opts: CreatePrOpts
): Promise<CreatePrResult> {
  const d = await fjJson<{ number: number; html_url: string }>(
    `${api(base)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    token,
    {
      method: 'POST',
      // Forgejo's API has no draft flag; the WIP prefix is how its UI marks one.
      body: JSON.stringify({ head: opts.source, base: opts.target, title: opts.draft ? `WIP: ${opts.title}` : opts.title, body: opts.body })
    }
  )
  return { url: d.html_url, number: d.number }
}

/** The page that opens a new pull request in the browser. */
export function forgejoCompareUrl(base: string, owner: string, repo: string, target: string, source: string): string {
  // Branch names keep their slashes (`feat/x`), like the GitHub compare link;
  // only each segment is escaped.
  const ref = (name: string): string => name.split('/').map(encodeURIComponent).join('/')
  return `${base}/${owner}/${repo}/compare/${ref(target)}...${ref(source)}`
}

interface FjRepo {
  full_name: string
  clone_url: string
  private: boolean
  description?: string
  owner?: { avatar_url?: string }
}

export async function listForgejoRepos(base: string, token: string): Promise<RemoteRepo[]> {
  const data = await fjJson<FjRepo[]>(`${api(base)}/user/repos?limit=50`, token)
  return data.map((r) => ({
    name: r.full_name,
    url: r.clone_url,
    private: r.private,
    description: r.description || undefined,
    avatarUrl: r.owner?.avatar_url
  }))
}

interface FjUser {
  id: number
  login: string
  full_name?: string
  avatar_url?: string
  html_url?: string
}

interface FjOrg {
  username?: string
  name?: string
  avatar_url?: string
}

const orgLogin = (o: FjOrg): string => o.username ?? o.name ?? ''

export async function listForgejoOwners(base: string, token: string): Promise<RemoteOwner[]> {
  const user = await fjJson<FjUser>(`${api(base)}/user`, token)
  const orgs = await fjJson<FjOrg[]>(`${api(base)}/user/orgs?limit=50`, token).catch(() => [])
  return [
    { id: user.login, login: user.login, avatarUrl: user.avatar_url, type: 'user' },
    ...orgs.filter(orgLogin).map((o) => ({ id: orgLogin(o), login: orgLogin(o), avatarUrl: o.avatar_url, type: 'org' as const }))
  ]
}

export async function createForgejoRepo(base: string, token: string, opts: CreateRepoOpts): Promise<RemoteRepo> {
  const url =
    opts.ownerType === 'org' ? `${api(base)}/orgs/${encodeURIComponent(opts.owner)}/repos` : `${api(base)}/user/repos`
  const r = await fjJson<FjRepo>(url, token, {
    method: 'POST',
    body: JSON.stringify({ name: opts.name, description: opts.description || undefined, private: opts.private })
  })
  return { name: r.full_name, url: r.clone_url, private: r.private }
}

export async function describeForgejoAccount(base: string, token: string): Promise<ConnectedAccount> {
  const user = await fjJson<FjUser>(`${api(base)}/user`, token)
  const orgs = await fjJson<FjOrg[]>(`${api(base)}/user/orgs?limit=50`, token).catch(() => [])
  return {
    login: user.login,
    name: user.full_name || undefined,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url ?? `${base}/${user.login}`,
    orgs: orgs.filter(orgLogin).map((o) => ({ login: orgLogin(o), avatarUrl: o.avatar_url, url: `${base}/${orgLogin(o)}` }))
  }
}
