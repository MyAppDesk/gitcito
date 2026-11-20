import type {
  ConnectedAccount,
  CreatePrOpts,
  CreatePrResult,
  CreateRepoOpts,
  GitHubNotification,
  IssueDetail,
  IssueInfo,
  MilestoneInfo,
  PullRequest,
  ReleaseInfo,
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
async function fjResponse(url: string, token: string, init?: RequestInit): Promise<Response> {
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
  return res
}

export async function fjJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const text = await (await fjResponse(url, token, init)).text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** One page of a Forgejo list, with the total the server reports, if it does. */
export interface FjPage<T> {
  items: T[]
  total?: number
}

/**
 * Walk a Forgejo list to its end. The server caps a page at its own
 * MAX_RESPONSE_ITEMS (50 by default, lower if its admin chose) whatever `limit`
 * asks for, so a page shorter than the limit does not prove the end. The
 * X-Total-Count header does; without it, the first page's length is taken as
 * the real page size and a shorter or empty page ends the walk.
 */
export async function forgejoPages<T>(fetchPage: (page: number) => Promise<FjPage<T>>, maxPages = 20): Promise<T[]> {
  const out: T[] = []
  let size = 0
  for (let page = 1; page <= maxPages; page++) {
    const { items, total } = await fetchPage(page)
    out.push(...items)
    if (page === 1) size = items.length
    if (items.length === 0) break
    if (total !== undefined ? out.length >= total : items.length < size) break
  }
  return out
}

/** Every item of a Forgejo list endpoint (up to `maxPages` pages). */
async function fjList<T>(url: string, token: string, maxPages?: number): Promise<T[]> {
  const sep = url.includes('?') ? '&' : '?'
  return forgejoPages(async (page) => {
    const res = await fjResponse(`${url}${sep}limit=50&page=${page}`, token)
    const text = await res.text()
    const header = res.headers.get('x-total-count')
    const total = header === null ? NaN : Number(header)
    return { items: (text ? JSON.parse(text) : []) as T[], ...(Number.isFinite(total) ? { total } : {}) }
  }, maxPages)
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
  const data = await fjList<FjPull>(
    `${api(base)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open`,
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
  const data = await fjList<FjRepo>(`${api(base)}/user/repos`, token)
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
  const orgs = await fjList<FjOrg>(`${api(base)}/user/orgs`, token).catch(() => [])
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
  const orgs = await fjList<FjOrg>(`${api(base)}/user/orgs`, token).catch(() => [])
  return {
    login: user.login,
    name: user.full_name || undefined,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url ?? `${base}/${user.login}`,
    orgs: orgs.filter(orgLogin).map((o) => ({ login: orgLogin(o), avatarUrl: o.avatar_url, url: `${base}/${orgLogin(o)}` }))
  }
}

// ── Issues, milestones, releases, notifications ─────────────────────────────

const repoPath = (owner: string, repo: string): string => `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

interface FjIssue {
  number: number
  title: string
  body?: string | null
  user?: { login?: string } | null
  state: string
  html_url: string
  comments?: number
  created_at?: string
  labels?: Array<{ name?: string }> | null
  assignees?: Array<{ login?: string }> | null
  milestone?: { title?: string } | null
  /** Set when the "issue" is a pull request (Forgejo lists both under /issues). */
  pull_request?: unknown
}

export function mapForgejoIssue(i: FjIssue): IssueInfo {
  return {
    number: i.number,
    title: i.title,
    author: i.user?.login ?? 'unknown',
    state: i.state === 'closed' ? 'closed' : 'open',
    url: i.html_url,
    comments: i.comments ?? 0
  }
}

/** Open issues — `type=issues` keeps pull requests out, as GitHub's list filters them. */
export async function listForgejoIssues(base: string, owner: string, repo: string, token: string): Promise<IssueInfo[]> {
  const data = await fjList<FjIssue>(`${api(base)}/repos/${repoPath(owner, repo)}/issues?state=open&type=issues`, token)
  return data.filter((i) => !i.pull_request).map(mapForgejoIssue)
}

export async function forgejoIssueDetail(
  base: string,
  owner: string,
  repo: string,
  token: string,
  number: number
): Promise<IssueDetail> {
  const at = `${api(base)}/repos/${repoPath(owner, repo)}/issues/${number}`
  const [i, comments] = await Promise.all([
    fjJson<FjIssue>(at, token),
    fjList<{ user?: { login?: string } | null; body?: string; created_at?: string }>(`${at}/comments`, token)
  ])
  return {
    ...mapForgejoIssue(i),
    body: i.body ?? '',
    labels: (i.labels ?? []).map((l) => l.name ?? '').filter(Boolean),
    assignees: (i.assignees ?? []).map((a) => a.login ?? '').filter(Boolean),
    milestone: i.milestone?.title ?? null,
    createdAt: i.created_at ?? '',
    comments: comments.map((c) => ({ author: c.user?.login ?? 'unknown', body: c.body ?? '', createdAt: c.created_at ?? '' })),
    // GitHub-only: the timeline's cross-references and Projects v2 fields.
    linkedPrs: [],
    projectFields: []
  }
}

export async function setForgejoIssueState(
  base: string,
  owner: string,
  repo: string,
  token: string,
  number: number,
  state: 'open' | 'closed'
): Promise<void> {
  await fjJson(`${api(base)}/repos/${repoPath(owner, repo)}/issues/${number}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ state })
  })
}

export async function createForgejoIssue(
  base: string,
  owner: string,
  repo: string,
  token: string,
  opts: { title: string; body?: string }
): Promise<{ number: number; url: string }> {
  const d = await fjJson<{ number: number; html_url: string }>(`${api(base)}/repos/${repoPath(owner, repo)}/issues`, token, {
    method: 'POST',
    body: JSON.stringify({ title: opts.title, body: opts.body || '' })
  })
  return { number: d.number, url: d.html_url }
}

interface FjMilestone {
  id: number
  title: string
  description?: string | null
  state: string
  due_on?: string | null
  open_issues?: number
  closed_issues?: number
}

/** A milestone has no html_url in Forgejo's API; its page is /owner/repo/milestone/<id>. */
export function mapForgejoMilestone(base: string, owner: string, repo: string, m: FjMilestone): MilestoneInfo {
  return {
    number: m.id,
    title: m.title,
    description: m.description ?? '',
    state: m.state === 'closed' ? 'closed' : 'open',
    dueOn: m.due_on ?? null,
    openIssues: m.open_issues ?? 0,
    closedIssues: m.closed_issues ?? 0,
    url: `${base}/${repoPath(owner, repo)}/milestone/${m.id}`
  }
}

export async function listForgejoMilestones(base: string, owner: string, repo: string, token: string): Promise<MilestoneInfo[]> {
  const data = await fjList<FjMilestone>(`${api(base)}/repos/${repoPath(owner, repo)}/milestones?state=all`, token)
  return data.map((m) => mapForgejoMilestone(base, owner, repo, m))
}

export async function forgejoMilestoneIssues(
  base: string,
  owner: string,
  repo: string,
  token: string,
  id: number
): Promise<IssueInfo[]> {
  const data = await fjList<FjIssue>(
    `${api(base)}/repos/${repoPath(owner, repo)}/issues?state=all&type=issues&milestones=${id}`,
    token
  )
  return data.filter((i) => !i.pull_request).map(mapForgejoIssue)
}

interface FjRelease {
  id: number
  tag_name?: string | null
  name?: string | null
  body?: string | null
  draft?: boolean
  prerelease?: boolean
  published_at?: string | null
  html_url: string
}

export function mapForgejoRelease(r: FjRelease): ReleaseInfo {
  return {
    id: r.id,
    tag: r.tag_name || null,
    name: r.name || null,
    body: r.body ?? null,
    publishedAt: r.draft ? null : (r.published_at ?? null),
    url: r.html_url,
    prerelease: !!r.prerelease,
    draft: !!r.draft
  }
}

export async function listForgejoReleases(base: string, owner: string, repo: string, token: string): Promise<ReleaseInfo[]> {
  // Releases are many and old ones rarely matter: two requests' worth is plenty.
  const data = await fjList<FjRelease>(`${api(base)}/repos/${repoPath(owner, repo)}/releases`, token, 2)
  return data.map(mapForgejoRelease)
}

interface FjNotification {
  id: number
  unread: boolean
  updated_at: string
  subject?: { title?: string; type?: string; html_url?: string; url?: string } | null
  repository?: { full_name?: string; html_url?: string } | null
}

/** The id prefix that routes a notification back to Forgejo when it is marked read. */
export const FORGEJO_NOTIFICATION = 'fj:'

/** Forgejo's subject types, in the vocabulary of the notifications page. */
const SUBJECT: Record<string, string> = { Pull: 'PullRequest', Issue: 'Issue', Commit: 'Commit', Repository: 'Repository' }

export function mapForgejoNotification(n: FjNotification): GitHubNotification {
  const htmlUrl = n.subject?.html_url ?? ''
  const tail = htmlUrl.split('/').pop() ?? ''
  return {
    id: `${FORGEJO_NOTIFICATION}${n.id}`,
    // Forgejo gives no reason (mention, review request…), only the subject.
    reason: '',
    title: n.subject?.title ?? '',
    type: SUBJECT[n.subject?.type ?? ''] ?? (n.subject?.type || ''),
    repoFullName: n.repository?.full_name ?? '',
    repoUrl: n.repository?.html_url ?? '',
    number: /^\d+$/.test(tail) ? Number(tail) : null,
    unread: n.unread,
    updatedAt: Math.floor(new Date(n.updated_at).getTime() / 1000),
    url: htmlUrl || n.repository?.html_url || ''
  }
}

export async function listForgejoNotifications(base: string, token: string, all: boolean): Promise<GitHubNotification[]> {
  const data = await fjList<FjNotification>(`${api(base)}/notifications?all=${all ? 'true' : 'false'}`, token, 2)
  return data.map(mapForgejoNotification)
}

export async function markForgejoNotificationRead(base: string, token: string, id: string): Promise<void> {
  const n = id.startsWith(FORGEJO_NOTIFICATION) ? id.slice(FORGEJO_NOTIFICATION.length) : id
  if (!/^\d+$/.test(n)) return
  await fjJson(`${api(base)}/notifications/threads/${n}`, token, { method: 'PATCH' })
}

export async function markAllForgejoNotificationsRead(base: string, token: string): Promise<void> {
  await fjJson(`${api(base)}/notifications`, token, { method: 'PUT' })
}
