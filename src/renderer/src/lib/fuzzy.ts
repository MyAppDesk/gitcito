/** Lightweight fuzzy scorer: subsequence match, contiguous + word-boundary
 *  bonuses, earlier matches rank higher. Returns null when not all query
 *  characters are found (in order). */
export function fuzzyScore(query: string, text: string): number | null {
  return fuzzyMatch(query, text)?.score ?? null
}

/** The score plus the matched character positions, for highlighting. */
export function fuzzyMatch(query: string, text: string): { score: number; hits: number[] } | null {
  if (!query) return { score: 0, hits: [] }
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const hits: number[] = []
  let score = 0
  let ti = 0
  let prevMatch = -2
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]
    const found = t.indexOf(ch, ti)
    if (found === -1) return null
    score += 1
    if (found === prevMatch + 1) score += 4 // contiguous run
    if (found === 0 || /[\s/_\-.]/.test(t[found - 1])) score += 3 // word boundary
    score -= Math.min(found - ti, 3) * 0.3 // penalise gaps
    hits.push(found)
    prevMatch = found
    ti = found + 1
  }
  return { score, hits }
}
