import { execFile } from 'child_process'
import { ipcMain } from 'electron'
import type { CodeTodo, TodoScanResult } from '../shared/types'

/**
 * The TODO scan — every `// TODO`, `# FIXME` or `HACK` the repository carries,
 * read straight out of the source.
 *
 * The search is `git grep`, not a directory walk: it already knows which files
 * are tracked, which are ignored and which are binary, which is the whole
 * difference between a scan that finishes and one that reads `node_modules`.
 *
 * Two passes on purpose. `git grep` runs a deliberately loose pattern — cheap
 * for C, wrong often enough to matter — and every candidate line is then parsed
 * in JS, where the comment leader, the owner and the message can be picked
 * apart properly. Grep decides what to read; `parseTodoLine` decides what counts.
 */

/** Past this the panel is wallpaper and the renderer starts to hurt. */
const MAX_TODOS = 5000
const GREP_TIMEOUT = 60_000

/**
 * The tags a marker can carry. Longest-first when they share a prefix, so the
 * alternation cannot match `FIX` inside `FIXME` and leave `ME` as the message.
 */
export const TODO_TAGS = [
  'FIXME',
  'TODO',
  'BUG',
  'HACK',
  'XXX',
  'NOTE',
  'OPTIMIZE',
  'REVIEW',
  'REFACTOR',
  'DEPRECATED',
  'QUESTION',
  'IDEA',
  'WIP',
  'TEMP'
] as const

const TAGS_ALT = [...TODO_TAGS].sort((a, b) => b.length - a.length).join('|')

/**
 * What has to sit in front of the tag for it to be a comment rather than a word.
 *
 * Every line comment leader in wide use, plus `*` for the continuation lines of
 * a block comment, and the decoration people put after them (`//!`, `# ---`).
 *
 * A leader is *required*. Without one, `todo = [l for l in lines if ...]` reads
 * as a marker, and a panel that lists a variable assignment as technical debt
 * is a panel nobody trusts twice. A TODO is something written in a comment.
 */
const LEADER = /(?:\/\/|\/\*|\*|#|<!--|--|;|%|"""|''')[ \t*!\-=>]*$/

/** An owner is a handle, not a sentence: `(cgm)` yes, `(see the issue)` no. */
const OWNER = /^[A-Za-z0-9_.@+-]{1,32}$/

/** A long marker is a paragraph someone pasted; the tooltip still has all of it. */
const MAX_MESSAGE = 300

const TAG_AT = new RegExp(`\\b(${TAGS_ALT})\\b`, 'gi')
const MARKER = new RegExp(
  // tag, then an optional `(owner)` / `[owner]`, then an optional separator.
  `^(${TAGS_ALT})\\b[ \\t]*(?:\\(([^)]*)\\)|\\[([^\\]]*)\\])?[ \\t]*[:：\\-–—]?[ \\t]*(.*)$`,
  'i'
)

/**
 * Parse one source line into a marker, or null when it holds none.
 *
 * `TODO`, `todo`, `//TODO`, `// TODO:` and a block-comment `TODO(cgm):` are the
 * same thing said five ways, and they all land in the same bucket: the tag is
 * upper-cased, the owner lower-cased, the separator thrown away.
 */
export function parseTodoLine(file: string, line: number, text: string): CodeTodo | null {
  TAG_AT.lastIndex = 0
  let hit: RegExpExecArray | null
  while ((hit = TAG_AT.exec(text))) {
    // A comment has to have opened before the tag. Code that merely uses the
    // word — a variable called `todo`, a function called `reviewNotes` — is no
    // marker, however it is indented.
    if (!LEADER.test(text.slice(0, hit.index))) continue
    const marker = MARKER.exec(text.slice(hit.index))
    if (!marker) continue
    const [, tag, paren, bracket, rest] = marker
    let owner = (paren ?? bracket ?? '').trim()
    let message = rest.trim()
    // `(cgm)` is an owner; `(see below)` is the start of the sentence, and
    // swallowing it would lose the words and invent a group nobody wrote.
    if (owner && !OWNER.test(owner)) {
      message = text.slice(hit.index + tag.length).trim().replace(/^[:：\-–—]\s*/, '')
      owner = ''
    }
    // `TODO: @cgm ship this` — the same claim, written the other common way.
    if (!owner) {
      const at = /^@([A-Za-z0-9_.+-]{1,32})\b[ \t]*[:：\-–—]?[ \t]*/.exec(message)
      if (at) {
        owner = at[1]
        message = message.slice(at[0].length)
      }
    }
    // A block comment's closer is punctuation, not part of the note.
    message = message.replace(/\s*(?:\*\/|-->|"""|''')\s*$/, '').trim()
    const todo: CodeTodo = {
      file,
      line,
      col: hit.index + 1,
      tag: tag.toUpperCase(),
      message: message.slice(0, MAX_MESSAGE),
      text: text.trim().slice(0, MAX_MESSAGE)
    }
    if (owner) todo.owner = owner.replace(/^@/, '').toLowerCase()
    return todo
  }
  return null
}

/**
 * The grep pattern: a comment leader followed by a tag.
 *
 * POSIX ERE, because `git grep -P` needs a PCRE build nobody can count on. It
 * is looser than `parseTodoLine` by design — grep is here to skip the 99% of
 * the repository that mentions no tag at all, not to be right.
 */
export function grepPattern(): string {
  return `(//|/\\*|\\*|#|<!--|--|;|%|"""|''')[ \t*!-]*(${TAGS_ALT})`
}

/** `path:line:text`, non-greedy so a path holding a colon still parses. */
const GREP_LINE = /^(.+?):(\d+):(.*)$/

export function parseGrepOutput(stdout: string): CodeTodo[] {
  const out: CodeTodo[] = []
  for (const raw of stdout.split('\n')) {
    if (!raw) continue
    const m = GREP_LINE.exec(raw)
    if (!m) continue
    const file = m[1].split('\\').join('/')
    // A dependency tree's TODOs are somebody else's, tracked or not.
    if (file.split('/').includes('node_modules')) continue
    const todo = parseTodoLine(file, Number(m[2]), m[3])
    if (todo) out.push(todo)
  }
  return out
}

/** File, then line — the order the panel groups in, whatever it groups by. */
export function sortTodos(todos: CodeTodo[]): CodeTodo[] {
  return [...todos].sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1))
}

/** Running scans, so a second click cancels rather than piling up. */
const running = new Map<string, { kill(): void }[]>()

export async function scanTodos(repoPath: string): Promise<TodoScanResult> {
  const started = Date.now()
  cancelTodoScan(repoPath)
  running.set(repoPath, [])
  const stdout = await new Promise<string>((done) => {
    const child = execFile(
      'git',
      [
        'grep',
        '-n',
        '-I',
        '-E',
        '-i',
        '--no-color',
        // Untracked files count — a TODO written five minutes ago is the one
        // that matters most — but anything `.gitignore`d is build output.
        '--untracked',
        '--exclude-standard',
        '-e',
        grepPattern()
      ],
      { cwd: repoPath, timeout: GREP_TIMEOUT, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (err, out) => {
        // Exit 1 is "no matches", which is a result, not a failure. Anything
        // else (no git, not a repo) leaves us with nothing to say.
        done(err && (!('code' in err) || (err.code !== 1 && err.code !== 0)) ? '' : out.toString())
      }
    )
    running.get(repoPath)?.push(child)
  })
  running.delete(repoPath)

  const todos = sortTodos(parseGrepOutput(stdout))
  return { todos: todos.slice(0, MAX_TODOS), truncated: todos.length > MAX_TODOS, ms: Date.now() - started }
}

export function cancelTodoScan(repoPath: string): void {
  for (const child of running.get(repoPath) ?? []) {
    try {
      child.kill()
    } catch {
      /* already gone */
    }
  }
  running.delete(repoPath)
}

export function registerTodoScanHandlers(): void {
  ipcMain.handle('todoscan:run', (_e, repoPath: string) => scanTodos(repoPath))
  ipcMain.on('todoscan:cancel', (_e, repoPath: string) => cancelTodoScan(repoPath))
}
