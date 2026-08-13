import type { RangeDiffEntry, RangeDiffKind } from './types'

/**
 * Decoder for `git range-diff`, the "what changed since you last looked"
 * command: it pairs the commits of two versions of a branch and shows how each
 * one was rewritten, instead of the useless "everything changed" a plain diff
 * reports after a rebase or a force-push.
 *
 * Each pair is one header line, optionally followed by an indented interdiff:
 *
 *     1:  890dbf2 = 1:  890dbf2 add x          (identical)
 *     2:  eb1d14d ! 3:  0da280d add y          (rewritten — interdiff follows)
 *     3:  ea2e850 < -:  ------- add z          (dropped)
 *     -:  ------- > 2:  eb6c239 add w          (new)
 */
const HEADER =
  /^(\d+|-):\s+([0-9a-f]+|-+)\s+([=!<>])\s+(\d+|-):\s+([0-9a-f]+|-+)\s+(.*)$/

const KIND: Record<string, RangeDiffKind> = {
  '=': 'unchanged',
  '!': 'modified',
  '<': 'removed',
  '>': 'added'
}

const index = (raw: string): number | null => (raw === '-' ? null : Number(raw))
const sha = (raw: string): string | null => (/^-+$/.test(raw) ? null : raw)

export function parseRangeDiff(out: string): RangeDiffEntry[] {
  const entries: RangeDiffEntry[] = []
  let body: string[] = []

  const flush = (): void => {
    if (!entries.length) return
    // Interdiff lines are indented by four spaces; strip that so the body reads
    // like an ordinary patch.
    entries[entries.length - 1].body = body
      .map((l) => (l.startsWith('    ') ? l.slice(4) : l))
      .join('\n')
      .replace(/\s+$/, '')
    body = []
  }

  for (const line of out.split('\n')) {
    const m = HEADER.exec(line)
    if (m) {
      flush()
      entries.push({
        kind: KIND[m[3]] ?? 'modified',
        oldIndex: index(m[1]),
        oldSha: sha(m[2]),
        newIndex: index(m[4]),
        newSha: sha(m[5]),
        subject: m[6].trim(),
        body: ''
      })
    } else if (entries.length) {
      body.push(line)
    }
  }
  flush()
  return entries
}
