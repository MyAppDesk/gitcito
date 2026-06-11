import { ipcMain, shell } from 'electron'
import type { HostingProvider, PullRequest, RemoteRepo, RepoHost } from '../shared/types'

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

export function registerHostingHandlers(): void {
  ipcMain.handle('hosting:listRepos', (_e, provider: RepoHost, token: string, org?: string) =>
    listRepositories(provider, token, org)
  )
  ipcMain.handle('hosting:listPRs', (_e, remoteUrl: string, tokens: { github?: string; azure?: string }) =>
    listPullRequests(remoteUrl, tokens)
  )
  ipcMain.handle('hosting:openCreatePR', (_e, remoteUrl: string, source: string, target: string) => {
    const url = createPullRequestUrl(remoteUrl, source, target)
    if (url) shell.openExternal(url)
    return url != null
  })
}
