import type { RemoteInfo } from '../../../shared/types'

/** True if a remote URL points at github.com (SSH or HTTPS). */
export function isGitHubRemote(url: string | undefined | null): boolean {
  return !!url && /github\.com[/:]/i.test(url)
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
