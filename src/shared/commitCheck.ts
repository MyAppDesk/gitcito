/**
 * `gitcito commit-check` — the same conventions the composer nudges about,
 * evaluated on a whole commit-message file so a `commit-msg` hook or a CI job
 * can fail on them.
 *
 * Deliberately separate from `renderer/src/lib/commitLint.ts`, which returns
 * dictionary keys for a UI in seventeen languages. A hook prints to a terminal:
 * the text is English, the same way git's own is, and the value that matters is
 * the exit code. Keeping the two apart also keeps this module importable from
 * the headless CLI, which must never pull in the renderer's i18n graph.
 *
 * What raises the level from `warn` to `error` is always something the
 * repository itself asked for in `.gitcito.json` — an unknown scope is an error
 * only because a scope list exists. Style alone never fails a build.
 */

import type { RepoConfig } from './types'

export type CommitCheckLevel = 'error' | 'warn'

export interface CommitCheckIssue {
  level: CommitCheckLevel
  /** Stable identifier, so a caller can filter without matching prose. */
  code:
    | 'empty'
    | 'subject-too-long'
    | 'subject-long'
    | 'trailing-period'
    | 'no-blank-line'
    | 'body-wrap'
    | 'not-conventional'
    | 'unknown-scope'
    | 'missing-trailer'
    | 'missing-ticket'
  message: string
}

const SUBJECT_IDEAL = 50
const SUBJECT_MAX = 72
const BODY_WRAP = 72
const CONVENTIONAL = /^(\w+)(\(([^)]*)\))?!?:\s?(.*)$/

/** Strip what git itself strips: comment lines, and everything from a
 *  `# ------------------------ >8 ------------------------` scissors line on. */
export function stripCommitComments(raw: string): string {
  const lines: string[] = []
  for (const line of raw.split('\n')) {
    if (/^#\s*-+\s*>8\s*-+/.test(line)) break
    if (line.startsWith('#')) continue
    lines.push(line)
  }
  return lines.join('\n').trim()
}

/** Ticket keys as they appear in a subject or a trailer: `ABC-123`. */
export const TICKET_RE = /\b[A-Z][A-Z0-9]+-\d+\b/

export interface CommitCheckOptions {
  /** The repository's own rules, when it ships a `.gitcito.json`. */
  config?: RepoConfig | null
  /** Current branch, used to look for the ticket key it carries. */
  branch?: string
}

/**
 * Check a full commit-message file. Returns every issue found; the caller
 * decides what to do with the levels (the CLI exits 1 on any `error`).
 */
export function checkCommitMessage(raw: string, opts: CommitCheckOptions = {}): CommitCheckIssue[] {
  const issues: CommitCheckIssue[] = []
  const text = stripCommitComments(raw)
  if (!text) return [{ level: 'error', code: 'empty', message: 'The commit message is empty.' }]

  const lines = text.split('\n')
  const subject = lines[0].trim()
  const body = lines.slice(1).join('\n')

  if (subject.length > SUBJECT_MAX)
    issues.push({
      level: 'error',
      code: 'subject-too-long',
      message: `Subject is ${subject.length} characters; keep it under ${SUBJECT_MAX}.`
    })
  else if (subject.length > SUBJECT_IDEAL)
    issues.push({
      level: 'warn',
      code: 'subject-long',
      message: `Subject is ${subject.length} characters; ${SUBJECT_IDEAL} or fewer reads better in a log.`
    })

  if (/[.]$/.test(subject))
    issues.push({ level: 'warn', code: 'trailing-period', message: 'Subject ends with a period.' })

  if (lines.length > 1 && lines[1].trim() !== '')
    issues.push({
      level: 'error',
      code: 'no-blank-line',
      message: 'A blank line must separate the subject from the body.'
    })

  const longBody = body.split('\n').find((l) => l.length > BODY_WRAP && !/^\s*\S+:\/\//.test(l))
  if (longBody)
    issues.push({ level: 'warn', code: 'body-wrap', message: `Wrap the body at ${BODY_WRAP} columns.` })

  const cc = CONVENTIONAL.exec(subject)
  const scopes = opts.config?.commit?.scopes
  // A scope list is the repository stating it uses Conventional Commits, so a
  // subject that is not one stops being a style preference and becomes a break
  // of the stated rule.
  if (scopes?.length && !cc)
    issues.push({
      level: 'error',
      code: 'not-conventional',
      message: 'Subject must be `type(scope): summary` — this repository declares commit scopes.'
    })

  const scope = cc?.[3]?.trim()
  if (scopes?.length && scope && !scopes.includes(scope))
    issues.push({
      level: 'error',
      code: 'unknown-scope',
      message: `Unknown scope "${scope}". Allowed: ${scopes.join(', ')}.`
    })

  for (const trailer of opts.config?.commit?.trailers ?? []) {
    const name = trailer.split(':')[0]?.trim()
    if (!name) continue
    const present = body.split('\n').some((l) => l.trim().toLowerCase().startsWith(`${name.toLowerCase()}:`))
    if (!present)
      issues.push({ level: 'warn', code: 'missing-trailer', message: `Missing trailer "${name}:".` })
  }

  if (opts.config?.commit?.ticketFromBranch) {
    const fromBranch = opts.branch ? TICKET_RE.exec(opts.branch)?.[0] : undefined
    if (fromBranch && !text.includes(fromBranch))
      issues.push({
        level: 'warn',
        code: 'missing-ticket',
        message: `Branch mentions ${fromBranch}; the message does not.`
      })
  }

  return issues
}
