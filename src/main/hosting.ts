import { ipcMain, shell } from 'electron'
import { apiToken, forgetCredential, isJwt, type GitCredential } from './credentials'
import { mergeStackSection } from '../shared/stackPr'
import type {
  CiJob,
  CiState,
  CiStatus,
  ConnectedAccount,
  CreateRepoOpts,
  CreatePrOpts,
  CreatePrResult,
  GitHubNotification,
  HostingProvider,
  PullRequest,
  PrDetail,
  PrReview,
  PrReviewThread,
  PrCheck,
  PrFile,
  IssueInfo,
  IssueDetail,
  LinkedPr,
  MilestoneInfo,
  ProjectFieldGroup,
  PrReviewEvent,
  PrMergeMethod,
  ReleaseInfo,
  RemoteOwner,
  RemoteRepo,
  RepoHost,
  GithubStackInfo
} from '../shared/types'

interface ParsedRemote {
  provider: Exclude<HostingProvider, null>
  owner: string // github owner / azure organization
  project: string // azure project ('' for github)
  repo: string
}

export function parseRemoteUrl(url: string): ParsedRemote | null {
  let m = /github\.com[/:]([^/]+)\/([^/]+?)(\.git)?$/.exec(url)
  if (m) return { provider: 'github', owner: m[1], project: '', repo: m[2] }

  m = /dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(\.git)?$/.exec(url)
  if (m) return { provider: 'azure', owner: m[1], project: decodeURIComponent(m[2]), repo: decodeURIComponent(m[3]) }

  m = /ssh\.dev\.azure\.com[/:]v3\/([^/]+)\/([^/]+)\/(.+?)(\.git)?$/.exec(url)
  if (m) return { provider: 'azure', owner: m[1], project: m[2], repo: m[3] }

  m = /([^/@:]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+?)(\.git)?$/.exec(url)
  if (m) return { provider: 'azure', owner: m[1], project: decodeURIComponent(m[2]), repo: decodeURIComponent(m[3]) }

  // GitLab: namespace may be multi-level (group/subgroup/repo) — owner holds the
  // full namespace path, repo the last segment.
  m = /gitlab\.com[/:](.+?)(?:\.git)?$/.exec(url)
  if (m) {
    const full = m[1]
    const i = full.lastIndexOf('/')
    if (i > 0) return { provider: 'gitlab', owner: full.slice(0, i), project: '', repo: full.slice(i + 1) }
  }

  m = /bitbucket\.org[/:]([^/]+)\/(.+?)(?:\.git)?$/.exec(url)
  if (m) return { provider: 'bitbucket', owner: m[1], project: '', repo: m[2] }

  return null
}

/** Bitbucket auth: an "app password" is stored as user:password → Basic; a raw
 *  access token → Bearer. */
function bitbucketAuth(token: string): string {
  return token.includes(':') ? `Basic ${Buffer.from(token).toString('base64')}` : `Bearer ${token}`
}

/**
 * GitLab auth. A token typed into Settings keeps using the `PRIVATE-TOKEN`
 * header it has always used; a credential borrowed from git is an OAuth access
 * token, which GitLab only accepts as a bearer token.
 */
function gitlabAuth(auth: { token: string; cred?: GitCredential }): Record<string, string> {
  return auth.cred ? { Authorization: `Bearer ${auth.token}` } : { 'PRIVATE-TOKEN': auth.token }
}

/**
 * Bitbucket auth from either source. A borrowed credential arrives already split
 * into username and password, which is exactly the Basic pair Bitbucket wants.
 */
function bitbucketAuthFor(auth: { token: string; cred?: GitCredential }): string {
  if (auth.cred?.username) {
    return `Basic ${Buffer.from(`${auth.cred.username}:${auth.cred.password}`).toString('base64')}`
  }
  return bitbucketAuth(auth.token)
}

/**
 * Azure DevOps auth. A PAT goes in as Basic with an empty username — the scheme
 * the docs describe. An Entra ID access token (what Git Credential Manager hands
 * out, and what PATs are being replaced by) is a JWT and must be sent as Bearer.
 */
export function azureAuth(token: string): string {
  return isJwt(token) ? `Bearer ${token}` : `Basic ${Buffer.from(`:${token}`).toString('base64')}`
}

/**
 * Call the Azure DevOps REST API.
 *
 * Azure DevOps does not answer an unauthenticated API request with 401. It
 * replies **203 Non-Authoritative Information** carrying an HTML sign-in page,
 * which `res.ok` accepts, so a bad or expired PAT used to surface as
 * `Unexpected token '<'` from JSON.parse rather than as an auth error. Anything
 * that is not JSON is therefore treated as a rejected credential here.
 */
export async function adoJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: azureAuth(token),
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>)
    }
  })

  const body = await res.text()
  if (!res.ok) {
    // The API returns {message} on real errors; fall back to the status.
    let message = ''
    try {
      message = (JSON.parse(body) as { message?: string }).message ?? ''
    } catch {
      /* not JSON — keep the status-only message */
    }
    throw new AzureAuthError(res.status, message)
  }
  // A sign-in page (203 + HTML), or an empty body from a 204.
  const trimmed = body.trim()
  if (!trimmed) return undefined as T
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) throw new AzureAuthError(401, '')
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new AzureAuthError(res.status, '')
  }
}

/** An Azure DevOps failure carrying the status, so callers can retry or re-auth. */
class AzureAuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message ? `Azure DevOps: ${message}` : azureAuthError(status))
    this.status = status
  }
}

/** Whether a failure means "this credential is no good" rather than "this request was". */
function isAuthFailure(err: unknown): boolean {
  return err instanceof AzureAuthError && (err.status === 401 || err.status === 403)
}

/** The four provider token slots the renderer passes down. */
export type HostTokens = { github?: string; azure?: string; gitlab?: string; bitbucket?: string }

/**
 * The token to use for a remote: the one configured in Settings, else whatever
 * git's credential helper already holds for that URL. Returns the borrowed
 * credential alongside it so an auth failure can evict it.
 */
async function tokenForRemote(
  remoteUrl: string,
  provider: Exclude<HostingProvider, null>,
  tokens: HostTokens
): Promise<{ token: string; cred?: GitCredential } | null> {
  return apiToken(remoteUrl, tokens[provider])
}

/**
 * Run an Azure DevOps request, and if a *borrowed* credential is rejected, drop
 * it from the helper and try once more with a freshly minted one. A credential
 * the user typed in themselves is never retried — it is simply wrong, and
 * silently re-asking would hide that.
 */
async function withAzureRetry<T>(
  remoteUrl: string,
  auth: { token: string; cred?: GitCredential },
  run: (token: string) => Promise<T>
): Promise<T> {
  try {
    return await run(auth.token)
  } catch (err) {
    if (!auth.cred || !isAuthFailure(err)) throw err
    await forgetCredential(remoteUrl, auth.cred)
    const fresh = await apiToken(remoteUrl, undefined)
    if (!fresh) throw err
    return run(fresh.token)
  }
}

/**
 * The URL a provider's credential is filed under when there is no repository in
 * hand (Settings, the clone browser). Azure DevOps keys per organization, since
 * each one needs its own token.
 */
export function providerBaseUrl(provider: RepoHost, org?: string): string {
  switch (provider) {
    case 'github':
      return 'https://github.com'
    case 'gitlab':
      return 'https://gitlab.com'
    case 'bitbucket':
      return 'https://bitbucket.org'
    case 'azure':
      return `https://dev.azure.com/${encodeURIComponent(org?.trim() ?? '')}`
  }
}

/**
 * The credential for a provider outside any repository. Same precedence as
 * `tokenForRemote`: what the user configured, else what git already holds.
 */
async function tokenForProvider(
  provider: RepoHost,
  token: string,
  org?: string
): Promise<{ token: string; cred?: GitCredential } | null> {
  return apiToken(providerBaseUrl(provider, org), token)
}

/** A uniform "no credential at all" message naming both ways to supply one. */
function noCredential(provider: string, remoteUrl?: string): Error {
  const host = (() => {
    try {
      return remoteUrl ? new URL(remoteUrl).host : ''
    } catch {
      return ''
    }
  })()
  return new Error(
    `No ${provider} credential${host ? ` for ${host}` : ''}. Either sign in with git (any credential helper — the same one \`git clone\` uses) or add a token in Settings → Integrations.`
  )
}

async function listPullRequests(
  remoteUrl: string,
  tokens: HostTokens
): Promise<{ provider: HostingProvider; prs: PullRequest[] }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed) return { provider: null, prs: [] }
  const auth = await tokenForRemote(remoteUrl, parsed.provider, tokens)

  // GitLab merge requests
  if (parsed.provider === 'gitlab') {
    if (!auth) return { provider: 'gitlab', prs: [] }
    const pid = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
    const res = await fetch(
      `https://gitlab.com/api/v4/projects/${pid}/merge_requests?state=opened&per_page=30`,
      { headers: gitlabAuth(auth) }
    )
    if (!res.ok) throw new Error(`GitLab API error (${res.status})`)
    const data = (await res.json()) as Array<{
      iid: number
      title: string
      author: { username: string }
      source_branch: string
      target_branch: string
      web_url: string
      draft?: boolean
      work_in_progress?: boolean
    }>
    return {
      provider: 'gitlab',
      prs: data.map((p) => ({
        id: p.iid,
        title: p.title,
        author: p.author?.username ?? 'unknown',
        sourceBranch: p.source_branch,
        targetBranch: p.target_branch,
        url: p.web_url,
        isDraft: !!(p.draft || p.work_in_progress)
      }))
    }
  }

  // Bitbucket pull requests
  if (parsed.provider === 'bitbucket') {
    if (!auth) return { provider: 'bitbucket', prs: [] }
    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${parsed.owner}/${parsed.repo}/pullrequests?state=OPEN&pagelen=30`,
      { headers: { Authorization: bitbucketAuthFor(auth) } }
    )
    if (!res.ok) throw new Error(`Bitbucket API error (${res.status})`)
    const data = (await res.json()) as {
      values: Array<{
        id: number
        title: string
        author: { display_name: string }
        source: { branch: { name: string } }
        destination: { branch: { name: string } }
        links: { html: { href: string } }
      }>
    }
    return {
      provider: 'bitbucket',
      prs: data.values.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author?.display_name ?? 'unknown',
        sourceBranch: p.source?.branch?.name ?? '',
        targetBranch: p.destination?.branch?.name ?? '',
        url: p.links.html.href,
        isDraft: false
      }))
    }
  }

  if (parsed.provider === 'github') {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (auth) headers['Authorization'] = `Bearer ${auth.token}`
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls?state=open&per_page=30`, {
      headers
    })
    if (!res.ok) throw new Error(`GitHub API error (${res.status})`)
    const data = (await res.json()) as Array<{
      number: number
      title: string
      draft: boolean
      html_url: string
      user: { login: string }
      head: { ref: string; sha: string }
      base: { ref: string }
      // Present once GitHub's stacked pull requests are in play; absent on a
      // server without them, which is the same as "this one is on its own".
      stack?: { number: number } | null
    }>
    const prs: PullRequest[] = data.map((p) => ({
      id: p.number,
      title: p.title,
      author: p.user.login,
      sourceBranch: p.head.ref,
      targetBranch: p.base.ref,
      url: p.html_url,
      isDraft: p.draft,
      stackNumber: p.stack?.number,
      state: 'open',
      headSha: p.head.sha
    }))
    if (!auth) return { provider: 'github', prs }

    // A stack is only legible if the levels that are already closed or merged
    // are in the list too, and `state=open` hides exactly those. GitHub knows
    // the membership, so ask it — once per stack, not once per level.
    const stackNumbers = [...new Set(prs.map((p) => p.stackNumber).filter((n): n is number => n !== undefined))]
    const known = new Set(prs.map((p) => p.id))
    for (const stackNumber of stackNumbers) {
      const members = await ghJson<{ pull_requests?: GithubStackMember[] }>(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/stacks/${stackNumber}`,
        auth.token
      ).catch(() => null)
      for (const m of members?.pull_requests ?? []) {
        if (!m?.number || known.has(m.number)) continue
        known.add(m.number)
        prs.push({
          id: m.number,
          title: m.title ?? `#${m.number}`,
          author: m.user?.login ?? '',
          sourceBranch: m.head?.ref ?? '',
          targetBranch: m.base?.ref ?? '',
          url: m.html_url ?? `https://github.com/${parsed.owner}/${parsed.repo}/pull/${m.number}`,
          isDraft: m.draft ?? false,
          stackNumber,
          state: m.merged_at ? 'merged' : m.state === 'closed' ? 'closed' : 'open',
          headSha: m.head?.sha
        })
      }
    }

    // The checks on each head, in the same batched shape the graph already
    // uses — one request per pull request, only when the list is refreshed.
    const shas = prs.map((p) => p.headSha).filter((sha): sha is string => !!sha)
    const ci = await fetchCiStatuses(remoteUrl, shas, auth.token).catch(() => ({}) as Record<string, CiStatus>)
    for (const pr of prs) {
      const status = pr.headSha ? ci[pr.headSha] : undefined
      if (!status) continue
      pr.ci = status.state
      pr.ciSummary = summariseChecks(status)
    }
    return { provider: 'github', prs }
  }

  // Azure DevOps
  if (!auth) throw noCredential('Azure DevOps', remoteUrl)
  const base = `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}`
  const data = await withAzureRetry(remoteUrl, auth, (token) =>
    adoJson<{
      value: Array<{
        pullRequestId: number
        title: string
        isDraft: boolean
        createdBy: { displayName: string }
        sourceRefName: string
        targetRefName: string
      }>
    }>(
      `${base}/_apis/git/repositories/${encodeURIComponent(parsed.repo)}/pullrequests?searchCriteria.status=active&api-version=7.1`,
      token
    )
  )
  return {
    provider: 'azure',
    prs: data.value.map((p) => ({
      id: p.pullRequestId,
      title: p.title,
      author: p.createdBy.displayName,
      sourceBranch: p.sourceRefName.replace('refs/heads/', ''),
      targetBranch: p.targetRefName.replace('refs/heads/', ''),
      url: `${base}/_git/${encodeURIComponent(parsed.repo)}/pullrequest/${p.pullRequestId}`,
      isDraft: p.isDraft
    }))
  }
}

async function listReleases(
  remoteUrl: string,
  tokens: { github?: string }
): Promise<{ provider: HostingProvider; releases: ReleaseInfo[] }> {
  const parsed = parseRemoteUrl(remoteUrl)
  // Releases are a GitHub concept; Azure DevOps "releases" are pipelines, not this.
  if (!parsed || parsed.provider !== 'github') return { provider: parsed?.provider ?? null, releases: [] }

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  const auth = await apiToken(remoteUrl, tokens.github)
  if (auth) headers['Authorization'] = `Bearer ${auth.token}`
  const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/releases?per_page=50`, {
    headers
  })
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`)
  const data = (await res.json()) as Array<{
    id: number
    tag_name: string | null
    name: string | null
    body: string | null
    draft: boolean
    prerelease: boolean
    published_at: string | null
    html_url: string
  }>
  return {
    provider: 'github',
    releases: data.map((r) => ({
      id: r.id,
      tag: r.tag_name || null,
      name: r.name,
      body: r.body,
      publishedAt: r.published_at,
      url: r.html_url,
      prerelease: r.prerelease,
      draft: r.draft
    }))
  }
}

function createPullRequestUrl(remoteUrl: string, source: string, target: string): string | null {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed) return null
  if (parsed.provider === 'github') {
    return `https://github.com/${parsed.owner}/${parsed.repo}/compare/${target}...${source}?expand=1`
  }
  if (parsed.provider === 'gitlab') {
    return `https://gitlab.com/${parsed.owner}/${parsed.repo}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(source)}&merge_request%5Btarget_branch%5D=${encodeURIComponent(target)}`
  }
  if (parsed.provider === 'bitbucket') {
    return `https://bitbucket.org/${parsed.owner}/${parsed.repo}/pull-requests/new?source=${encodeURIComponent(source)}&dest=${encodeURIComponent(target)}`
  }
  return `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}/_git/${encodeURIComponent(
    parsed.repo
  )}/pullrequestcreate?sourceRef=${encodeURIComponent(source)}&targetRef=${encodeURIComponent(target)}`
}

/**
 * Create a pull/merge request. GitHub is fully supported; Azure DevOps too.
 * (GitLab/Bitbucket creation is tracked separately under hosting verification —
 * their remotes aren't parsed by parseRemoteUrl yet.)
 */
/** GitHub's error envelope: a headline plus, on a 422, one entry per problem. */
interface GithubErrorBody {
  message?: string
  errors?: { resource?: string; field?: string; code?: string; message?: string }[]
}

/**
 * A GitHub API failure, said in words.
 *
 * The headline for a rejected PR is always "Validation Failed", and the entry
 * that explains it usually carries no `message` at all — only a `field` and a
 * `code`, which the user cannot be expected to read. So the two that actually
 * happen get spelled out with the branch names in them, and anything else
 * degrades to `field: code` rather than being dropped, which is how the
 * useless headline used to be all that survived.
 */
function githubErrorMessage(detail: GithubErrorBody | null, status: number, opts: CreatePrOpts): string {
  const parts = (detail?.errors ?? []).map((e) => {
    if (e.message) return e.message
    if (e.field === 'head') {
      // The commonest cause by far: the branch was never pushed, so as far as
      // GitHub is concerned there is nothing to open a pull request from.
      return `the branch "${opts.source}" is not on the remote — push it first`
    }
    if (e.field === 'base') return `the base branch "${opts.target}" is not on the remote`
    return [e.field, e.code].filter(Boolean).join(': ')
  })
  const listed = parts.filter(Boolean).join('; ')
  if (listed && detail?.message) return `${detail.message} — ${listed}`
  return listed || detail?.message || `API error (${status})`
}

async function createPullRequest(
  remoteUrl: string,
  tokens: HostTokens,
  opts: CreatePrOpts
): Promise<CreatePrResult> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed) throw new Error('Unrecognized remote — PR creation supports GitHub, GitLab, Bitbucket and Azure DevOps.')
  const auth = await tokenForRemote(remoteUrl, parsed.provider, tokens)

  // GitLab merge request
  if (parsed.provider === 'gitlab') {
    if (!auth) throw noCredential('GitLab', remoteUrl)
    const pid = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
    const res = await fetch(`https://gitlab.com/api/v4/projects/${pid}/merge_requests`, {
      method: 'POST',
      headers: { ...gitlabAuth(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_branch: opts.source,
        target_branch: opts.target,
        title: opts.draft ? `Draft: ${opts.title}` : opts.title,
        description: opts.body
      })
    })
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { message?: unknown } | null
      throw new Error(`GitLab: ${typeof d?.message === 'string' ? d.message : `API error (${res.status})`}`)
    }
    const d = (await res.json()) as { iid: number; web_url: string }
    return { url: d.web_url, number: d.iid }
  }

  // Bitbucket pull request
  if (parsed.provider === 'bitbucket') {
    if (!auth) throw noCredential('Bitbucket', remoteUrl)
    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${parsed.owner}/${parsed.repo}/pullrequests`,
      {
        method: 'POST',
        headers: { Authorization: bitbucketAuthFor(auth), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: opts.title,
          description: opts.body,
          source: { branch: { name: opts.source } },
          destination: { branch: { name: opts.target } }
        })
      }
    )
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      throw new Error(`Bitbucket: ${d?.error?.message || `API error (${res.status})`}`)
    }
    const d = (await res.json()) as { id: number; links: { html: { href: string } } }
    return { url: d.links.html.href, number: d.id }
  }

  if (parsed.provider === 'github') {
    if (!auth) throw noCredential('GitHub', remoteUrl)
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: opts.title,
        head: opts.source,
        base: opts.target,
        body: opts.body,
        draft: opts.draft
      })
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as GithubErrorBody | null
      throw new Error(`GitHub: ${githubErrorMessage(detail, res.status, opts)}`)
    }
    const d = (await res.json()) as { html_url: string; number: number }
    return { url: d.html_url, number: d.number }
  }

  // Azure DevOps
  if (!auth) throw noCredential('Azure DevOps', remoteUrl)
  const base = `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}`
  const d = await withAzureRetry(remoteUrl, auth, (token) =>
    adoJson<{ pullRequestId: number }>(
      `${base}/_apis/git/repositories/${encodeURIComponent(parsed.repo)}/pullrequests?api-version=7.1`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          sourceRefName: `refs/heads/${opts.source}`,
          targetRefName: `refs/heads/${opts.target}`,
          title: opts.title,
          description: opts.body,
          isDraft: opts.draft
        })
      }
    )
  )
  return {
    url: `${base}/_git/${encodeURIComponent(parsed.repo)}/pullrequest/${d.pullRequestId}`,
    number: d.pullRequestId
  }
}

/** Resolve a GitHub remote to {owner, repo} or throw (these B2 ops are GitHub-only for now). */
async function ghRepoOf(
  remoteUrl: string,
  token?: string
): Promise<{ owner: string; repo: string; token: string }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github') {
    throw new Error('This action currently supports GitHub repositories only.')
  }
  const auth = await apiToken(remoteUrl, token)
  if (!auth) throw noCredential('GitHub', remoteUrl)
  return { owner: parsed.owner, repo: parsed.repo, token: auth.token }
}

// ── GitLab merge request review ─────────────────────────────────────────────
// Mirrors the GitHub review surface below, normalised into the shared PR types
// so the renderer never has to branch on provider vocabulary.

/** GitLab counterpart to ghJson — one place for auth headers and error extraction. */
export async function glJson<T>(
  url: string,
  auth: { token: string; cred?: GitCredential },
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...gitlabAuth(auth),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>)
    }
  })
  if (!res.ok) {
    // GitLab errors carry {message} (string or array) or {error}.
    const d = (await res.json().catch(() => null)) as { message?: unknown; error?: unknown } | null
    const raw = d?.message ?? d?.error
    const msg = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join('; ') : ''
    throw new Error(msg ? `GitLab: ${msg}` : `GitLab API error (${res.status})`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Resolve a GitLab remote to its project API base + credential, or throw. */
async function glProjectOf(
  remoteUrl: string,
  token?: string
): Promise<{ base: string; auth: { token: string; cred?: GitCredential } }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'gitlab') throw new Error('Not a GitLab repository.')
  const auth = await apiToken(remoteUrl, token)
  if (!auth) throw noCredential('GitLab', remoteUrl)
  const pid = encodeURIComponent(`${parsed.owner}/${parsed.repo}`)
  return { base: `https://gitlab.com/api/v4/projects/${pid}`, auth }
}

interface GlNote {
  id: number
  system: boolean
  author: { username: string } | null
  body: string
  created_at: string
  position?: {
    new_path?: string | null
    old_path?: string | null
    new_line?: number | null
    old_line?: number | null
  } | null
}

async function glMergeRequestDetail(remoteUrl: string, token: string | undefined, number: number): Promise<PrDetail> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  const mrUrl = `${base}/merge_requests/${number}`
  const [mr, discussions, approvals] = await Promise.all([
    glJson<{
      iid: number
      title: string
      description: string | null
      author: { username: string } | null
      source_branch: string
      target_branch: string
      draft?: boolean
      work_in_progress?: boolean
      state: string
      merge_status?: string
      web_url: string
    }>(mrUrl, auth),
    glJson<Array<{ id: string; notes: GlNote[] }>>(`${mrUrl}/discussions?per_page=100`, auth).catch(
      () => [] as Array<{ id: string; notes: GlNote[] }>
    ),
    glJson<{ approved_by?: Array<{ user: { username: string } | null }> }>(`${mrUrl}/approvals`, auth).catch(() => ({
      approved_by: []
    }))
  ])

  // Discussions hold both kinds of comment: a note with a position is an inline
  // review thread, one without is plain conversation. System notes are noise.
  const comments: PrDetail['comments'] = []
  const reviewThreads: PrReviewThread[] = []
  for (const d of discussions) {
    const notes = d.notes.filter((n) => !n.system)
    if (notes.length === 0) continue
    const pos = notes[0].position
    if (pos) {
      reviewThreads.push({
        path: pos.new_path || pos.old_path || '',
        line: pos.new_line ?? pos.old_line ?? null,
        // GitLab notes carry a file position but not the surrounding hunk.
        diffHunk: '',
        rootId: d.id,
        comments: notes.map((n) => ({
          id: n.id,
          author: n.author?.username ?? 'unknown',
          body: n.body,
          createdAt: n.created_at
        }))
      })
    } else {
      for (const n of notes)
        comments.push({ author: n.author?.username ?? 'unknown', body: n.body, createdAt: n.created_at })
    }
  }
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    number: mr.iid,
    title: mr.title,
    body: mr.description ?? '',
    author: mr.author?.username ?? 'unknown',
    source: mr.source_branch,
    target: mr.target_branch,
    draft: !!(mr.draft || mr.work_in_progress),
    state: mr.state === 'opened' ? 'open' : 'closed',
    merged: mr.state === 'merged',
    mergeable: mr.merge_status === 'can_be_merged' ? true : mr.merge_status === 'cannot_be_merged' ? false : null,
    url: mr.web_url,
    comments,
    reviews: (approvals.approved_by ?? []).map((a) => ({
      author: a.user?.username ?? 'unknown',
      state: 'APPROVED' as const
    })),
    reviewThreads
  }
}

/** GitLab job status → the check-run vocabulary the renderer already renders. */
export function glJobToCheck(job: { name: string; status: string; web_url?: string | null }): PrCheck {
  const map: Record<string, { status: string; conclusion: string | null }> = {
    created: { status: 'queued', conclusion: null },
    pending: { status: 'queued', conclusion: null },
    waiting_for_resource: { status: 'queued', conclusion: null },
    preparing: { status: 'queued', conclusion: null },
    scheduled: { status: 'queued', conclusion: null },
    running: { status: 'in_progress', conclusion: null },
    success: { status: 'completed', conclusion: 'success' },
    failed: { status: 'completed', conclusion: 'failure' },
    canceled: { status: 'completed', conclusion: 'cancelled' },
    canceling: { status: 'completed', conclusion: 'cancelled' },
    skipped: { status: 'completed', conclusion: 'skipped' },
    manual: { status: 'completed', conclusion: 'action_required' }
  }
  const m = map[job.status] ?? { status: 'completed', conclusion: 'neutral' }
  return { name: job.name, status: m.status, conclusion: m.conclusion, url: job.web_url || '' }
}

async function glMergeRequestChecks(remoteUrl: string, token: string | undefined, number: number): Promise<PrCheck[]> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  // Pipelines come newest-first; the head pipeline's jobs are the checks.
  const pipelines = await glJson<Array<{ id: number }>>(
    `${base}/merge_requests/${number}/pipelines?per_page=1`,
    auth
  ).catch(() => [] as Array<{ id: number }>)
  if (pipelines.length === 0) return []
  const jobs = await glJson<Array<{ name: string; status: string; web_url?: string | null }>>(
    `${base}/pipelines/${pipelines[0].id}/jobs?per_page=100`,
    auth
  ).catch(() => [] as Array<{ name: string; status: string; web_url?: string | null }>)
  return jobs.map(glJobToCheck)
}

/** Count added/removed lines in a unified diff body (file headers excluded). */
export function diffLineCounts(diff: string): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++
  }
  return { additions, deletions }
}

async function glMergeRequestFiles(remoteUrl: string, token: string | undefined, number: number): Promise<PrFile[]> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  const diffs = await glJson<
    Array<{
      old_path: string
      new_path: string
      new_file: boolean
      renamed_file: boolean
      deleted_file: boolean
      diff: string
    }>
  >(`${base}/merge_requests/${number}/diffs?per_page=100`, auth).catch(() => [])
  return diffs.map((d) => ({
    filename: d.new_path || d.old_path,
    status: d.new_file ? 'added' : d.deleted_file ? 'removed' : d.renamed_file ? 'renamed' : 'modified',
    ...diffLineCounts(d.diff || '')
  }))
}

async function glReplyReviewComment(
  remoteUrl: string,
  token: string | undefined,
  number: number,
  discussionId: string,
  body: string
): Promise<void> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  await glJson(`${base}/merge_requests/${number}/discussions/${encodeURIComponent(discussionId)}/notes`, auth, {
    method: 'POST',
    body: JSON.stringify({ body })
  })
}

async function glCommentOnMr(remoteUrl: string, token: string | undefined, number: number, body: string): Promise<void> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  await glJson(`${base}/merge_requests/${number}/notes`, auth, { method: 'POST', body: JSON.stringify({ body }) })
}

async function glReviewMr(
  remoteUrl: string,
  token: string | undefined,
  number: number,
  event: PrReviewEvent,
  body: string
): Promise<void> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  // GitLab has no single "submit review" call: approval is its own endpoint,
  // and requesting changes is an unapproval plus a comment.
  if (event === 'APPROVE') {
    await glJson(`${base}/merge_requests/${number}/approve`, auth, { method: 'POST' })
  } else if (event === 'REQUEST_CHANGES') {
    // A 404 here just means "you had not approved" — nothing worth surfacing.
    await glJson(`${base}/merge_requests/${number}/unapprove`, auth, { method: 'POST' }).catch(() => undefined)
  }
  if (body) {
    await glJson(`${base}/merge_requests/${number}/notes`, auth, { method: 'POST', body: JSON.stringify({ body }) })
  }
}

async function glMergeMr(
  remoteUrl: string,
  token: string | undefined,
  number: number,
  method: PrMergeMethod
): Promise<void> {
  const { base, auth } = await glProjectOf(remoteUrl, token)
  // GitLab picks merge-commit vs fast-forward from the project settings; the
  // API only takes a squash flag. The renderer hides "rebase" for GitLab.
  await glJson(`${base}/merge_requests/${number}/merge`, auth, {
    method: 'PUT',
    body: JSON.stringify({ squash: method === 'squash' })
  })
}

async function pullRequestDetail(
  remoteUrl: string,
  tokens: HostTokens,
  number: number
): Promise<PrDetail> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glMergeRequestDetail(remoteUrl, tokens.gitlab, number)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const [pr, comments, reviews, reviewComments] = await Promise.all([
    ghJson<{
      number: number
      title: string
      body: string | null
      user: { login: string }
      head: { ref: string }
      base: { ref: string }
      draft: boolean
      state: string
      merged: boolean
      mergeable: boolean | null
      html_url: string
    }>(`${api}/pulls/${number}`, token),
    ghJson<Array<{ user: { login: string } | null; body: string; created_at: string }>>(
      `${api}/issues/${number}/comments?per_page=100`,
      token
    ),
    ghJson<Array<{ user: { login: string } | null; state: string }>>(
      `${api}/pulls/${number}/reviews?per_page=100`,
      token
    ),
    ghJson<
      Array<{
        id: number
        user: { login: string } | null
        body: string
        created_at: string
        path: string
        line: number | null
        original_line: number | null
        diff_hunk: string
        in_reply_to_id?: number
      }>
    >(`${api}/pulls/${number}/comments?per_page=100`, token).catch(() => [])
  ])

  // Group inline review comments into threads. Replies (in_reply_to_id) attach to
  // their root; roots are keyed by their own id. Ordered by first comment.
  const threadById = new Map<number, PrReviewThread>()
  const sortedRC = [...reviewComments].sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const rc of sortedRC) {
    const rootId = rc.in_reply_to_id ?? rc.id
    const comment = { id: rc.id, author: rc.user?.login ?? 'unknown', body: rc.body, createdAt: rc.created_at }
    const existing = threadById.get(rootId)
    if (existing) existing.comments.push(comment)
    else
      threadById.set(rootId, {
        path: rc.path,
        line: rc.line ?? rc.original_line,
        diffHunk: rc.diff_hunk,
        rootId,
        comments: [comment]
      })
  }
  const reviewThreads = [...threadById.values()]
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? '',
    author: pr.user.login,
    source: pr.head.ref,
    target: pr.base.ref,
    draft: pr.draft,
    state: pr.state === 'closed' ? 'closed' : 'open',
    merged: pr.merged,
    mergeable: pr.mergeable,
    url: pr.html_url,
    comments: comments.map((c) => ({ author: c.user?.login ?? 'unknown', body: c.body, createdAt: c.created_at })),
    reviews: reviews
      .filter((r) => r.state !== 'PENDING')
      .map((r) => ({ author: r.user?.login ?? 'unknown', state: r.state as PrReview['state'] })),
    reviewThreads
  }
}

/** CI checks on a PR's head commit (GitHub check-runs / GitLab pipeline jobs). */
async function pullRequestChecks(
  remoteUrl: string,
  tokens: HostTokens,
  number: number
): Promise<PrCheck[]> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glMergeRequestChecks(remoteUrl, tokens.gitlab, number)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const pr = await ghJson<{ head: { sha: string } }>(`${api}/pulls/${number}`, token)
  const data = await ghJson<{
    check_runs: Array<{ name: string; status: string; conclusion: string | null; html_url: string | null; details_url: string | null }>
  }>(`${api}/commits/${pr.head.sha}/check-runs?per_page=100`, token).catch(() => ({ check_runs: [] }))
  return data.check_runs.map((c) => ({
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
    url: c.html_url || c.details_url || ''
  }))
}

/** Changed files in a PR (for the file-by-file review checklist). */
async function pullRequestFiles(
  remoteUrl: string,
  tokens: HostTokens,
  number: number
): Promise<PrFile[]> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glMergeRequestFiles(remoteUrl, tokens.gitlab, number)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const data = await ghJson<Array<{ filename: string; status: string; additions: number; deletions: number }>>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=300`,
    token
  ).catch(() => [])
  return data.map((f) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }))
}

/** Reply to an inline review thread (POST a comment in reply to `inReplyTo`). */
async function replyReviewComment(
  remoteUrl: string,
  tokens: HostTokens,
  number: number,
  inReplyTo: number | string,
  body: string
): Promise<void> {
  // GitHub threads reply to a numeric comment id; GitLab to a discussion id string.
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') {
    return glReplyReviewComment(remoteUrl, tokens.gitlab, number, String(inReplyTo), body)
  }
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ body, in_reply_to: inReplyTo })
  })
}

async function commentOnPr(
  remoteUrl: string,
  tokens: HostTokens,
  number: number,
  body: string
): Promise<void> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glCommentOnMr(remoteUrl, tokens.gitlab, number, body)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ body })
  })
}

async function reviewPr(
  remoteUrl: string,
  tokens: HostTokens,
  number: number,
  event: PrReviewEvent,
  body: string
): Promise<void> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glReviewMr(remoteUrl, tokens.gitlab, number, event, body)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`, token, {
    method: 'POST',
    body: JSON.stringify({ event, body: body || undefined })
  })
}

async function mergePr(
  remoteUrl: string,
  tokens: HostTokens,
  number: number,
  method: PrMergeMethod
): Promise<void> {
  if (parseRemoteUrl(remoteUrl)?.provider === 'gitlab') return glMergeMr(remoteUrl, tokens.gitlab, number, method)
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/merge`, token, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: method })
  })
}

async function listIssues(
  remoteUrl: string,
  tokens: { github?: string }
): Promise<{ provider: HostingProvider; issues: IssueInfo[] }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github') return { provider: parsed?.provider ?? null, issues: [] }
  const auth = await apiToken(remoteUrl, tokens.github)
  if (!auth) return { provider: 'github', issues: [] }
  const data = await ghJson<
    Array<{
      number: number
      title: string
      user: { login: string } | null
      state: string
      html_url: string
      comments: number
      pull_request?: unknown
    }>
  >(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues?state=open&per_page=50`, auth.token)
  return {
    provider: 'github',
    // The issues endpoint also returns PRs — filter them out.
    issues: data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        author: i.user?.login ?? 'unknown',
        state: i.state === 'closed' ? 'closed' : 'open',
        url: i.html_url,
        comments: i.comments
      }))
  }
}

async function listMilestones(
  remoteUrl: string,
  tokens: { github?: string }
): Promise<{ provider: HostingProvider; milestones: MilestoneInfo[] }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github') return { provider: parsed?.provider ?? null, milestones: [] }
  const auth = await apiToken(remoteUrl, tokens.github)
  if (!auth) return { provider: 'github', milestones: [] }
  const data = await ghJson<
    Array<{
      number: number
      title: string
      description: string | null
      state: string
      due_on: string | null
      open_issues: number
      closed_issues: number
      html_url: string
    }>
  >(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/milestones?state=all&per_page=50`, auth.token)
  return {
    provider: 'github',
    milestones: data.map((m) => ({
      number: m.number,
      title: m.title,
      description: m.description ?? '',
      state: m.state === 'closed' ? 'closed' : 'open',
      dueOn: m.due_on,
      openIssues: m.open_issues,
      closedIssues: m.closed_issues,
      url: m.html_url
    }))
  }
}

/**
 * Projects v2 custom fields for an issue (Priority, Start/Target date, Effort, …).
 * GraphQL-only and requires the token's `read:project` scope — best-effort, so any
 * error (missing scope, no project) yields an empty list rather than failing.
 */
async function fetchProjectFields(
  owner: string,
  repo: string,
  number: number,
  token: string
): Promise<ProjectFieldGroup[]> {
  const query = `query($owner:String!,$repo:String!,$number:Int!){
    repository(owner:$owner,name:$repo){
      issue(number:$number){
        projectItems(first:10){ nodes{
          project{ title }
          fieldValues(first:30){ nodes{
            __typename
            ... on ProjectV2ItemFieldTextValue { text field{ ... on ProjectV2FieldCommon { name } } }
            ... on ProjectV2ItemFieldNumberValue { number field{ ... on ProjectV2FieldCommon { name } } }
            ... on ProjectV2ItemFieldDateValue { date field{ ... on ProjectV2FieldCommon { name } } }
            ... on ProjectV2ItemFieldSingleSelectValue { name field{ ... on ProjectV2FieldCommon { name } } }
            ... on ProjectV2ItemFieldIterationValue { title field{ ... on ProjectV2FieldCommon { name } } }
          } }
        } }
      }
    }
  }`
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner, repo, number } })
    })
    if (!res.ok) return []
    const json = (await res.json()) as {
      data?: {
        repository?: {
          issue?: {
            projectItems?: {
              nodes?: Array<{
                project?: { title?: string }
                fieldValues?: {
                  nodes?: Array<Record<string, unknown> & { field?: { name?: string } }>
                }
              }>
            }
          }
        }
      }
    }
    const items = json.data?.repository?.issue?.projectItems?.nodes ?? []
    const groups: ProjectFieldGroup[] = []
    for (const item of items) {
      const fields: { name: string; value: string }[] = []
      for (const fv of item.fieldValues?.nodes ?? []) {
        const name = fv.field?.name
        if (!name) continue // skip non-custom values (no field name)
        const value =
          (fv.text as string) ??
          (fv.name as string) ??
          (fv.title as string) ??
          (fv.date as string) ??
          (typeof fv.number === 'number' ? String(fv.number) : undefined)
        if (value != null && value !== '') fields.push({ name, value })
      }
      if (fields.length) groups.push({ project: item.project?.title ?? 'Project', fields })
    }
    return groups
  } catch {
    return []
  }
}

async function issueDetail(
  remoteUrl: string,
  tokens: { github?: string },
  number: number
): Promise<IssueDetail> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const [issue, comments, timeline, projectFields] = await Promise.all([
    ghJson<{
      number: number
      title: string
      body: string | null
      user: { login: string } | null
      state: string
      html_url: string
      created_at: string
      labels: Array<{ name: string } | string>
      assignees: Array<{ login: string }> | null
      milestone: { title: string } | null
    }>(`${api}/issues/${number}`, token),
    ghJson<Array<{ user: { login: string } | null; body: string; created_at: string }>>(
      `${api}/issues/${number}/comments?per_page=100`,
      token
    ),
    ghJson<
      Array<{
        event: string
        source?: { issue?: { number: number; title: string; html_url: string; state: string; pull_request?: unknown } }
      }>
    >(`${api}/issues/${number}/timeline?per_page=100`, token).catch(() => []),
    fetchProjectFields(owner, repo, number, token)
  ])

  const linkedMap = new Map<number, LinkedPr>()
  for (const ev of timeline) {
    const si = ev.event === 'cross-referenced' ? ev.source?.issue : undefined
    if (si?.pull_request) {
      linkedMap.set(si.number, { number: si.number, title: si.title, url: si.html_url, state: si.state })
    }
  }

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? '',
    author: issue.user?.login ?? 'unknown',
    state: issue.state === 'closed' ? 'closed' : 'open',
    url: issue.html_url,
    labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    assignees: (issue.assignees ?? []).map((a) => a.login),
    milestone: issue.milestone?.title ?? null,
    createdAt: issue.created_at,
    comments: comments.map((c) => ({ author: c.user?.login ?? 'unknown', body: c.body, createdAt: c.created_at })),
    linkedPrs: [...linkedMap.values()],
    projectFields
  }
}

/** Issues belonging to a milestone (open + closed). GitHub only. */
async function milestoneIssues(
  remoteUrl: string,
  tokens: { github?: string },
  number: number
): Promise<IssueInfo[]> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const data = await ghJson<
    Array<{
      number: number
      title: string
      user: { login: string } | null
      state: string
      html_url: string
      comments: number
      pull_request?: unknown
    }>
  >(`https://api.github.com/repos/${owner}/${repo}/issues?milestone=${number}&state=all&per_page=100`, token)
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      author: i.user?.login ?? 'unknown',
      state: i.state === 'closed' ? 'closed' : 'open',
      url: i.html_url,
      comments: i.comments
    }))
}

async function setIssueState(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  state: 'open' | 'closed'
): Promise<void> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ state })
  })
}

/** Create a new issue. GitHub only. Returns its number + web URL. */
async function createIssue(
  remoteUrl: string,
  tokens: { github?: string },
  opts: { title: string; body?: string }
): Promise<{ number: number; url: string }> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const d = await ghJson<{ number: number; html_url: string }>(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    token,
    { method: 'POST', body: JSON.stringify({ title: opts.title, body: opts.body || '' }) }
  )
  return { number: d.number, url: d.html_url }
}

/**
 * Best-effort apply reviewers / labels / assignees to a PR after creation.
 * Each call is independent; a failure on one doesn't block the others.
 */
async function applyPrMeta(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  meta: { reviewers?: string[]; labels?: string[]; assignees?: string[] }
): Promise<void> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const tasks: Promise<unknown>[] = []
  if (meta.reviewers?.length)
    tasks.push(
      ghJson(`${api}/pulls/${number}/requested_reviewers`, token, {
        method: 'POST',
        body: JSON.stringify({ reviewers: meta.reviewers })
      }).catch(() => {})
    )
  if (meta.labels?.length)
    tasks.push(
      ghJson(`${api}/issues/${number}/labels`, token, {
        method: 'POST',
        body: JSON.stringify({ labels: meta.labels })
      }).catch(() => {})
    )
  if (meta.assignees?.length)
    tasks.push(
      ghJson(`${api}/issues/${number}/assignees`, token, {
        method: 'POST',
        body: JSON.stringify({ assignees: meta.assignees })
      }).catch(() => {})
    )
  await Promise.all(tasks)
}

/**
 * Which of these head branches have a MERGED pull request (GitHub only)?
 * This is how squash-merged stack bottoms get detected: the squashed patch
 * leaves no ancestry a local git can follow, but the host knows the PR landed.
 * One request per branch, filtered server-side by head ref.
 */
async function mergedPrHeads(remoteUrl: string, tokens: { github?: string }, branches: string[]): Promise<string[]> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const merged: string[] = []
  for (const branch of branches) {
    const prs = await ghJson<Array<{ merged_at: string | null }>>(
      `${api}/pulls?state=closed&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=5`,
      token
    ).catch(() => [])
    if (prs.some((p) => p.merged_at)) merged.push(branch)
  }
  return merged
}

/**
 * Mutate an open PR (GitHub only): retarget its base, retitle, or maintain the
 * marked stack-navigation section in its body. `stackSection` merges into the
 * live body server-side (one GET) so a user's own description edits survive.
 */
async function updatePullRequest(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  patch: { base?: string; title?: string; stackSection?: string }
): Promise<void> {
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const body: { base?: string; title?: string; body?: string } = {}
  if (patch.base) body.base = patch.base
  if (patch.title) body.title = patch.title
  if (patch.stackSection !== undefined) {
    const current = await ghJson<{ body: string | null }>(`${api}/pulls/${number}`, token)
    body.body = mergeStackSection(current.body ?? '', patch.stackSection)
  }
  if (!Object.keys(body).length) return
  await ghJson(`${api}/pulls/${number}`, token, { method: 'PATCH', body: JSON.stringify(body) })
}

/**
 * Register the chain as a **native GitHub stack**, and report what it is now.
 *
 * Chaining the bases is what makes a stack reviewable anywhere — GitLab,
 * Bitbucket and Azure have nothing else. GitHub, since its stacked pull
 * requests preview, also has a stack of its own: a real object that draws the
 * chain in the PR UI, rebases the levels above server-side, and lands the whole
 * thing from one merge. That is worth having, and it is one call on top of the
 * PRs we already opened.
 *
 * `numbers` arrive bottom → top, the order the API wants. A repository that is
 * not in the preview answers 404/403 for the endpoint; that is not a failure of
 * the submit, so it returns null and the chained PRs stand on their own.
 */
async function ensureGithubStack(
  remoteUrl: string,
  tokens: { github?: string },
  numbers: number[]
): Promise<GithubStackInfo | null> {
  if (numbers.length < 2) return null // one PR is not a stack
  const { owner, repo, token } = await ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`

  // Whatever stack these PRs are already in, if any: the bottom one decides,
  // because a stack is extended upward.
  const bottom = await ghJson<{ stack: { number: number } | null }>(`${api}/pulls/${numbers[0]}`, token).catch(
    () => null
  )
  // The field is absent entirely on a server without the feature — treat that
  // the same as "no stack" and let the POST below decide.
  const existing = bottom?.stack?.number ?? null

  try {
    if (existing === null) {
      const created = await ghJson<{ number: number; html_url?: string }>(`${api}/stacks`, token, {
        method: 'POST',
        body: JSON.stringify({ pull_requests: numbers })
      })
      return { number: created.number, url: created.html_url, added: numbers.length }
    }
    // Extend: only the levels the stack does not already carry, still bottom → top.
    const current = await ghJson<{ pull_requests?: { number: number }[] }>(`${api}/stacks/${existing}`, token)
    const have = new Set((current.pull_requests ?? []).map((p) => p.number))
    const missing = numbers.filter((n) => !have.has(n))
    if (missing.length) {
      await ghJson(`${api}/stacks/${existing}/add`, token, {
        method: 'POST',
        body: JSON.stringify({ pull_requests: missing })
      })
    }
    return { number: existing, added: missing.length }
  } catch {
    // Not enrolled in the preview, or the token cannot manage stacks. The PRs
    // are already chained and navigable; say nothing rather than fail the run.
    return null
  }
}

async function listRepositories(provider: RepoHost, token: string, org?: string): Promise<RemoteRepo[]> {
  const auth = await tokenForProvider(provider, token, org)
  if (!auth) throw noCredential(provider, providerBaseUrl(provider, org))

  if (provider === 'github') {
    const res = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${auth.token}` } }
    )
    if (!res.ok) throw new Error(`GitHub API error (${res.status})`)
    const data = (await res.json()) as Array<{
      full_name: string
      clone_url: string
      private: boolean
      description: string | null
      owner: { avatar_url: string } | null
    }>
    return data.map((r) => ({
      name: r.full_name,
      url: r.clone_url,
      private: r.private,
      description: r.description ?? undefined,
      avatarUrl: r.owner?.avatar_url
    }))
  }

  if (provider === 'gitlab') {
    const res = await fetch(
      'https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at&simple=true',
      { headers: gitlabAuth(auth) }
    )
    if (!res.ok) throw new Error(`GitLab API error (${res.status})`)
    const data = (await res.json()) as Array<{
      path_with_namespace: string
      http_url_to_repo: string
      visibility: string
      description: string | null
      avatar_url: string | null
      namespace?: { avatar_url: string | null }
    }>
    return data.map((r) => ({
      name: r.path_with_namespace,
      url: r.http_url_to_repo,
      private: r.visibility !== 'public',
      description: r.description ?? undefined,
      avatarUrl: r.avatar_url ?? r.namespace?.avatar_url ?? undefined
    }))
  }

  if (provider === 'bitbucket') {
    const res = await fetch('https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100&sort=-updated_on', {
      headers: { Authorization: bitbucketAuthFor(auth) }
    })
    if (!res.ok) throw new Error(`Bitbucket API error (${res.status})`)
    const data = (await res.json()) as {
      values: Array<{
        full_name: string
        is_private: boolean
        description: string
        links: { clone: Array<{ name: string; href: string }>; avatar?: { href: string } }
      }>
    }
    return data.values.map((r) => ({
      name: r.full_name,
      url: r.links.clone.find((c) => c.name === 'https')?.href ?? r.links.clone[0]?.href ?? '',
      private: r.is_private,
      description: r.description || undefined,
      avatarUrl: r.links.avatar?.href
    }))
  }

  // Azure DevOps — lists every repo across all projects in the organization.
  if (!org?.trim()) throw new Error('Enter your Azure DevOps organization.')
  const base = providerBaseUrl('azure', org)
  const data = await withAzureRetry(base, auth, (t) =>
    adoJson<{ value: Array<{ name: string; remoteUrl: string; project: { name: string } }> }>(
      `${base}/_apis/git/repositories?api-version=7.1`,
      t
    )
  )
  return data.value.map((r) => ({ name: `${r.project.name}/${r.name}`, url: r.remoteUrl }))
}

async function ghJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string>)
    }
  })
  if (!res.ok) {
    const msg = (await res.json().catch(() => null)) as { message?: string } | null
    // Surface when the rate limit resets so the user knows how long to wait.
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      const reset = res.headers.get('x-ratelimit-reset')
      if (remaining === '0' && reset) {
        const at = new Date(+reset * 1000).toLocaleTimeString()
        throw new Error(`GitHub rate limit exceeded — resets at ${at}.`)
      }
    }
    throw new Error(msg?.message ? `GitHub: ${msg.message}` : `GitHub API error (${res.status})`)
  }
  return res.json() as Promise<T>
}

/** Accounts a new repo can be created under: the authenticated user plus their orgs/groups. */
async function listOwners(provider: RepoHost, token: string, org?: string): Promise<RemoteOwner[]> {
  const auth = await tokenForProvider(provider, token, org)
  if (!auth) throw noCredential(provider, providerBaseUrl(provider, org))

  if (provider === 'github') {
    const user = await ghJson<{ login: string; avatar_url: string }>('https://api.github.com/user', auth.token)
    const orgs = await ghJson<Array<{ login: string; avatar_url: string }>>(
      'https://api.github.com/user/orgs?per_page=100',
      auth.token
    )
    return [
      { id: user.login, login: user.login, avatarUrl: user.avatar_url, type: 'user' },
      ...orgs.map((o) => ({ id: o.login, login: o.login, avatarUrl: o.avatar_url, type: 'org' as const }))
    ]
  }

  if (provider === 'gitlab') {
    const headers = gitlabAuth(auth)
    const user = (await (await fetch('https://gitlab.com/api/v4/user', { headers })).json()) as {
      id: number
      username: string
      avatar_url: string | null
      namespace_id?: number
    }
    const groupsRes = await fetch('https://gitlab.com/api/v4/groups?min_access_level=30&per_page=100', { headers })
    const groups = (await groupsRes.json()) as Array<{ id: number; full_path: string; avatar_url: string | null }>
    return [
      { id: String(user.id), login: user.username, avatarUrl: user.avatar_url ?? undefined, type: 'user' },
      ...groups.map((g) => ({
        id: String(g.id),
        login: g.full_path,
        avatarUrl: g.avatar_url ?? undefined,
        type: 'org' as const
      }))
    ]
  }

  if (provider === 'bitbucket') {
    const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=100', {
      headers: { Authorization: bitbucketAuthFor(auth) }
    })
    if (!wsRes.ok) throw new Error(`Bitbucket API error (${wsRes.status})`)
    const data = (await wsRes.json()) as {
      values: Array<{ slug: string; name: string; links?: { avatar?: { href: string } } }>
    }
    return data.values.map((w) => ({
      id: w.slug,
      login: w.slug,
      avatarUrl: w.links?.avatar?.href,
      type: 'org' as const
    }))
  }

  // Azure DevOps — projects under the given organization act as "owners" for new repos.
  if (!org?.trim()) throw new Error('Enter your Azure DevOps organization.')
  const base = providerBaseUrl('azure', org)
  const data = await withAzureRetry(base, auth, (t) =>
    adoJson<{ value: Array<{ id: string; name: string }> }>(`${base}/_apis/projects?api-version=7.1`, t)
  )
  return data.value.map((p) => ({ id: p.id, login: p.name, type: 'org' as const }))
}

/** Build a human-readable message for Azure DevOps auth failures, which are otherwise opaque. */
function azureAuthError(status: number, org?: string): string {
  if (status === 401 || status === 403) {
    return org
      ? `Azure DevOps rejected the credential (${status}). Check that it is valid and not expired, that it has access to the "${org}" organization, and that the organization name is spelled correctly.`
      : `Azure DevOps rejected the credential (${status}). Check that it is valid, not expired, and has at least User Profile (read) or Code (read) scope — or set an organization so it can be checked against that org directly.`
  }
  if (status === 404 && org) {
    return `Azure DevOps organization "${org}" was not found (404). Double-check the organization name.`
  }
  return `Azure DevOps API error (${status})`
}

/** Resolve the authenticated user behind a stored token, for display in Settings → Integrations. */
async function fetchConnectedAccount(
  provider: RepoHost,
  token: string,
  org?: string,
  interactive = false
): Promise<ConnectedAccount> {
  // Only an explicit "sign in" may open the helper's login window. Merely opening
  // the Settings page must not prompt for four providers at once.
  const auth = await apiToken(providerBaseUrl(provider, org), token, { interactive })
  if (!auth) throw noCredential(provider, providerBaseUrl(provider, org))

  if (provider === 'github') {
    const user = await ghJson<{ login: string; name: string | null; avatar_url: string; html_url: string }>(
      'https://api.github.com/user',
      auth.token
    )
    const orgs = await ghJson<Array<{ login: string; avatar_url: string }>>(
      'https://api.github.com/user/orgs?per_page=100',
      auth.token
    ).catch(() => [])
    return {
      login: user.login,
      name: user.name ?? undefined,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      orgs: orgs.map((o) => ({ login: o.login, avatarUrl: o.avatar_url, url: `https://github.com/${o.login}` }))
    }
  }

  if (provider === 'gitlab') {
    const headers = gitlabAuth(auth)
    const userRes = await fetch('https://gitlab.com/api/v4/user', { headers })
    if (!userRes.ok) throw new Error(`GitLab API error (${userRes.status})`)
    const user = (await userRes.json()) as {
      username: string
      name: string | null
      avatar_url: string | null
      web_url: string
    }
    const groupsRes = await fetch('https://gitlab.com/api/v4/groups?min_access_level=10&per_page=100', { headers })
    const groups = groupsRes.ok
      ? ((await groupsRes.json()) as Array<{ full_path: string; avatar_url: string | null; web_url: string }>)
      : []
    return {
      login: user.username,
      name: user.name ?? undefined,
      avatarUrl: user.avatar_url ?? undefined,
      profileUrl: user.web_url,
      orgs: groups.map((g) => ({ login: g.full_path, avatarUrl: g.avatar_url ?? undefined, url: g.web_url }))
    }
  }

  if (provider === 'bitbucket') {
    const bbAuth = bitbucketAuthFor(auth)
    const userRes = await fetch('https://api.bitbucket.org/2.0/user', { headers: { Authorization: bbAuth } })
    if (!userRes.ok) throw new Error(`Bitbucket API error (${userRes.status})`)
    const user = (await userRes.json()) as {
      username: string
      display_name: string | null
      links?: { avatar?: { href: string }; html?: { href: string } }
    }
    const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=100', {
      headers: { Authorization: bbAuth }
    })
    const workspaces = wsRes.ok
      ? (
          (await wsRes.json()) as {
            values: Array<{ slug: string; name: string; links?: { avatar?: { href: string }; html?: { href: string } } }>
          }
        ).values
      : []
    return {
      login: user.username,
      name: user.display_name ?? undefined,
      avatarUrl: user.links?.avatar?.href,
      profileUrl: user.links?.html?.href,
      orgs: workspaces.map((w) => ({
        login: w.slug,
        avatarUrl: w.links?.avatar?.href,
        url: w.links?.html?.href ?? `https://bitbucket.org/${w.slug}`
      }))
    }
  }

  // Azure DevOps — prefer an organization-scoped check. The global profile service
  // (app.vssps.visualstudio.com) returns 401 for Entra/guest accounts even with a valid
  // org-scoped PAT, so when we know the organization we validate against connectionData,
  // which works with a plain Code-scoped PAT and reflects the token's real access.
  const orgName = org?.trim()
  if (orgName) {
    const base = providerBaseUrl('azure', orgName)
    const data = await withAzureRetry(base, auth, (t) =>
      adoJson<{
        authenticatedUser?: {
          providerDisplayName?: string
          properties?: { Account?: { $value?: string } }
        }
      }>(`${base}/_apis/connectionData?api-version=7.1-preview`, t)
    ).catch((err) => {
      throw err instanceof AzureAuthError ? new Error(azureAuthError(err.status, orgName)) : err
    })
    const user = data.authenticatedUser
    const email = user?.properties?.Account?.$value
    const displayName = user?.providerDisplayName
    return {
      login: email ?? displayName ?? orgName,
      name: displayName,
      orgs: [{ login: orgName, url: `https://dev.azure.com/${encodeURIComponent(orgName)}` }]
    }
  }

  // No organization provided — fall back to the global profile service (best effort).
  const profile = await adoJson<{ displayName: string; emailAddress?: string; id: string }>(
    'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1',
    auth.token
  ).catch((err) => {
    throw err instanceof AzureAuthError ? new Error(azureAuthError(err.status)) : err
  })
  return {
    login: profile.emailAddress ?? profile.displayName,
    name: profile.displayName
  }
}

/** Create a new repository on the host and return its clone URL. */
async function createRepository(
  provider: RepoHost,
  token: string,
  opts: CreateRepoOpts,
  org?: string
): Promise<RemoteRepo> {
  if (!opts.name.trim()) throw new Error('Repository name is required.')
  const auth = await tokenForProvider(provider, token, org)
  if (!auth) throw noCredential(provider, providerBaseUrl(provider, org))

  if (provider === 'github') {
    const url =
      opts.ownerType === 'org'
        ? `https://api.github.com/orgs/${encodeURIComponent(opts.owner)}/repos`
        : 'https://api.github.com/user/repos'
    const repo = await ghJson<{ full_name: string; clone_url: string; private: boolean }>(url, auth.token, {
      method: 'POST',
      body: JSON.stringify({ name: opts.name, description: opts.description || undefined, private: opts.private })
    })
    return { name: repo.full_name, url: repo.clone_url, private: repo.private }
  }

  if (provider === 'gitlab') {
    const res = await fetch('https://gitlab.com/api/v4/projects', {
      method: 'POST',
      headers: { ...gitlabAuth(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: opts.name,
        description: opts.description || undefined,
        visibility: opts.private ? 'private' : 'public',
        namespace_id: opts.ownerId ? Number(opts.ownerId) : undefined
      })
    })
    if (!res.ok) {
      const msg = (await res.json().catch(() => null)) as { message?: unknown } | null
      throw new Error(`GitLab: ${msg?.message ? JSON.stringify(msg.message) : res.status}`)
    }
    const repo = (await res.json()) as { path_with_namespace: string; http_url_to_repo: string; visibility: string }
    return { name: repo.path_with_namespace, url: repo.http_url_to_repo, private: repo.visibility !== 'public' }
  }

  if (provider === 'bitbucket') {
    const slug = opts.name.trim().toLowerCase().replace(/\s+/g, '-')
    const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${opts.owner}/${slug}`, {
      method: 'POST',
      headers: { Authorization: bitbucketAuthFor(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify({ scm: 'git', is_private: opts.private, description: opts.description || undefined })
    })
    if (!res.ok) throw new Error(`Bitbucket API error (${res.status})`)
    const repo = (await res.json()) as {
      full_name: string
      is_private: boolean
      links: { clone: Array<{ name: string; href: string }> }
    }
    return {
      name: repo.full_name,
      url: repo.links.clone.find((c) => c.name === 'https')?.href ?? repo.links.clone[0]?.href ?? '',
      private: repo.is_private
    }
  }

  // Azure DevOps — create a repo inside a project of the organization.
  if (!org?.trim()) throw new Error('Enter your Azure DevOps organization.')
  if (!opts.project?.trim()) throw new Error('Select an Azure DevOps project.')
  const base = providerBaseUrl('azure', org)
  const repo = await withAzureRetry(base, auth, (t) =>
    adoJson<{ name: string; remoteUrl: string; project: { name: string } }>(
      `${base}/${encodeURIComponent(opts.project!)}/_apis/git/repositories?api-version=7.1`,
      t,
      { method: 'POST', body: JSON.stringify({ name: opts.name, project: { id: opts.owner } }) }
    )
  )
  return { name: `${repo.project.name}/${repo.name}`, url: repo.remoteUrl }
}

function ghCiState(conclusion: string | null, status: string): CiState {
  if (status !== 'completed') return 'pending'
  if (conclusion === 'success') return 'success'
  if (conclusion === 'neutral' || conclusion === 'skipped') return 'neutral'
  return 'failure'
}

/** The shape of a stack member, as much of it as we rely on. */
interface GithubStackMember {
  number: number
  title?: string
  html_url?: string
  draft?: boolean
  state?: string
  merged_at?: string | null
  user?: { login: string }
  head?: { ref: string; sha: string }
  base?: { ref: string }
}

/** "3 passed · 1 failing" — the row shows a dot, the tooltip shows this. */
function summariseChecks(status: CiStatus): string {
  const count = (state: CiState): number => status.jobs.filter((j) => j.state === state).length
  const parts: string[] = []
  if (count('success')) parts.push(`${count('success')} passed`)
  if (count('failure')) parts.push(`${count('failure')} failing`)
  if (count('pending')) parts.push(`${count('pending')} running`)
  if (count('neutral')) parts.push(`${count('neutral')} skipped`)
  return parts.join(' · ')
}

async function fetchCiStatuses(
  remoteUrl: string,
  shas: string[],
  token: string
): Promise<Record<string, CiStatus>> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github') return {}
  const auth = await apiToken(remoteUrl, token)
  if (!auth) return {}

  const result: Record<string, CiStatus> = {}
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${auth.token}`
  }

  await Promise.all(
    shas.slice(0, 40).map(async (sha) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${sha}/check-runs?per_page=30`,
          { headers }
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          check_runs: Array<{ name: string; status: string; conclusion: string | null; html_url: string }>
        }
        const runs = data.check_runs ?? []
        if (!runs.length) return
        const jobs: CiJob[] = runs.map((r) => ({
          name: r.name,
          state: ghCiState(r.conclusion, r.status),
          url: r.html_url
        }))
        const overallState: CiState = jobs.some((j) => j.state === 'failure')
          ? 'failure'
          : jobs.some((j) => j.state === 'pending')
            ? 'pending'
            : jobs.every((j) => j.state === 'neutral')
              ? 'neutral'
              : 'success'
        result[sha] = { state: overallState, jobs }
      } catch {
        /* skip failed SHA */
      }
    })
  )
  return result
}

/**
 * GitHub notifications for the authenticated user, across every repo the token
 * can see. Token-level (no remote needed). `all=false` ⇒ unread only.
 */
async function listNotifications(token: string, all = false): Promise<GitHubNotification[]> {
  // Same precedence as every other call: a typed token, else the credential
  // git's helper already holds for github.com. Silent (this backs a poll).
  const auth = await tokenForProvider('github', token)
  if (!auth) return []
  token = auth.token
  const data = await ghJson<
    Array<{
      id: string
      reason: string
      unread: boolean
      updated_at: string
      subject: { title: string; url: string | null; type: string }
      repository: { full_name: string; html_url: string }
    }>
  >(`https://api.github.com/notifications?all=${all ? 'true' : 'false'}&per_page=50`, token)

  return data.map((n) => {
    // subject.url is an API url (…/repos/o/r/issues/5 or …/pulls/5). Derive the
    // trailing number and a browser URL — note PRs use the singular /pull/.
    const tail = n.subject.url?.split('/').pop() ?? ''
    const number = /^\d+$/.test(tail) ? Number(tail) : null
    let url = n.repository.html_url
    if (number != null) {
      if (n.subject.type === 'PullRequest') url = `${n.repository.html_url}/pull/${number}`
      else if (n.subject.type === 'Issue') url = `${n.repository.html_url}/issues/${number}`
    } else if (n.subject.type === 'Release') {
      url = `${n.repository.html_url}/releases`
    }
    return {
      id: n.id,
      reason: n.reason,
      title: n.subject.title,
      type: n.subject.type,
      repoFullName: n.repository.full_name,
      repoUrl: n.repository.html_url,
      number,
      unread: n.unread,
      updatedAt: Math.floor(new Date(n.updated_at).getTime() / 1000),
      url
    }
  })
}

async function markNotificationRead(token: string, id: string): Promise<void> {
  const auth = await tokenForProvider('github', token)
  if (!auth) return
  await ghJson<unknown>(`https://api.github.com/notifications/threads/${id}`, auth.token, { method: 'PATCH' }).catch(() => {
    /* already read / gone — non-fatal */
  })
}

async function markAllNotificationsRead(token: string): Promise<void> {
  const auth = await tokenForProvider('github', token)
  if (!auth) return
  token = auth.token
  // The PUT /notifications endpoint returns 202 with an empty body; ghJson would
  // choke parsing JSON, so call fetch directly.
  await fetch('https://api.github.com/notifications', {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ read: true })
  }).catch(() => {
    /* non-fatal */
  })
}

/**
 * Register an SSH public key on the user's GitHub account. The only place the
 * host token and the SSH world meet: the token is what authorises adding a key
 * the transport will then use. Only the public half is ever sent.
 */
export async function uploadSshKey(token: string, title: string, publicKey: string): Promise<{ id: number }> {
  return ghJson<{ id: number }>('https://api.github.com/user/keys', token, {
    method: 'POST',
    body: JSON.stringify({ title, key: publicKey.trim() })
  })
}

export function registerHostingHandlers(): void {
  ipcMain.handle('hosting:listRepos', (_e, provider: RepoHost, token: string, org?: string) =>
    listRepositories(provider, token, org)
  )
  ipcMain.handle('hosting:listOwners', (_e, provider: RepoHost, token: string, org?: string) =>
    listOwners(provider, token, org)
  )
  ipcMain.handle('hosting:whoAmI', (_e, provider: RepoHost, token: string, org?: string, interactive?: boolean) =>
    fetchConnectedAccount(provider, token, org, interactive)
  )
  ipcMain.handle('hosting:createRepo', (_e, provider: RepoHost, token: string, opts: CreateRepoOpts, org?: string) =>
    createRepository(provider, token, opts, org)
  )
  ipcMain.handle('hosting:listPRs', (_e, remoteUrl: string, tokens: { github?: string; azure?: string; gitlab?: string; bitbucket?: string }) =>
    listPullRequests(remoteUrl, tokens)
  )
  ipcMain.handle('hosting:listReleases', (_e, remoteUrl: string, tokens: { github?: string }) =>
    listReleases(remoteUrl, tokens)
  )
  ipcMain.handle('hosting:ciStatuses', (_e, remoteUrl: string, shas: string[], token: string) =>
    fetchCiStatuses(remoteUrl, shas, token)
  )
  ipcMain.handle('hosting:openCreatePR', (_e, remoteUrl: string, source: string, target: string) => {
    const url = createPullRequestUrl(remoteUrl, source, target)
    if (url) shell.openExternal(url)
    return url != null
  })
  ipcMain.handle(
    'hosting:createPR',
    (_e, remoteUrl: string, tokens: { github?: string; azure?: string; gitlab?: string; bitbucket?: string }, opts: CreatePrOpts) =>
      createPullRequest(remoteUrl, tokens, opts)
  )
  ipcMain.handle('hosting:prDetail', (_e, remoteUrl: string, tokens: HostTokens, number: number) =>
    pullRequestDetail(remoteUrl, tokens, number)
  )
  ipcMain.handle('hosting:prComment', (_e, remoteUrl: string, tokens: HostTokens, number: number, body: string) =>
    commentOnPr(remoteUrl, tokens, number, body)
  )
  ipcMain.handle(
    'hosting:prReplyReviewComment',
    (_e, remoteUrl: string, tokens: HostTokens, number: number, inReplyTo: number | string, body: string) =>
      replyReviewComment(remoteUrl, tokens, number, inReplyTo, body)
  )
  ipcMain.handle('hosting:prFiles', (_e, remoteUrl: string, tokens: HostTokens, number: number) =>
    pullRequestFiles(remoteUrl, tokens, number)
  )
  ipcMain.handle('hosting:prChecks', (_e, remoteUrl: string, tokens: HostTokens, number: number) =>
    pullRequestChecks(remoteUrl, tokens, number)
  )
  ipcMain.handle(
    'hosting:prReview',
    (_e, remoteUrl: string, tokens: HostTokens, number: number, event: PrReviewEvent, body: string) =>
      reviewPr(remoteUrl, tokens, number, event, body)
  )
  ipcMain.handle(
    'hosting:prMerge',
    (_e, remoteUrl: string, tokens: HostTokens, number: number, method: PrMergeMethod) =>
      mergePr(remoteUrl, tokens, number, method)
  )
  ipcMain.handle('hosting:mergedPrHeads', (_e, remoteUrl: string, tokens: { github?: string }, branches: string[]) =>
    mergedPrHeads(remoteUrl, tokens, branches)
  )
  ipcMain.handle(
    'hosting:ensureStack',
    (_e, remoteUrl: string, tokens: { github?: string }, numbers: number[]) =>
      ensureGithubStack(remoteUrl, tokens, numbers)
  )
  ipcMain.handle(
    'hosting:updatePR',
    (
      _e,
      remoteUrl: string,
      tokens: { github?: string },
      number: number,
      patch: { base?: string; title?: string; stackSection?: string }
    ) => updatePullRequest(remoteUrl, tokens, number, patch)
  )
  ipcMain.handle('hosting:listNotifications', (_e, token: string, all?: boolean) =>
    listNotifications(token, all)
  )
  ipcMain.handle('hosting:markNotificationRead', (_e, token: string, id: string) =>
    markNotificationRead(token, id)
  )
  ipcMain.handle('hosting:markAllNotificationsRead', (_e, token: string) =>
    markAllNotificationsRead(token)
  )
  ipcMain.handle('hosting:listIssues', (_e, remoteUrl: string, tokens: { github?: string }) =>
    listIssues(remoteUrl, tokens)
  )
  ipcMain.handle('hosting:listMilestones', (_e, remoteUrl: string, tokens: { github?: string }) =>
    listMilestones(remoteUrl, tokens)
  )
  ipcMain.handle('hosting:milestoneIssues', (_e, remoteUrl: string, tokens: { github?: string }, number: number) =>
    milestoneIssues(remoteUrl, tokens, number)
  )
  ipcMain.handle('hosting:uploadSshKey', (_e, token: string, title: string, publicKey: string) =>
    uploadSshKey(token, title, publicKey)
  )
  ipcMain.handle('hosting:issueDetail', (_e, remoteUrl: string, tokens: { github?: string }, number: number) =>
    issueDetail(remoteUrl, tokens, number)
  )
  ipcMain.handle(
    'hosting:setIssueState',
    (_e, remoteUrl: string, tokens: { github?: string }, number: number, state: 'open' | 'closed') =>
      setIssueState(remoteUrl, tokens, number, state)
  )
  ipcMain.handle(
    'hosting:createIssue',
    (_e, remoteUrl: string, tokens: { github?: string }, opts: { title: string; body?: string }) =>
      createIssue(remoteUrl, tokens, opts)
  )
  ipcMain.handle(
    'hosting:applyPrMeta',
    (_e, remoteUrl: string, tokens: { github?: string }, number: number, meta: { reviewers?: string[]; labels?: string[]; assignees?: string[] }) =>
      applyPrMeta(remoteUrl, tokens, number, meta)
  )
}
