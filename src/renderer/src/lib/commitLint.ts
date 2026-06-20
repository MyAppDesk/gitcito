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
