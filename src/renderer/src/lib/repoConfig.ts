// Reading `.gitcito.json` in the renderer — pure functions over an already
// validated config. No React, no IPC: the store fetches the file, everything
// here just answers questions about it.
//
// The validator in shared/repoConfig.ts has already dropped anything malformed
// or unsafe, so nothing here re-checks schema. What it does still assume is
// that the *values* are a stranger's: patterns are run against bounded text,
// and interpolation never produces a half-filled trailer.

import type { DoctorCheck, RepoConfig, RepoConfigIssueCode, RepoConfigLink } from '../../../shared/types'
import { branchMatches } from '../../../shared/repoConfig'
import type { TranslationKey } from '../i18n'

/**
 * Branches protected for this repository: the local list plus whatever the
 * config adds.
 *
 * Union, never intersection. A repository can protect more than the person
 * cloning it chose to; it can never talk them out of protecting something.
 */
export function effectiveProtected(local: string[], config: RepoConfig | null | undefined): string[] {
  return [...new Set([...local, ...(config?.protect ?? [])])]
}

/** Whether a branch is protected, honouring the config's `glob*` patterns. */
export function isProtectedBranch(branch: string, local: string[], config: RepoConfig | null | undefined): boolean {
  return effectiveProtected(local, config).some((p) => branchMatches(p, branch))
}

/** One run of commit text: plain, or a link to the repository's tracker. */
export interface TicketSegment {
  text: string
  href?: string
  /** The tracker's name, for the link title. */
  label?: string
}

/** Commit text is scanned this far and no further — a pattern from a stranger
 *  should not be able to make the graph slow by being fed a huge body. */
const SCAN_LIMIT = 4000

/**
 * Split commit text into plain runs and tracker links.
 *
 * Patterns are tried in the order the config lists them and matches cannot
 * overlap — the first pattern to claim a span keeps it, so a repo listing a
 * broad pattern after a narrow one gets the narrow one where both apply.
 * Returns a single plain segment when nothing matches, which is the common case.
 */
export function ticketSegments(text: string, links: RepoConfigLink[] | undefined): TicketSegment[] {
  if (!text || !links?.length) return [{ text }]
  const scan = text.slice(0, SCAN_LIMIT)
  const hits: { start: number; end: number; href: string; label?: string; text: string }[] = []
  for (const link of links) {
    let re: RegExp
    try {
      re = new RegExp(link.match, 'g')
    } catch {
      continue
    }
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = re.exec(scan)) !== null && guard++ < 200) {
      // A pattern that can match empty would spin here forever.
      if (m[0] === '') {
        re.lastIndex++
        continue
      }
      const start = m.index
      const end = start + m[0].length
      if (hits.some((h) => start < h.end && end > h.start)) continue
      hits.push({
        start,
        end,
        text: m[0],
        href: expandUrl(link.url, m),
        ...(link.label ? { label: link.label } : {})
      })
    }
  }
  if (!hits.length) return [{ text }]
  hits.sort((a, b) => a.start - b.start)
  const out: TicketSegment[] = []
  let last = 0
  for (const h of hits) {
    if (h.start > last) out.push({ text: scan.slice(last, h.start) })
    out.push({ text: h.text, href: h.href, ...(h.label ? { label: h.label } : {}) })
    last = h.end
  }
  const tail = text.slice(last)
  if (tail) out.push({ text: tail })
  return out
}

/** Substitute `$0`…`$9` in a link template with the match and its groups. */
function expandUrl(url: string, m: RegExpExecArray): string {
  return url.replace(/\$([0-9])/g, (_, d: string) => encodeURIComponent(m[Number(d)] ?? ''))
}

/**
 * The trailer lines this config wants on a commit, with `{ticket}` and
 * `{branch}` filled in.
 *
 * A trailer whose placeholder has nothing to fill it is dropped rather than
 * emitted half-written: `Refs: ` in a commit message is worse than no trailer,
 * because it looks like something was lost.
 */
export function configTrailers(
  config: RepoConfig | null | undefined,
  vars: { ticket?: string; branch?: string }
): string[] {
  const out: string[] = []
  for (const raw of config?.commit?.trailers ?? []) {
    let dropped = false
    const line = raw.replace(/\{(ticket|branch)\}/g, (_, key: 'ticket' | 'branch') => {
      const value = vars[key]?.trim()
      if (!value) dropped = true
      return value ?? ''
    })
    if (!dropped) out.push(line)
  }
  return out
}

/**
 * Append trailers to a commit body, skipping ones already written by hand and
 * keeping the blank line git needs before a trailer block.
 */
export function appendTrailers(body: string, trailers: string[]): string {
  if (!trailers.length) return body
  const existing = new Set(
    body
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean)
  )
  const missing = trailers.filter((t) => !existing.has(t.trim().toLowerCase()))
  if (!missing.length) return body
  const base = body.replace(/\s+$/, '')
  return base ? `${base}\n\n${missing.join('\n')}` : missing.join('\n')
}

/** How many checks are in each state — what the status-bar chip reads. */
export function doctorSummary(checks: DoctorCheck[] | undefined): { ok: number; warn: number; fail: number } {
  let ok = 0
  let warn = 0
  let fail = 0
  for (const c of checks ?? []) {
    if (c.status === 'ok') ok++
    else if (c.status === 'warn') warn++
    else fail++
  }
  return { ok, warn, fail }
}

/** Dictionary key explaining why a config field was rejected. */
export function repoConfigIssueKey(code: RepoConfigIssueCode): TranslationKey {
  switch (code) {
    case 'json':
      return 'repoConfig.issueJson'
    case 'version':
      return 'repoConfig.issueVersion'
    case 'unknown':
      return 'repoConfig.issueUnknown'
    case 'unsafe':
      return 'repoConfig.issueUnsafe'
    case 'regex':
      return 'repoConfig.issueRegex'
    case 'url':
      return 'repoConfig.issueUrl'
    case 'limit':
      return 'repoConfig.issueLimit'
    default:
      return 'repoConfig.issueType'
  }
}

/** Dictionary key naming a doctor row. */
export function doctorCheckKey(check: DoctorCheck): TranslationKey {
  switch (check.kind) {
    case 'node':
      return 'doctor.node'
    case 'submodules':
      return 'doctor.submodules'
    case 'lfs':
      return 'doctor.lfs'
    case 'hooks':
      return 'doctor.hooks'
    default:
      return 'doctor.file'
  }
}

/** Dictionary key for the verdict line under a doctor row. */
export function doctorDetailKey(check: DoctorCheck): TranslationKey {
  if (check.status === 'ok') return 'doctor.detailOk'
  switch (check.kind) {
    case 'node':
      return check.actual ? 'doctor.detailNodeMismatch' : 'doctor.detailNodeMissing'
    case 'submodules':
      return 'doctor.detailSubmodules'
    case 'lfs':
      return check.fix ? 'doctor.detailLfsPointers' : 'doctor.detailLfsMissing'
    case 'hooks':
      return check.actual ? 'doctor.detailHooksWrong' : 'doctor.detailHooksUnset'
    default:
      return 'doctor.detailFileMissing'
  }
}
