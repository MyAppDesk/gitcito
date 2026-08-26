/**
 * Grounding helpers for AI features.
 *
 * The model never writes file paths, line numbers or code: it is given a list of
 * evidence items with opaque IDs ("E1", "E2", …) and may only cite those IDs.
 * The app resolves each ID back to the real path/line, so a hallucinated
 * reference is a validation error instead of a plausible-looking lie.
 */

import { isSafeRepoPath } from './aiSchemas'
import { jsonrepair } from 'jsonrepair'

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

/** One line of source as the viewer has it, with its real file line number. */
export interface NumberedLine {
  no: number
  text: string
}

/** A numbered slice of a file, the only thing a hover explanation may draw on. */
export interface LineWindow {
  startLine: number
  endLine: number
  /** The line numbers actually in the window — a diff view has gaps. */
  numbers: number[]
  /** Lines prefixed with their number, ready to paste into a prompt. */
  text: string
}

/**
 * Builds the context window around a line: `radius` lines either side of the
 * hovered one, numbered so the model can cite locations without being told any
 * file paths. Takes the lines the viewer actually has — a whole file, or just
 * the hunks of a diff — and trims from the far end first if it overruns the
 * byte budget, always keeping the hovered line.
 */
export function buildWindowFromLines(
  lines: NumberedLine[],
  line: number,
  opts: { radius?: number; maxBytes?: number } = {}
): LineWindow {
  const radius = opts.radius ?? 30
  const maxBytes = opts.maxBytes ?? 6000
  if (lines.length === 0) return { startLine: line, endLine: line, numbers: [], text: '' }

  // Nearest entry to the hovered line — in a diff the exact number may be on
  // the other side of the hunk.
  let targetIdx = 0
  for (let i = 1; i < lines.length; i++) {
    if (Math.abs(lines[i].no - line) < Math.abs(lines[targetIdx].no - line)) targetIdx = i
  }

  let from = Math.max(0, targetIdx - radius)
  let to = Math.min(lines.length - 1, targetIdx + radius)
  const render = (a: number, b: number): string =>
    lines
      .slice(a, b + 1)
      .map((l) => `${l.no} | ${l.text}`)
      .join('\n')

  let text = render(from, to)
  while (text.length > maxBytes && (from < targetIdx || to > targetIdx)) {
    if (to - targetIdx >= targetIdx - from && to > targetIdx) to--
    else if (from < targetIdx) from++
    else break
    text = render(from, to)
  }

  const slice = lines.slice(from, to + 1)
  return {
    startLine: slice[0].no,
    endLine: slice[slice.length - 1].no,
    numbers: slice.map((l) => l.no),
    text
  }
}

/** Window around a line of a whole file. */
export function buildLineWindow(
  content: string,
  line: number,
  opts: { radius?: number; maxBytes?: number } = {}
): LineWindow {
  const lines = content.split('\n').map((text, i) => ({ no: i + 1, text }))
  return buildWindowFromLines(lines, Math.min(Math.max(line, 1), lines.length), opts)
}

/**
 * Checks a hover explanation: it must be brief and may only cite lines that
 * were actually in the window.
 */
export function validateHoverExplain(value: unknown, window: LineWindow): string[] {
  const errors: string[] = []
  const root = value as { summary?: unknown; bullets?: unknown; lines?: unknown } | null
  if (!root || typeof root !== 'object') return ['The response must be a JSON object.']
  if (typeof root.summary !== 'string' || !root.summary.trim()) errors.push('"summary" must be a single sentence.')
  if (root.bullets !== undefined) {
    if (!Array.isArray(root.bullets)) errors.push('"bullets" must be an array of short strings.')
    else if (root.bullets.length > 3) errors.push('"bullets" must have at most 3 entries.')
  }
  if (root.lines !== undefined) {
    if (!Array.isArray(root.lines)) {
      errors.push('"lines" must be an array of line numbers from the window.')
    } else {
      const allowed = new Set(window.numbers)
      for (const n of root.lines) {
        if (typeof n !== 'number' || !allowed.has(n)) {
          errors.push(
            `"lines" contains ${JSON.stringify(n)}, which is not a line you were shown. Cite only lines between ${window.startLine} and ${window.endLine} that appear in the window.`
          )
        }
      }
    }
  }
  return errors
}

/** Working-tree and ref bookkeeping — what the Ask planner has always run. */
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

/** Local actions that move history. Allowed only for a surface that shows the
 *  model the branches and commit hashes they must name. */
const HISTORY_ACTION_TYPES = new Set(['merge', 'rebase', 'revert', 'cherry_pick'])

/** Action types that reach a remote or the hosting provider. Allowed only when
 *  the caller says the remote-actions setting is on. */
const REMOTE_ASK_ACTION_TYPES = new Set(['fetch', 'pull', 'push', 'open_pr', 'stack_submit'])

const PULL_MODES = new Set(['default', 'ff-only', 'rebase'])
const HASH = /^[0-9a-f]{7,40}$/i

/** Field checks for the actions that name refs or commits rather than files. */
function refActionErrors(type: string, raw: Record<string, unknown>, at: string): string[] {
  const errors: string[] = []
  const text = (key: string): string => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '')
  if (type === 'merge' && !text('ref')) errors.push(`${at}.ref must be the branch or commit to merge in.`)
  if (type === 'rebase' && !text('onto')) errors.push(`${at}.onto must be the branch to rebase onto.`)
  if (type === 'revert' || type === 'cherry_pick') {
    const hashes = raw.hashes
    if (!Array.isArray(hashes) || hashes.length === 0) {
      errors.push(`${at}.hashes must be a non-empty array of commit hashes copied from the history you were shown.`)
    } else if (hashes.some((hash) => typeof hash !== 'string' || !HASH.test(hash))) {
      errors.push(`${at}.hashes must contain only commit hashes; never invent one.`)
    }
  }
  if (type === 'pull' && raw.mode !== undefined && !PULL_MODES.has(String(raw.mode))) {
    errors.push(`${at}.mode must be one of: ${[...PULL_MODES].join(', ')}.`)
  }
  if (type === 'open_pr') {
    if (!text('title')) errors.push(`${at}.title must be the pull request title.`)
    if (!text('target')) errors.push(`${at}.target must be the branch the pull request merges into.`)
  }
  return errors
}

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
  return [...errors, ...validateAskActions(root.actions, knownPaths)]
}

/**
 * The action-list half of the plan check, shared with repository chat: chat
 * replies carry the same action union, grounded against the same working-tree
 * path list.
 */
export function validateAskActions(
  value: unknown,
  knownPaths: Set<string>,
  allow: { history?: boolean; remote?: boolean } = {}
): string[] {
  if (!Array.isArray(value)) return ['"actions" must be an array (use [] when nothing can be done).']
  const errors: string[] = []
  const runnable = new Set([
    ...ASK_ACTION_TYPES,
    ...(allow.history ? HISTORY_ACTION_TYPES : []),
    ...(allow.remote ? REMOTE_ASK_ACTION_TYPES : [])
  ])
  value.forEach((raw: Record<string, unknown>, i) => {
    const at = `actions[${i}]`
    if (!raw || typeof raw !== 'object') {
      errors.push(`${at} must be an object.`)
      return
    }
    const type = raw.type
    if (typeof type !== 'string' || !runnable.has(type)) {
      // Naming the remote set explicitly is the difference between "the app
      // cannot do this" and "this repository's settings do not allow it".
      if (typeof type === 'string' && REMOTE_ASK_ACTION_TYPES.has(type)) {
        errors.push(`${at}.type ${JSON.stringify(type)} needs remote actions, which are off in Settings. Propose only local actions.`)
        return
      }
      if (typeof type === 'string' && HISTORY_ACTION_TYPES.has(type)) {
        errors.push(`${at}.type ${JSON.stringify(type)} is not available on this surface. Use repository chat for merge, rebase, revert and cherry-pick.`)
        return
      }
      errors.push(`${at}.type ${JSON.stringify(type ?? null)} is not an action this app can run. Use one of: ${[...runnable].join(', ')}.`)
      return
    }
    errors.push(...refActionErrors(type, raw, at))
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

const REPO_CHAT_FILE_ACTION_TYPES = new Set(['edit_file', 'write_file', 'delete_file'])

export interface RepoChatActionContext {
  workingTreePaths: Set<string>
  evidencePaths: Set<string>
  completePaths: Set<string>
  allowFileActions?: boolean
  /** Whether the plan may reach a remote or the hosting provider. */
  allowRemoteActions?: boolean
}

/**
 * Validates repository-chat plans without broadening the Ask planner. File
 * mutations form a prefix, and their outputs become valid paths for later Git
 * actions such as stage and commit.
 */
export function validateRepoChatActions(value: unknown, context: RepoChatActionContext): string[] {
  if (!Array.isArray(value)) return ['"actions" must be an array (use [] when nothing can be done).']

  const errors: string[] = []
  const gitActions: unknown[] = []
  const knownGitPaths = new Set(context.workingTreePaths)
  let fileActions = 0
  let sawGitAction = false

  if (value.length > 64) errors.push('Repository chat may propose at most 64 total actions.')

  value.forEach((raw, i) => {
    const at = `actions[${i}]`
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      gitActions.push(raw)
      sawGitAction = true
      return
    }

    const action = raw as Record<string, unknown>
    if (typeof action.type !== 'string' || !REPO_CHAT_FILE_ACTION_TYPES.has(action.type)) {
      gitActions.push(action)
      sawGitAction = true
      return
    }
    if (context.allowFileActions === false) {
      errors.push(`${at} file actions are disabled by file read-only mode.`)
      return
    }

    fileActions++
    if (sawGitAction) errors.push(`${at} file actions must appear before Git actions.`)
    if (typeof action.description !== 'string' || !action.description.trim()) {
      errors.push(`${at}.description must be a short sentence.`)
    }
    if (!isSafeRepoPath(action.path)) {
      errors.push(`${at}.path must be a relative path inside the repository.`)
      return
    }

    const path = action.path.trim()
    if (action.type !== 'write_file' || action.mode === 'replace') {
      if (!context.evidencePaths.has(path)) {
        errors.push(`${at}.path ${JSON.stringify(path)} requires repository evidence.`)
      }
    }

    if (action.type === 'edit_file') {
      if (typeof action.oldText !== 'string' || action.oldText.length === 0) {
        errors.push(`${at}.oldText must be a non-empty exact excerpt.`)
      }
      if (typeof action.newText !== 'string') errors.push(`${at}.newText must be a string.`)
      if (action.replaceAll !== undefined && typeof action.replaceAll !== 'boolean') {
        errors.push(`${at}.replaceAll must be a boolean when provided.`)
      }
    } else if (action.type === 'write_file') {
      if (action.mode !== 'create' && action.mode !== 'replace') {
        errors.push(`${at}.mode must be either "create" or "replace".`)
      }
      if (typeof action.content !== 'string') errors.push(`${at}.content must be a string.`)
      if (action.mode === 'replace' && !context.completePaths.has(path)) {
        errors.push(`${at}.path ${JSON.stringify(path)} requires complete evidence before replacement.`)
      }
    }

    knownGitPaths.add(path)
  })

  if (fileActions > 48) errors.push('Repository chat may propose at most 48 file actions.')
  if (gitActions.length > 12) errors.push('Repository chat may propose at most 12 Git actions.')
  errors.push(...validateAskActions(gitActions, knownGitPaths, { history: true, remote: context.allowRemoteActions === true }))
  return errors
}

/**
 * Repairs a narrow DiffusionGemma failure mode where array objects acquire an
 * extra quote and brace (`{"{"text"...}`) plus a quote before the closing
 * bracket. The normal parser always runs first, so valid JSON strings that
 * happen to contain braces are left untouched.
 */
function repairQuotedArrayObjects(value: string): string {
  return value
    .replace(/\{\s*"\s*\{/g, '{')
    .replace(/\{"(\s+)(?="[^"]+"\s*:)/g, '{$1')
    .replace(/\}\s*"\s*(?=[,\]])/g, '}')
}

/** Decodes providers that return the JSON object escaped as if it were a string. */
function unescapeJsonEnvelope(value: string): string {
  const trimmed = value.trim()
  if (!/^[{\[]\s*\\"/.test(trimmed)) return value
  try {
    const decoded = JSON.parse(`"${trimmed.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`)
    return typeof decoded === 'string' ? decoded : value
  } catch {
    return value
  }
}

/** Finds complete top-level JSON containers inside prose or repeated replies. */
function jsonContainerCandidates(value: string): string[] {
  const candidates: string[] = []
  const stack: string[] = []
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (start < 0) {
      if (char === '{' || char === '[') {
        start = i
        stack.push(char)
      }
      continue
    }
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{' || char === '[') {
      stack.push(char)
      continue
    }
    if (char !== '}' && char !== ']') continue

    const open = stack[stack.length - 1]
    if ((open === '{' && char === '}') || (open === '[' && char === ']')) {
      stack.pop()
      if (stack.length === 0) {
        candidates.push(value.slice(start, i + 1))
        start = -1
      }
    }
  }
  return candidates
}

/** Strips a stray ```json fence and parses; returns null when unparseable. */
export function parseLooseJson<T>(text: string): T | null {
  const clean = (value: string): string =>
    value
      .replace(/^```(json)?/m, '')
      .replace(/```$/m, '')
      .trim()
  const parse = (value: string): T | null => {
    try {
      return JSON.parse(clean(value)) as T
    } catch {
      return null
    }
  }

  const direct = parse(text)
  if (direct !== null) return direct

  // Some self-hosted reasoning models wrap an otherwise valid answer in a
  // visible <think> prelude. Never use that prose; remove the wrapper and
  // validate the JSON payload through the same semantic contract as usual.
  let withoutThinking = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  const lastClose = withoutThinking.toLowerCase().lastIndexOf('</think>')
  if (lastClose >= 0) withoutThinking = withoutThinking.slice(lastClose + '</think>'.length)
  withoutThinking = withoutThinking.replace(/<think>[\s\S]*$/i, '')
  const withoutThinkingResult = parse(withoutThinking)
  if (withoutThinkingResult !== null) return withoutThinkingResult
  const unescaped = unescapeJsonEnvelope(clean(withoutThinking))
  const unescapedResult = parse(unescaped)
  if (unescapedResult !== null) return unescapedResult
  const normalized = repairQuotedArrayObjects(unescaped)
  const candidates = jsonContainerCandidates(normalized)
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = parse(candidates[i])
    if (candidate !== null) return candidate
  }
  if (!/^[{\[]/.test(normalized.trim())) return null
  try {
    return parse(jsonrepair(normalized))
  } catch {
    return null
  }
}
