import type { TranslationKey } from '../i18n'

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

  const isConventional = CONVENTIONAL.test(s)
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

/** Split a summary into its Conventional-Commit prefix parts (empty type if none). */
export function parseCcPrefix(summary: string): { type: string; scope: string; bang: string; rest: string } {
  const m = CC_PREFIX.exec(summary)
  if (m && (CC_TYPES as readonly string[]).includes(m[1])) {
    return { type: m[1], scope: m[2] ?? '', bang: m[3] ?? '', rest: summary.slice(m[0].length) }
  }
  return { type: '', scope: '', bang: '', rest: summary }
}

/** Apply (or, with an empty type, strip) a Conventional-Commit type prefix,
 *  preserving any existing scope/`!` and the rest of the subject. */
export function applyCcType(summary: string, type: string): string {
  const { rest, scope, bang } = parseCcPrefix(summary)
  return type ? `${type}${scope}${bang}: ${rest}` : rest
}

/** Common gitmoji, each with a short intent label (shown in the picker).
 *  Labels are dictionary keys — resolve them with `t()` at render time. */
export const GITMOJIS: { emoji: string; labelKey: TranslationKey }[] = [
  { emoji: '✨', labelKey: 'gitmoji.feature' },
  { emoji: '🐛', labelKey: 'gitmoji.fix' },
  { emoji: '📝', labelKey: 'gitmoji.docs' },
  { emoji: '💄', labelKey: 'gitmoji.style' },
  { emoji: '♻️', labelKey: 'gitmoji.refactor' },
  { emoji: '⚡️', labelKey: 'gitmoji.performance' },
  { emoji: '✅', labelKey: 'gitmoji.tests' },
  { emoji: '👷', labelKey: 'gitmoji.ci' },
  { emoji: '🔧', labelKey: 'gitmoji.chore' },
  { emoji: '⏪️', labelKey: 'gitmoji.revert' },
  { emoji: '🎉', labelKey: 'gitmoji.init' },
  { emoji: '🔥', labelKey: 'gitmoji.remove' },
  { emoji: '🚧', labelKey: 'gitmoji.wip' },
  { emoji: '🔒️', labelKey: 'gitmoji.security' },
  { emoji: '⬆️', labelKey: 'gitmoji.upgradeDeps' },
  { emoji: '🚀', labelKey: 'gitmoji.deploy' }
]

/** Find a leading gitmoji on the summary (empty emoji if none). */
export function parseGitmojiPrefix(summary: string): { emoji: string; rest: string } {
  for (const g of GITMOJIS) {
    if (summary === g.emoji) return { emoji: g.emoji, rest: '' }
    if (summary.startsWith(g.emoji + ' ')) return { emoji: g.emoji, rest: summary.slice(g.emoji.length + 1) }
  }
  return { emoji: '', rest: summary }
}

/** Apply (or, with an empty emoji, strip) a leading gitmoji on the subject. */
export function applyGitmoji(summary: string, emoji: string): string {
  const { rest } = parseGitmojiPrefix(summary)
  return emoji ? `${emoji} ${rest}` : rest
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
