export type LintLevel = 'warn' | 'error'

export interface LintHint {
  level: LintLevel
  text: string
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

  if (s.length > SUBJECT_MAX) hints.push({ level: 'error', text: `Subject is ${s.length} chars — keep it under ${SUBJECT_MAX}.` })
  else if (s.length > SUBJECT_IDEAL) hints.push({ level: 'warn', text: `Subject is ${s.length} chars — aim for ≤ ${SUBJECT_IDEAL}.` })

  if (/[.]$/.test(s)) hints.push({ level: 'warn', text: 'Drop the trailing period in the subject.' })

  const isConventional = CONVENTIONAL.test(s)
  // For non-conventional subjects, nudge toward an imperative, capitalized verb.
  if (!isConventional) {
    const first = s[0]
    if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
      hints.push({ level: 'warn', text: 'Capitalize the subject (or use a Conventional type like `feat:`).' })
    }
    if (/^(added|fixed|changed|updated|removed|created)\b/i.test(s)) {
      hints.push({ level: 'warn', text: 'Use the imperative mood — e.g. “Add” not “Added”.' })
    }
  }

  // Body: blank line after subject is enforced on join, so only wrap-width here.
  const longLine = body.split('\n').find((l) => l.length > BODY_WRAP)
  if (longLine) hints.push({ level: 'warn', text: `Wrap body lines at ${BODY_WRAP} chars.` })

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

/** Common gitmoji, each with a short intent label (shown in the picker). */
export const GITMOJIS: { emoji: string; label: string }[] = [
  { emoji: '✨', label: 'feature' },
  { emoji: '🐛', label: 'fix' },
  { emoji: '📝', label: 'docs' },
  { emoji: '💄', label: 'ui / style' },
  { emoji: '♻️', label: 'refactor' },
  { emoji: '⚡️', label: 'performance' },
  { emoji: '✅', label: 'tests' },
  { emoji: '👷', label: 'ci' },
  { emoji: '🔧', label: 'config / chore' },
  { emoji: '⏪️', label: 'revert' },
  { emoji: '🎉', label: 'init' },
  { emoji: '🔥', label: 'remove' },
  { emoji: '🚧', label: 'wip' },
  { emoji: '🔒️', label: 'security' },
  { emoji: '⬆️', label: 'upgrade deps' },
  { emoji: '🚀', label: 'deploy' }
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
