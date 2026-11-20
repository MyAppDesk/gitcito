import { normalizeGitlabUrl } from '../shared/gitlabInstance'

/**
 * The self-managed GitLab instances the profiles point at, so the synchronous
 * host checks (`providerOfHost`, `parseRemoteUrl`) recognise them. Refreshed
 * whenever settings are read or written; gitlab.com is not listed — it is
 * always known.
 *
 * Recognising a host only decides that it *is* GitLab. Which token it may
 * receive is decided per profile (`settings.profileAuth`), never here.
 */
let known: string[] = []

export function setKnownGitlabInstances(urls: Array<string | undefined>): void {
  known = [...new Set(urls.map((u) => normalizeGitlabUrl(u)).filter((u): u is string => !!u))]
}

export function knownGitlabInstances(): readonly string[] {
  return known
}

export function isKnownGitlabHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return known.some((base) => new URL(base).hostname === h)
}
