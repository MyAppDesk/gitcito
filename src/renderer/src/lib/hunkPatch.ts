import type { DiffLine } from './diff'

/**
 * Patches for the hunk actions — stage, unstage, discard, revert, apply. Each
 * takes the diff the user is looking at and hands `git apply` either one hunk
 * or a line selection, forwards or reversed (see `applyHunkPatch` in the main
 * process for which action is which). Pure so the line-selection rules can be
 * tested without git.
 */

export interface SplitDiff {
  /** Everything before the first `@@` — `diff --git`, `---`, `+++`, mode lines. */
  header: string
  /** Each hunk, from its `@@` line to the line before the next one. */
  hunks: string[]
}

export function extractHunks(diff: string): SplitDiff {
  const headerLines: string[] = []
  const hunks: string[] = []
  let current: string[] | null = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current.join('\n'))
      current = [line]
    } else if (current !== null) {
      current.push(line)
    } else {
      headerLines.push(line)
    }
  }
  if (current) hunks.push(current.join('\n'))
  return { header: headerLines.join('\n'), hunks }
}

/** A patch holding just hunk `idx`. */
export function singleHunkPatch(split: SplitDiff, idx: number): string {
  return `${split.header}\n${split.hunks[idx] ?? ''}\n`
}

/**
 * A patch holding only the selected +/- lines (indices into `lines`), with each
 * affected hunk's `@@` counts recomputed.
 *
 * What happens to an *unselected* change depends on which way the patch will be
 * applied, because it must describe the file as it is on the side git matches
 * against:
 *
 *   forwards (stage, apply) — git matches the old side. An unselected deletion
 *     is still there, so it becomes context; an unselected addition is not
 *     there yet, so it is dropped. This is the shape `git add -p` produces.
 *   reversed (unstage, discard, revert) — git matches the new side. Mirrored:
 *     an unselected addition is there, so it becomes context; an unselected
 *     deletion is already gone, so it is dropped.
 */
export function buildLinePatch(
  lines: DiffLine[],
  header: string,
  selected: Set<number>,
  direction: 'forward' | 'reverse' = 'forward'
): string {
  const starts = new Map<number, { o: number; n: number }>()
  for (const l of lines) {
    if (l.kind === 'hunk') {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l.text)
      if (m) starts.set(l.hunkIdx, { o: +m[1], n: +m[2] })
    }
  }
  // A diff ends with a newline, so parsing it leaves one empty context line after
  // the last real one. Kept, it would claim a line past the end of the file and
  // git would refuse the whole patch whenever a hunk reaches the end of a file.
  const last = lines[lines.length - 1]
  const end = last && last.kind === 'ctx' && last.text === '' ? lines.length - 1 : lines.length

  const byHunk = new Map<number, number[]>()
  lines.slice(0, end).forEach((l, i) => {
    if (l.kind === 'add' || l.kind === 'del' || l.kind === 'ctx') {
      const list = byHunk.get(l.hunkIdx) ?? []
      list.push(i)
      byHunk.set(l.hunkIdx, list)
    }
  })

  // The unselected change that stays in the file on the side git matches against.
  const keptAsContext = direction === 'forward' ? 'del' : 'add'

  const parts: string[] = []
  for (const [hunkIdx, idxs] of byHunk) {
    if (!idxs.some((i) => selected.has(i))) continue
    const start = starts.get(hunkIdx) ?? { o: 1, n: 1 }
    const body: string[] = []
    let oldCount = 0
    let newCount = 0
    for (const i of idxs) {
      const l = lines[i]
      if (l.text.startsWith('\\')) {
        body.push(l.text) // "\ No newline at end of file" — verbatim, not counted
        continue
      }
      const asContext = l.kind === 'ctx' || (!selected.has(i) && l.kind === keptAsContext)
      if (asContext) {
        body.push(` ${l.text}`)
        oldCount++
        newCount++
      } else if (!selected.has(i)) {
        // The other unselected kind: absent on the matched side, so omitted.
      } else if (l.kind === 'del') {
        body.push(`-${l.text}`)
        oldCount++
      } else {
        body.push(`+${l.text}`)
        newCount++
      }
    }
    parts.push(`@@ -${start.o},${oldCount} +${start.n},${newCount} @@`, ...body)
  }
  return `${header}\n${parts.join('\n')}\n`
}
