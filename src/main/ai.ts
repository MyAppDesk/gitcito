import { ipcMain } from 'electron'
import type { AIConfig, AppThemeColors, AskPlan, BranchNamingStyle, CodeThemeColors, ConflictStyle, ExplainStyle, RepoStatus } from '../shared/types'
import { recordAIUsage, type TokenUsage } from './analytics'

/** Token-usage block as returned by OpenAI-compatible (and native Anthropic) APIs. */
interface ApiUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  input_tokens?: number
  output_tokens?: number
}

function parseUsage(raw: ApiUsage | undefined): TokenUsage {
  const prompt = raw?.prompt_tokens ?? raw?.input_tokens ?? 0
  const completion = raw?.completion_tokens ?? raw?.output_tokens ?? 0
  return { promptTokens: prompt, completionTokens: completion, totalTokens: raw?.total_tokens ?? prompt + completion }
}

export interface AICommitMessage {
  summary: string
  description: string
}

export interface AICommitContext {
  branch: string
}

const TICKET_RE = /([A-Z][A-Z0-9]+-\d+)/

/** Normalizes the configured endpoint to an OpenAI-compatible base URL. */
function baseUrl(endpoint: string): string {
  return (endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
}

function isLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/.test(url)
}

function authHeaders(cfg: AIConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`
    // Anthropic's API uses these instead of a Bearer token; harmless elsewhere.
    headers['x-api-key'] = cfg.apiKey
    headers['anthropic-version'] = '2023-06-01'
  }
  return headers
}

function fetchFailureReason(err: unknown): string | null {
  const cause = err instanceof Error && 'cause' in err ? (err.cause as { code?: string; message?: string } | undefined) : null
  if (cause?.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    return 'A proxy or network certificate is self-signed, so Electron rejected the TLS connection.'
  }
  if (cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return 'Electron could not verify the provider certificate chain.'
  }
  if (cause?.code === 'ECONNREFUSED') return 'The endpoint refused the connection.'
  if (cause?.code === 'ENOTFOUND') return 'The endpoint host could not be resolved.'
  return cause?.message ?? (err instanceof Error ? err.message : null)
}

async function listModels(cfg: AIConfig): Promise<string[]> {
  const base = baseUrl(cfg.endpoint)
  let res: Response
  try {
    res = await fetch(`${base}/models`, { headers: authHeaders(cfg) })
  } catch (err) {
    const reason = fetchFailureReason(err)
    const localHint = isLocal(base) ? ' Is the local provider running?' : ' Check your network, endpoint, or proxy/VPN.'
    throw new Error(`Could not reach ${base}/models.${reason ? ` ${reason}` : ''}${localHint}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Could not list models (${res.status}): ${body.slice(0, 160)}`)
  }
  const json = (await res.json()) as {
    data?: { id?: string; name?: string }[]
    models?: { id?: string; name?: string }[]
  }
  const items = json.data ?? json.models ?? []
  return items
    .map((m) => m.id ?? m.name ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
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
  const base = baseUrl(cfg.endpoint)
  if (!cfg.apiKey && !isLocal(base)) throw new Error('No AI API key configured. Add one in Settings → AI.')
  const truncated = diff.length > 16000 ? diff.slice(0, 16000) + '\n…(truncated)' : diff

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt(cfg, ctx) },
        { role: 'user', content: `Branch: ${ctx.branch}\n\nStaged diff:\n\n${truncated}` }
      ]
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: ApiUsage }
  void recordAIUsage('commitMessage', cfg.model || 'gpt-4o-mini', parseUsage(json.usage))
  const content = json.choices?.[0]?.message?.content ?? ''
  // Honour the toggle even if the model ignores the instruction and returns a body anyway.
  const omitDesc = cfg.generateDescription === false
  try {
    const cleaned = content.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<AICommitMessage>
    return { summary: parsed.summary ?? '', description: omitDesc ? '' : (parsed.description ?? '') }
  } catch {
    const [first, ...rest] = content.split('\n')
    return { summary: first.trim(), description: omitDesc ? '' : rest.join('\n').trim() }
  }
}

/** Single OpenAI-compatible chat completion returning the raw message text. */
async function chatComplete(
  cfg: AIConfig,
  messages: { role: 'system' | 'user'; content: string }[],
  feature: string,
  temperature = 0.2
): Promise<string> {
  const base = baseUrl(cfg.endpoint)
  if (!cfg.apiKey && !isLocal(base)) throw new Error('No AI API key configured. Add one in Settings → AI.')

  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify({ model: cfg.model || 'gpt-4o-mini', temperature, messages })
    })
  } catch (err) {
    const reason = fetchFailureReason(err)
    throw new Error(`Could not reach ${base}.${reason ? ` ${reason}` : ''}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: ApiUsage }
  void recordAIUsage(feature, cfg.model || 'gpt-4o-mini', parseUsage(json.usage))
  return json.choices?.[0]?.message?.content ?? ''
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
  const out = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: clip(content, 24000) }
    ],
    'resolveConflict',
    0.1
  )
  // Strip a stray ```lang fence if the model added one despite instructions.
  return out.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').replace(/\s+$/, '')
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

  const response = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    'generateConfig',
    0.3
  )

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { files?: GeneratedFile[] }
    return { files: Array.isArray(parsed.files) ? parsed.files : [] }
  } catch {
    throw new Error('AI returned invalid JSON. Try again or reduce the number of selected artifacts.')
  }
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
  const response = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: `Changed files:\n${fileList}` }
  ], 'smartStage')

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { toStage?: unknown; reason?: unknown }
    const toStage = Array.isArray(parsed.toStage) ? (parsed.toStage as unknown[]).filter((p) => typeof p === 'string') as string[] : []
    // Validate returned paths actually exist in the input
    const validPaths = new Set(files.map((f) => f.path))
    return {
      toStage: toStage.filter((p) => validPaths.has(p)),
      reason: typeof parsed.reason === 'string' ? parsed.reason : ''
    }
  } catch {
    return { toStage: files.map((f) => f.path), reason: 'Could not parse AI response — staged all files.' }
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

  const response = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    'suggestArtifacts',
    0.4
  )

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { suggestions?: ArtifactSuggestion[] }
    return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] }
  } catch {
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

  const response = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: `Theme description: ${prompt}` }
  ], 'generateAppTheme', 0.7)

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { name?: string; light?: AppThemeColors; dark?: AppThemeColors }
    if (!parsed.name || !parsed.light || !parsed.dark) throw new Error('incomplete response')
    return { name: parsed.name, light: parsed.light, dark: parsed.dark }
  } catch {
    throw new Error('AI returned an invalid theme. Try again with a different description.')
  }
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

  const response = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: `Theme description: ${prompt}` }
  ], 'generateCodeTheme', 0.7)

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { name?: string; light?: CodeThemeColors; dark?: CodeThemeColors }
    if (!parsed.name || !parsed.light || !parsed.dark) throw new Error('incomplete response')
    return { name: parsed.name, light: parsed.light, dark: parsed.dark }
  } catch {
    throw new Error('AI returned an invalid theme. Try again with a different description.')
  }
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

  const response = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: `Palette description: ${prompt}` }
  ], 'generateGraphPalette', 0.7)

  try {
    const cleaned = response.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { name?: string; colors?: string[] }
    const colors = (parsed.colors ?? []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
    if (!parsed.name || colors.length < 4) throw new Error('incomplete response')
    return { name: parsed.name, colors }
  } catch {
    throw new Error('AI returned an invalid palette. Try again with a different description.')
  }
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
- Reply with ONLY the branch name. No quotes, no explanation, no newlines.`
  const result = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: description }
  ], 'generateBranchName', 0.3)
  return result.trim().replace(/^['"`]|['"`]$/g, '').split('\n')[0].trim()
}

export interface PRReviewResult {
  summary: string
  risks: string
  suggestions: string
}

async function reviewPR(diff: string, cfg: AIConfig): Promise<PRReviewResult> {
  const system = `You are an expert software engineer performing a pull request review.
Analyze the provided git diff and return a structured JSON object with these exact keys:
- "summary": 2-4 sentences describing what this PR does and its overall quality.
- "risks": bullet points of potential bugs, security issues, performance concerns, or breaking changes. Use "-" for each bullet. Empty string if none.
- "suggestions": bullet points of concrete improvement suggestions. Use "-" for each bullet. Empty string if none.
Reply ONLY with valid JSON: {"summary": "...", "risks": "...", "suggestions": "..."}. No markdown fences.`
  const out = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: clip(diff, 24000) }
  ], 'reviewPR', 0.2)
  try {
    const cleaned = out.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<PRReviewResult>
    return { summary: parsed.summary ?? '', risks: parsed.risks ?? '', suggestions: parsed.suggestions ?? '' }
  } catch {
    return { summary: out.trim(), risks: '', suggestions: '' }
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
  const out = await chatComplete(
    cfg,
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    'prDescription',
    0.3
  )
  try {
    const cleaned = out.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<PRDescriptionResult>
    return { title: (parsed.title ?? '').trim(), body: (parsed.body ?? '').trim() }
  } catch {
    // Fall back to the first line as title, rest as body.
    const [first, ...rest] = out.trim().split('\n')
    return { title: first.trim(), body: rest.join('\n').trim() }
  }
}

/**
 * Interpret a free-form instruction (e.g. "ignore all *.tsx files", "commit the
 * unstaged .md files") against the repo's current working-tree state and return a
 * concrete, executable plan. The model resolves globs/intents to literal paths and
 * patterns using the file lists below — the renderer just applies the actions.
 */
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

  const out = await chatComplete(cfg, [
    { role: 'system', content: system },
    { role: 'user', content: `${stateBlock}\n\nInstruction: ${clip(prompt, 4000)}` }
  ], 'planActions', 0.1)

  try {
    const cleaned = out.replace(/^```(json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<AskPlan>
    return {
      summary: parsed.summary ?? '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      note: parsed.note
    }
  } catch {
    return { summary: '', actions: [], note: out.trim() || 'The AI returned an unreadable response.' }
  }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:planActions', (_e, prompt: string, status: RepoStatus, cfg: AIConfig) =>
    planRepoActions(prompt, status, cfg)
  )
  ipcMain.handle('ai:commitMessage', (_e, diff: string, cfg: AIConfig, ctx: AICommitContext) =>
    generateCommitMessage(diff, cfg, ctx)
  )
  ipcMain.handle('ai:listModels', (_e, cfg: AIConfig) => listModels(cfg))
  ipcMain.handle('ai:explainCode', (_e, code: string, lang: string, cfg: AIConfig) => explainCode(code, lang, cfg))
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
