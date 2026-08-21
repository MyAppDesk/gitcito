import type { RemoteInfo } from '../../../shared/types'

/** True if a remote URL points at github.com (SSH or HTTPS). */
export function isGitHubRemote(url: string | undefined | null): boolean {
  return !!url && /github\.com[/:]/i.test(url)
}

/** Owner/repo for a github.com remote (SSH or HTTPS). */
export function parseGitHubRemote(url: string | undefined | null): { owner: string; repo: string } | null {
  if (!url) return null
  const m = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(url.trim())
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/i, '') }
}

/** https://github.com/owner/repo for a GitHub remote, or undefined. */
export function githubWebUrl(url: string | undefined | null): string | undefined {
  const parsed = parseGitHubRemote(url)
  return parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : undefined
}

/** Prefer origin when it is GitHub; otherwise the first parseable github.com remote. */
export function githubRepoUrl(remotes: { name: string; url: string }[]): string | undefined {
  const origin = remotes.find((r) => r.name === 'origin')
  if (origin && isGitHubRemote(origin.url)) return githubWebUrl(origin.url)
  const first = remotes.find((r) => isGitHubRemote(r.url))
  return first ? githubWebUrl(first.url) : undefined
}

/** GitHub remote used for web links — origin when it is GitHub, else the first GitHub remote. */
export function githubRemote(remotes: RemoteInfo[]): RemoteInfo | null {
  const origin = remotes.find((r) => r.name === 'origin')
  if (origin && isGitHubRemote(origin.url)) return origin
  return remotes.find((r) => isGitHubRemote(r.url)) ?? null
}

/** Canonical github.com commit URL, or null when no GitHub remote can be normalised. */
export function githubCommitUrl(remotes: RemoteInfo[], sha: string): string | null {
  const full = sha.trim()
  if (!full) return null
  const remote = githubRemote(remotes)
  const parsed = parseGitHubRemote(remote?.url)
  if (!parsed) return null
  return `https://github.com/${parsed.owner}/${parsed.repo}/commit/${full}`
}

/** True if the repo's origin (or first) remote is hosted on GitHub. */
export function repoIsGitHub(remotes: RemoteInfo[]): boolean {
  const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
  return isGitHubRemote(origin?.url)
}

/** True if a remote's host has a rich PR detail/review surface (GitHub or GitLab). */
export function isReviewableRemote(url: string | undefined | null): boolean {
  return !!url && /(github\.com|gitlab\.com)[/:]/i.test(url)
}

/** True if the repo's origin (or first) remote supports the PR detail modal. */
export function repoSupportsPrReview(remotes: RemoteInfo[]): boolean {
  const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
  return isReviewableRemote(origin?.url)
}
