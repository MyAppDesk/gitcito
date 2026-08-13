import type { PrRefCandidate, PrRefFlavor } from './types'

/**
 * Where each forge publishes a pull/merge request's head as a plain git ref.
 *
 * This is what makes previewing a PR work without an API token, without a
 * second remote and without knowing the fork's URL: the PR head is mirrored on
 * the *target* repository under a well-known ref, so a single `ls-remote` finds
 * it and a single `fetch` brings it down. Hosts that copy GitHub's layout
 * (Gitea, Forgejo, Gogs, GitHub Enterprise) fall out for free.
 */
const CONVENTIONS: { flavor: PrRefFlavor; ref: (n: number) => string }[] = [
  // GitHub, Gitea, Forgejo, Gogs, GHES.
  { flavor: 'github', ref: (n) => `refs/pull/${n}/head` },
  // GitLab, cloud and self-hosted.
  { flavor: 'gitlab', ref: (n) => `refs/merge-requests/${n}/head` },
  // Bitbucket Cloud and Bitbucket Server / Data Center.
  { flavor: 'bitbucket', ref: (n) => `refs/pull-requests/${n}/from` },
  // Azure DevOps publishes only the pre-merged result, never a bare head.
  { flavor: 'azure', ref: (n) => `refs/pull/${n}/merge` }
]

/** Best guess at a remote's forge, from its URL alone. `null` when unknown. */
export function flavorForRemoteUrl(url: string | undefined): PrRefFlavor | null {
  if (!url) return null
  if (/gitlab/i.test(url)) return 'gitlab'
  if (/bitbucket/i.test(url)) return 'bitbucket'
  if (/dev\.azure\.com|visualstudio\.com/i.test(url)) return 'azure'
  if (/github|gitea|forgejo|codeberg/i.test(url)) return 'github'
  return null
}

/**
 * Every ref a PR numbered `number` could live under, most likely first.
 *
 * All four are always returned — the URL hint only reorders them. A self-hosted
 * GitLab on a vanity domain looks like nothing in particular, and probing the
 * whole set costs one `ls-remote` either way.
 */
export function prRefCandidates(number: number, remoteUrl?: string): PrRefCandidate[] {
  const hint = flavorForRemoteUrl(remoteUrl)
  const ordered = hint
    ? [...CONVENTIONS].sort((a, b) => Number(b.flavor === hint) - Number(a.flavor === hint))
    : CONVENTIONS
  return ordered.map((c) => ({ flavor: c.flavor, ref: c.ref(number) }))
}

/**
 * Pull a PR number out of whatever the user pasted — a bare number, `#7`, or a
 * full browser URL from any of the four forges. Returns null when there is no
 * number to be found, so the caller can keep the probe button disabled.
 */
export function parsePrNumber(input: string): number | null {
  const s = input.trim()
  if (!s) return null

  const fromUrl =
    // github/gitea: /pull/7, azure: /pullrequest/7, bitbucket: /pull-requests/7,
    // gitlab: /-/merge_requests/7
    /\/(?:pull|pullrequest|pull-requests|merge_requests|pullrequests)\/(\d+)/i.exec(s)
  if (fromUrl) return Number(fromUrl[1])

  const bare = /^#?(\d+)$/.exec(s)
  return bare ? Number(bare[1]) : null
}

/**
 * Default local branch name for a preview. Kept boringly predictable (`pr/7`)
 * so a second preview of the same PR reuses the branch instead of littering.
 */
export function defaultPreviewBranch(source: { number?: number; branch?: string }): string {
  if (source.number != null) return `pr/${source.number}`
  const clean = (source.branch ?? '').replace(/^refs\/heads\//, '').replace(/^origin\//, '')
  return clean ? `preview/${clean}` : ''
}
