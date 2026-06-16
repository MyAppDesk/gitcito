import { ipcMain } from 'electron'
import type { AIConfig, ConflictStyle, ExplainStyle } from '../shared/types'

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

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
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
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
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
  ])).trim()
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
    0.1
  )
  // Strip a stray ```lang fence if the model added one despite instructions.
  return out.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').replace(/\s+$/, '')
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:commitMessage', (_e, diff: string, cfg: AIConfig, ctx: AICommitContext) =>
    generateCommitMessage(diff, cfg, ctx)
  )
  ipcMain.handle('ai:listModels', (_e, cfg: AIConfig) => listModels(cfg))
  ipcMain.handle('ai:explainCode', (_e, code: string, lang: string, cfg: AIConfig) => explainCode(code, lang, cfg))
  ipcMain.handle('ai:resolveConflict', (_e, file: string, content: string, cfg: AIConfig) =>
    resolveConflictAI(file, content, cfg)
  )
}
