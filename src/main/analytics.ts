import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import {
  emptyAnalytics,
  emptyAIUsageStat,
  type ActivityEvent,
  type Analytics,
  type AIUsageStat,
  type DayBucket
} from '../shared/types'

/** Token counts pulled from a single OpenAI-compatible API response. */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const filePath = (): string => join(app.getPath('userData'), 'gitcito-analytics.json')

let cache: Analytics | null = null

async function load(): Promise<Analytics> {
  if (cache) return cache
  try {
    const raw = await readFile(filePath(), 'utf-8')
    cache = { ...emptyAnalytics(), ...(JSON.parse(raw) as Analytics) }
  } catch {
    cache = emptyAnalytics()
  }
  prune(cache)
  return cache
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!cache) return
    const snapshot = cache
    void mkdir(app.getPath('userData'), { recursive: true })
      .then(() => writeFile(filePath(), JSON.stringify(snapshot, null, 2), 'utf-8'))
      .catch(() => {})
  }, 400)
}

/** Local-time 'YYYY-MM-DD' for a given epoch-ms (defaults to now). */
function dayKey(ms = Date.now()): string {
  const d = new Date(ms)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Drop buckets older than the retention window (0 = keep forever). */
function prune(a: Analytics): void {
  if (!a.retentionDays || a.retentionDays <= 0) return
  const cutoff = dayKey(Date.now() - a.retentionDays * 86_400_000)
  a.days = a.days.filter((b) => b.date >= cutoff)
}

function todayBucket(a: Analytics): DayBucket {
  const key = dayKey()
  let bucket = a.days.find((b) => b.date === key)
  if (!bucket) {
    bucket = { date: key, events: {}, ai: emptyAIUsageStat() }
    a.days.push(bucket)
    a.days.sort((x, y) => x.date.localeCompare(y.date))
  }
  return bucket
}

// Rough public list prices, USD per 1M tokens [input, output]. Matched by
// substring on the model id (first hit wins, so order specific → generic).
// Unknown models cost 0 — tokens are still tracked, only the $ estimate is omitted.
const PRICING: [string, number, number][] = [
  ['gpt-4o-mini', 0.15, 0.6],
  ['gpt-4o', 2.5, 10],
  ['gpt-4.1-mini', 0.4, 1.6],
  ['gpt-4.1', 2, 8],
  ['claude-3-5-haiku', 0.8, 4],
  ['claude-3-5-sonnet', 3, 15],
  ['claude-3-7-sonnet', 3, 15],
  ['llama-3.3-70b', 0.59, 0.79],
  ['llama-3.1-8b', 0.05, 0.08],
  ['mixtral-8x7b', 0.24, 0.24],
  ['mistral-small', 0.2, 0.6],
  ['mistral-medium', 0.4, 2],
  ['mistral-large', 2, 6],
  ['codestral', 0.3, 0.9]
]

function estimateCost(model: string, prompt: number, completion: number): number {
  const m = model.toLowerCase()
  const hit = PRICING.find(([key]) => m.includes(key))
  if (!hit) return 0
  return (prompt * hit[1] + completion * hit[2]) / 1_000_000
}

function addUsage(stat: AIUsageStat, u: TokenUsage, cost: number): void {
  stat.requests += 1
  stat.promptTokens += u.promptTokens
  stat.completionTokens += u.completionTokens
  stat.totalTokens += u.totalTokens
  stat.cost += cost
}

/** Record one user-driven activity event into today's bucket. */
export async function recordEvent(type: ActivityEvent): Promise<void> {
  const a = await load()
  if (!a.since) a.since = Date.now()
  const bucket = todayBucket(a)
  bucket.events[type] = (bucket.events[type] ?? 0) + 1
  scheduleSave()
}

/** Fold one API response's token usage into the ledger (lifetime totals + today's bucket). */
export async function recordAIUsage(feature: string, model: string, u: TokenUsage): Promise<void> {
  if (u.promptTokens <= 0 && u.completionTokens <= 0 && u.totalTokens <= 0) return
  const a = await load()
  if (!a.since) a.since = Date.now()
  const cost = estimateCost(model, u.promptTokens, u.completionTokens)
  addUsage(a.aiTotal, u, cost)
  addUsage((a.aiByFeature[feature] ??= emptyAIUsageStat()), u, cost)
  addUsage((a.aiByModel[model] ??= emptyAIUsageStat()), u, cost)
  addUsage(todayBucket(a).ai, u, cost)
  scheduleSave()
}

export function registerAnalyticsHandlers(): void {
  ipcMain.handle('analytics:get', () => load())
  ipcMain.handle('analytics:clear', () => {
    const retentionDays = cache?.retentionDays ?? 0
    cache = { ...emptyAnalytics(), retentionDays }
    scheduleSave()
    return cache
  })
  ipcMain.handle('analytics:setRetention', async (_e, days: number) => {
    const a = await load()
    a.retentionDays = Math.max(0, Math.floor(days) || 0)
    prune(a)
    scheduleSave()
    return a
  })
}
