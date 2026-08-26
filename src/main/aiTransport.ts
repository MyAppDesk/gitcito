import type { AIConfig } from '../shared/types'
import { aiProviderPreset } from '../shared/types'
import type { TokenUsage } from './analytics'
import { runCliModel } from './aiCli'

/**
 * The wire layer for every model call.
 *
 * Gitcito used to speak one protocol — OpenAI's `POST /chat/completions` — at
 * whatever endpoint the user configured. That quietly failed for Anthropic,
 * whose API is `POST /v1/messages` with the system prompt hoisted out of the
 * message list and `max_tokens` required. Providers now declare a transport in
 * their preset and this module owns the differences, so the feature code above
 * it never branches on provider.
 */

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface ModelReply {
  text: string
  usage: TokenUsage
}

export interface ModelCallOptions {
  /** Provider-specific fields such as OpenAI's response_format. */
  extra?: Record<string, unknown>
  /** Bounds generation so a malformed structured reply cannot consume an open-ended completion budget. */
  maxTokens?: number
  /** Structured tasks need the answer, not a model's visible reasoning prelude. */
  disableThinking?: boolean
}

/** Token-usage block as returned by OpenAI-compatible and native Anthropic APIs. */
export interface ApiUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  input_tokens?: number
  output_tokens?: number
}

export function parseUsage(raw: ApiUsage | undefined): TokenUsage {
  const prompt = raw?.prompt_tokens ?? raw?.input_tokens ?? 0
  const completion = raw?.completion_tokens ?? raw?.output_tokens ?? 0
  return { promptTokens: prompt, completionTokens: completion, totalTokens: raw?.total_tokens ?? prompt + completion }
}

/** The transport a config speaks, resolved from its provider when not stamped. */
export function transportOf(cfg: AIConfig): 'openai' | 'anthropic' | 'cli' {
  return cfg.transport ?? aiProviderPreset(cfg.provider ?? 'custom').transport
}

/**
 * Normalizes the configured endpoint to the provider's API root.
 *
 * Anthropic's root has no `/v1` because the paths carry it; installs that
 * predate this stored `https://api.anthropic.com/v1`, so it is trimmed rather
 * than producing `/v1/v1/messages`.
 */
export function baseUrl(cfg: AIConfig): string {
  const preset = aiProviderPreset(cfg.provider ?? 'custom')
  const raw = (cfg.endpoint || preset.endpoint || 'https://api.openai.com/v1')
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '')
  if (transportOf(cfg) === 'anthropic') return raw.replace(/\/v1$/, '')
  return raw
}

export function isLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/.test(url)
}

export function authHeaders(cfg: AIConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = (cfg.apiKey ?? '').trim()
  if (!key) return headers
  if (transportOf(cfg) === 'anthropic') {
    headers['x-api-key'] = key
    headers['anthropic-version'] = ANTHROPIC_VERSION
    return headers
  }
  headers.Authorization = `Bearer ${key}`
  return headers
}

const ANTHROPIC_VERSION = '2023-06-01'

/** Anthropic requires an explicit cap; large enough for a generated wiki page. */
const ANTHROPIC_MAX_TOKENS = 8192

export function fetchFailureReason(err: unknown): string | null {
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

/** True when the account cannot authenticate and the provider demands it. */
export function missingCredential(cfg: AIConfig): boolean {
  if (transportOf(cfg) === 'cli') return false
  if ((cfg.apiKey ?? '').trim()) return false
  return !isLocal(baseUrl(cfg))
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  return `AI request failed (${res.status}): ${body.slice(0, 200)}`
}

async function callOpenAI(
  cfg: AIConfig,
  messages: ChatMessage[],
  temperature: number,
  options?: ModelCallOptions
): Promise<ModelReply> {
  const base = baseUrl(cfg)
  const maxTokens = options?.maxTokens
  const provider = cfg.provider ?? 'custom'
  const mayDisableThinking =
    options?.disableThinking === true && (provider === 'custom' || provider === 'ollama')
  const payload: Record<string, unknown> = {
    model: cfg.model,
    temperature,
    messages,
    ...(maxTokens !== undefined ? { max_tokens: Math.max(1, Math.floor(maxTokens)) } : {}),
    ...(mayDisableThinking ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    ...options?.extra
  }

  const post = async (body: Record<string, unknown>): Promise<Response> => {
    try {
      return await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: authHeaders(cfg),
        body: JSON.stringify(body)
      })
    } catch (err) {
      const reason = fetchFailureReason(err)
      throw new Error(`Could not reach ${base}.${reason ? ` ${reason}` : ''}`)
    }
  }

  let res = await post(payload)
  if (!res.ok && mayDisableThinking && (res.status === 400 || res.status === 422)) {
    const body = await res.text().catch(() => '')
    if (/chat_template_kwargs|enable_thinking/i.test(body)) {
      // Strict OpenAI-compatible gateways may reject this self-hosted-model
      // extension. Retry once without it instead of breaking that provider.
      const { chat_template_kwargs: _ignored, ...compatible } = payload
      res = await post(compatible)
    } else {
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`)
    }
  }
  if (!res.ok) throw new Error(await readError(res))
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: ApiUsage }
  return { text: json.choices?.[0]?.message?.content ?? '', usage: parseUsage(json.usage) }
}

/**
 * Native Anthropic Messages API.
 *
 * System turns are concatenated into the top-level `system` field — Anthropic
 * rejects a `system` role inside `messages` — and `response_format` is dropped,
 * since structured output is negotiated differently there. Callers that need
 * JSON already fall back to prompt-only JSON with a validation retry, which is
 * the same path every non-OpenAI provider takes.
 */
async function callAnthropic(
  cfg: AIConfig,
  messages: ChatMessage[],
  temperature: number,
  options?: ModelCallOptions
): Promise<ModelReply> {
  const base = baseUrl(cfg)
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
  const turns = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
  // The API rejects an empty message list, and a system-only prompt is a real
  // shape for a few callers.
  if (turns.length === 0) turns.push({ role: 'user', content: 'Proceed.' })

  let res: Response
  try {
    res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: options?.maxTokens ?? ANTHROPIC_MAX_TOKENS,
        temperature,
        ...(system ? { system } : {}),
        messages: turns
      })
    })
  } catch (err) {
    const reason = fetchFailureReason(err)
    throw new Error(`Could not reach ${base}.${reason ? ` ${reason}` : ''}`)
  }
  if (!res.ok) throw new Error(await readError(res))
  const json = (await res.json()) as {
    content?: { type?: string; text?: string }[]
    usage?: ApiUsage
  }
  const text = (json.content ?? [])
    .filter((block) => block.type === 'text' || typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('')
  return { text, usage: parseUsage(json.usage) }
}

/** One model call, whatever the provider speaks. */
export async function callModel(
  cfg: AIConfig,
  messages: ChatMessage[],
  temperature: number,
  options?: ModelCallOptions
): Promise<ModelReply> {
  switch (transportOf(cfg)) {
    case 'anthropic':
      return callAnthropic(cfg, messages, temperature, options)
    case 'cli':
      return runCliModel(cfg, messages)
    default:
      return callOpenAI(cfg, messages, temperature, options)
  }
}
