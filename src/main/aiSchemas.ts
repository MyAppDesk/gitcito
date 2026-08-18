/**
 * JSON contracts for the AI features: the schema sent to providers that support
 * structured output, and a validator that decides whether a reply is usable.
 * Validators return one correction line per problem — those lines are what the
 * model is shown when it is asked to try again.
 */

const HEX = /^#[0-9a-fA-F]{6}$/

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Builds an object schema whose properties are all required strings. */
function stringMapSchema(keys: readonly string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: [...keys],
    properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }]))
  }
}

// ─── Commit messages ────────────────────────────────────────────────────────

export const COMMIT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'description'],
  properties: { summary: { type: 'string' }, description: { type: 'string' } }
}

export function validateCommitMessage(value: unknown): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.summary)) errors.push('"summary" must be a non-empty one-line commit subject.')
  else if ((root.summary as string).includes('\n')) errors.push('"summary" must be a single line.')
  if (root.description !== undefined && root.description !== null && typeof root.description !== 'string') {
    errors.push('"description" must be a string (use "" when there is no body).')
  }
  return errors
}

// ─── Generated project config files ─────────────────────────────────────────

/**
 * True when a model-supplied path stays inside the repo. Paths come back from
 * the LLM and are joined onto the repo root before writing, so `..` segments,
 * absolute paths and Windows drive letters have to be refused.
 */
export function isSafeRepoPath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  const p = path.trim()
  if (!p || p.length > 400) return false
  if (p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:/.test(p)) return false
  if (p.includes('\0')) return false
  return !p
    .split(/[/\\]/)
    .some((segment) => segment === '..')
}

export const CONFIG_FILES_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'content'],
        properties: { path: { type: 'string' }, content: { type: 'string' } }
      }
    }
  }
}

export function validateGeneratedFiles(value: unknown, requested: string[]): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  if (!Array.isArray(root.files)) return ['"files" must be an array of {path, content} objects.']
  if (root.files.length === 0) return ['"files" is empty — generate the files that were asked for.']

  const errors: string[] = []
  const wanted = new Set(requested)
  root.files.forEach((raw: unknown, i) => {
    const file = asObject(raw)
    const at = `files[${i}]`
    if (!file) {
      errors.push(`${at} must be an object with "path" and "content".`)
      return
    }
    if (!isSafeRepoPath(file.path)) {
      errors.push(`${at}.path ${JSON.stringify(file.path ?? null)} must be a relative path inside the repo — no leading "/" and no ".." segments.`)
    } else if (wanted.size > 0 && !wanted.has((file.path as string).trim())) {
      errors.push(`${at}.path ${JSON.stringify(file.path)} was not requested. Generate only: ${[...wanted].join(', ')}.`)
    }
    if (!nonEmptyString(file.content)) errors.push(`${at}.content must be the complete file contents.`)
  })
  return errors
}

// ─── "Ask" actions ──────────────────────────────────────────────────────────

/** One entry of the AskAction union, as loose JSON Schema. Shared between the
 *  Ask planner and repository chat so both surfaces speak the same action set
 *  and go through `validateAskActions` for the real checks. */
export const ASK_ACTIONS_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    required: ['type', 'description'],
    properties: {
      type: {
        type: 'string',
        enum: ['gitignore', 'stage', 'unstage', 'commit', 'stash', 'discard', 'branch', 'checkout', 'tag']
      },
      description: { type: 'string' },
      files: { type: 'array', items: { type: 'string' } },
      patterns: { type: 'array', items: { type: 'string' } },
      message: { type: 'string' },
      name: { type: 'string' },
      at: { type: 'string' },
      ref: { type: 'string' },
      checkout: { type: 'boolean' }
    }
  }
}

// ─── Smart staging ──────────────────────────────────────────────────────────

export const SMART_STAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['toStage', 'reason'],
  properties: {
    toStage: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' }
  }
}

export function validateSmartStage(value: unknown, known: Set<string>): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  if (!Array.isArray(root.toStage)) return ['"toStage" must be an array of paths (use [] to stage nothing).']

  const errors: string[] = []
  for (const path of root.toStage) {
    if (typeof path !== 'string' || !known.has(path)) {
      errors.push(`"toStage" contains ${JSON.stringify(path)}, which is not one of the changed files you were given.`)
    }
  }
  if (root.reason !== undefined && typeof root.reason !== 'string') errors.push('"reason" must be a string.')
  return errors
}

// ─── Suggested config artifacts ─────────────────────────────────────────────

export const ARTIFACT_SUGGESTIONS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'description', 'reason'],
        properties: { path: { type: 'string' }, description: { type: 'string' }, reason: { type: 'string' } }
      }
    }
  }
}

export function validateArtifactSuggestions(value: unknown, alreadySelected: string[]): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  if (!Array.isArray(root.suggestions)) return ['"suggestions" must be an array (use [] when there is nothing to add).']

  const errors: string[] = []
  const taken = new Set(alreadySelected)
  root.suggestions.forEach((raw: unknown, i) => {
    const item = asObject(raw)
    const at = `suggestions[${i}]`
    if (!item) {
      errors.push(`${at} must be an object.`)
      return
    }
    if (!isSafeRepoPath(item.path)) {
      errors.push(`${at}.path must be a relative path inside the repo.`)
    } else if (taken.has((item.path as string).trim())) {
      errors.push(`${at}.path ${JSON.stringify(item.path)} is already selected — suggest something else.`)
    }
    if (!nonEmptyString(item.description)) errors.push(`${at}.description must say what the file is for.`)
    if (!nonEmptyString(item.reason)) errors.push(`${at}.reason must say why this project benefits from it.`)
  })
  return errors
}

// ─── Themes and palettes ────────────────────────────────────────────────────

export const APP_THEME_KEYS = [
  'bg0', 'bg1', 'bg2', 'bg3', 'bg4',
  'border', 'borderSoft',
  'text0', 'text1', 'text2',
  'accent', 'green', 'red', 'yellow', 'purple'
] as const

export const CODE_THEME_KEYS = [
  'bg', 'text', 'comment', 'keyword', 'string', 'number', 'function', 'title',
  'variable', 'type', 'builtin', 'attr', 'tag', 'operator', 'meta'
] as const

function themeSchema(keys: readonly string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'light', 'dark'],
    properties: { name: { type: 'string' }, light: stringMapSchema(keys), dark: stringMapSchema(keys) }
  }
}

export const APP_THEME_SCHEMA = themeSchema(APP_THEME_KEYS)
export const CODE_THEME_SCHEMA = themeSchema(CODE_THEME_KEYS)

/** Both variants must carry every colour, as a 6-digit hex value. */
export function validateTheme(value: unknown, keys: readonly string[]): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.name)) errors.push('"name" must be the theme name.')
  for (const variant of ['light', 'dark'] as const) {
    const colors = asObject(root[variant])
    if (!colors) {
      errors.push(`"${variant}" must be an object with all ${keys.length} colours.`)
      continue
    }
    const missing = keys.filter((k) => !(k in colors))
    if (missing.length > 0) errors.push(`"${variant}" is missing: ${missing.join(', ')}.`)
    const bad = keys.filter((k) => k in colors && !HEX.test(String(colors[k])))
    if (bad.length > 0) errors.push(`"${variant}" must use 6-digit hex colours; these are not: ${bad.join(', ')}.`)
  }
  return errors
}

export const GRAPH_PALETTE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'colors'],
  properties: { name: { type: 'string' }, colors: { type: 'array', items: { type: 'string' } } }
}

export function validateGraphPalette(value: unknown): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.name)) errors.push('"name" must be the palette name.')
  if (!Array.isArray(root.colors)) return [...errors, '"colors" must be an array of 8 hex colours.']
  if (root.colors.length !== 8) errors.push(`"colors" must have exactly 8 entries, not ${root.colors.length}.`)
  const bad = root.colors.filter((c: unknown) => !HEX.test(String(c)))
  if (bad.length > 0) errors.push(`"colors" must be 6-digit hex values; these are not: ${bad.join(', ')}.`)
  return errors
}

// ─── Pull request description ───────────────────────────────────────────────

export const PR_DESCRIPTION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body'],
  properties: { title: { type: 'string' }, body: { type: 'string' } }
}

export function validatePRDescription(value: unknown): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const errors: string[] = []
  if (!nonEmptyString(root.title)) errors.push('"title" must be a one-line pull request title.')
  else if ((root.title as string).includes('\n')) errors.push('"title" must be a single line.')
  if (!nonEmptyString(root.body)) errors.push('"body" must be the Markdown description.')
  return errors
}

// ─── Branch names ───────────────────────────────────────────────────────────

export const BRANCH_NAME_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: { name: { type: 'string' } }
}

/** git's rules, plus the house style: lowercase, hyphens, no exotic characters. */
export function validateBranchName(value: unknown): string[] {
  const root = asObject(value)
  if (!root) return ['The response must be a JSON object.']
  const name = root.name
  if (!nonEmptyString(name)) return ['"name" must be the branch name.']
  const n = (name as string).trim()
  const errors: string[] = []
  if (/\s/.test(n)) errors.push('"name" must not contain spaces — use hyphens.')
  if (!/^[A-Za-z0-9._\-/]+$/.test(n)) errors.push('"name" may only use letters, digits, ".", "_", "-" and "/".')
  if (n.startsWith('/') || n.endsWith('/') || n.includes('//')) errors.push('"name" must not start or end with "/" or contain "//".')
  if (n.endsWith('.lock') || n.includes('..')) errors.push('"name" must not contain ".." or end with ".lock".')
  if (n.length > 100) errors.push('"name" must be shorter than 100 characters.')
  return errors
}

// ─── Merge conflict resolution (plain text, not JSON) ───────────────────────

const CONFLICT_MARKER = /^(<{7}|={7}|>{7}|\|{7})/m

/** A resolved file must not still contain conflict markers. */
export function validateResolvedFile(text: string): string[] {
  if (CONFLICT_MARKER.test(text)) {
    return ['The result still contains git conflict markers (<<<<<<<, =======, >>>>>>>). Return the merged file with none of them.']
  }
  if (!text.trim()) return ['The result is empty. Return the full merged file contents.']
  return []
}
