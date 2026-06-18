import { ipcMain, shell } from 'electron'
import type {
  CiJob,
  CiState,
  CiStatus,
  CreateRepoOpts,
  CreatePrOpts,
  CreatePrResult,
  HostingProvider,
  PullRequest,
  PrDetail,
  PrReview,
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
  RepoHost
} from '../shared/types'

interface ParsedRemote {
  provider: HostingProvider
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

  return null
}

async function listPullRequests(
  remoteUrl: string,
  tokens: { github?: string; azure?: string }
): Promise<{ provider: HostingProvider; prs: PullRequest[] }> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed) return { provider: null, prs: [] }

  if (parsed.provider === 'github') {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (tokens.github) headers['Authorization'] = `Bearer ${tokens.github}`
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
      head: { ref: string }
      base: { ref: string }
    }>
    return {
      provider: 'github',
      prs: data.map((p) => ({
        id: p.number,
        title: p.title,
        author: p.user.login,
        sourceBranch: p.head.ref,
        targetBranch: p.base.ref,
        url: p.html_url,
        isDraft: p.draft
      }))
    }
  }

  // Azure DevOps
  if (!tokens.azure) throw new Error('Azure DevOps requires a PAT. Add one in Settings → Profiles.')
  const auth = Buffer.from(`:${tokens.azure}`).toString('base64')
  const base = `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}`
  const res = await fetch(
    `${base}/_apis/git/repositories/${encodeURIComponent(parsed.repo)}/pullrequests?searchCriteria.status=active&api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  if (!res.ok) throw new Error(`Azure DevOps API error (${res.status})`)
  const data = (await res.json()) as {
    value: Array<{
      pullRequestId: number
      title: string
      isDraft: boolean
      createdBy: { displayName: string }
      sourceRefName: string
      targetRefName: string
    }>
  }
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
  if (tokens.github) headers['Authorization'] = `Bearer ${tokens.github}`
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
  return `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}/_git/${encodeURIComponent(
    parsed.repo
  )}/pullrequestcreate?sourceRef=${encodeURIComponent(source)}&targetRef=${encodeURIComponent(target)}`
}

/**
 * Create a pull/merge request. GitHub is fully supported; Azure DevOps too.
 * (GitLab/Bitbucket creation is tracked separately under hosting verification —
 * their remotes aren't parsed by parseRemoteUrl yet.)
 */
async function createPullRequest(
  remoteUrl: string,
  tokens: { github?: string; azure?: string },
  opts: CreatePrOpts
): Promise<CreatePrResult> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed) throw new Error('Unrecognized remote — PR creation supports GitHub and Azure DevOps.')

  if (parsed.provider === 'github') {
    if (!tokens.github) throw new Error('Add a GitHub token in Settings → Integrations.')
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokens.github}`,
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
      const detail = (await res.json().catch(() => null)) as { message?: string; errors?: { message?: string }[] } | null
      const msg = detail?.errors?.map((e) => e.message).filter(Boolean).join('; ') || detail?.message
      throw new Error(`GitHub: ${msg || `API error (${res.status})`}`)
    }
    const d = (await res.json()) as { html_url: string; number: number }
    return { url: d.html_url, number: d.number }
  }

  // Azure DevOps
  if (!tokens.azure) throw new Error('Azure DevOps requires a PAT. Add one in Settings → Integrations.')
  const auth = Buffer.from(`:${tokens.azure}`).toString('base64')
  const base = `https://dev.azure.com/${parsed.owner}/${encodeURIComponent(parsed.project)}`
  const res = await fetch(
    `${base}/_apis/git/repositories/${encodeURIComponent(parsed.repo)}/pullrequests?api-version=7.1`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceRefName: `refs/heads/${opts.source}`,
        targetRefName: `refs/heads/${opts.target}`,
        title: opts.title,
        description: opts.body,
        isDraft: opts.draft
      })
    }
  )
  if (!res.ok) throw new Error(`Azure DevOps API error (${res.status})`)
  const d = (await res.json()) as { pullRequestId: number }
  return {
    url: `${base}/_git/${encodeURIComponent(parsed.repo)}/pullrequest/${d.pullRequestId}`,
    number: d.pullRequestId
  }
}

/** Resolve a GitHub remote to {owner, repo} or throw (these B2 ops are GitHub-only for now). */
function ghRepoOf(remoteUrl: string, token?: string): { owner: string; repo: string; token: string } {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github') {
    throw new Error('This action currently supports GitHub repositories only.')
  }
  if (!token) throw new Error('Add a GitHub token in Settings → Integrations.')
  return { owner: parsed.owner, repo: parsed.repo, token }
}

async function pullRequestDetail(
  remoteUrl: string,
  tokens: { github?: string },
  number: number
): Promise<PrDetail> {
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
  const api = `https://api.github.com/repos/${owner}/${repo}`
  const [pr, comments, reviews] = await Promise.all([
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
    )
  ])
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
      .map((r) => ({ author: r.user?.login ?? 'unknown', state: r.state as PrReview['state'] }))
  }
}

async function commentOnPr(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  body: string
): Promise<void> {
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ body })
  })
}

async function reviewPr(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  event: PrReviewEvent,
  body: string
): Promise<void> {
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`, token, {
    method: 'POST',
    body: JSON.stringify({ event, body: body || undefined })
  })
}

async function mergePr(
  remoteUrl: string,
  tokens: { github?: string },
  number: number,
  method: PrMergeMethod
): Promise<void> {
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
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
  if (!parsed || parsed.provider !== 'github' || !tokens.github) {
    return { provider: parsed?.provider ?? null, issues: [] }
  }
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
  >(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues?state=open&per_page=50`, tokens.github)
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
  if (!parsed || parsed.provider !== 'github' || !tokens.github) {
    return { provider: parsed?.provider ?? null, milestones: [] }
  }
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
  >(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/milestones?state=all&per_page=50`, tokens.github)
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
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
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
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
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
  const { owner, repo, token } = ghRepoOf(remoteUrl, tokens.github)
  await ghJson(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ state })
  })
}

async function listRepositories(provider: RepoHost, token: string, org?: string): Promise<RemoteRepo[]> {
  if (provider === 'github') {
    if (!token.trim()) throw new Error('Not connected. Add a GitHub token in Settings → Integrations.')
    const res = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` } }
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
    if (!token.trim()) throw new Error('Not connected. Add a GitLab token in Settings → Integrations.')
    const res = await fetch(
      'https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at&simple=true',
      { headers: { 'PRIVATE-TOKEN': token } }
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
    if (!token.trim()) throw new Error('Not connected. Add a Bitbucket token in Settings → Integrations.')
    const auth = token.includes(':') ? `Basic ${Buffer.from(token).toString('base64')}` : `Bearer ${token}`
    const res = await fetch('https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100&sort=-updated_on', {
      headers: { Authorization: auth }
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
  if (!token.trim()) throw new Error('Not connected. Add an Azure DevOps PAT in Settings → Integrations.')
  const auth = Buffer.from(`:${token}`).toString('base64')
  const res = await fetch(
    `https://dev.azure.com/${encodeURIComponent(org.trim())}/_apis/git/repositories?api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  if (!res.ok) throw new Error(`Azure DevOps API error (${res.status})`)
  const data = (await res.json()) as {
    value: Array<{ name: string; remoteUrl: string; project: { name: string } }>
  }
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
  if (!token.trim()) throw new Error(`Not connected. Add a ${provider} token in Settings → Integrations.`)

  if (provider === 'github') {
    const user = await ghJson<{ login: string; avatar_url: string }>('https://api.github.com/user', token)
    const orgs = await ghJson<Array<{ login: string; avatar_url: string }>>(
      'https://api.github.com/user/orgs?per_page=100',
      token
    )
    return [
      { id: user.login, login: user.login, avatarUrl: user.avatar_url, type: 'user' },
      ...orgs.map((o) => ({ id: o.login, login: o.login, avatarUrl: o.avatar_url, type: 'org' as const }))
    ]
  }

  if (provider === 'gitlab') {
    const headers = { 'PRIVATE-TOKEN': token }
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
    const auth = token.includes(':') ? `Basic ${Buffer.from(token).toString('base64')}` : `Bearer ${token}`
    const wsRes = await fetch('https://api.bitbucket.org/2.0/workspaces?pagelen=100', {
      headers: { Authorization: auth }
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
  const auth = Buffer.from(`:${token}`).toString('base64')
  const res = await fetch(
    `https://dev.azure.com/${encodeURIComponent(org.trim())}/_apis/projects?api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  if (!res.ok) throw new Error(`Azure DevOps API error (${res.status})`)
  const data = (await res.json()) as { value: Array<{ id: string; name: string }> }
  return data.value.map((p) => ({ id: p.id, login: p.name, type: 'org' as const }))
}

/** Create a new repository on the host and return its clone URL. */
async function createRepository(
  provider: RepoHost,
  token: string,
  opts: CreateRepoOpts,
  org?: string
): Promise<RemoteRepo> {
  if (!token.trim()) throw new Error(`Not connected. Add a ${provider} token in Settings → Integrations.`)
  if (!opts.name.trim()) throw new Error('Repository name is required.')

  if (provider === 'github') {
    const url =
      opts.ownerType === 'org'
        ? `https://api.github.com/orgs/${encodeURIComponent(opts.owner)}/repos`
        : 'https://api.github.com/user/repos'
    const repo = await ghJson<{ full_name: string; clone_url: string; private: boolean }>(url, token, {
      method: 'POST',
      body: JSON.stringify({ name: opts.name, description: opts.description || undefined, private: opts.private })
    })
    return { name: repo.full_name, url: repo.clone_url, private: repo.private }
  }

  if (provider === 'gitlab') {
    const res = await fetch('https://gitlab.com/api/v4/projects', {
      method: 'POST',
      headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' },
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
    const auth = token.includes(':') ? `Basic ${Buffer.from(token).toString('base64')}` : `Bearer ${token}`
    const slug = opts.name.trim().toLowerCase().replace(/\s+/g, '-')
    const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${opts.owner}/${slug}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
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
  const auth = Buffer.from(`:${token}`).toString('base64')
  const res = await fetch(
    `https://dev.azure.com/${encodeURIComponent(org.trim())}/${encodeURIComponent(opts.project)}/_apis/git/repositories?api-version=7.1`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: opts.name, project: { id: opts.owner } })
    }
  )
  if (!res.ok) throw new Error(`Azure DevOps API error (${res.status})`)
  const repo = (await res.json()) as { name: string; remoteUrl: string; project: { name: string } }
  return { name: `${repo.project.name}/${repo.name}`, url: repo.remoteUrl }
}

function ghCiState(conclusion: string | null, status: string): CiState {
  if (status !== 'completed') return 'pending'
  if (conclusion === 'success') return 'success'
  if (conclusion === 'neutral' || conclusion === 'skipped') return 'neutral'
  return 'failure'
}

async function fetchCiStatuses(
  remoteUrl: string,
  shas: string[],
  token: string
): Promise<Record<string, CiStatus>> {
  const parsed = parseRemoteUrl(remoteUrl)
  if (!parsed || parsed.provider !== 'github' || !token) return {}

  const result: Record<string, CiStatus> = {}
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`
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

export function registerHostingHandlers(): void {
  ipcMain.handle('hosting:listRepos', (_e, provider: RepoHost, token: string, org?: string) =>
    listRepositories(provider, token, org)
  )
  ipcMain.handle('hosting:listOwners', (_e, provider: RepoHost, token: string, org?: string) =>
    listOwners(provider, token, org)
  )
  ipcMain.handle('hosting:createRepo', (_e, provider: RepoHost, token: string, opts: CreateRepoOpts, org?: string) =>
    createRepository(provider, token, opts, org)
  )
  ipcMain.handle('hosting:listPRs', (_e, remoteUrl: string, tokens: { github?: string; azure?: string }) =>
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
    (_e, remoteUrl: string, tokens: { github?: string; azure?: string }, opts: CreatePrOpts) =>
      createPullRequest(remoteUrl, tokens, opts)
  )
  ipcMain.handle('hosting:prDetail', (_e, remoteUrl: string, tokens: { github?: string }, number: number) =>
    pullRequestDetail(remoteUrl, tokens, number)
  )
  ipcMain.handle('hosting:prComment', (_e, remoteUrl: string, tokens: { github?: string }, number: number, body: string) =>
    commentOnPr(remoteUrl, tokens, number, body)
  )
  ipcMain.handle(
    'hosting:prReview',
    (_e, remoteUrl: string, tokens: { github?: string }, number: number, event: PrReviewEvent, body: string) =>
      reviewPr(remoteUrl, tokens, number, event, body)
  )
  ipcMain.handle(
    'hosting:prMerge',
    (_e, remoteUrl: string, tokens: { github?: string }, number: number, method: PrMergeMethod) =>
      mergePr(remoteUrl, tokens, number, method)
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
  ipcMain.handle('hosting:issueDetail', (_e, remoteUrl: string, tokens: { github?: string }, number: number) =>
    issueDetail(remoteUrl, tokens, number)
  )
  ipcMain.handle(
    'hosting:setIssueState',
    (_e, remoteUrl: string, tokens: { github?: string }, number: number, state: 'open' | 'closed') =>
      setIssueState(remoteUrl, tokens, number, state)
  )
}
