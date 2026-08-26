import type { UpdateInfo } from '../../../shared/types'
import { isNewerVersion } from '../../../shared/version'

/** A published release, as the What's-new timeline knows it. */
export interface ReleaseRef {
  tag: string
  body: string | null
  url: string
}

export interface UpdateOffer {
  /** The version to advertise and to act on. */
  version: string
  /** Richest release notes available for it, or null. */
  notes: string | null
  /** A build already on disk that this offer supersedes — quitting would
   *  install that one, so the UI has to say it rather than let the two
   *  numbers contradict each other. */
  supersedes: string | null
  /** A release GitHub has published that the update feed is not serving yet
   *  (installers land minutes after the tag). Null when the two agree. */
  aheadOnGitHub: ReleaseRef | null
}

const stripV = (s: string): string => s.trim().replace(/^v/i, '')

/** Reconcile the two things that know about new versions: the updater feed,
 *  which is the only one that can actually install, and the GitHub release
 *  timeline, which the What's-new page refetches every time it opens. Reading
 *  them independently is what let the page and the banner name two different
 *  versions at once — so this decides once, for both. */
export function resolveUpdateOffer(args: {
  installed: string
  /** What the updater is offering, if anything. */
  info: UpdateInfo | null
  /** Version already downloaded and staged on disk. */
  staged: string | null
  /** Published releases, newest first, prereleases already filtered out. */
  timeline: ReleaseRef[]
}): UpdateOffer | null {
  const current = stripV(args.installed)
  if (!current) return null

  const ahead = args.timeline.find((r) => isNewerVersion(stripV(r.tag), current)) ?? null

  // The updater wins when it has something: it names the build that will run.
  const offered = args.info && isNewerVersion(args.info.version, current) ? args.info.version : null

  // The timeline only stands in when the updater has nothing to say yet —
  // dev builds, offline, or a check that has not landed.
  const version = offered ?? (ahead ? stripV(ahead.tag) : null)
  if (!version) return null

  const match = args.timeline.find((r) => stripV(r.tag) === version) ?? null
  return {
    version,
    // A GitHub body is richer than the note the feed carries.
    notes: match?.body?.trim() ? match.body : offered ? args.info?.notes ?? null : null,
    supersedes: args.staged && isNewerVersion(version, args.staged) ? args.staged : null,
    aheadOnGitHub: offered && ahead && isNewerVersion(stripV(ahead.tag), offered) ? ahead : null
  }
}
