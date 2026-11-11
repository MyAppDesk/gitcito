import type { TranslationKey } from '../i18n'
import { CC_TYPE_GITMOJI, findGitmoji, splitGitmoji } from '../../../shared/gitmoji'

export type LintLevel = 'warn' | 'error'

export interface LintHint {
  level: LintLevel
  /** Dictionary key; render with `interp(t(key), vars)`. */
  key: TranslationKey
  vars?: Record<string, string | number>
}

/** Turn commitlint's noisy hook output into an actionable composer error.
 *  Returns a dictionary key so the caller renders it in the user's language. */
export function commitHookFailureHint(message: string): TranslationKey | null {
  if (/subject-empty|type-empty/i.test(message)) return 'commitLint.hookNeedsType'
  if (/commitlint|commit-msg script failed/i.test(message)) return 'commitLint.hookRejected'
  return null
}

const SUBJECT_IDEAL = 50
const SUBJECT_MAX = 72
const BODY_WRAP = 72
const CONVENTIONAL = /^(\w+)(\([^)]*\))?!?:\s/

/**
 * Lint a commit message (subject + optional body) against common conventions.
 * Non-blocking — these are hints, not hard gates.
 */
export function lintCommit(summary: string, body: string): LintHint[] {
  const hints: LintHint[] = []
  const s = summary.trim()
  if (!s) return hints

  if (s.length > SUBJECT_MAX)
    hints.push({ level: 'error', key: 'commitLint.subjectTooLong', vars: { len: s.length, max: SUBJECT_MAX } })
  else if (s.length > SUBJECT_IDEAL)
    hints.push({ level: 'warn', key: 'commitLint.subjectLong', vars: { len: s.length, ideal: SUBJECT_IDEAL } })

  if (/[.]$/.test(s)) hints.push({ level: 'warn', key: 'commitLint.trailingPeriod' })

  // `✨ feat: x` is still Conventional — the gitmoji sits in front of the type.
  const isConventional = CONVENTIONAL.test(splitGitmoji(s).rest)
  // For non-conventional subjects, nudge toward an imperative, capitalized verb.
  if (!isConventional) {
    const first = s[0]
    if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
      hints.push({ level: 'warn', key: 'commitLint.capitalize' })
    }
    if (/^(added|fixed|changed|updated|removed|created)\b/i.test(s)) {
      hints.push({ level: 'warn', key: 'commitLint.imperative' })
    }
  }

  // Body: blank line after subject is enforced on join, so only wrap-width here.
  const longLine = body.split('\n').find((l) => l.length > BODY_WRAP)
  if (longLine) hints.push({ level: 'warn', key: 'commitLint.wrapBody', vars: { width: BODY_WRAP } })

  return hints
}

/** Color band for the subject character counter. */
export function subjectCounterLevel(len: number): '' | 'warn' | 'error' {
  if (len > SUBJECT_MAX) return 'error'
  if (len > SUBJECT_IDEAL) return 'warn'
  return ''
}

export const SUBJECT_IDEAL_LEN = SUBJECT_IDEAL

/** Conventional-Commit types (matches the project's commitlint allow-list). */
export const CC_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'] as const

const CC_PREFIX = /^(\w+)(\([^)]*\))?(!)?:\s*/

function parsePlainCc(summary: string): { type: string; scope: string; bang: string; rest: string } {
  const m = CC_PREFIX.exec(summary)
  if (m && (CC_TYPES as readonly string[]).includes(m[1])) {
    return { type: m[1], scope: m[2] ?? '', bang: m[3] ?? '', rest: summary.slice(m[0].length) }
  }
  return { type: '', scope: '', bang: '', rest: summary }
}

/** Run `fn` on the subject after any leading gitmoji, then put the gitmoji back
 *  exactly as it was written — so the Conventional helpers work the same on
 *  `feat: x` and on `✨ feat: x` (or `:sparkles: feat: x`). */
function behindGitmoji(summary: string, fn: (plain: string) => string): string {
  const { raw, rest } = splitGitmoji(summary)
  return raw ? `${raw} ${fn(rest)}` : fn(summary)
}

/** Split a summary into its Conventional-Commit prefix parts (empty type if
 *  none). A leading gitmoji is skipped and not part of `rest`. */
export function parseCcPrefix(summary: string): { type: string; scope: string; bang: string; rest: string } {
  return parsePlainCc(splitGitmoji(summary).rest)
}

/** Apply (or, with an empty type, strip) a Conventional-Commit type prefix,
 *  preserving any existing scope/`!`, the rest of the subject and a leading gitmoji. */
export function applyCcType(summary: string, type: string): string {
  return behindGitmoji(summary, (plain) => {
    const { rest, scope, bang } = parsePlainCc(plain)
    return type ? `${type}${scope}${bang}: ${rest}` : rest
  })
}

/** Apply (or, with an empty scope, strip) a Conventional-Commit scope. Only
 *  meaningful once a type is set — a bare `(scope):` is not a valid prefix. */
export function applyCcScope(summary: string, scope: string): string {
  return behindGitmoji(summary, (plain) => {
    const { type, bang, rest } = parsePlainCc(plain)
    if (!type) return plain
    const s = scope.trim()
    return `${type}${s ? `(${s})` : ''}${bang}: ${rest}`
  })
}

/** The scope currently written on the subject, without its parentheses. */
export function currentCcScope(summary: string): string {
  return parseCcPrefix(summary).scope.replace(/^\(|\)$/g, '')
}

/** Find a leading gitmoji on the summary — unicode or `:shortcode:` — as its
 *  canonical emoji (empty emoji if none). */
export function parseGitmojiPrefix(summary: string): { emoji: string; rest: string } {
  const { emoji, rest } = splitGitmoji(summary)
  return { emoji, rest }
}

/** Apply (or, with an empty emoji, strip) a leading gitmoji on the subject. */
export function applyGitmoji(summary: string, emoji: string): string {
  const { rest } = splitGitmoji(summary)
  return emoji ? `${emoji} ${rest}` : rest
}

/**
 * Change the Conventional type in the combined `✨ feat: …` style, keeping the
 * gitmoji in step: an empty gitmoji, or the one the previous type would have
 * seeded, follows the new type (`feat`→`fix` turns ✨ into 🐛). A gitmoji the
 * user picked by hand (say 🚑️ on a fix) is never overwritten.
 */
export function applyCcTypeWithGitmoji(summary: string, type: string): string {
  const { emoji } = splitGitmoji(summary)
  const prevSeed = CC_TYPE_GITMOJI[parseCcPrefix(summary).type] ?? ''
  const auto = !emoji || findGitmoji(emoji)?.emoji === findGitmoji(prevSeed)?.emoji
  const typed = applyCcType(summary, type)
  if (!auto) return typed
  return applyGitmoji(typed, type ? (CC_TYPE_GITMOJI[type] ?? '') : '')
}

const TICKET_PREFIX = /^([A-Z][A-Z0-9]+-\d+):\s*/

/** Split a leading `KEY-123: ` ticket prefix from the subject (empty if none). */
export function parseTicketPrefix(summary: string): { ticket: string; rest: string } {
  const m = TICKET_PREFIX.exec(summary)
  return m ? { ticket: m[1], rest: summary.slice(m[0].length) } : { ticket: '', rest: summary }
}

/** Apply (or, with an empty ticket, strip) a `KEY-123: ` prefix on the subject. */
export function applyTicket(summary: string, ticket: string): string {
  const { rest } = parseTicketPrefix(summary)
  const t = ticket.trim().toUpperCase()
  return t ? `${t}: ${rest}` : rest
}

/** Pull a ticket key out of a branch name, if present (e.g. `feat/ABC-123-x`). */
export function ticketFromBranch(branch: string): string {
  return /([A-Z][A-Z0-9]+-\d+)/.exec(branch ?? '')?.[1] ?? ''
}
