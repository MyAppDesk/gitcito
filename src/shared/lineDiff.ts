/**
 * A unified diff of two texts, for hosts that list a PR's changed files but
 * send no patch (Azure DevOps). Returns only the `@@` hunks — the shape GitHub's
 * `patch` field has, which the app's DiffViewer reads — or null when the change
 * is too large to compute here (the page then links to the host).
 *
 * The common head and tail are trimmed first; only the changed middle goes
 * through a longest-common-subsequence table, capped so a huge rewrite cannot
 * stall the main process.
 */

/** Cells the LCS table may use: a 2000×2000-line middle, about 16 MB. */
const MAX_CELLS = 4_000_000

type Op = { kind: ' ' | '-' | '+'; text: string; oldNo: number; newNo: number }

function splitLines(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  // A trailing newline ends the last line; it does not start an empty one.
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function unifiedDiff(oldText: string, newText: string, context = 3): string | null {
  const a = splitLines(oldText)
  const b = splitLines(newText)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const n = endA - start
  const m = endB - start
  if (n === 0 && m === 0) return ''
  if ((n + 1) * (m + 1) > MAX_CELLS) return null

  // LCS lengths over the middle, then walk it back into delete/insert/keep ops.
  const width = m + 1
  const lcs = new Uint32Array((n + 1) * (m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[start + i] === b[start + j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }
  const ops: Op[] = []
  for (let k = 0; k < start; k++) ops.push({ kind: ' ', text: a[k], oldNo: k + 1, newNo: k + 1 })
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      ops.push({ kind: ' ', text: a[start + i], oldNo: start + i + 1, newNo: start + j + 1 })
      i++
      j++
    } else if (i < n && (j === m || lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      // Removals before additions, as git writes them — the DiffViewer pairs a
      // run of `-` with the `+` after it for word-level changes.
      ops.push({ kind: '-', text: a[start + i], oldNo: start + i + 1, newNo: start + j })
      i++
    } else {
      ops.push({ kind: '+', text: b[start + j], oldNo: start + i, newNo: start + j + 1 })
      j++
    }
  }
  for (let k = 0; k < a.length - endA; k++) {
    ops.push({ kind: ' ', text: a[endA + k], oldNo: endA + k + 1, newNo: endB + k + 1 })
  }

  // Group changes with `context` lines around them into hunks.
  const changed = ops.map((o, idx) => (o.kind === ' ' ? -1 : idx)).filter((idx) => idx >= 0)
  const hunks: Array<[number, number]> = []
  for (const idx of changed) {
    const from = Math.max(0, idx - context)
    const to = Math.min(ops.length - 1, idx + context)
    const last = hunks[hunks.length - 1]
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to)
    else hunks.push([from, to])
  }
  const out: string[] = []
  for (const [from, to] of hunks) {
    const slice = ops.slice(from, to + 1)
    const oldCount = slice.filter((o) => o.kind !== '+').length
    const newCount = slice.filter((o) => o.kind !== '-').length
    // A side's start is the line number of its first line in the hunk; an
    // empty side (pure addition or deletion) gives the line just before.
    const firstOld = slice.find((o) => o.kind !== '+')
    const firstNew = slice.find((o) => o.kind !== '-')
    const oldStart = firstOld ? firstOld.oldNo : slice[0].oldNo
    const newStart = firstNew ? firstNew.newNo : slice[0].newNo
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    for (const o of slice) out.push(`${o.kind}${o.text}`)
  }
  return out.join('\n')
}
