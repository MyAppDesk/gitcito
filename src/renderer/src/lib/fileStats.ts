import type { TranslationKey } from '../i18n'

/** Change counts for a set of files, bucketed exactly as `statusClass` colours
 *  them — so a summary and the file tree below it never disagree. */
export interface FileStats {
  add: number
  mod: number
  del: number
  ren: number
  conflict: number
}

export type StatBucket = keyof FileStats

/** One git status letter per bucket — the same letter the file row paints. */
export const SAMPLE_STATUS: Record<StatBucket, string> = {
  mod: 'M',
  add: 'A',
  del: 'D',
  ren: 'R',
  conflict: 'U'
}

/** Untracked ('?') and copied ('C') files count as additions, and anything
 *  unrecognised as a modification: a file the summary cannot name is still a
 *  file that changed, and dropping it would make the chips undercount. */
export function bucketOf(status: string): StatBucket {
  switch (status) {
    case 'A':
    case 'C':
    case '?':
      return 'add'
    case 'D':
      return 'del'
    case 'R':
      return 'ren'
    case 'U':
      return 'conflict'
    default:
      return 'mod'
  }
}

export function fileStats(files: { status: string }[]): FileStats {
  const s: FileStats = { add: 0, mod: 0, del: 0, ren: 0, conflict: 0 }
  for (const f of files) s[bucketOf(f.status)]++
  return s
}

export interface StatChip {
  bucket: StatBucket
  labelKey: TranslationKey
  n: number
}

// Modifications lead because they dominate a typical commit; conflicts trail
// because they are the exception a reader scans to the end for.
const CHIPS: { bucket: StatBucket; one: TranslationKey; many: TranslationKey }[] = [
  { bucket: 'mod', one: 'chg.modifiedOne', many: 'chg.modified' },
  { bucket: 'add', one: 'chg.addedOne', many: 'chg.added' },
  { bucket: 'del', one: 'chg.deletedOne', many: 'chg.deleted' },
  { bucket: 'ren', one: 'chg.renamedOne', many: 'chg.renamed' },
  { bucket: 'conflict', one: 'chg.conflictedOne', many: 'chg.conflicted' }
]

/** Keys, not strings — the caller renders them, so this stays testable against
 *  stable keys and never freezes copy at import time. */
export function summaryChips(s: FileStats): StatChip[] {
  return CHIPS.filter((c) => s[c.bucket] > 0).map((c) => ({
    bucket: c.bucket,
    labelKey: s[c.bucket] === 1 ? c.one : c.many,
    n: s[c.bucket]
  }))
}
