import { ipcMain } from 'electron'
import type { AIConfig, AppThemeColors, AskAction, AskPlan, BranchNamingStyle, CodeThemeColors, ConflictStyle, ExplainStyle, PRReviewResult, RepoStatus } from '../shared/types'
import { recordAIUsage } from './analytics'
import { activeProfileAiKey } from './settings'
import { callModel, missingCredential, type ChatMessage } from './aiTransport'
import { listAccountModels } from './aiModels'
import { detectCliBinaries } from './aiCli'
import { createHash } from 'node:crypto'
import {
  APP_THEME_KEYS,
  APP_THEME_SCHEMA,
  ARTIFACT_SUGGESTIONS_SCHEMA,
  BRANCH_NAME_SCHEMA,
  ASK_ACTIONS_SCHEMA,
  CODE_THEME_KEYS,
  CODE_THEME_SCHEMA,
  COMMIT_SCHEMA,
  CONFIG_FILES_SCHEMA,
  GRAPH_PALETTE_SCHEMA,
  PR_DESCRIPTION_SCHEMA,
  SMART_STAGE_SCHEMA,
  validateArtifactSuggestions,
  validateBranchName,
  validateCommitMessage,
  validateGeneratedFiles,
  validateGraphPalette,
  validatePRDescription,
  validateResolvedFile,
  validateSmartStage,
  validateTheme
} from './aiSchemas'
import {
  buildDiffEvidence,
  buildWindowFromLines,
  evidenceIndex,
  groundFindings,
  parseLooseJson,
  renderFindings,
  serializeEvidence,
  validateAskPlan,
  validateHoverExplain,
  validateReview,
  type NumberedLine,
  type RawFinding
} from './grounding'

export interface AICommitMessage {
  summary: string
  description: string
}

export interface AICommitContext {
  branch: string
}

const TICKET_RE = /([A-Z][A-Z0-9]+-\d+)/

/**
 * Fills in the API key the renderer does not have.
 *
 * Stored keys are decrypted lazily — only opening Settings hydrates them into
 * the renderer — so a config arriving from any other surface (commit message,
 * hover explain, conflict resolve, …) is keyless on a fresh launch. Resolve it
 * from the encrypted store at the point of use rather than failing.
 *
 * `cfg.accountId` says which account the renderer resolved, so the key that
 * comes back belongs to that account rather than to whichever one is default.
 */
export async function withStoredKey(cfg: AIConfig): Promise<AIConfig> {
  if (cfg.apiKey && cfg.apiKey.trim()) return cfg
  const key = await activeProfileAiKey(cfg.accountId)
  return key ? { ...cfg, apiKey: key } : cfg
}

function styleGuidance(cfg: AIConfig, branch: string): string {
  const ticket = TICKET_RE.exec(branch)?.[1] ?? null
  const conventional =
    'Format the summary using Conventional Commits: a prefix like feat:, fix:, refactor:, chore:, docs:, test:, perf: followed by an imperative description.'
  const ticketRule = ticket
    ? `The current branch is "${branch}" and references ticket ${ticket}. Prefix the summary with "${ticket}: " (e.g. "${ticket}: add login validation"). Do not use any other prefix.`
    : null

  let rule: string
  switch (cfg.commitStyle) {
    case 'conventional':
      rule = conventional
      break
    case 'gitmoji':
      rule =
        'Start the summary with the most fitting gitmoji (✨ feature, 🐛 fix, ♻️ refactor, 📝 docs, ✅ tests, 🔧 config, ⚡️ perf) followed by a space and an imperative description. No other prefix.'
      break
    case 'ticket':
      rule =
        ticketRule ??
        `No ticket reference found in the branch name ("${branch}"). Fall back to a plain imperative summary without prefixes.`
      break
    case 'plain':
      rule = 'Write a plain imperative summary with no prefixes, no emoji, no ticket references.'
      break
    case 'caveman':
      rule =
        'Write the summary in exaggerated caveman speak: short, broken sentences in ALL CAPS, e.g. "ME ADD LOGIN. CODE GOOD.". No prefixes or emoji. Keep it understandable.'
      break
    case 'haiku':
      rule =
        'Write the summary as a single-line haiku (5-7-5 syllables) describing the change, separating the three parts with " / ". No prefixes or emoji.'
      break
    case 'auto':
    default:
      rule = ticketRule ?? conventional
      break
  }

  const custom = cfg.customInstructions?.trim()
  return custom ? `${rule}\nAdditional user rules (highest priority): ${custom}` : rule
}

/** Tone instruction for code explanations. */
function explainStyleGuidance(style: ExplainStyle | undefined): string {
  switch (style) {
    case 'concise':
      return 'Be extremely concise: a one-line summary and at most two short bullets.'
    case 'detailed':
      return 'Be thorough: walk through the logic step by step, including edge cases, complexity, and potential bugs.'
    case 'eli5':
      return 'Explain it like I am five: very simple words and everyday analogies, no jargon.'
    case 'caveman':
      return 'Use exaggerated caveman speak: short, broken sentences and ALL CAPS for emphasis (e.g. "CODE TAKE NUMBER. CODE ADD. CODE GIVE BACK."). Stay accurate and understandable.'
    case 'pirate':
      return 'Speak like a salty pirate, with nautical slang and the odd "Arr". Stay accurate and understandable.'
    case 'formal':
      return 'Use a formal, academic tone suitable for technical documentation.'
    case 'normal':
    default:
      return 'Use a clear, friendly, professional tone.'
  }
}

/** Output-shaping instruction for AI merge-conflict resolution. */
function conflictStyleGuidance(style: ConflictStyle | undefined): string {
  switch (style) {
    case 'commented':
      return "Where you combine or choose between the conflicting sides, add a brief inline comment using the file's comment syntax noting what was done (e.g. \"// merged: kept both validations\"). Keep comments short and only at resolved spots."
    case 'conservative':
      return 'Be conservative: make the smallest possible change. When the two sides cannot be safely combined, prefer keeping BOTH behaviours over dropping either.'
    case 'clean':
    default:
      return 'Produce a clean result with no extra comments about the merge.'
  }
}

function buildSystemPrompt(cfg: AIConfig, ctx: AICommitContext): string {
  const descRule =
    cfg.generateDescription === false
      ? '- "description": always null. Do not write a body; put everything meaningful in the summary.'
      : '- "description": 1-4 short bullet lines explaining the why/what, or empty string for trivial changes.'
  return `You are an expert software engineer writing git commit messages.
Given a staged diff, reply ONLY with a JSON object: {"summary": "...", "description": "..."}.
- "summary": max 72 chars, imperative mood. ${styleGuidance(cfg, ctx.branch)}
${descRule}
No markdown fences, no extra text.`
}

async function generateCommitMessage(diff: string, cfg: AIConfig, ctx: AICommitContext): Promise<AICommitMessage> {
  // Honour the toggle even if the model ignores the instruction and returns a body anyway.
  const omitDesc = cfg.generateDescription === false
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(cfg, ctx) },
    { role: 'user', content: `Branch: ${ctx.branch}\n\nStaged diff:\n\n${clip(diff)}` }
  ]
  try {
    const parsed = await chatCompleteJson<AICommitMessage>(cfg, messages, 'commitMessage', {
      name: 'commit_message',
      schema: COMMIT_SCHEMA,
      validate: validateCommitMessage
    })
    return { summary: parsed.summary.trim(), description: omitDesc ? '' : (parsed.description ?? '').trim() }
  } catch (err) {
    if (!(err instanceof InvalidAIResponse) || !err.lastReply.trim()) throw err
    // Rather than fail the commit outright, fall back to reading the reply as
    // plain text — the first line is the subject, the rest the body.
    const [first, ...rest] = err.lastReply.trim().split('\n')
    return { summary: first.trim(), description: omitDesc ? '' : rest.join('\n').trim() }
  }
}

/** One chat completion against the account's provider, as raw message text. */
async function chatComplete(
  input: AIConfig,
  messages: ChatMessage[],
  feature: string,
  temperature = 0.2,
  extra?: Record<string, unknown>
): Promise<string> {
  const cfg = await withStoredKey(input)
  if (missingCredential(cfg)) throw new Error('No AI API key configured. Add one in Settings → AI.')

  const model = cfg.model || 'gpt-4o-mini'
  const reply = await callModel({ ...cfg, model }, messages, temperature, extra)
  void recordAIUsage(feature, model, reply.usage)
  return reply.text
}

/** A JSON contract the model must satisfy before its output is accepted. */
export interface JsonSpec {
  /** Schema name, for providers with native structured output. */
  name: string
  schema: Record<string, unknown>
  /** Returns one correction line per problem; empty means the value is usable. */
  validate: (value: unknown) => string[]
  /** Off for schemas with optional or union-shaped fields. Default on. */
  strict?: boolean
}

/** Thrown when the model's JSON is still unusable after the correction retry. */
export class InvalidAIResponse extends Error {
  /** The rejected reply, for callers that can still salvage something from it. */
  readonly lastReply: string

  constructor(message: string, lastReply = '') {
    super(message)
    this.lastReply = lastReply
  }
}

/** True when a provider rejected the request because it can't do json_schema. */
function rejectsJsonSchema(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /failed \(4\d\d\)/.test(msg) && /response_format|json[_ ]schema|structured/i.test(msg)
}

function correctionMessage(errors: string[]): string {
  return `Your previous reply was rejected for these reasons:
${errors.map((e) => `- ${e}`).join('\n')}

Reply again with the corrected JSON object only — no explanation, no markdown fences.`
}

/**
 * Asks for JSON, validates it against `spec`, and re-prompts once with the
 * validation errors before giving up. Providers that don't support native
 * structured output silently fall back to prompt-only JSON.
 */
export async function chatCompleteJson<T>(
  cfg: AIConfig,
  messages: ChatMessage[],
  feature: string,
  spec: JsonSpec,
  temperature = 0.2
): Promise<T> {
  const format = {
    response_format: {
      type: 'json_schema',
      json_schema: { name: spec.name, strict: spec.strict !== false, schema: spec.schema }
    }
  }

  let extra: Record<string, unknown> | undefined = format
  let raw: string
  try {
    raw = await chatComplete(cfg, messages, feature, temperature, extra)
  } catch (err) {
    if (!rejectsJsonSchema(err)) throw err
    extra = undefined
    raw = await chatComplete(cfg, messages, feature, temperature)
  }

  const check = (text: string): { value: T | null; errors: string[] } => {
    const value = parseLooseJson<T>(text)
    if (value === null) {
      return { value: null, errors: ['The reply was not valid JSON. Return a single JSON object and nothing else.'] }
    }
    return { value, errors: spec.validate(value) }
  }

  let result = check(raw)
  if (result.errors.length === 0 && result.value !== null) return result.value

  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: raw },
    { role: 'user', content: correctionMessage(result.errors) }
  ]
  raw = await chatComplete(cfg, retryMessages, feature, temperature, extra)
  result = check(raw)
  if (result.errors.length === 0 && result.value !== null) return result.value

  throw new InvalidAIResponse(`The AI returned an invalid response: ${result.errors[0]}`, raw)
}

/**
 * Same contract for replies that are not JSON: ask, check, and re-prompt once
 * with the problem before giving up.
 */
async function chatCompleteChecked(
  cfg: AIConfig,
  messages: ChatMessage[],
  feature: string,
  validate: (text: string) => string[],
  temperature = 0.2
): Promise<string> {
  let raw = await chatComplete(cfg, messages, feature, temperature)
  let errors = validate(raw)
  if (errors.length === 0) return raw

  raw = await chatComplete(
    cfg,
    [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: `Your previous reply was rejected: ${errors.join(' ')}\n\nReply again with the corrected result only.` }
    ],
    feature,
    temperature
  )
  errors = validate(raw)
  if (errors.length === 0) return raw
  throw new InvalidAIResponse(`The AI returned an invalid response: ${errors[0]}`, raw)
}

function clip(text: string, max = 16000): string {
  return text.length > max ? text.slice(0, max) + '\n…(truncated)' : text
}

/** Plain-language explanation of a code file or snippet. */
async function explainCode(code: string, lang: string, cfg: AIConfig): Promise<string> {
  const tone = explainStyleGuidance(cfg.explainStyle)
  const system = `You are an expert software engineer explaining code to a colleague.
Explain what the given ${lang || 'source'} code does in clear, plain language.
Lead with a one-sentence summary, then short bullet points for the key parts and any
notable side effects, edge cases, or risks. Be concise. Do not restate the code line by
line. Use markdown, but no code fences unless quoting a short identifier.
Tone: ${tone}`
  return (await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: clip(code) }
  ], 'explainCode')).trim()
}

export interface HoverExplainRequest {
  path: string
  lang: string
  token: string
  line: number
  /** The lines the viewer has — a whole file, or the hunks of a diff. */
  lines: NumberedLine[]
}

export interface HoverExplainResult {
  summary: string
  bullets: string[]
  /** Lines the explanation drew on, resolved to `path:line` by the caller. */
  lines: number[]
  startLine: number
  endLine: number
}

const HOVER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'bullets', 'lines'],
  properties: {
    summary: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
    lines: { type: 'array', items: { type: 'integer' } }
  }
}

// Hovering is cheap to trigger and expensive to answer, so identical asks are
// served from memory. The key covers the window text, so editing the file (or
// switching model) misses and re-asks. Bounded; oldest entry goes first.
const HOVER_CACHE_LIMIT = 200
const hoverCache = new Map<string, HoverExplainResult>()

function rememberHover(key: string, value: HoverExplainResult): void {
  hoverCache.set(key, value)
  if (hoverCache.size > HOVER_CACHE_LIMIT) {
    const oldest = hoverCache.keys().next().value
    if (oldest !== undefined) hoverCache.delete(oldest)
  }
}

/**
 * Explains one token, using only a numbered window of the file around it. The
 * model cites line numbers from that window and never sees — or writes — a file
 * path, so a citation that isn't in front of it is a validation error.
 */
async function hoverExplain(req: HoverExplainRequest, cfg: AIConfig): Promise<HoverExplainResult> {
  const window = buildWindowFromLines(req.lines, req.line)
  if (!window.text) throw new InvalidAIResponse('There is no code around that token to read.')
  const key = createHash('sha256')
    .update(
      JSON.stringify([
        'hover.v1',
        cfg.model,
        cfg.explainStyle ?? 'normal',
        req.path,
        req.token,
        req.line,
        window.text
      ])
    )
    .digest('hex')
  const hit = hoverCache.get(key)
  if (hit) return hit

  const system = `You explain a single token of source code to a developer reading the file.

You are given a numbered window of a ${req.lang || 'source'} file. Rules:
- Answer only from the window. If it does not show what the token is (it is imported or defined elsewhere), say exactly that in the summary instead of guessing.
- The numbering may skip lines — a diff view shows only the changed hunks. Never assume anything about the gaps.
- Never write file paths. Cite line numbers only from the window, in "lines" — the app turns them into links.
- Be brief: one sentence in "summary", at most 2 short bullets in "bullets". Plain text, no markdown, no code fences.
Tone: ${explainStyleGuidance(cfg.explainStyle)}

Reply ONLY with valid JSON: {"summary":"...","bullets":["..."],"lines":[${window.startLine}]}`

  const parsed = await chatCompleteJson<{ summary: string; bullets?: string[]; lines?: number[] }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Token: ${req.token}\nOn line: ${req.line}\n\nFile window:\n${window.text}` }
    ],
    'hoverExplain',
    { name: 'hover_explain', schema: HOVER_SCHEMA, validate: (v) => validateHoverExplain(v, window) },
    0.2
  )

  const result: HoverExplainResult = {
    summary: parsed.summary.trim(),
    bullets: (parsed.bullets ?? []).map((b) => String(b).trim()).filter(Boolean).slice(0, 3),
    lines: (parsed.lines ?? []).filter((n) => Number.isInteger(n)),
    startLine: window.startLine,
    endLine: window.endLine
  }
  rememberHover(key, result)
  return result
}

/** Propose a merged file from raw content containing git conflict markers. */
async function resolveConflictAI(file: string, content: string, cfg: AIConfig): Promise<string> {
  const styleRule = conflictStyleGuidance(cfg.conflictStyle)
  const system = `You are resolving a git merge conflict in "${file}".
The input contains conflict markers: <<<<<<< (ours), ======= , >>>>>>> (theirs), and
optionally ||||||| (base). Produce the correct merged file that preserves the intent of
BOTH sides where compatible. Keep all non-conflicting content unchanged.
${styleRule}
Reply with ONLY the full resolved file content. No conflict markers, no markdown fences,
no commentary, no explanations.`
  // Strip a stray ```lang fence if the model added one despite instructions.
  const unfence = (text: string): string =>
    text.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').replace(/\s+$/, '')

  const out = await chatCompleteChecked(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: clip(content, 24000) }
    ],
    'resolveConflict',
    // A "resolution" that still has conflict markers would be pasted straight
    // into the editor, so it is worth one more try.
    (text) => validateResolvedFile(unfence(text)),
    0.1
  )
  return unfence(out)
}

export interface ArtifactRequest {
  path: string
  description: string
}

export interface GeneratedFile {
  path: string
  content: string
}

export interface ArtifactSuggestion {
  path: string
  description: string
  reason: string
}

async function generateProjectConfig(
  repoName: string,
  artifacts: ArtifactRequest[],
  context: string,
  cfg: AIConfig
): Promise<{ files: GeneratedFile[] }> {
  const system = `You are a developer productivity expert generating AI tool configuration files for a software project.
Reply ONLY with valid JSON: {"files": [{"path": "...", "content": "..."}]}
Rules:
- Paths are relative to the repo root (e.g. "CLAUDE.md", ".cursor/rules/project.mdc")
- Content must be complete and production-ready — no placeholders, no TODOs
- For shell scripts (.git/hooks/*), output executable sh scripts with a proper shebang line
- No markdown fences or commentary outside the JSON object`

  const fileList = artifacts.map((a) => `- ${a.path}: ${a.description}`).join('\n')
  const user = `Project name: ${repoName}${context.trim() ? `\nProject description: ${context.trim()}` : ''}

Generate these configuration files:
${fileList}`

  const requested = artifacts.map((a) => a.path.trim())
  const parsed = await chatCompleteJson<{ files: GeneratedFile[] }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    'generateConfig',
    {
      name: 'project_config',
      schema: CONFIG_FILES_SCHEMA,
      validate: (v) => validateGeneratedFiles(v, requested)
    },
    0.3
  )
  return { files: parsed.files }
}

export interface SmartStageFile {
  path: string
  status: string
}

export interface SmartStageResult {
  toStage: string[]
  reason: string
}

async function smartStageFiles(files: SmartStageFile[], cfg: AIConfig): Promise<SmartStageResult> {
  const system = `You are a git expert deciding which changed files should be staged for a commit.

STAGE these kinds of files:
- Source code changes (.ts, .tsx, .js, .jsx, .py, .go, .rs, .java, .rb, .php, .cs, .cpp, .c, .h, .swift, .kt)
- Tests, documentation, migrations, SQL
- Intentional config changes (tsconfig, vite.config, package.json changes that aren't just lockfile, .eslintrc, etc.)
- Assets, styles, templates that were deliberately edited

DO NOT STAGE:
- Lock files: package-lock.json, yarn.lock, pnpm-lock.yaml, Cargo.lock, poetry.lock, Gemfile.lock, composer.lock
- Build/compile output: dist/, build/, out/, .next/, .nuxt/, __pycache__/, *.pyc, *.class, *.o, *.d.ts in dist
- Environment & secrets: .env, .env.local, .env.production, .env.development, *.pem, *.key, secrets.*
- OS & editor garbage: .DS_Store, Thumbs.db, desktop.ini, .idea/, *.swp, *.swo, *~
- Log files: *.log, npm-debug.log, yarn-error.log
- Coverage & cache: coverage/, .nyc_output/, .cache/, .parcel-cache/

Reply ONLY with valid JSON (no markdown fences):
{"toStage": ["path/to/file.ts", ...], "reason": "one sentence explaining what you staged and what you excluded"}`

  const fileList = files.map((f) => `${f.status}: ${f.path}`).join('\n')
  const known = new Set(files.map((f) => f.path))
  try {
    const parsed = await chatCompleteJson<{ toStage: string[]; reason: string }>(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: `Changed files:\n${fileList}` }
      ],
      'smartStage',
      { name: 'smart_stage', schema: SMART_STAGE_SCHEMA, validate: (v) => validateSmartStage(v, known) }
    )
    return { toStage: parsed.toStage, reason: parsed.reason ?? '' }
  } catch (err) {
    if (!(err instanceof InvalidAIResponse)) throw err
    // Staging nothing is the safe failure: the old fallback staged everything,
    // which is exactly what the user asked the AI to avoid.
    return { toStage: [], reason: 'The AI response could not be used, so nothing was selected. Stage manually.' }
  }
}

async function suggestArtifacts(
  repoName: string,
  selectedTools: string[],
  context: string,
  alreadySelected: ArtifactRequest[],
  cfg: AIConfig
): Promise<{ suggestions: ArtifactSuggestion[] }> {
  const alreadyList = alreadySelected.map((a) => `- ${a.path}`).join('\n')
  const system = `You are a developer productivity expert. Given a project description and the AI tools a developer is using, suggest ADDITIONAL configuration files that would be valuable — beyond what they have already selected.
Reply ONLY with valid JSON: {"suggestions": [{"path": "...", "description": "...", "reason": "..."}]}
Rules:
- path: file path relative to repo root
- description: one sentence — what the file does/contains
- reason: one sentence — why this specific project would benefit from it
- Suggest only files not already in the "already selected" list
- Limit to 6–10 high-value suggestions
- Paths must be real, recognised config file paths for the tools listed
- No markdown fences or commentary outside the JSON`

  const user = `Project name: ${repoName}
${context.trim() ? `Project description: ${context.trim()}\n` : ''}Selected tools: ${selectedTools.join(', ')}

Already selected files (do NOT suggest these again):
${alreadyList || '(none)'}

Suggest additional configuration files that would be valuable for this project.`

  try {
    const parsed = await chatCompleteJson<{ suggestions: ArtifactSuggestion[] }>(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      'suggestArtifacts',
      {
        name: 'artifact_suggestions',
        schema: ARTIFACT_SUGGESTIONS_SCHEMA,
        validate: (v) => validateArtifactSuggestions(v, alreadySelected.map((a) => a.path.trim()))
      },
      0.4
    )
    return { suggestions: parsed.suggestions }
  } catch (err) {
    // Suggestions are a bonus on top of the wizard; an unusable reply just means
    // none to show.
    if (!(err instanceof InvalidAIResponse)) throw err
    return { suggestions: [] }
  }
}

async function generateAppTheme(
  prompt: string,
  cfg: AIConfig
): Promise<{ name: string; light: AppThemeColors; dark: AppThemeColors }> {
  const system = `You are a UI color palette expert. Generate a complete app color theme with DISTINCT light and dark variants.

Reply ONLY with valid JSON (no markdown fences):
{
  "name": "Theme Name",
  "light": { "bg0":"#hex","bg1":"#hex","bg2":"#hex","bg3":"#hex","bg4":"#hex","border":"#hex","borderSoft":"#hex","text0":"#hex","text1":"#hex","text2":"#hex","accent":"#hex","green":"#hex","red":"#hex","yellow":"#hex","purple":"#hex" },
  "dark":  { "bg0":"#hex","bg1":"#hex","bg2":"#hex","bg3":"#hex","bg4":"#hex","border":"#hex","borderSoft":"#hex","text0":"#hex","text1":"#hex","text2":"#hex","accent":"#hex","green":"#hex","red":"#hex","yellow":"#hex","purple":"#hex" }
}

LIGHT mode rules (bg values must be LIGHT, text must be DARK):
- bg0: the main window background — very light (e.g. #f5f5f5, #ffffff, #f0ebe3). Luminance > 85%.
- bg1–bg4: progressively slightly darker panels/surfaces, still clearly light
- text0: near-black or very dark (e.g. #1a1a1a, #111827). Luminance < 20%.
- text1: medium dark (e.g. #374151). text2: muted (e.g. #6b7280)
- border: subtle light gray (e.g. #e5e7eb). borderSoft: even subtler (e.g. #f0f0f0)

DARK mode rules (bg values must be DARK, text must be LIGHT):
- bg0: the main window background — very dark (e.g. #0f1117, #1a1a2e, #1e1e1e). Luminance < 15%.
- bg1–bg4: progressively slightly lighter dark panels, but still clearly dark
- text0: near-white or very light (e.g. #f0f0f0, #e2e8f0). Luminance > 85%.
- text1: lighter gray (e.g. #94a3b8). text2: muted (e.g. #64748b)
- border: dark gray (e.g. #2d2d2d). borderSoft: subtler dark (e.g. #252525)

Shared rules:
- accent: the theme's signature color (buttons, links, highlights) — keep hue consistent across both modes, adjust lightness
- green/red/yellow/purple: semantic status colors — keep recognizable in both modes
- bg0 in light and bg0 in dark must look COMPLETELY DIFFERENT — one clearly light, one clearly dark
- All values must be valid 6-digit hex colors`

  return chatCompleteJson<{ name: string; light: AppThemeColors; dark: AppThemeColors }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Theme description: ${prompt}` }
    ],
    'generateAppTheme',
    { name: 'app_theme', schema: APP_THEME_SCHEMA, validate: (v) => validateTheme(v, APP_THEME_KEYS) },
    0.7
  )
}

async function generateCodeTheme(
  prompt: string,
  cfg: AIConfig
): Promise<{ name: string; light: CodeThemeColors; dark: CodeThemeColors }> {
  const system = `You are a syntax highlighting color theme expert. Generate a complete code editor theme with DISTINCT light and dark variants.

Reply ONLY with valid JSON (no markdown fences):
{
  "name": "Theme Name",
  "light": { "bg":"#hex","text":"#hex","comment":"#hex","keyword":"#hex","string":"#hex","number":"#hex","function":"#hex","title":"#hex","variable":"#hex","type":"#hex","builtin":"#hex","attr":"#hex","tag":"#hex","operator":"#hex","meta":"#hex" },
  "dark":  { "bg":"#hex","text":"#hex","comment":"#hex","keyword":"#hex","string":"#hex","number":"#hex","function":"#hex","title":"#hex","variable":"#hex","type":"#hex","builtin":"#hex","attr":"#hex","tag":"#hex","operator":"#hex","meta":"#hex" }
}

LIGHT mode rules (editor background must be LIGHT):
- bg: very light editor background (e.g. #ffffff, #fafafa, #f8f4f0). Luminance > 90%.
- text: near-black default code color (e.g. #1a1a1a, #24292e). High contrast on light bg.
- comment: muted medium tone (e.g. #6a737d, #998866) — readable but de-emphasized
- All token colors must be dark enough to read clearly on the light bg

DARK mode rules (editor background must be DARK):
- bg: very dark editor background (e.g. #1e1e1e, #0d1117, #1a1b26). Luminance < 15%.
- text: light default code color (e.g. #d4d4d4, #abb2bf). High contrast on dark bg.
- comment: muted mid-tone (e.g. #6a737d, #5c6370) — readable but de-emphasized
- All token colors must be light enough to read clearly on the dark bg

Shared rules:
- bg in light and bg in dark must look COMPLETELY DIFFERENT — one clearly light, one clearly dark
- Each token type should use a distinct hue to maximize visual differentiation
- Keep keyword/string/function hues thematically consistent with the prompt's color palette
- All values must be valid 6-digit hex colors`

  return chatCompleteJson<{ name: string; light: CodeThemeColors; dark: CodeThemeColors }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Theme description: ${prompt}` }
    ],
    'generateCodeTheme',
    { name: 'code_theme', schema: CODE_THEME_SCHEMA, validate: (v) => validateTheme(v, CODE_THEME_KEYS) },
    0.7
  )
}

async function generateGraphPalette(
  prompt: string,
  cfg: AIConfig
): Promise<{ name: string; colors: string[] }> {
  const system = `You are a data-visualization color expert. Generate a palette of branch-lane colors for a git commit graph.

Reply ONLY with valid JSON (no markdown fences):
{
  "name": "Palette Name",
  "colors": ["#hex","#hex","#hex","#hex","#hex","#hex","#hex","#hex"]
}

Rules:
- Exactly 8 colors, all valid 6-digit hex.
- These are LANE colors drawn as thin lines/dots over BOTH light and dark app backgrounds, so pick mid-to-vivid tones that stay legible on either — avoid near-white, near-black, and very pale pastels unless the prompt explicitly asks for them.
- Adjacent colors in the array must be clearly distinguishable from each other (different hue or strong lightness gap) — they often sit side by side.
- Keep the set harmonious and on-theme for the prompt.`

  return chatCompleteJson<{ name: string; colors: string[] }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Palette description: ${prompt}` }
    ],
    'generateGraphPalette',
    { name: 'graph_palette', schema: GRAPH_PALETTE_SCHEMA, validate: validateGraphPalette },
    0.7
  )
}

function branchStyleGuidance(style: BranchNamingStyle | undefined, username?: string): string {
  const name = username?.split(' ')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'dev'
  switch (style) {
    case 'prefix/ticket-description':
      return `Use the format "prefix/TICKET-slug". Extract ticket/issue numbers (e.g. CMS-123, JIRA-456) if present. Pick prefix from: feature, fix, chore, docs, test, refactor, hotfix. If no ticket found, fall back to "prefix/slug". Example: feature/CMS-123-add-login-form`
    case 'username/prefix/description':
      return `Use the format "${name}/prefix/slug". Username is always "${name}". Pick prefix from: feature, fix, chore, docs, test, refactor, hotfix. Example: ${name}/feature/add-login-form`
    case 'plain':
      return `Plain slug only, no prefix, no slashes. Example: add-login-form`
    case 'prefix/description':
    default:
      return `Use the format "prefix/slug". Pick prefix from: feature, fix, chore, docs, test, refactor, hotfix. Example: feature/add-login-form`
  }
}

async function generateBranchName(
  description: string,
  cfg: AIConfig,
  ctx: { username?: string }
): Promise<string> {
  const styleGuide = branchStyleGuidance(cfg.branchNamingStyle, ctx.username)
  const system = `You are a git branch naming expert.
Given a description of work, generate a short, valid branch name.
Convention: ${styleGuide}
Rules:
- Lowercase only, hyphens instead of spaces or special chars
- Keep slug concise (3–6 words max after the prefix)
- The name must be a valid git ref: no spaces, no "..", no trailing "/" or ".lock".
Reply ONLY with valid JSON: {"name": "..."}. No markdown fences.`
  const parsed = await chatCompleteJson<{ name: string }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: description }
    ],
    'generateBranchName',
    { name: 'branch_name', schema: BRANCH_NAME_SCHEMA, validate: validateBranchName },
    0.3
  )
  return parsed.name.trim()
}

const REVIEW_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'severity', 'evidenceId', 'claim', 'suggestion'],
        properties: {
          kind: { type: 'string', enum: ['risk', 'suggestion'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          evidenceId: { type: 'string' },
          claim: { type: 'string' },
          suggestion: { type: 'string' }
        }
      }
    }
  }
}

/**
 * Reviews a diff hunk by hunk. The model only ever cites EvidenceIDs; the real
 * paths and line numbers are resolved here, so it cannot invent a location.
 */
async function reviewPR(diff: string, cfg: AIConfig): Promise<PRReviewResult> {
  const evidence = buildDiffEvidence(diff)
  if (evidence.items.length === 0) {
    return { summary: 'No reviewable code changes found in this diff.', risks: '', suggestions: '', findings: [] }
  }
  const index = evidenceIndex(evidence)
  const allowed = new Set(index.keys())

  const system = `You are an expert software engineer reviewing a pull request.

You are given the changed hunks of a git diff. Each hunk is labelled with an EvidenceID like [E3].

Rules:
- Ground every finding in exactly one hunk and cite it with "evidenceId".
- Only cite EvidenceIDs from the list. Never invent one.
- Never write file paths, line numbers or code excerpts — the app resolves those from the EvidenceID you cite.
- If a hunk does not actually show the problem, omit the finding rather than guess.
- At most 8 findings, most important first. Return an empty array when the change looks fine.

Reply ONLY with valid JSON (no markdown fences):
{"summary":"2-4 sentences on what this PR does and its overall quality","findings":[{"kind":"risk","severity":"high","evidenceId":"E1","claim":"one sentence describing the problem","suggestion":"one sentence with the fix, or an empty string"}]}
- "kind": "risk" for bugs, security, performance or breaking changes; "suggestion" for improvements.
- "severity": "high", "medium" or "low".`

  const parsed = await chatCompleteJson<{ summary: string; findings: RawFinding[] }>(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: `Changed hunks:\n\n${serializeEvidence(evidence)}` }
    ],
    'reviewPR',
    { name: 'pr_review', schema: REVIEW_SCHEMA, validate: (v) => validateReview(v, allowed) },
    0.2
  )

  const findings = groundFindings(parsed.findings, index)
  return {
    summary: parsed.summary.trim(),
    risks: renderFindings(findings, 'risk'),
    suggestions: renderFindings(findings, 'suggestion'),
    findings
  }
}

export interface PRDescriptionResult {
  title: string
  body: string
}

/** Draft a PR title + Markdown body from a branch's commit subjects and diff. */
async function prDescription(commits: string, diff: string, cfg: AIConfig): Promise<PRDescriptionResult> {
  const system = `You write clear, concise pull request descriptions.
Given a branch's commit subjects and its diff, return a JSON object:
- "title": a single-line PR title (imperative, no trailing period, ≤ 70 chars).
- "body": GitHub-flavored Markdown — a short summary paragraph, then a "## Changes" bullet list of the notable changes, and a "## Notes" section only if useful.
Reply ONLY with valid JSON: {"title": "...", "body": "..."}. No markdown fences.`
  const user = `Commit subjects:\n${clip(commits, 4000)}\n\nDiff:\n${clip(diff, 20000)}`
  try {
    const parsed = await chatCompleteJson<PRDescriptionResult>(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      'prDescription',
      { name: 'pr_description', schema: PR_DESCRIPTION_SCHEMA, validate: validatePRDescription },
      0.3
    )
    return { title: parsed.title.trim(), body: parsed.body.trim() }
  } catch (err) {
    if (!(err instanceof InvalidAIResponse) || !err.lastReply.trim()) throw err
    // Fall back to the first line as title, rest as body.
    const [first, ...rest] = err.lastReply.trim().split('\n')
    return { title: first.trim(), body: rest.join('\n').trim() }
  }
}

/**
 * Interpret a free-form instruction (e.g. "ignore all *.tsx files", "commit the
 * unstaged .md files") against the repo's current working-tree state and return a
 * concrete, executable plan. The model resolves globs/intents to literal paths and
 * patterns using the file lists below — the renderer just applies the actions.
 */
const ASK_PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['summary', 'actions'],
  properties: {
    summary: { type: 'string' },
    note: { type: 'string' },
    actions: ASK_ACTIONS_SCHEMA
  }
}

async function planRepoActions(prompt: string, status: RepoStatus, cfg: AIConfig): Promise<AskPlan> {
  const list = (files: { path: string }[]): string => files.map((f) => f.path).join('\n') || '(none)'
  const stateBlock = `Current branch: ${status.current}
Staged files:
${list(status.staged)}
Unstaged/untracked files:
${list(status.unstaged)}
Conflicted files:
${list(status.conflicted)}`

  const system = `You translate a user's plain-language git instruction into a concrete plan of actions for the Gitcito desktop app to execute.

You are given the repository's current working-tree state. Resolve any globs or descriptions (e.g. "*.tsx", "the markdown files", "everything unstaged") to LITERAL repo-relative file paths drawn ONLY from the lists provided. Never invent paths that aren't listed (except .gitignore patterns, which are literal glob strings the user wants ignored).

Reply ONLY with valid JSON (no markdown fences) matching:
{
  "summary": "one short sentence describing the plan",
  "actions": [ ...zero or more actions... ],
  "note": "optional — set only when you cannot fulfill the request; then actions must be []"
}

Each action is one of:
- {"type":"gitignore","patterns":["*.tsx"],"description":"Ignore all .tsx files"}
- {"type":"stage","files":["a.ts"],"description":"Stage a.ts"}
- {"type":"unstage","files":["a.ts"],"description":"Unstage a.ts"}
- {"type":"commit","message":"...","files":["README.md"],"description":"Commit the .md files"}
- {"type":"stash","files":["a.ts"],"message":"optional label","description":"Stash a.ts"}
- {"type":"discard","files":["a.ts"],"description":"Discard uncommitted changes to a.ts"}
- {"type":"branch","name":"feature/x","at":"main","checkout":true,"description":"Create branch feature/x"}
- {"type":"checkout","ref":"main","description":"Switch to main"}
- {"type":"tag","name":"v1.2.0","message":"optional annotation","description":"Tag the current commit v1.2.0"}

Rules:
- For a commit, set "files" to the paths to include; they will be staged before committing. Omit "files" to commit what is already staged.
- For a stash, set "files" to the specific paths to stash; omit "files" to stash all changes. "message" is an optional label.
- "message" (commit) must be a concise, conventional commit message.
- "discard" permanently throws away uncommitted changes to the listed files — only use it when the user clearly asks to discard / revert / throw away local changes.
- For "branch", "at" is the start point (default: current branch); "checkout" switches to it after creating (default true).
- ONLY use the action types listed above. If the instruction needs anything else (push, pull, fetch, reset, rebase, revert, merge, delete a branch, force operations, etc.), return actions: [] and explain in "note" that it must be done from the dedicated UI.
- If nothing matches (e.g. the user asks to commit .md files but none exist), return actions: [] and explain in "note".
- Keep the plan minimal — only the actions needed to satisfy the instruction.`

  const known = new Set(
    [...status.staged, ...status.unstaged, ...status.conflicted].map((f) => f.path)
  )

  try {
    const parsed = await chatCompleteJson<{ summary: string; actions: AskAction[]; note?: string }>(
      cfg,
      [
        { role: 'system', content: system },
        { role: 'user', content: `${stateBlock}\n\nInstruction: ${clip(prompt, 4000)}` }
      ],
      'planActions',
      { name: 'ask_plan', schema: ASK_PLAN_SCHEMA, validate: (v) => validateAskPlan(v, known), strict: false },
      0.1
    )
    return { summary: parsed.summary, actions: parsed.actions, note: parsed.note }
  } catch (err) {
    // A malformed plan is reported in the panel; transport errors still throw.
    if (!(err instanceof InvalidAIResponse)) throw err
    return { summary: '', actions: [], note: err.message }
  }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:planActions', (_e, prompt: string, status: RepoStatus, cfg: AIConfig) =>
    planRepoActions(prompt, status, cfg)
  )
  ipcMain.handle('ai:commitMessage', (_e, diff: string, cfg: AIConfig, ctx: AICommitContext) =>
    generateCommitMessage(diff, cfg, ctx)
  )
  ipcMain.handle('ai:listModels', async (_e, cfg: AIConfig, force?: boolean) =>
    listAccountModels(await withStoredKey(cfg), force === true)
  )
  ipcMain.handle('ai:detectCli', () => detectCliBinaries())
  ipcMain.handle('ai:explainCode', (_e, code: string, lang: string, cfg: AIConfig) => explainCode(code, lang, cfg))
  ipcMain.handle('ai:hoverExplain', (_e, req: HoverExplainRequest, cfg: AIConfig) => hoverExplain(req, cfg))
  ipcMain.handle('ai:resolveConflict', (_e, file: string, content: string, cfg: AIConfig) =>
    resolveConflictAI(file, content, cfg)
  )
  ipcMain.handle(
    'ai:generateConfig',
    (_e, repoName: string, artifacts: ArtifactRequest[], context: string, cfg: AIConfig) =>
      generateProjectConfig(repoName, artifacts, context, cfg)
  )
  ipcMain.handle(
    'ai:suggestArtifacts',
    (_e, repoName: string, selectedTools: string[], context: string, alreadySelected: ArtifactRequest[], cfg: AIConfig) =>
      suggestArtifacts(repoName, selectedTools, context, alreadySelected, cfg)
  )
  ipcMain.handle('ai:smartStage', (_e, files: SmartStageFile[], cfg: AIConfig) => smartStageFiles(files, cfg))
  ipcMain.handle('ai:generateAppTheme', (_e, prompt: string, cfg: AIConfig) => generateAppTheme(prompt, cfg))
  ipcMain.handle('ai:generateCodeTheme', (_e, prompt: string, cfg: AIConfig) => generateCodeTheme(prompt, cfg))
  ipcMain.handle('ai:generateGraphPalette', (_e, prompt: string, cfg: AIConfig) => generateGraphPalette(prompt, cfg))
  ipcMain.handle('ai:generateBranchName', (_e, description: string, cfg: AIConfig, ctx: { username?: string }) =>
    generateBranchName(description, cfg, ctx)
  )
  ipcMain.handle('ai:reviewPR', (_e, diff: string, cfg: AIConfig) => reviewPR(diff, cfg))
  ipcMain.handle('ai:prDescription', (_e, commits: string, diff: string, cfg: AIConfig) =>
    prDescription(commits, diff, cfg)
  )
}
