// Tiny frecency store for the command palette: how often + how recently each
// command id was run, persisted in localStorage. Used to surface recents and
// to nudge fuzzy ranking toward what you actually use.

const KEY = 'gitcito-cmd-frecency'

export interface FrecencyEntry {
  n: number // run count
  t: number // last-used epoch ms
}

export function getFrecency(): Record<string, FrecencyEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, FrecencyEntry>
  } catch {
    return {}
  }
}

export function bumpFrecency(id: string, now: number = Date.now()): void {
  const all = getFrecency()
  const cur = all[id] ?? { n: 0, t: 0 }
  all[id] = { n: cur.n + 1, t: now }
  // Cap the table so it can't grow unbounded — keep the 200 most recent.
  const ids = Object.keys(all)
  if (ids.length > 200) {
    ids.sort((a, b) => all[a].t - all[b].t)
    for (const old of ids.slice(0, ids.length - 200)) delete all[old]
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}

/** A bounded ranking score from a frecency entry (recent + frequent → higher). */
export function frecencyScore(e: FrecencyEntry | undefined, now: number = Date.now()): number {
  if (!e) return 0
  const ageDays = (now - e.t) / 86_400_000
  const recency = ageDays < 1 ? 4 : ageDays < 7 ? 2 : ageDays < 30 ? 1 : 0.5
  return Math.min(e.n, 10) * recency
}
