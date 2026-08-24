/**
 * Session logic for hack mode — the parts that are arithmetic and string
 * matching rather than React or IPC, so they can be tested without either.
 *
 * The session itself is data (`HackSession` in shared/types). This module
 * answers the questions the UI asks of it: how long is left, is the freeze on,
 * does this file belong to someone else, did that push break a contract.
 */

import { matchesAny, matchesPattern } from '../../../shared/codeowners'
import type { HackRepoRole, HackSession, HackTemplate, PortableHackSession } from '../../../shared/types'

/** Where the session is in its own life. Drives the banner's tone. */
export type HackPhase = 'running' | 'freeze' | 'overtime'

export interface HackClock {
  phase: HackPhase
  /** Milliseconds to the deadline; negative once it has passed. */
  remainingMs: number
  /** 0…1 of the session elapsed, clamped — the banner's progress bar. */
  progress: number
}

export function hackClock(session: HackSession, now: number): HackClock {
  const remainingMs = session.endsAt - now
  const total = Math.max(1, session.endsAt - session.startedAt)
  const progress = Math.min(1, Math.max(0, (now - session.startedAt) / total))
  if (remainingMs <= 0) return { phase: 'overtime', remainingMs, progress: 1 }
  const freezeWindow = session.freezeFromHours * 3600_000
  if (freezeWindow > 0 && remainingMs <= freezeWindow) return { phase: 'freeze', remainingMs, progress }
  return { phase: 'running', remainingMs, progress }
}

/** `36:12` / `04:07` / `12:30` — hours and minutes, zero-padded, no seconds
 *  ticking away in the corner of someone's eye for two days. */
export function formatCountdown(ms: number): string {
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3600_000)
  const minutes = Math.floor((abs % 3600_000) / 60_000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Roles that apply to a repo: its own, plus any pinned to a folder inside it. */
export function rolesForRepo(session: HackSession, repoPath: string): HackRepoRole[] {
  return session.roles.filter((r) => r.path === repoPath || r.path.startsWith(`${repoPath}/`))
}

/**
 * Contract globs for a repo, rebased to be repo-relative.
 *
 * A role pinned to `~/mono/api` declaring `openapi.yaml` means `api/openapi.yaml`
 * from the repository's point of view, and every consumer of this list — the
 * radar, the freeze check — works in repo-relative paths.
 */
export function contractsForRepo(session: HackSession, repoPath: string): string[] {
  const out: string[] = []
  for (const role of rolesForRepo(session, repoPath)) {
    const sub = role.path === repoPath ? '' : `${role.path.slice(repoPath.length + 1)}/`
    for (const c of role.contracts) out.push(`${sub}${c}`)
  }
  return [...new Set(out)]
}

/** Which of `files` are declared contracts of `repoPath`. */
export function contractHits(session: HackSession, repoPath: string, files: string[]): string[] {
  const globs = contractsForRepo(session, repoPath)
  if (globs.length === 0) return []
  return files.filter((f) => matchesAny(globs, f))
}

/**
 * Repos that should hear about a contract change in `sourceRepo`.
 *
 * Everything else in the session, minus the source. There is deliberately no
 * inferred dependency graph: between repositories no exact signal exists, and a
 * guess dressed as a fact is worse than telling four people that the schema
 * moved. The declaration of what *is* a contract is the precision; who consumes
 * it is not worth guessing.
 */
export function contractAudience(session: HackSession, sourceRepo: string): string[] {
  return session.repos.filter((p) => p !== sourceRepo)
}

/** Is the freeze warning live right now? */
export function freezeActive(session: HackSession, now: number): boolean {
  const { phase } = hackClock(session, now)
  return session.freezeFromHours > 0 && (phase === 'freeze' || phase === 'overtime')
}

/**
 * Files a commit would touch that the freeze says to leave alone.
 *
 * A warning, never a block: the allow-list is a thing five people agreed to in
 * a hurry, and being wrong about it must cost a dialog, not a commit.
 */
export function frozenViolations(session: HackSession, files: string[], now: number): string[] {
  if (!freezeActive(session, now)) return []
  if (session.freezeAllowlist.length === 0) return []
  return files.filter((f) => !matchesAny(session.freezeAllowlist, f))
}

/** A session seeded from a template. Every field stays editable afterwards. */
export function sessionFromTemplate(
  template: HackTemplate,
  opts: { id: string; name: string; repos: string[]; roles: HackRepoRole[]; me: string; now: number }
): HackSession {
  return {
    id: opts.id,
    name: opts.name,
    templateId: template.id,
    repos: opts.repos,
    roles: opts.roles,
    me: opts.me,
    startedAt: opts.now,
    endsAt: opts.now + template.durationHours * 3600_000,
    fetchSeconds: template.fetchSeconds,
    wipPushMinutes: template.wipPushMinutes,
    freezeAllowlist: [],
    freezeFromHours: template.freezeFromHours,
    radarNotify: template.radarNotify,
    semanticCollisions: false,
    // On by default: unlike the AI passes it costs nothing and answers the
    // question people actually ask each other across a room all day.
    activityDigest: true,
    wipPush: false
  }
}

/** The WIP branch a repo pushes to. Namespaced by handle so five people on one
 *  remote do not overwrite each other. */
export function wipBranchName(me: string, branch: string): string {
  const handle = (me || 'me').replace(/^@/, '').replace(/[^\w.-]+/g, '-')
  const safe = branch.replace(/[^\w./-]+/g, '-')
  return `wip/${handle}/${safe}`
}

/** Everything under `wip/<me>/`, for the teardown that removes them. */
export function wipBranchPrefix(me: string): string {
  return `wip/${(me || 'me').replace(/^@/, '').replace(/[^\w.-]+/g, '-')}/`
}

/**
 * How many AI judgements one session may spend.
 *
 * The prompt behind this feature asked who pays for the calls, and the honest
 * answer is "the user, on their own key". A 36-hour event with a fetch every 45
 * seconds is ~2900 sweeps per repo; without a ceiling, one noisy afternoon
 * could turn into hundreds of requests nobody asked for. The cap is deliberately
 * low enough to be affordable and high enough to cover a real event's genuine
 * collisions, and the counter is shown so it is never a surprise.
 */
export const AI_CALL_BUDGET = 40

/** Whether another judgement is allowed, and how many are left. */
export function aiBudget(used: number): { left: number; allowed: boolean } {
  const left = Math.max(0, AI_CALL_BUDGET - used)
  return { left, allowed: left > 0 }
}

/**
 * The identity of one AI judgement, so the same question is never paid for
 * twice.
 *
 * Keyed on what actually determines the answer: which repository is asking,
 * which upstream commit prompted it, and which files are in play. A sweep that
 * re-runs over unchanged state produces the same key and is skipped.
 */
export function collisionKey(repoPath: string, sha: string, files: string[]): string {
  return `${repoPath}@${sha}:${[...files].sort().join(',')}`
}

/**
 * How long one repository must stay quiet before it may interrupt again.
 *
 * The digest exists to answer "what shipped over there while I was here", and
 * the fastest way to make that worthless is to send it per commit. One message
 * per repository per ten minutes is a colleague leaning over; one per push is a
 * firehose people mute on day one.
 */
export const DIGEST_QUIET_MS = 10 * 60_000

/** At this many unseen commits a repository may interrupt early — something
 *  substantial landed and waiting out the timer would just make it stale. */
export const DIGEST_BURST = 5

/**
 * Should this repository's activity be surfaced now?
 *
 * Deliberately not "is there anything new": there is almost always something
 * new. It fires on volume or on patience, never on every arrival.
 */
export function shouldDigest(pending: number, lastAt: number, now: number): boolean {
  if (pending === 0) return false
  if (pending >= DIGEST_BURST) return true
  return now - lastAt >= DIGEST_QUIET_MS
}

/**
 * A one-line description of what landed, without a model.
 *
 * This is the fallback that keeps the feature whole with no API key: the people
 * and the subjects, which is most of what a digest is for. The AI pass, when it
 * is on, replaces this with a judgement about whether any of it touches *your*
 * work — but its absence costs detail, never the feature.
 */
export function describeActivity(commits: { author: string; subject: string }[]): string {
  const authors = [...new Set(commits.map((c) => c.author).filter(Boolean))]
  const subjects = commits.slice(0, 3).map((c) => c.subject).filter(Boolean)
  const who = authors.slice(0, 2).join(', ')
  const what = subjects.join(' · ')
  return [who, what].filter(Boolean).join(' — ')
}

/** Commits worth putting in a digest: not mine, and actually described. */
export function digestWorthy<T extends { author: string; subject: string; sha: string }>(
  commits: T[],
  me: string,
  seen: string[]
): T[] {
  const mine = me.replace(/^@/, '').toLowerCase()
  const seenSet = new Set(seen)
  return commits.filter((c) => {
    if (seenSet.has(c.sha)) return false
    if (!c.subject.trim()) return false
    // Your own commits arriving back from the remote are not news.
    return !mine || c.author.toLowerCase() !== mine
  })
}

// ─── Portability ────────────────────────────────────────────────────────────

/**
 * Strip a session down to what survives another machine: no absolute paths, no
 * handles, no local state. Repos travel as remote URL plus folder name, which
 * is the same rule the portable workspace already uses.
 */
export function toPortable(
  session: HackSession,
  repoInfo: { path: string; name: string; remote?: string }[]
): PortableHackSession {
  const folderOf = (p: string): string => p.split('/').filter(Boolean).pop() ?? p
  return {
    version: 1,
    name: session.name,
    templateId: session.templateId,
    endsAt: session.endsAt,
    fetchSeconds: session.fetchSeconds,
    wipPushMinutes: session.wipPushMinutes,
    freezeAllowlist: session.freezeAllowlist,
    freezeFromHours: session.freezeFromHours,
    radarNotify: session.radarNotify,
    repos: session.repos.map((p) => {
      const info = repoInfo.find((r) => r.path === p)
      return {
        name: info?.name ?? folderOf(p),
        ...(info?.remote ? { remote: info.remote } : {}),
        folder: folderOf(p)
      }
    }),
    roles: session.roles.map((r) => {
      const repo = session.repos.find((p) => r.path === p || r.path.startsWith(`${p}/`))
      const folder = folderOf(repo ?? r.path)
      const sub = repo && r.path !== repo ? r.path.slice(repo.length + 1) : undefined
      return { folder, ...(sub ? { sub } : {}), label: r.label, contracts: r.contracts }
    })
  }
}

/** Bounds an imported session is clamped into. A file that arrived over Slack
 *  is someone else's input, and these are the numbers it is not allowed to
 *  choose freely. */
export const IMPORT_LIMITS = {
  minFetchSeconds: 15,
  maxFetchSeconds: 3600,
  maxWipPushMinutes: 240,
  maxFreezeFromHours: 72,
  maxDurationMs: 60 * 24 * 3600_000,
  maxRepos: 32,
  maxRoles: 128,
  maxContracts: 64,
  maxPatternLength: 256,
  maxNameLength: 80
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/**
 * A pattern safe to keep from an imported file.
 *
 * The session only ever *matches* these against paths — nothing resolves them
 * to disk, expands them into a command, or hands them to git. The rules below
 * are belt and braces on top of that: no traversal, no absolute anchor, no
 * pathological length.
 */
function safePattern(p: unknown): string | null {
  if (typeof p !== 'string') return null
  const s = p.trim()
  if (!s || s.length > IMPORT_LIMITS.maxPatternLength) return null
  if (s.includes('..') || s.startsWith('~') || /^[A-Za-z]:/.test(s)) return null
  if (s.includes('\0') || s.includes('\n')) return null
  return s
}

// Control characters are stripped rather than rejected: a name that arrived
// with a stray newline is a formatting accident, not an attack, and refusing
// the whole session over it helps nobody. The length cap does the real work.
const safeText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : ''

const safeNumber = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback


/**
 * Validate and clamp a parsed session file.
 *
 * Returns null when it is not a session at all. Everything that survives is
 * inside `IMPORT_LIMITS` — a shared preset may change what Gitcito shows, never
 * what Gitcito runs, and it can certainly not talk the app into fetching every
 * second or naming a remote.
 */
export function parsePortableSession(raw: unknown): PortableHackSession | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  const name = safeText(o.name, IMPORT_LIMITS.maxNameLength)
  if (!name) return null

  const repos = Array.isArray(o.repos)
    ? o.repos
        .slice(0, IMPORT_LIMITS.maxRepos)
        .map((r) => {
          const e = (r ?? {}) as Record<string, unknown>
          const folder = safeText(e.folder, 120).replace(/[/\\]/g, '')
          if (!folder) return null
          // The remote is displayed and matched as a string, never fetched from
          // here — but only ever accept the schemes a remote can actually be.
          const remote = safeText(e.remote, 400)
          const okRemote = /^(https?:\/\/|ssh:\/\/|git@)/.test(remote) ? remote : ''
          return {
            name: safeText(e.name, 120) || folder,
            ...(okRemote ? { remote: okRemote } : {}),
            folder
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    : []
  if (repos.length === 0) return null

  const roles = Array.isArray(o.roles)
    ? o.roles
        .slice(0, IMPORT_LIMITS.maxRoles)
        .map((r) => {
          const e = (r ?? {}) as Record<string, unknown>
          const folder = safeText(e.folder, 120).replace(/[/\\]/g, '')
          if (!folder) return null
          const sub = safePattern(e.sub) ?? undefined
          const contracts = Array.isArray(e.contracts)
            ? e.contracts
                .slice(0, IMPORT_LIMITS.maxContracts)
                .map(safePattern)
                .filter((c): c is string => c !== null)
            : []
          return { folder, ...(sub ? { sub } : {}), label: safeText(e.label, 60), contracts }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    : []

  const freezeAllowlist = Array.isArray(o.freezeAllowlist)
    ? o.freezeAllowlist
        .slice(0, IMPORT_LIMITS.maxContracts)
        .map(safePattern)
        .filter((c): c is string => c !== null)
    : []

  // A deadline from someone else's clock is still a deadline, but it cannot be
  // a decade away or already-expired nonsense.
  const now = Date.now()
  const endsAt = clamp(safeNumber(o.endsAt, now + 36 * 3600_000), now, now + IMPORT_LIMITS.maxDurationMs)

  return {
    version: 1,
    name,
    templateId: safeText(o.templateId, 60) || 'hackathon-36h',
    endsAt,
    fetchSeconds: clamp(
      Math.round(safeNumber(o.fetchSeconds, 60)),
      IMPORT_LIMITS.minFetchSeconds,
      IMPORT_LIMITS.maxFetchSeconds
    ),
    wipPushMinutes: clamp(Math.round(safeNumber(o.wipPushMinutes, 0)), 0, IMPORT_LIMITS.maxWipPushMinutes),
    freezeAllowlist,
    freezeFromHours: clamp(Math.round(safeNumber(o.freezeFromHours, 0)), 0, IMPORT_LIMITS.maxFreezeFromHours),
    radarNotify: o.radarNotify === true,
    repos,
    roles
  }
}

/**
 * Match a portable session's repos against what this machine has open.
 *
 * Remote URL first, folder name second — never an absolute path, which is the
 * one thing guaranteed to differ. Repos with no match are reported so the UI
 * can list what still needs cloning rather than silently shrinking the session.
 */
export function matchPortableRepos(
  portable: PortableHackSession,
  local: { path: string; name: string; remote?: string }[]
): { matched: { folder: string; path: string }[]; missing: { name: string; remote?: string }[] } {
  // Canonicalise to `host/owner/repo`, so the same repository cloned over SSH by
  // one person and over HTTPS by another still matches — which is the normal
  // state of a five-person team, not an edge case.
  const norm = (u: string): string =>
    u
      .trim()
      .toLowerCase()
      .replace(/\.git$/, '')
      .replace(/\/+$/, '')
      .replace(/^[a-z+]+:\/\//, '')
      .replace(/^[^@/]+@/, '')
      .replace(':', '/')
  const matched: { folder: string; path: string }[] = []
  const missing: { name: string; remote?: string }[] = []
  for (const r of portable.repos) {
    const byRemote = r.remote ? local.find((l) => l.remote && norm(l.remote) === norm(r.remote!)) : undefined
    const byFolder = local.find((l) => (l.path.split('/').filter(Boolean).pop() ?? '') === r.folder)
    const hit = byRemote ?? byFolder
    if (hit) matched.push({ folder: r.folder, path: hit.path })
    else missing.push({ name: r.name, ...(r.remote ? { remote: r.remote } : {}) })
  }
  return { matched, missing }
}

/** Rebuild a local session from a portable one plus the repos that matched. */
export function fromPortable(
  portable: PortableHackSession,
  matched: { folder: string; path: string }[],
  opts: { id: string; me: string; now: number }
): HackSession {
  const pathFor = (folder: string): string | undefined => matched.find((m) => m.folder === folder)?.path
  const roles: HackRepoRole[] = []
  for (const r of portable.roles) {
    const base = pathFor(r.folder)
    if (!base) continue
    roles.push({ path: r.sub ? `${base}/${r.sub}` : base, label: r.label, contracts: r.contracts })
  }
  return {
    id: opts.id,
    name: portable.name,
    templateId: portable.templateId,
    repos: matched.map((m) => m.path),
    roles,
    me: opts.me,
    startedAt: opts.now,
    endsAt: portable.endsAt,
    fetchSeconds: portable.fetchSeconds,
    wipPushMinutes: portable.wipPushMinutes,
    freezeAllowlist: portable.freezeAllowlist,
    freezeFromHours: portable.freezeFromHours,
    radarNotify: portable.radarNotify,
    semanticCollisions: false,
    // On by default: unlike the AI passes it costs nothing and answers the
    // question people actually ask each other across a room all day.
    activityDigest: true,
    wipPush: false
  }
}

/** Contract globs a detected role proposes, filtered to what the user kept. */
export function mergeDetectedContracts(existing: string[], detected: string[]): string[] {
  return [...new Set([...existing, ...detected.filter((d) => !existing.some((e) => matchesPattern(e, d)))])]
}
