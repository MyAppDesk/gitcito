/**
 * Grounding helpers for AI features.
 *
 * The model never writes file paths, line numbers or code: it is given a list of
 * evidence items with opaque IDs ("E1", "E2", …) and may only cite those IDs.
 * The app resolves each ID back to the real path/line, so a hallucinated
 * reference is a validation error instead of a plausible-looking lie.
 */

/** One citable hunk of a unified diff. */
export interface DiffEvidence {
  id: string
  path: string
  /** First line of the hunk, in the new file (old file for pure deletions). */
  startLine: number
  endLine: number
  /** Hunk text as sent to the model, including its `@@` header. */
  text: string
}

export interface DiffEvidenceSet {
  items: DiffEvidence[]
  /** Hunks dropped to stay inside the byte budget. */
  omitted: number
}

const FILE_RE = /^diff --git a\/(.+?) b\/(.+)$/
const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

function clipHunk(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n…(hunk truncated)` : text
}

/**
 * Splits a unified diff into per-hunk evidence items, oldest-first, stopping
 * once `maxBytes` of hunk text has been collected.
 */
export function buildDiffEvidence(
  diff: string,
  opts: { maxBytes?: number; maxHunks?: number; maxHunkBytes?: number } = {}
): DiffEvidenceSet {
  const maxBytes = opts.maxBytes ?? 24000
  const maxHunks = opts.maxHunks ?? 40
  const maxHunkBytes = opts.maxHunkBytes ?? 4000

  const items: DiffEvidence[] = []
  let omitted = 0
  let used = 0
  let path = ''

  // Hunk currently being accumulated.
  let head: string | null = null
  let body: string[] = []
  let startLine = 0
  let endLine = 0
  let newLine = 0
  let oldLine = 0
  let sawNew = false

  const flush = (): void => {
    if (head === null) return
    const text = clipHunk([head, ...body].join('\n'), maxHunkBytes)
    head = null
    body = []
    if (items.length >= maxHunks || used + text.length > maxBytes) {
      omitted++
      return
    }
    used += text.length
    items.push({ id: `E${items.length + 1}`, path, startLine, endLine: Math.max(startLine, endLine), text })
  }

  for (const line of diff.split('\n')) {
    const file = FILE_RE.exec(line)
    if (file) {
      flush()
      path = file[2]
      continue
    }
    if (line.startsWith('+++ ')) {
      // A deleted file has `+++ /dev/null`; keep the a-side path in that case.
      const to = line.slice(4).trim()
      if (to !== '/dev/null') path = to.replace(/^b\//, '')
      continue
    }
    if (line.startsWith('--- ')) {
      const from = line.slice(4).trim()
      if (!path && from !== '/dev/null') path = from.replace(/^a\//, '')
      continue
    }

    const hunk = HUNK_RE.exec(line)
    if (hunk) {
      flush()
      oldLine = Number(hunk[1])
      newLine = Number(hunk[3])
      sawNew = Number(hunk[4] ?? '1') > 0
      startLine = sawNew ? newLine : oldLine
      endLine = startLine
      head = line
      continue
    }
    if (head === null) continue

    body.push(line)
    if (line.startsWith('+')) {
      endLine = newLine
      newLine++
    } else if (line.startsWith('-')) {
      if (!sawNew) endLine = oldLine
      oldLine++
    } else if (line.startsWith(' ') || line === '') {
      endLine = sawNew ? newLine : oldLine
      newLine++
      oldLine++
    }
  }
  flush()

  return { items, omitted }
}

/** Renders the evidence list for the prompt: an ID header plus the hunk text. */
export function serializeEvidence(set: DiffEvidenceSet): string {
  const blocks = set.items.map(
    (e) => `[${e.id}] ${e.path}:${e.startLine}${e.endLine > e.startLine ? `-${e.endLine}` : ''}\n${e.text}`
  )
  if (set.omitted > 0) {
    blocks.push(`(${set.omitted} further hunk(s) omitted — do not reference them.)`)
  }
  return blocks.join('\n\n')
}

export function evidenceIndex(set: DiffEvidenceSet): Map<string, DiffEvidence> {
  return new Map(set.items.map((e) => [e.id, e]))
}

/** Raw, still-ungrounded finding as emitted by the model. */
export interface RawFinding {
  kind?: unknown
  severity?: unknown
  evidenceId?: unknown
  claim?: unknown
  suggestion?: unknown
}

const KINDS = new Set(['risk', 'suggestion'])
const SEVERITIES = new Set(['high', 'medium', 'low'])

/**
 * Checks a model review against the evidence it was given. Returns one
 * correction line per problem; an empty array means the output is usable.
 */
export function validateReview(value: unknown, allowed: Set<string>): string[] {
  const errors: string[] = []
  const root = value as { summary?: unknown; findings?: unknown } | null
  if (!root || typeof root !== 'object') return ['The response must be a JSON object.']
  if (typeof root.summary !== 'string' || !root.summary.trim()) errors.push('"summary" must be a non-empty string.')
  if (!Array.isArray(root.findings)) return [...errors, '"findings" must be an array (use [] when there is nothing to report).']

  const ids = [...allowed].join(', ') || '(none)'
  root.findings.forEach((raw: RawFinding, i) => {
    const at = `findings[${i}]`
    if (!raw || typeof raw !== 'object') {
      errors.push(`${at} must be an object.`)
      return
    }
    if (typeof raw.evidenceId !== 'string' || !allowed.has(raw.evidenceId)) {
      errors.push(`${at}.evidenceId ${JSON.stringify(raw.evidenceId ?? null)} is not in the evidence list. Cite one of: ${ids}.`)
    }
    if (typeof raw.kind !== 'string' || !KINDS.has(raw.kind)) {
      errors.push(`${at}.kind must be "risk" or "suggestion".`)
    }
    if (typeof raw.severity !== 'string' || !SEVERITIES.has(raw.severity)) {
      errors.push(`${at}.severity must be "high", "medium" or "low".`)
    }
    if (typeof raw.claim !== 'string' || !raw.claim.trim()) {
      errors.push(`${at}.claim must be a non-empty sentence.`)
    }
  })
  return errors
}

/** A finding after its EvidenceID has been resolved to a real location. */
export interface GroundedFinding {
  kind: 'risk' | 'suggestion'
  severity: 'high' | 'medium' | 'low'
  path: string
  line: number
  claim: string
  suggestion: string
}

/** Resolves cited EvidenceIDs to paths/lines, dropping anything unresolvable. */
export function groundFindings(findings: RawFinding[], index: Map<string, DiffEvidence>): GroundedFinding[] {
  const out: GroundedFinding[] = []
  for (const raw of findings) {
    const evidence = typeof raw.evidenceId === 'string' ? index.get(raw.evidenceId) : undefined
    if (!evidence) continue
    out.push({
      kind: raw.kind === 'suggestion' ? 'suggestion' : 'risk',
      severity: raw.severity === 'high' || raw.severity === 'low' ? raw.severity : 'medium',
      path: evidence.path,
      line: evidence.startLine,
      claim: String(raw.claim ?? '').trim(),
      suggestion: typeof raw.suggestion === 'string' ? raw.suggestion.trim() : ''
    })
  }
  return out
}

/** Markdown bullet list of one finding kind, with app-resolved locations. */
export function renderFindings(findings: GroundedFinding[], kind: 'risk' | 'suggestion'): string {
  return findings
    .filter((f) => f.kind === kind)
    .map((f) => {
      const tail = f.suggestion && kind === 'risk' ? ` — ${f.suggestion}` : ''
      const body = kind === 'suggestion' ? f.suggestion || f.claim : f.claim
      return `- \`${f.path}:${f.line}\` ${body}${kind === 'risk' ? tail : ''}`
    })
    .join('\n')
}

const ASK_ACTION_TYPES = new Set([
  'gitignore',
  'stage',
  'unstage',
  'commit',
  'stash',
  'discard',
  'branch',
  'checkout',
  'tag'
])

/** Action fields whose entries must be paths the working tree actually has. */
const PATH_FIELD = 'files'

/**
 * Checks an "Ask" plan against the working tree it was built for: every file an
 * action touches must be a path the model was shown, and every action must be a
 * type the app can execute.
 */
export function validateAskPlan(value: unknown, knownPaths: Set<string>): string[] {
  const errors: string[] = []
  const root = value as { summary?: unknown; actions?: unknown; note?: unknown } | null
  if (!root || typeof root !== 'object') return ['The response must be a JSON object.']
  if (typeof root.summary !== 'string') errors.push('"summary" must be a string.')
  if (!Array.isArray(root.actions)) return [...errors, '"actions" must be an array (use [] when nothing can be done).']

  root.actions.forEach((raw: Record<string, unknown>, i) => {
    const at = `actions[${i}]`
    if (!raw || typeof raw !== 'object') {
      errors.push(`${at} must be an object.`)
      return
    }
    const type = raw.type
    if (typeof type !== 'string' || !ASK_ACTION_TYPES.has(type)) {
      errors.push(`${at}.type ${JSON.stringify(type ?? null)} is not an action this app can run. Use one of: ${[...ASK_ACTION_TYPES].join(', ')}.`)
      return
    }
    if (typeof raw.description !== 'string' || !raw.description.trim()) {
      errors.push(`${at}.description must be a short sentence.`)
    }
    if (type === 'commit' && (typeof raw.message !== 'string' || !raw.message.trim())) {
      errors.push(`${at}.message must be a commit message.`)
    }
    if ((type === 'branch' || type === 'tag') && (typeof raw.name !== 'string' || !raw.name.trim())) {
      errors.push(`${at}.name must be a ${type} name.`)
    }
    if (type === 'checkout' && (typeof raw.ref !== 'string' || !raw.ref.trim())) {
      errors.push(`${at}.ref must be a branch, tag or commit to switch to.`)
    }
    if (type === 'gitignore') {
      // Patterns are literal globs the user wants ignored, not existing paths.
      if (!Array.isArray(raw.patterns) || raw.patterns.length === 0) {
        errors.push(`${at}.patterns must be a non-empty array of gitignore patterns.`)
      }
      return
    }
    const files = raw[PATH_FIELD]
    if (files === undefined) return
    if (!Array.isArray(files)) {
      errors.push(`${at}.files must be an array of repo-relative paths.`)
      return
    }
    for (const file of files) {
      if (typeof file !== 'string' || !knownPaths.has(file)) {
        errors.push(`${at}.files contains ${JSON.stringify(file)}, which is not one of the files listed in the working-tree state. Use only paths from those lists.`)
      }
    }
  })
  return errors
}

/** Strips a stray ```json fence and parses; returns null when unparseable. */
export function parseLooseJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```(json)?/m, '')
    .replace(/```$/m, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
