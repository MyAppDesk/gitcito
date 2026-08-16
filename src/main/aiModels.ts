import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { aiProviderPreset, type AIConfig, type ModelCatalog } from '../shared/types'
import { authHeaders, baseUrl, fetchFailureReason, isLocal, transportOf } from './aiTransport'
import { cliModels } from './aiCli'
import { buildModelLists, chatModelsOnly, normalizeModelIds } from '../shared/aiModelNames'

/**
 * The live model catalogue.
 *
 * The pickers used to show a list hardcoded at release time, which went stale
 * the moment a provider shipped anything — and was simply wrong for a custom
 * endpoint or a local Ollama, where the app cannot know what is installed. The
 * list is now fetched from the provider, cached on disk for a day, and falls
 * back to the bundled one only when the fetch cannot happen (no key yet, no
 * network, provider down).
 *
 * Every picker also accepts free text, so an unlisted model is never a wall.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const cachePath = (): string => join(app.getPath('userData'), 'gitcito-models.json')

interface CacheEntry {
  models: string[]
  /** Everything the provider listed. Absent in caches written before "show all". */
  allModels?: string[]
  fetchedAt: number
}

type Cache = Record<string, CacheEntry>

let cache: Cache | null = null

async function readCache(): Promise<Cache> {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(cachePath(), 'utf-8')) as Cache
  } catch {
    cache = {} // missing or corrupt: a cold catalogue, not an error
  }
  return cache
}

async function writeCache(next: Cache): Promise<void> {
  cache = next
  try {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(cachePath(), JSON.stringify(next), 'utf-8')
  } catch {
    // A catalogue that cannot be cached still works; it just refetches.
  }
}

/**
 * Identifies one list. The endpoint is part of it because two accounts on the
 * same provider can point at different gateways, and a local Ollama's list is
 * whatever that machine has pulled.
 */
function cacheKey(cfg: AIConfig): string {
  if (transportOf(cfg) === 'cli') return `cli:${cfg.cli ?? 'claude'}`
  return `${cfg.provider ?? 'custom'}:${baseUrl(cfg)}`
}

interface RawModel {
  id?: string
  name?: string
  /** OpenAI-compatible and OpenRouter: epoch seconds. */
  created?: number
  /** Anthropic: ISO 8601. */
  created_at?: string
  /** Gemini, native listing. */
  supportedGenerationMethods?: string[]
}

interface ModelListBody {
  data?: RawModel[]
  models?: RawModel[]
}

/** Epoch ms from whichever field the provider dates its models with. */
function createdAt(model: RawModel): number | undefined {
  if (typeof model.created === 'number' && model.created > 0) {
    // Seconds everywhere it appears; milliseconds would be off by a factor of
    // a thousand and sort every model to the top.
    return model.created < 1e12 ? model.created * 1000 : model.created
  }
  if (model.created_at) {
    const ms = Date.parse(model.created_at)
    if (!Number.isNaN(ms)) return ms
  }
  return undefined
}

/**
 * Where to ask, and with what.
 *
 * Gemini is the one case worth a detour: chat goes through Google's
 * OpenAI-compatible surface, but that surface returns bare ids, while the
 * native listing endpoint says which models actually support `generateContent`.
 * Listing natively and chatting compatibly gets both.
 */
function listRequest(cfg: AIConfig): { url: string; headers: Record<string, string> } {
  const base = baseUrl(cfg)
  const headers = authHeaders(cfg)
  if (transportOf(cfg) === 'anthropic') return { url: `${base}/v1/models?limit=1000`, headers }
  if (cfg.provider === 'google') {
    const native = base.replace(/\/openai$/, '')
    const key = (cfg.apiKey ?? '').trim()
    // The native API takes the key in its own header, not as a bearer token.
    const { Authorization: _drop, ...rest } = headers
    return { url: `${native}/models?pageSize=200`, headers: key ? { ...rest, 'x-goog-api-key': key } : rest }
  }
  return { url: `${base}/models`, headers }
}

/** Fetches the provider's list. Throws with a reason the user can act on. */
async function fetchModels(cfg: AIConfig): Promise<{ models: string[]; allModels: string[] }> {
  if (transportOf(cfg) === 'cli') {
    const models = cliModels(cfg.cli ?? 'claude')
    return { models, allModels: models }
  }

  const { url, headers } = listRequest(cfg)
  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch (err) {
    const reason = fetchFailureReason(err)
    const hint = isLocal(url) ? ' Is the local provider running?' : ' Check your network, endpoint, or proxy/VPN.'
    throw new Error(`Could not reach ${url}.${reason ? ` ${reason}` : ''}${hint}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Could not list models (${res.status}): ${body.slice(0, 160)}`)
  }
  const json = (await res.json()) as ModelListBody
  const raw = (json.data ?? json.models ?? []).filter((m) =>
    // Only Gemini's native listing says this; everything else is unfiltered.
    m.supportedGenerationMethods ? m.supportedGenerationMethods.includes('generateContent') : true
  )
  return buildModelLists(raw.map((m) => ({ id: m.id ?? m.name ?? '', created: createdAt(m) })))
}

/**
 * The models an account can use.
 *
 * Never throws: a provider that cannot be reached yields the bundled list with
 * `error` set, so a picker always has something in it and the UI can still say
 * why the list is not live.
 */
export async function listAccountModels(cfg: AIConfig, force = false): Promise<ModelCatalog> {
  const preset = aiProviderPreset(cfg.provider ?? 'custom')
  const key = cacheKey(cfg)
  const store = await readCache()
  const entry = store[key]
  const fresh = entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS

  if (!force && fresh && entry.models.length > 0) return fromCache(entry)

  try {
    const { models, allModels } = await fetchModels(cfg)
    if (models.length === 0) throw new Error('The provider returned an empty model list.')
    const fetchedAt = Date.now()
    await writeCache({ ...store, [key]: { models, allModels, fetchedAt } })
    return { models, allModels, source: 'live', fetchedAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // A stale cache beats the bundled list: it at least came from this account.
    if (entry && entry.models.length > 0) return { ...fromCache(entry), error: message }
    return { models: preset.models, allModels: preset.models, source: 'fallback', fetchedAt: null, error: message }
  }
}

/**
 * Re-shapes a cached list on the way out rather than trusting it as written.
 *
 * A cache from an earlier build holds ids that the current filters exclude, and
 * holds no `allModels` at all; re-running the shaping here means an upgrade
 * takes effect immediately instead of a day later, when the entry expires.
 */
function fromCache(entry: CacheEntry): ModelCatalog {
  const all = entry.allModels ?? entry.models
  return {
    models: entry.allModels ? chatModelsOnly(entry.models) : normalizeModelIds(entry.models),
    allModels: all,
    source: 'cache',
    fetchedAt: entry.fetchedAt
  }
}
