/**
 * CODEOWNERS, parsed.
 *
 * Reusing the standard rather than inventing `.gitcito/owners.yml`: the format
 * already exists, teams already know it, GitHub and GitLab already interpret
 * it, git already versions it, and many repos already have one. A bespoke file
 * would be a second source of truth that only this app can read.
 *
 * Only the part that earns its place is supported — patterns and owner tokens.
 * Owners are opaque labels here; the app never resolves `@org/team` to people,
 * because there is no backend to resolve it against.
 *
 * The rule that catches everyone: **last match wins**, the opposite of the
 * first-match intuition people bring from `.gitignore`.
 */

import type { OwnerRule } from './types'

/** Where hosts look for the file, in the order they look. */
export const CODEOWNERS_PATHS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS', '.gitlab/CODEOWNERS']

/** An owner token: `@user`, `@org/team`, or a bare email. */
const OWNER_RE = /^(?:@[\w.-]+(?:\/[\w.-]+)?|[^\s@]+@[^\s@]+\.[^\s@]+)$/

/**
 * Parse a CODEOWNERS file into rules, in file order.
 *
 * Blank lines and `#` comments are dropped. A line whose first field is a
 * pattern but which names no valid owner is kept with an empty owner list —
 * that is how CODEOWNERS spells "explicitly unowned", and swallowing it would
 * make a deliberate exclusion invisible.
 */
export function parseCodeowners(content: string): OwnerRule[] {
  const rules: OwnerRule[] = []
  for (const raw of content.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const [pattern, ...rest] = line.split(/\s+/)
    if (!pattern) continue
    rules.push({ pattern, owners: rest.filter((o) => OWNER_RE.test(o)) })
  }
  return rules
}

/**
 * Translate one CODEOWNERS pattern to a regular expression.
 *
 * The dialect is gitignore-shaped: a leading `/` anchors to the root, a
 * trailing `/` matches a directory and everything under it, `*` stops at a
 * path separator and `**` does not, and a bare name matches at any depth.
 */
function patternToRegExp(pattern: string): RegExp {
  let p = pattern
  const anchored = p.startsWith('/')
  if (anchored) p = p.slice(1)
  const dirOnly = p.endsWith('/')
  if (dirOnly) p = p.slice(0, -1)

  // Build the body one token at a time; escaping the whole string first and
  // un-escaping the wildcards afterwards is where these functions go wrong.
  let body = ''
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '*') {
      if (p[i + 1] === '*') {
        body += '.*'
        i++
        // `**/` should also match zero directories, so `a/**/b` covers `a/b`.
        if (p[i + 1] === '/') {
          body += '(?:/)?'
          i++
        }
      } else {
        body += '[^/]*'
      }
      continue
    }
    if (c === '?') {
      body += '[^/]'
      continue
    }
    body += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }

  // An unanchored bare name matches at any depth; anything with a slash in it
  // is treated as rooted, which is what git does.
  const prefix = anchored || p.includes('/') ? '^' : '^(?:.*/)?'
  // A directory pattern owns everything beneath it; a file pattern may still be
  // a directory in practice, so both allow a trailing subpath.
  const suffix = dirOnly ? '(?:/.*)?$' : '(?:/.*)?$'
  return new RegExp(prefix + body + suffix)
}

/**
 * Does one gitignore-shaped pattern match a repo-relative path?
 *
 * Exported because contract files and the freeze allow-list want exactly this
 * dialect — a user who has written `src/**` in a CODEOWNERS should not have to
 * learn a second glob syntax three fields later.
 */
export function matchesPattern(pattern: string, path: string): boolean {
  return patternToRegExp(pattern).test(path)
}

/** Any of the patterns. Empty list matches nothing — an empty allow-list means
 *  "nothing is allowed", not "everything is". */
export function matchesAny(patterns: string[], path: string): boolean {
  return patterns.some((p) => matchesPattern(p, path))
}

/** Rules compiled once, so a staging list of 400 files does not rebuild them. */
export interface OwnerIndex {
  rules: { re: RegExp; owners: string[] }[]
}

export function buildOwnerIndex(rules: OwnerRule[]): OwnerIndex {
  return { rules: rules.map((r) => ({ re: patternToRegExp(r.pattern), owners: r.owners })) }
}

/** Owners of one repo-relative path, or [] when no rule matches. Last wins. */
export function ownersOf(index: OwnerIndex, path: string): string[] {
  let owners: string[] = []
  for (const rule of index.rules) if (rule.re.test(path)) owners = rule.owners
  return owners
}

/**
 * Whether `me` owns `path`.
 *
 * An unowned path counts as yours: CODEOWNERS is an allow-list of *claimed*
 * areas, and flagging everything nobody claimed would turn the hint into noise
 * on the first repo that only owns two directories.
 */
export function ownedByMe(index: OwnerIndex, path: string, me: string): boolean {
  if (!me) return true
  const owners = ownersOf(index, path)
  if (owners.length === 0) return true
  return owners.some((o) => o.toLowerCase() === me.toLowerCase())
}

/**
 * Draft a CODEOWNERS file from evidence, for a repo that has none.
 *
 * Deliberately shallow — one line per top-level directory, owned by whoever has
 * touched it most. It is a starting point a team edits, not a claim to have
 * worked out who owns what.
 */
export function draftCodeowners(entries: { dir: string; owner: string }[]): string {
  const header = [
    '# Drafted by Gitcito from commit history — review before trusting it.',
    '# Last matching rule wins.',
    ''
  ]
  const lines = entries
    .filter((e) => e.owner)
    .map((e) => `/${e.dir}/ ${e.owner.startsWith('@') ? e.owner : `@${e.owner}`}`)
  return [...header, ...lines, ''].join('\n')
}
