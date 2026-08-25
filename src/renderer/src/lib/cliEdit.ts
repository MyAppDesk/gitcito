/**
 * Reading the file git handed to `gitcito --wait`.
 *
 * git never says what it wants edited — it just passes a path — so the kind is
 * inferred from the name, which is the same thing every other editor
 * integration does. Pure, so the (slightly surprising) rules about which files
 * git names can be pinned down in tests rather than discovered in a rebase.
 */

/** What the file is for, which decides the dialog's affordances. */
export type CliEditKind = 'message' | 'todo' | 'file'

const MESSAGE_FILES = ['COMMIT_EDITMSG', 'MERGE_MSG', 'SQUASH_MSG', 'TAG_EDITMSG', 'NOTES_EDITMSG']

export function editKindFor(path: string): CliEditKind {
  const name = path.split(/[/\\]/).pop() ?? path
  if (MESSAGE_FILES.includes(name)) return 'message'
  // `git rebase -i` writes `git-rebase-todo`; `--edit-todo` reuses the name.
  if (name === 'git-rebase-todo' || name === 'git-rebase-todo.backup') return 'todo'
  return 'file'
}

/**
 * Split a commit-message file the way git will: the first line is the subject,
 * everything after the blank line is the body, and `#` lines are stripped
 * before either — they exist to be read, not committed.
 */
export function splitMessage(raw: string): { subject: string; body: string; comments: number } {
  const lines = raw.split('\n')
  const comments = lines.filter((l) => l.startsWith('#')).length
  const content = lines.filter((l) => !l.startsWith('#'))
  const subject = (content[0] ?? '').trim()
  // Drop the single blank separator, not the blank lines inside the body.
  const rest = content.slice(1)
  if (rest[0] === '') rest.shift()
  return { subject, body: rest.join('\n').trimEnd(), comments }
}
