import type { Problem, ProblemSeverity } from '../../../shared/types'

/**
 * Shaping the problem list for the panel: counts, filters, grouping.
 *
 * The filter that matters is `changedOnly`. A flat list of every warning in the
 * repository is the same list an IDE gives you and it ages into wallpaper —
 * what nobody else can answer is "did *my* diff cause these", and Gitcito knows
 * exactly which files are dirty. Hence a toggle, not a separate view.
 */

export interface ProblemCounts {
  error: number
  warning: number
  info: number
}

export function countBySeverity(problems: Problem[]): ProblemCounts {
  const counts: ProblemCounts = { error: 0, warning: 0, info: 0 }
  for (const p of problems) counts[p.severity]++
  return counts
}

export interface ProblemFilter {
  /** Severities to keep. An empty list means "no filter", not "nothing". */
  severities: ProblemSeverity[]
  /** Restrict to files with uncommitted changes. */
  changedOnly: boolean
  /** Repo-relative paths that are dirty right now. */
  changedFiles: string[]
  /** Free text, matched against the message, the file and the code. */
  query: string
}

export function filterProblems(problems: Problem[], filter: ProblemFilter): Problem[] {
  const changed = new Set(filter.changedFiles)
  const q = filter.query.trim().toLowerCase()
  const severities = filter.severities.length > 0 ? new Set(filter.severities) : null
  return problems.filter((p) => {
    if (severities && !severities.has(p.severity)) return false
    if (filter.changedOnly && !changed.has(p.file)) return false
    if (!q) return true
    return (
      p.message.toLowerCase().includes(q) ||
      p.file.toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q) ||
      p.source.toLowerCase().includes(q)
    )
  })
}

export interface ProblemGroup {
  file: string
  problems: Problem[]
  counts: ProblemCounts
}

/** One group per file, in the order the (already sorted) problems arrive. */
export function groupByFile(problems: Problem[]): ProblemGroup[] {
  const groups = new Map<string, Problem[]>()
  for (const p of problems) {
    const list = groups.get(p.file)
    if (list) list.push(p)
    else groups.set(p.file, [p])
  }
  return [...groups.entries()].map(([file, list]) => ({
    file,
    problems: list,
    counts: countBySeverity(list)
  }))
}

/** Just the file name, for the bold half of a group header. */
export function baseName(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1)
}

/** The directory, for the dimmed half. Empty at the repo root. */
export function dirName(file: string): string {
  const i = file.lastIndexOf('/')
  return i < 0 ? '' : file.slice(0, i)
}
