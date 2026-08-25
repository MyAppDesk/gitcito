/**
 * Validation for `.gitcito.json` — the optional file a repository ships to
 * describe its own house rules.
 *
 * Lives in `shared/` because both sides need the same verdict: the main process
 * validates what it reads off disk, and the settings editor validates what the
 * user is about to write, so the editor can never save something the loader
 * would then reject.
 *
 * The governing rule is that this file is **untrusted repository content**, no
 * different from a commit message. Three consequences show up all over this
 * module:
 *
 * - Every field is inert data or an added restriction. There is no field that
 *   runs a command, and none that can switch a guard off.
 * - Every list and every string is capped. A hostile repo should not be able to
 *   paste a wall of text into a confirmation dialog or a thousand chips into
 *   the sidebar.
 * - Anything that becomes a path is checked for escape, and anything that
 *   becomes a link is checked for scheme.
 *
 * Validation never throws and never rejects the whole file for one bad field:
 * offending entries are dropped, an issue is recorded, and the rest applies.
 * A config that fails wholesale would take a working repository's guards with
 * it, which is the wrong failure direction.
 */

import type {
  RepoConfig,
  RepoConfigFileReq,
  RepoConfigIssue,
  RepoConfigLink
} from './types'

/** The file name, at the repository root. */
export const REPO_CONFIG_FILE = '.gitcito.json'

/** Schema version this build understands. A newer file is ignored, not guessed at. */
export const REPO_CONFIG_VERSION = 1

// Caps. Generous for any honest repository, small enough that the worst a
// hostile one achieves is a slightly crowded panel.
const LIMITS = {
  protect: 50,
  scopes: 100,
  tickets: 10,
  trailers: 10,
  files: 20,
  checklist: 20,
  /** Free text shown in a dialog (checklist lines). */
  line: 200,
  /** Anything that becomes a chip, a path or a value. */
  short: 200,
  /** A regular expression source. Short patterns are also cheap patterns. */
  pattern: 120
} as const

type Issues = RepoConfigIssue[]

const push = (issues: Issues, field: string, code: RepoConfigIssue['code']): void => {
  issues.push({ field, code })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * A repo-relative path that cannot leave the repository.
 *
 * Rejects absolute paths, `..` segments, `~`, Windows drive letters, UNC roots
 * and NUL bytes. Everything the config can name is joined onto the repo root,
 * so this is the only thing standing between a config field and the rest of the
 * filesystem.
 */
export function isSafeRepoRelPath(value: string): boolean {
  if (!value || value.length > LIMITS.short) return false
  if (value.includes('\0')) return false
  if (value.startsWith('/') || value.startsWith('\\') || value.startsWith('~')) return false
  if (/^[a-zA-Z]:/.test(value)) return false
  return !value
    .split(/[/\\]/)
    .some((seg) => seg === '..' || seg === '.git')
}

/** Only `http(s)` links are ever handed to the shell's external-URL opener. */
export function isSafeLinkUrl(value: string): boolean {
  if (!value || value.length > LIMITS.short) return false
  return /^https?:\/\/[^\s]+$/i.test(value)
}

/** Whether a pattern is a regular expression this build will run. */
export function isSafePattern(source: string): boolean {
  if (!source || source.length > LIMITS.pattern) return false
  try {
    new RegExp(source)
    return true
  } catch {
    return false
  }
}

function strings(value: unknown, field: string, cap: number, issues: Issues, maxLen = LIMITS.short): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    push(issues, field, 'type')
    return undefined
  }
  if (value.length > cap) push(issues, field, 'limit')
  const out: string[] = []
  for (const [i, raw] of value.slice(0, cap).entries()) {
    if (typeof raw !== 'string') {
      push(issues, `${field}[${i}]`, 'type')
      continue
    }
    const s = raw.trim()
    if (!s) continue
    if (s.length > maxLen) {
      push(issues, `${field}[${i}]`, 'limit')
      continue
    }
    out.push(s)
  }
  return out.length ? out : undefined
}

function bool(value: unknown, field: string, issues: Issues): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    push(issues, field, 'type')
    return undefined
  }
  return value
}

function shortString(value: unknown, field: string, issues: Issues): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    push(issues, field, 'type')
    return undefined
  }
  const s = value.trim()
  if (!s) return undefined
  if (s.length > LIMITS.short) {
    push(issues, field, 'limit')
    return undefined
  }
  return s
}

function links(value: unknown, issues: Issues): RepoConfigLink[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    push(issues, 'links.tickets', 'type')
    return undefined
  }
  if (value.length > LIMITS.tickets) push(issues, 'links.tickets', 'limit')
  const out: RepoConfigLink[] = []
  for (const [i, raw] of value.slice(0, LIMITS.tickets).entries()) {
    const at = `links.tickets[${i}]`
    if (!isRecord(raw)) {
      push(issues, at, 'type')
      continue
    }
    const match = shortString(raw.match, `${at}.match`, issues)
    const url = shortString(raw.url, `${at}.url`, issues)
    const label = shortString(raw.label, `${at}.label`, issues)
    if (!match || !url) continue
    if (!isSafePattern(match)) {
      push(issues, `${at}.match`, 'regex')
      continue
    }
    if (!isSafeLinkUrl(url)) {
      push(issues, `${at}.url`, 'url')
      continue
    }
    out.push({ match, url, ...(label ? { label } : {}) })
  }
  return out.length ? out : undefined
}

function fileReqs(value: unknown, issues: Issues): RepoConfigFileReq[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    push(issues, 'requires.files', 'type')
    return undefined
  }
  if (value.length > LIMITS.files) push(issues, 'requires.files', 'limit')
  const out: RepoConfigFileReq[] = []
  for (const [i, raw] of value.slice(0, LIMITS.files).entries()) {
    const at = `requires.files[${i}]`
    // A bare string is the common case ("this file must exist"), so accept it.
    const rec: Record<string, unknown> = typeof raw === 'string' ? { path: raw } : isRecord(raw) ? raw : {}
    if (!isRecord(raw) && typeof raw !== 'string') {
      push(issues, at, 'type')
      continue
    }
    const path = shortString(rec.path, `${at}.path`, issues)
    const from = shortString(rec.from, `${at}.from`, issues)
    const why = shortString(rec.why, `${at}.why`, issues)
    if (!path) continue
    if (!isSafeRepoRelPath(path)) {
      push(issues, `${at}.path`, 'unsafe')
      continue
    }
    if (from && !isSafeRepoRelPath(from)) {
      push(issues, `${at}.from`, 'unsafe')
      continue
    }
    out.push({ path, ...(from ? { from } : {}), ...(why ? { why } : {}) })
  }
  return out.length ? out : undefined
}

const TOP_LEVEL = new Set(['version', 'protect', 'links', 'commit', 'requires', 'checklist'])

/**
 * Validate a parsed JSON value against the v1 schema.
 *
 * Returns the config with every rejected field dropped, plus the list of what
 * was rejected. `config` is null only when the document is not an object or
 * carries a version this build does not understand — a version bump must not
 * make an old Gitcito guess at fields it has never seen.
 */
export function validateRepoConfig(value: unknown): { config: RepoConfig | null; issues: RepoConfigIssue[] } {
  const issues: Issues = []
  if (!isRecord(value)) {
    push(issues, 'version', 'type')
    return { config: null, issues }
  }
  if (value.version !== REPO_CONFIG_VERSION) {
    push(issues, 'version', 'version')
    return { config: null, issues }
  }
  for (const key of Object.keys(value)) {
    if (!TOP_LEVEL.has(key)) push(issues, key, 'unknown')
  }

  const config: RepoConfig = { version: REPO_CONFIG_VERSION }

  const protect = strings(value.protect, 'protect', LIMITS.protect, issues)
  if (protect) config.protect = protect

  if (value.links !== undefined) {
    if (!isRecord(value.links)) push(issues, 'links', 'type')
    else {
      const tickets = links(value.links.tickets, issues)
      if (tickets) config.links = { tickets }
    }
  }

  if (value.commit !== undefined) {
    if (!isRecord(value.commit)) push(issues, 'commit', 'type')
    else {
      const scopes = strings(value.commit.scopes, 'commit.scopes', LIMITS.scopes, issues)
      const trailers = strings(value.commit.trailers, 'commit.trailers', LIMITS.trailers, issues)
      const ticketFromBranch = bool(value.commit.ticketFromBranch, 'commit.ticketFromBranch', issues)
      const commit: NonNullable<RepoConfig['commit']> = {}
      if (scopes) commit.scopes = scopes
      if (trailers) commit.trailers = trailers
      if (ticketFromBranch !== undefined) commit.ticketFromBranch = ticketFromBranch
      if (Object.keys(commit).length) config.commit = commit
    }
  }

  if (value.requires !== undefined) {
    if (!isRecord(value.requires)) push(issues, 'requires', 'type')
    else {
      const requires: NonNullable<RepoConfig['requires']> = {}
      const node = shortString(value.requires.node, 'requires.node', issues)
      if (node) requires.node = node
      const submodules = bool(value.requires.submodules, 'requires.submodules', issues)
      if (submodules !== undefined) requires.submodules = submodules
      const lfs = bool(value.requires.lfs, 'requires.lfs', issues)
      if (lfs !== undefined) requires.lfs = lfs
      const hooksPath = shortString(value.requires.hooksPath, 'requires.hooksPath', issues)
      if (hooksPath) {
        if (isSafeRepoRelPath(hooksPath)) requires.hooksPath = hooksPath
        else push(issues, 'requires.hooksPath', 'unsafe')
      }
      const files = fileReqs(value.requires.files, issues)
      if (files) requires.files = files
      if (Object.keys(requires).length) config.requires = requires
    }
  }

  if (value.checklist !== undefined) {
    if (!isRecord(value.checklist)) push(issues, 'checklist', 'type')
    else {
      const pushList = strings(value.checklist.push, 'checklist.push', LIMITS.checklist, issues, LIMITS.line)
      if (pushList) config.checklist = { push: pushList }
    }
  }

  return { config, issues }
}

/** Parse and validate raw file contents. Invalid JSON yields a single issue. */
export function parseRepoConfig(raw: string): { config: RepoConfig | null; issues: RepoConfigIssue[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { config: null, issues: [{ field: REPO_CONFIG_FILE, code: 'json' }] }
  }
  return validateRepoConfig(parsed)
}

/**
 * Render a config back to the file's text.
 *
 * Two spaces and a trailing newline, because this file is committed and diffed
 * by humans; the editor writing it should produce what a human would have.
 */
export function serializeRepoConfig(config: RepoConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

/** An empty, valid config — what the editor starts from on a repo without one. */
export function emptyRepoConfig(): RepoConfig {
  return { version: REPO_CONFIG_VERSION }
}

/** Whether a config carries anything at all beyond its version stamp. */
export function isRepoConfigEmpty(config: RepoConfig | null | undefined): boolean {
  if (!config) return true
  return Object.keys(config).filter((k) => k !== 'version').length === 0
}

/**
 * Whether an installed Node version satisfies a `requires.node` spec.
 *
 * Deliberately a fraction of semver: the specs that appear in a `.nvmrc` or an
 * `engines.node` field in practice — `20`, `20.x`, `v20.11.1`, `>=20`, `^20.1`,
 * `~20.1`. Anything richer than that is a question for the project's own
 * tooling, not for a doctor row, so an unrecognised spec passes rather than
 * inventing a failure the reader cannot act on.
 */
export function satisfiesNodeRange(actual: string, spec: string): boolean {
  const have = major(actual)
  if (have === null) return false
  const s = spec.trim()
  const wanted = major(s)
  if (wanted === null) return true // unparseable spec — say nothing rather than lie
  if (/^(>=|\^|~)/.test(s)) return have >= wanted
  if (s.startsWith('>')) return have > wanted
  if (s.startsWith('<=')) return have <= wanted
  if (s.startsWith('<')) return have < wanted
  return have === wanted
}

/** First integer in a version-ish string: `v20.11.1` → 20, `>=20` → 20. */
function major(value: string): number | null {
  const m = /(\d+)/.exec(value ?? '')
  return m ? Number(m[1]) : null
}

/**
 * Whether a branch matches a protect entry. `*` is the only wildcard, matching
 * any run of characters — `release/*` is the shape people actually write, and a
 * full glob dialect in a guard is a way to be surprised by what is not covered.
 */
export function branchMatches(pattern: string, branch: string): boolean {
  if (!pattern.includes('*')) return pattern === branch
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${source}$`).test(branch)
}
