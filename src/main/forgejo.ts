import type {
  ConnectedAccount,
  CreatePrOpts,
  CreatePrResult,
  CreateRepoOpts,
  PrCheck,
  PrDetail,
  PrFile,
  PrMergeMethod,
  PrReview,
  PrReviewEvent,
  PrReviewThread,
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

// ─── Pull request review ────────────────────────────────────────────────────
// The PR page's GitHub/GitLab surface, for Forgejo. One gap: Forgejo has no
// API to reply inside an existing line thread, so threads are read-only here.

/** GET a non-JSON body (the PR's .diff). */
async function fjText(url: string, token: string): Promise<string> {
  const res = await fetch(url, { headers: { Authorization: `token ${token}` } })
  if (!res.ok) throw new Error(`Forgejo API error (${res.status})`)
  return res.text()
}

const repoApi = (base: string, owner: string, repo: string): string =>
  `${api(base)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

/**
 * One unified diff for the whole PR, split into a file each — Forgejo's file
 * list endpoint carries no patch, but `/pulls/:n.diff` has them all.
 */
export function splitUnifiedDiff(diff: string): PrFile[] {
  const files: PrFile[] = []
  const chunks = diff.split(/^(?=diff --git )/m).filter((c) => c.startsWith('diff --git '))
  for (const chunk of chunks) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/m.exec(chunk)
    if (!header) continue
    let [, oldPath, newPath] = header
    const renameFrom = /^rename from (.+)$/m.exec(chunk)?.[1]
    const renameTo = /^rename to (.+)$/m.exec(chunk)?.[1]
    if (renameFrom && renameTo) [oldPath, newPath] = [renameFrom, renameTo]
    const status = /^new file mode/m.test(chunk)
      ? 'added'
      : /^deleted file mode/m.test(chunk)
        ? 'removed'
        : renameFrom
          ? 'renamed'
          : 'modified'
    const hunkAt = chunk.search(/^@@ /m)
    const patch = hunkAt >= 0 ? chunk.slice(hunkAt).replace(/\n$/, '') : ''
    let additions = 0
    let deletions = 0
    for (const line of patch.split('\n')) {
      if (line.startsWith('+')) additions++
      else if (line.startsWith('-')) deletions++
    }
    files.push({
      filename: status === 'removed' ? oldPath : newPath,
      status,
      additions,
      deletions,
      ...(patch ? { patch } : {}),
      ...(status === 'renamed' ? { previousFilename: oldPath } : {})
    })
  }
  return files
}

interface FjDetail extends FjPull {
  body?: string
  state: string
  merged: boolean
  mergeable: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  merged_by: FjUser | null
  assignees?: FjUser[] | null
  requested_reviewers?: FjUser[] | null
  labels?: Array<{ name: string; color?: string }> | null
  milestone: { title: string } | null
  additions?: number
  deletions?: number
  changed_files?: number
  base?: { ref?: string; repo?: { full_name?: string } | null }
  user?: FjUser
}

interface FjReview {
  id: number
  state: string
  dismissed?: boolean
  user: FjUser | null
  body?: string
  submitted_at?: string
}

interface FjReviewComment {
  id: number
  body: string
  user: FjUser | null
  path: string
  line?: number
  original_position?: number
  position?: number
  diff_hunk?: string
  created_at: string
}

/** Forgejo review states → the ones the PR page understands. A pending review
 *  or a review request is not a decision, so it is left out. */
export function mapForgejoReviewState(r: Pick<FjReview, 'state' | 'dismissed'>): PrReview['state'] | null {
  if (r.dismissed) return 'DISMISSED'
  switch (r.state) {
    case 'APPROVED':
      return 'APPROVED'
    case 'REQUEST_CHANGES':
      return 'CHANGES_REQUESTED'
    case 'COMMENT':
      return 'COMMENTED'
    default:
      return null
  }
}

export async function forgejoPullDetail(
  base: string,
  owner: string,
  repo: string,
  token: string,
  number: number
): Promise<PrDetail> {
  const r = repoApi(base, owner, repo)
  const [pr, comments, reviews] = await Promise.all([
    fjJson<FjDetail>(`${r}/pulls/${number}`, token),
    fjJson<Array<{ user: FjUser | null; body: string; created_at: string }>>(
      `${r}/issues/${number}/comments?limit=50`,
      token
    ).catch(() => []),
    fjJson<FjReview[]>(`${r}/pulls/${number}/reviews?limit=50`, token).catch(() => [] as FjReview[])
  ])
  // Line comments hang off each review; one request per review that has any.
  const reviewThreads: PrReviewThread[] = []
  for (const rv of reviews) {
    const lineComments = await fjJson<FjReviewComment[]>(`${r}/pulls/${number}/reviews/${rv.id}/comments`, token).catch(
      () => [] as FjReviewComment[]
    )
    for (const c of lineComments) {
      reviewThreads.push({
        path: c.path,
        line: c.line ?? c.position ?? c.original_position ?? null,
        diffHunk: c.diff_hunk ?? '',
        rootId: c.id,
        comments: [{ id: c.id, author: c.user?.login ?? 'unknown', body: c.body, createdAt: c.created_at }]
      })
    }
  }

  const avatars: Record<string, string> = {}
  const seen = (u: FjUser | null | undefined): void => {
    if (u?.login && u.avatar_url) avatars[u.login] = u.avatar_url
  }
  ;[pr.user, pr.merged_by, ...(pr.assignees ?? []), ...(pr.requested_reviewers ?? [])].forEach(seen)
  comments.forEach((c) => seen(c.user))
  reviews.forEach((rv) => seen(rv.user))

  const headRepo = pr.head?.repo?.full_name
  const baseRepo = pr.base?.repo?.full_name
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? '',
    author: pr.user?.login ?? 'unknown',
    source: pr.head?.ref ?? '',
    target: pr.base?.ref ?? '',
    draft: !!pr.draft || /^\s*(?:\[wip\]|wip:|draft:)/i.test(pr.title),
    state: pr.state === 'closed' ? 'closed' : 'open',
    merged: !!pr.merged,
    mergeable: pr.state === 'open' ? !!pr.mergeable : null,
    url: pr.html_url,
    comments: comments.map((c) => ({ author: c.user?.login ?? 'unknown', body: c.body, createdAt: c.created_at })),
    reviews: reviews.flatMap((rv) => {
      const state = mapForgejoReviewState(rv)
      return state ? [{ author: rv.user?.login ?? 'unknown', state }] : []
    }),
    reviewThreads,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    closedAt: pr.closed_at,
    mergedAt: pr.merged_at,
    mergedBy: pr.merged_by?.login ?? null,
    assignees: (pr.assignees ?? []).map((u) => ({ login: u.login })),
    requestedReviewers: (pr.requested_reviewers ?? []).map((u) => ({ login: u.login })),
    labels: (pr.labels ?? []).map((l) => ({ name: l.name, ...(l.color ? { color: l.color } : {}) })),
    milestone: pr.milestone?.title ?? null,
    ...(pr.additions !== undefined ? { additions: pr.additions } : {}),
    ...(pr.deletions !== undefined ? { deletions: pr.deletions } : {}),
    ...(pr.changed_files !== undefined ? { changedFiles: pr.changed_files } : {}),
    sourceRepo: headRepo && baseRepo && headRepo !== baseRepo ? headRepo : null,
    avatars
  }
}

export async function forgejoPullFiles(base: string, owner: string, repo: string, token: string, number: number): Promise<PrFile[]> {
  return splitUnifiedDiff(await fjText(`${repoApi(base, owner, repo)}/pulls/${number}.diff`, token))
}

/** Commit statuses on the PR head — Forgejo Actions and external CI both report there. */
export async function forgejoPullChecks(base: string, owner: string, repo: string, token: string, number: number): Promise<PrCheck[]> {
  const r = repoApi(base, owner, repo)
  const pr = await fjJson<FjPull>(`${r}/pulls/${number}`, token)
  const sha = pr.head?.sha
  if (!sha) return []
  const st = await fjJson<{ statuses?: Array<{ context: string; status: string; target_url?: string }> }>(
    `${r}/commits/${sha}/status`,
    token
  ).catch(() => ({ statuses: [] }))
  return (st.statuses ?? []).map((s) => ({
    name: s.context,
    status: s.status === 'pending' ? 'in_progress' : 'completed',
    conclusion: s.status === 'pending' ? null : s.status === 'success' ? 'success' : s.status === 'warning' ? 'neutral' : 'failure',
    url: s.target_url ?? '',
    ...(forgejoJobLogUrl(base, s.target_url ?? '') ? { hasLog: true } : {})
  }))
}

/**
 * The log of a Forgejo Actions job, when `target` is one: a status whose link is
 * `<this instance>/<owner>/<repo>/actions/runs/<run>/jobs/<job>`. Anything else —
 * an external CI, another host, a look-alike path — is null, and the token is
 * never sent to it. Forgejo has no API for job logs; this is the web route its
 * own log viewer downloads.
 */
export function forgejoJobLogUrl(base: string, target: string): string | null {
  const prefix = `${base.replace(/\/+$/, '')}/`
  if (!target.startsWith(prefix)) return null
  const m = /^([^/?#]+)\/([^/?#]+)\/actions\/runs\/(\d+)\/jobs\/(\d+)\/?$/.exec(target.slice(prefix.length))
  return m ? `${prefix}${m[1]}/${m[2]}/actions/runs/${m[3]}/jobs/${m[4]}/logs` : null
}

/** How much of a log the page shows: the end, where a failure is. */
const LOG_TAIL_BYTES = 512 * 1024

/**
 * A Forgejo Actions job log, or null when the server will not give it to the
 * token (the route is a web one: some servers only serve it to a signed-in
 * browser). Only the last LOG_TAIL_BYTES are kept.
 */
export async function forgejoJobLog(base: string, token: string, target: string): Promise<string | null> {
  const url = forgejoJobLogUrl(base, target)
  if (!url) return null
  const res = await fetch(url, { redirect: 'error', headers: { Authorization: `token ${token}`, Accept: 'text/plain' } }).catch(
    () => null
  )
  // A redirect to the sign-in page throws (redirect: 'error'); an HTML answer is that page served directly.
  if (!res || !res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return null
  const text = await res.text()
  return text.length > LOG_TAIL_BYTES ? text.slice(-LOG_TAIL_BYTES) : text
}

export async function forgejoComment(base: string, owner: string, repo: string, token: string, number: number, body: string): Promise<void> {
  await fjJson(`${repoApi(base, owner, repo)}/issues/${number}/comments`, token, { method: 'POST', body: JSON.stringify({ body }) })
}

const REVIEW_EVENT: Record<PrReviewEvent, string> = { APPROVE: 'APPROVED', REQUEST_CHANGES: 'REQUEST_CHANGES', COMMENT: 'COMMENT' }

export async function forgejoReview(
  base: string,
  owner: string,
  repo: string,
  token: string,
  number: number,
  event: PrReviewEvent,
  body: string
): Promise<void> {
  await fjJson(`${repoApi(base, owner, repo)}/pulls/${number}/reviews`, token, {
    method: 'POST',
    body: JSON.stringify({ event: REVIEW_EVENT[event], body })
  })
}

export async function forgejoMerge(
  base: string,
  owner: string,
  repo: string,
  token: string,
  number: number,
  method: PrMergeMethod
): Promise<void> {
  // Forgejo spells the method "Do"; rebase is a real per-request option here.
  await fjJson(`${repoApi(base, owner, repo)}/pulls/${number}/merge`, token, {
    method: 'POST',
    body: JSON.stringify({ Do: method })
  })
}
