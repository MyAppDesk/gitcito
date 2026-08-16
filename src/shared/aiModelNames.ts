/**
 * Turning a provider's raw model list into one worth showing.
 *
 * No provider publishes a curated or ranked list — `/v1/models` is a flat
 * inventory. OpenAI's is around ninety entries, most of them dated snapshots of
 * a handful of actual models, and sorting it by name buries `gpt-4o` under
 * `babbage-002`. So the shaping happens here:
 *
 * 1. Models that cannot answer a chat request are dropped.
 * 2. Dated snapshots collapse into the model they are a snapshot of.
 * 3. What remains is ordered newest first, which is far closer to "the ones you
 *    want" than alphabetical.
 *
 * Every step is a heuristic over names, and each is reversible from the UI:
 * the full list is one click away, and any model can be typed by hand.
 */

/** One model as the provider described it. */
export interface ModelEntry {
  id: string
  /** Epoch ms, when the provider dates its models. */
  created?: number
}

const NON_CHAT =
  /(embed|whisper|tts|audio|speech|dall-?e|image|moderation|rerank|guard|transcribe|realtime|sora|codestral-embed)/i

/**
 * Completion-era models a chat request cannot use at all. Matched separately
 * because these are whole names rather than a substring anyone would search
 * for — `babbage-002` and `gpt-3.5-turbo-instruct` still show up in OpenAI's
 * `/models`, and they 400 the moment they are handed a message list.
 */
const COMPLETION_ONLY = /(^|[/-])(babbage|davinci|ada|curie)([-.]|$)|-instruct($|[-.])/i

export function chatModelsOnly(ids: string[]): string[] {
  const filtered = ids.filter((id) => !NON_CHAT.test(id) && !COMPLETION_ONLY.test(id))
  return filtered.length > 0 ? filtered : ids
}

/**
 * A trailing release stamp: `-2024-05-13`, `-20251001`, `-0125`.
 *
 * Deliberately anchored and exact-width, so `mixtral-8x7b-32768` (a context
 * size) and `gpt-3.5-turbo-16k` are left alone.
 */
const SNAPSHOT = /-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4})$/

/** The model a dated id is a snapshot of, or the id itself. */
export function baseModelName(id: string): string {
  return id.replace(SNAPSHOT, '')
}

export function isSnapshot(id: string): boolean {
  return SNAPSHOT.test(id)
}

/**
 * Drops dated snapshots that add nothing.
 *
 * A snapshot whose base model is also listed is redundant — `gpt-4o` covers
 * `gpt-4o-2024-08-06`. Where only snapshots exist (Anthropic dates every id),
 * the newest of each family is kept, so the model does not vanish.
 */
export function collapseSnapshots(entries: ModelEntry[]): ModelEntry[] {
  const listed = new Set(entries.map((e) => e.id))
  const bestPerBase = new Map<string, ModelEntry>()

  for (const entry of entries) {
    if (!isSnapshot(entry.id)) continue
    const base = baseModelName(entry.id)
    if (listed.has(base)) continue // the undated id already covers it
    const current = bestPerBase.get(base)
    if (!current || newerThan(entry, current)) bestPerBase.set(base, entry)
  }

  const keep = new Set([...bestPerBase.values()].map((e) => e.id))
  return entries.filter((e) => !isSnapshot(e.id) || keep.has(e.id))
}

/** Later `created` wins; with no dates, the higher-sorting id does. */
function newerThan(a: ModelEntry, b: ModelEntry): boolean {
  if (a.created !== undefined && b.created !== undefined) return a.created > b.created
  if (a.created !== undefined) return true
  if (b.created !== undefined) return false
  return a.id.localeCompare(b.id) > 0
}

/**
 * Newest first, with undated models after the dated ones in name order.
 *
 * Providers that date their models (OpenAI, OpenRouter, Anthropic) get a list
 * whose top is the current generation. Ones that do not (Ollama tags, most
 * custom gateways) fall back to alphabetical, which is what they had before.
 */
export function orderModels(entries: ModelEntry[]): ModelEntry[] {
  return [...entries].sort((a, b) => {
    if (a.created !== undefined && b.created !== undefined && a.created !== b.created) {
      return b.created - a.created
    }
    if (a.created !== undefined && b.created === undefined) return -1
    if (a.created === undefined && b.created !== undefined) return 1
    return a.id.localeCompare(b.id)
  })
}

/** Trims, unqualifies and de-duplicates ids, keeping the first date seen. */
export function normalizeEntries(entries: ModelEntry[]): ModelEntry[] {
  const seen = new Map<string, ModelEntry>()
  for (const entry of entries) {
    // Gemini returns fully-qualified names like `models/gemini-2.5-flash`.
    const id = (entry.id ?? '').trim().replace(/^models\//, '')
    if (!id || seen.has(id)) continue
    seen.set(id, { id, created: entry.created })
  }
  return [...seen.values()]
}

/**
 * The two lists a picker needs: the shaped one it shows, and everything the
 * provider returned for when the shaping hid something wanted.
 */
export function buildModelLists(raw: ModelEntry[]): { models: string[]; allModels: string[] } {
  const entries = normalizeEntries(raw)
  const chat = new Set(chatModelsOnly(entries.map((e) => e.id)))
  const usable = entries.filter((e) => chat.has(e.id))
  return {
    models: orderModels(collapseSnapshots(usable)).map((e) => e.id),
    // "All" still means every id the provider listed, snapshots included.
    allModels: orderModels(entries).map((e) => e.id)
  }
}

/** Legacy shape: ids only, no dates. Used for cached lists written earlier. */
export function normalizeModelIds(ids: (string | undefined)[]): string[] {
  const entries = normalizeEntries(ids.map((id) => ({ id: id ?? '' })))
  const chat = new Set(chatModelsOnly(entries.map((e) => e.id)))
  return orderModels(collapseSnapshots(entries.filter((e) => chat.has(e.id)))).map((e) => e.id)
}
