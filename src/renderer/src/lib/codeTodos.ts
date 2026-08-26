import type { CodeTodo } from '../../../shared/types'

/**
 * Shaping the scanned TODO markers for the panel: counts, filters, grouping.
 *
 * The interesting axis is not the file — an editor's todo tree already gives
 * you that. It is *who* and *what kind*: `TODO(cgm)` and `TODO (cgm)` are one
 * person's backlog written two ways, and everything without an owner is the
 * pile nobody has claimed. So grouping is a choice, not a fixed tree, and the
 * keys here are raw — the panel translates the empty ones.
 */

export type TodoGroupBy = 'tag' | 'owner' | 'folder' | 'file'

export const TODO_GROUP_BYS: readonly TodoGroupBy[] = ['tag', 'owner', 'folder', 'file']

export interface CodeTodoFilter {
  /** Tags to keep, upper-case. An empty list means "no filter", not "nothing". */
  tags: string[]
  /** Owners to keep, lower-case. `''` is the unclaimed pile. */
  owners: string[]
  /** Restrict to files with uncommitted changes. */
  changedOnly: boolean
  /** Repo-relative paths that are dirty right now. */
  changedFiles: string[]
  /** Free text, matched against the message, the file, the tag and the owner. */
  query: string
}

export function filterCodeTodos(todos: CodeTodo[], filter: CodeTodoFilter): CodeTodo[] {
  const changed = new Set(filter.changedFiles)
  const q = filter.query.trim().toLowerCase()
  const tags = filter.tags.length > 0 ? new Set(filter.tags) : null
  const owners = filter.owners.length > 0 ? new Set(filter.owners) : null
  return todos.filter((td) => {
    if (tags && !tags.has(td.tag)) return false
    if (owners && !owners.has(td.owner ?? '')) return false
    if (filter.changedOnly && !changed.has(td.file)) return false
    if (!q) return true
    return (
      td.message.toLowerCase().includes(q) ||
      td.file.toLowerCase().includes(q) ||
      td.tag.toLowerCase().includes(q) ||
      (td.owner ?? '').includes(q)
    )
  })
}

export interface TodoTally {
  key: string
  n: number
}

/** Tag counts, biggest first — the chips along the top of the panel. */
export function countByTag(todos: CodeTodo[]): TodoTally[] {
  return tally(todos.map((td) => td.tag))
}

/** Owner counts, biggest first. `''` is everything nobody put their name on. */
export function countByOwner(todos: CodeTodo[]): TodoTally[] {
  return tally(todos.map((td) => td.owner ?? ''))
}

function tally(keys: string[]): TodoTally[] {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts.entries()]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => (b.n === a.n ? compareKeys(a.key, b.key) : b.n - a.n))
}

/** The unclaimed pile sorts last whatever its size — it is the leftovers. */
function compareKeys(a: string, b: string): number {
  if (a === '') return 1
  if (b === '') return -1
  return a < b ? -1 : a > b ? 1 : 0
}

export interface CodeTodoGroup {
  /** Raw key: a tag, an owner (`''` when unclaimed), a folder or a file path. */
  key: string
  todos: CodeTodo[]
}

/**
 * One group per tag / owner / folder / file.
 *
 * Tags and owners sort by size — the loudest bucket is the one worth reading
 * first. Paths sort alphabetically, because a tree that reorders itself as
 * counts change is a tree you cannot find anything in twice.
 */
export function groupCodeTodos(todos: CodeTodo[], by: TodoGroupBy): CodeTodoGroup[] {
  const groups = new Map<string, CodeTodo[]>()
  for (const td of todos) {
    const key = by === 'tag' ? td.tag : by === 'owner' ? (td.owner ?? '') : by === 'file' ? td.file : folderOf(td.file)
    const list = groups.get(key)
    if (list) list.push(td)
    else groups.set(key, [td])
  }
  const out = [...groups.entries()].map(([key, list]) => ({ key, todos: list }))
  if (by === 'tag' || by === 'owner') {
    out.sort((a, b) => (b.todos.length === a.todos.length ? compareKeys(a.key, b.key) : b.todos.length - a.todos.length))
  } else {
    out.sort((a, b) => compareKeys(a.key, b.key))
  }
  return out
}

/** The directory a file lives in. `''` at the repository root. */
export function folderOf(file: string): string {
  const i = file.lastIndexOf('/')
  return i < 0 ? '' : file.slice(0, i)
}
