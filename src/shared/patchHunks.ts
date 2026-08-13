/**
 * Splitting a unified diff into per-file hunks, and putting chosen hunks back
 * together into an applicable patch.
 *
 * Absorb needs both directions: it takes the staged diff apart to ask blame who
 * owns each hunk, then rebuilds one patch per target commit so each `fixup!`
 * carries only its own changes.
 */

export interface PatchHunk {
  /** The `@@ -a,b +c,d @@ …` line, verbatim. */
  header: string
  /** Body lines (context, additions, deletions), verbatim and without the header. */
  lines: string[]
  /** First line number on the *old* side, and how many lines it spans. */
  oldStart: number
  oldCount: number
}

export interface PatchFile {
  /** Path on the old side (`a/…` stripped); equals `newPath` unless renamed. */
  oldPath: string
  newPath: string
  /** `diff --git` line plus the mode/index/±++ header lines, verbatim. */
  headerLines: string[]
  hunks: PatchHunk[]
  /** A binary file, a pure rename, a mode change — nothing to attribute. */
  binary: boolean
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

function pathsFrom(diffLine: string): { oldPath: string; newPath: string } {
  // `diff --git a/foo b/foo` — quoted paths keep their quotes, which git also
  // accepts back when the patch is applied.
  const m = /^diff --git (?:"?a\/)?(.+?)"? (?:"?b\/)?(.+?)"?$/.exec(diffLine)
  if (!m) return { oldPath: '', newPath: '' }
  return { oldPath: m[1], newPath: m[2] }
}

/** Split a unified diff (as produced by `git diff`) into files and hunks. */
export function parsePatch(diff: string): PatchFile[] {
  const files: PatchFile[] = []
  let file: PatchFile | null = null
  let hunk: PatchHunk | null = null

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const { oldPath, newPath } = pathsFrom(line)
      file = { oldPath, newPath, headerLines: [line], hunks: [], binary: false }
      hunk = null
      files.push(file)
      continue
    }
    if (!file) continue

    const m = HUNK.exec(line)
    if (m) {
      hunk = {
        header: line,
        lines: [],
        oldStart: Number(m[1]),
        oldCount: m[2] === undefined ? 1 : Number(m[2])
      }
      file.hunks.push(hunk)
      continue
    }

    if (hunk) {
      // "\ No newline at end of file" belongs to the hunk it follows.
      hunk.lines.push(line)
    } else {
      if (/^(GIT binary patch|Binary files )/.test(line)) file.binary = true
      file.headerLines.push(line)
    }
  }

  // A trailing newline in the input leaves one empty line on the last hunk.
  for (const f of files) {
    const last = f.hunks[f.hunks.length - 1]
    if (last && last.lines[last.lines.length - 1] === '') last.lines.pop()
  }
  return files
}

/**
 * Rebuild an applicable patch containing only `hunks` of `file`.
 * Hunk headers are reused untouched: every hunk here comes from one diff
 * against one base, so their old-side line numbers are still correct.
 */
export function buildPatch(file: PatchFile, hunks: PatchHunk[]): string {
  if (!hunks.length) return ''
  const out = [...file.headerLines]
  for (const h of hunks) {
    out.push(h.header)
    out.push(...h.lines)
  }
  return out.join('\n') + '\n'
}

/**
 * The old-side line numbers a hunk touches — the lines that already existed and
 * were deleted or used as context. Those are the ones blame can attribute; a
 * hunk that only adds lines has none of its own, so its surrounding context is
 * used instead.
 */
export function touchedOldLines(hunk: PatchHunk): { deleted: number[]; context: number[] } {
  const deleted: number[] = []
  const context: number[] = []
  let lineNo = hunk.oldStart
  for (const line of hunk.lines) {
    if (line.startsWith('-')) {
      deleted.push(lineNo)
      lineNo++
    } else if (line.startsWith('+') || line.startsWith('\\')) {
      // additions and "\ No newline" don't consume an old-side line
    } else {
      context.push(lineNo)
      lineNo++
    }
  }
  return { deleted, context }
}
