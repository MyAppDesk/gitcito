// Per-repository todo lists — pure list algebra, no store and no React.
//
// Todos live in app settings (keyed by canonical repo path), never in the
// repository, so nothing here touches git. Everything is immutable: each helper
// returns a new array, which is what lets the sidebar memo on identity.

import type { RepoTodo, TodoPriority, TodoStatus } from '../../../shared/types'

/** Sort weight per priority — higher floats to the top of the open list. */
const WEIGHT: Record<TodoPriority, number> = { high: 2, normal: 1, low: 0 }

export function newTodoId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * A fresh todo. `now` is injected rather than read from the clock so the
 * ordering is testable and a batch created together keeps a stable sequence.
 */
export function createTodo(
  title: string,
  now: number,
  opts: { notes?: string; priority?: TodoPriority; branch?: string; parentId?: string; status?: TodoStatus } = {}
): RepoTodo {
  return {
    id: newTodoId(),
    title: title.trim(),
    done: false,
    priority: opts.priority ?? 'normal',
    status: opts.status ?? 'todo',
    createdAt: now,
    ...(opts.notes?.trim() ? { notes: opts.notes.trim() } : {}),
    ...(opts.branch ? { branch: opts.branch } : {}),
    ...(opts.parentId ? { parentId: opts.parentId } : {})
  }
}

/** The board columns, left to right. The order is the workflow, so it is the
 *  order everything — the board, the menus, the status chips — reads in. */
export const TODO_STATUSES: readonly TodoStatus[] = ['todo', 'progress', 'blocked', 'qa', 'done']

/** A todo written before the board existed has no `status`; its ticked box is
 *  the only thing that ever said where it was. */
export function todoStatus(td: RepoTodo): TodoStatus {
  if (td.done) return 'done'
  return td.status && td.status !== 'done' ? td.status : 'todo'
}

/**
 * Move a todo to a column, keeping `done` and `doneAt` in step. Ticking a
 * parent ticks its subtasks with it — a parent that claims to be finished over
 * a half-open checklist is the one state the board must not be able to show.
 */
export function setTodoStatus(todos: RepoTodo[], id: string, status: TodoStatus, now: number): RepoTodo[] {
  const ids = new Set([id, ...childrenOf(todos, id).map((td) => td.id)])
  return todos.map((td) => {
    if (!ids.has(td.id)) return td
    // A subtask dragged along by its parent only follows into `done`; the
    // parent's own in-flight columns say nothing about the child's state.
    if (td.id !== id && status !== 'done') return td
    if (status === 'done') return { ...td, status: 'done', done: true, doneAt: td.doneAt ?? now }
    const { doneAt: _doneAt, ...rest } = td
    return { ...rest, status, done: false }
  })
}

/** Subtasks of one todo, in storage order. */
export function childrenOf(todos: RepoTodo[], parentId: string): RepoTodo[] {
  return todos.filter((td) => td.parentId === parentId)
}

/** Everything that is not a subtask — what the sidebar and the board show. */
export function topLevelTodos(todos: RepoTodo[]): RepoTodo[] {
  return todos.filter((td) => !td.parentId)
}

/** `2/3` for the checklist under one todo. Zero total means it has no
 *  subtasks, and callers hide the badge rather than print `0/0`. */
export function subtaskProgress(todos: RepoTodo[], id: string): { done: number; total: number } {
  const kids = childrenOf(todos, id)
  return { done: kids.filter((td) => td.done).length, total: kids.length }
}

/**
 * Display order: everything open first (loudest, then oldest — an old high
 * priority is the thing that has been ignored longest), then the done pile with
 * the most recently ticked on top so undoing a mistake is one click away.
 *
 * `manual` hands the open run back in storage order instead — that is what a
 * drag or an arrow press writes. The done pile still sinks either way: manual
 * ordering is about what to do next, and a ticked item is not that.
 */
export function sortTodos(todos: RepoTodo[], manual = false): RepoTodo[] {
  if (manual) return [...todos.filter((td) => !td.done), ...sortDone(todos.filter((td) => td.done))]
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done) return (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt)
    if (WEIGHT[a.priority] !== WEIGHT[b.priority]) return WEIGHT[b.priority] - WEIGHT[a.priority]
    return a.createdAt - b.createdAt
  })
}

function sortDone(done: RepoTodo[]): RepoTodo[] {
  return [...done].sort((a, b) => (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt))
}

/**
 * Reorder one *run* of todos in place: the siblings sharing a parent, and — on
 * the board — sharing a column too. Every other entry keeps its absolute slot,
 * so a move inside one column cannot disturb another, and a done pile stays
 * where the display puts it.
 */
function reorderRun(
  todos: RepoTodo[],
  inRun: (td: RepoTodo) => boolean,
  mut: (run: RepoTodo[]) => RepoTodo[] | null
): RepoTodo[] {
  const slots = todos.map((_, i) => i).filter((i) => inRun(todos[i]))
  const next = mut(slots.map((i) => todos[i]))
  if (!next) return todos
  const out = [...todos]
  slots.forEach((slot, k) => {
    out[slot] = next[k]
  })
  return out
}

/** `list` reorders among open siblings; `column` reorders inside one board
 *  column, where the done pile is a column like any other. */
export type TodoScope = 'list' | 'column'

function runOf(todos: RepoTodo[], anchor: RepoTodo, scope: TodoScope): ((td: RepoTodo) => boolean) | null {
  if (scope === 'list' && anchor.done) return null
  const parent = anchor.parentId
  const col = todoStatus(anchor)
  return (td) =>
    td.parentId === parent && (scope === 'column' ? todoStatus(td) === col : !td.done)
}

/** Nudge one todo a single slot within its run. `dir` is -1 for up, 1 for down;
 *  a move off either end is a no-op rather than a wrap, because a wrapping
 *  arrow key moves an item somewhere the user was not looking. */
export function moveTodo(todos: RepoTodo[], id: string, dir: -1 | 1, scope: TodoScope = 'list'): RepoTodo[] {
  const anchor = todos.find((td) => td.id === id)
  const inRun = anchor && runOf(todos, anchor, scope)
  if (!inRun) return todos
  return reorderRun(todos, inRun, (run) => {
    const from = run.findIndex((td) => td.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= run.length) return null
    const next = [...run]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  })
}

/** Drop `fromId` in front of `toId`, or at the end of the run when `toId` is
 *  null. Ids in different runs — a different parent, a different column — are a
 *  no-op: crossing a column is a status change, not a reorder. */
export function reorderTodos(
  todos: RepoTodo[],
  fromId: string,
  toId: string | null,
  scope: TodoScope = 'list'
): RepoTodo[] {
  const anchor = todos.find((td) => td.id === fromId)
  const inRun = anchor && runOf(todos, anchor, scope)
  if (!inRun || fromId === toId) return todos
  if (toId !== null) {
    const target = todos.find((td) => td.id === toId)
    if (!target || !inRun(target)) return todos
  }
  return reorderRun(todos, inRun, (run) => {
    const from = run.findIndex((td) => td.id === fromId)
    if (from < 0) return null
    const next = [...run]
    const [moved] = next.splice(from, 1)
    const to = toId === null ? next.length : next.findIndex((td) => td.id === toId)
    if (to < 0) return null
    next.splice(to, 0, moved)
    return next
  })
}

export function openTodos(todos: RepoTodo[]): RepoTodo[] {
  return todos.filter((td) => !td.done)
}

/** What the badges read from: open count, and whether any of them is urgent. */
export function todoSummary(todos: RepoTodo[] | undefined): { open: number; done: number; high: number } {
  const list = todos ?? []
  let open = 0
  let done = 0
  let high = 0
  for (const td of list) {
    if (td.done) done++
    else {
      open++
      if (td.priority === 'high') high++
    }
  }
  return { open, done, high }
}

/** Tick or untick. `doneAt` is dropped on untick so the entry cannot claim a
 *  completion time it no longer has. */
export function toggleTodo(todos: RepoTodo[], id: string, now: number): RepoTodo[] {
  const td = todos.find((x) => x.id === id)
  if (!td) return todos
  // The box and the board are one state: unticking returns a todo to the column
  // it is most honestly in — the first one — rather than to a stale `qa`.
  return setTodoStatus(todos, id, td.done ? 'todo' : 'done', now)
}

export function patchTodo(todos: RepoTodo[], id: string, patch: Partial<Omit<RepoTodo, 'id'>>): RepoTodo[] {
  return todos.map((td) => (td.id === id ? { ...td, ...patch } : td))
}

/** Delete a todo and, with it, the subtasks that only existed underneath it —
 *  an orphaned subtask is a row nothing can reach. */
export function removeTodo(todos: RepoTodo[], id: string): RepoTodo[] {
  return todos.filter((td) => td.id !== id && td.parentId !== id)
}

export function clearDoneTodos(todos: RepoTodo[]): RepoTodo[] {
  const gone = new Set(todos.filter((td) => td.done).map((td) => td.id))
  return todos.filter((td) => !td.done && !(td.parentId && gone.has(td.parentId)))
}

/**
 * Free-text filter over title and notes. Case-insensitive substring — a todo
 * list is small enough that anything cleverer would only surprise the reader.
 */
export function filterTodos(todos: RepoTodo[], query: string): RepoTodo[] {
  const q = query.trim().toLowerCase()
  if (!q) return todos
  return todos.filter(
    (td) => td.title.toLowerCase().includes(q) || (td.notes ?? '').toLowerCase().includes(q)
  )
}
