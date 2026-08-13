/**
 * Decoders for `git merge-tree --write-tree` output.
 *
 * merge-tree performs a real merge entirely in the object database: it never
 * touches the index, the working tree or any ref, so it is safe to run against
 * dozens of branches in the background while the user keeps working. That is
 * what powers the Conflict Radar — knowing which branches will bite *before*
 * checking anything out.
 *
 * Two output shapes exist and both are parsed here:
 *  - batch mode (`--stdin`), NUL-separated, one record per input line;
 *  - single mode, newline-separated, one merge per process.
 */

/** Outcome of one merge-tree run. */
export interface MergeTreeRecord {
  /** 'clean' = merges without conflicts, 'conflict' = needs hands, 'error' = git refused. */
  status: 'clean' | 'conflict' | 'error'
  /** OID of the merged toplevel tree (empty on error). */
  tree: string
  /** Conflicting paths (only populated for 'conflict'). */
  files: string[]
  /** Informational / error text, newline-joined. */
  message: string
}

const NUL = '\0'

/**
 * Parses the output of `git merge-tree --stdin --name-only`.
 *
 * Per merge, git emits: status NUL tree NUL [conflicted paths NUL…] NUL
 * [message blocks NUL…] NUL — where the conflicted-path section is present
 * only when the merge conflicted, and each message block is
 * `<n> NUL <path>×n NUL <type> NUL <text>`.
 *
 * A fatal error (unrelated histories, unknown ref) makes git abort the whole
 * batch, so the caller must treat a short result as "the rest is unknown" and
 * retry those refs one at a time.
 */
export function parseMergeTreeStdin(out: string): MergeTreeRecord[] {
  const f = out.split(NUL)
  const records: MergeTreeRecord[] = []
  let i = 0

  while (i < f.length) {
    // Skip padding between records; the stream ends with a trailing NUL.
    while (i < f.length && f[i] === '') i++
    if (i >= f.length) break

    const status = Number(f[i++])
    if (!Number.isFinite(status)) break
    const tree = f[i++] ?? ''
    const files: string[] = []

    if (status === 0) {
      while (i < f.length && f[i] !== '') files.push(f[i++])
      i++ // section terminator
    }

    const messages: string[] = []
    while (i < f.length && f[i] !== '') {
      const count = Number(f[i++]) || 0
      i += count // the paths the message is about — already covered by `files`
      i++ // message type ('CONFLICT (content)', 'Auto-merging'…)
      const text = f[i++]
      if (text) messages.push(text.trim())
    }
    i++ // record terminator

    records.push({
      status: status === 0 ? 'conflict' : status > 0 ? 'clean' : 'error',
      tree,
      files,
      message: messages.join('\n')
    })
  }

  return records
}

/**
 * Parses a single `git merge-tree --write-tree --name-only --messages` run.
 * Exit 0 = clean, 1 = conflicts, anything else = git refused the merge.
 */
export function parseMergeTreeSingle(stdout: string, exitCode: number, stderr = ''): MergeTreeRecord {
  if (exitCode !== 0 && exitCode !== 1) {
    return { status: 'error', tree: '', files: [], message: (stderr || stdout).trim() }
  }
  const lines = stdout.split('\n')
  const tree = (lines.shift() ?? '').trim()
  const files: string[] = []
  while (lines.length && lines[0].trim() !== '') files.push(lines.shift()!.trim())
  const message = lines.join('\n').trim()
  return { status: exitCode === 1 ? 'conflict' : 'clean', tree, files, message }
}
