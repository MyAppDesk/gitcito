// Per-repository todo lists — pure list algebra, no store and no React.
//
// Todos live in app settings (keyed by canonical repo path), never in the
// repository, so nothing here touches git. Everything is immutable: each helper
// returns a new array, which is what lets the sidebar memo on identity.

import type { RepoTodo, TodoPriority } from '../../../shared/types'

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
  opts: { notes?: string; priority?: TodoPriority; branch?: string } = {}
): RepoTodo {
  return {
    id: newTodoId(),
    title: title.trim(),
    done: false,
    priority: opts.priority ?? 'normal',
    createdAt: now,
    ...(opts.notes?.trim() ? { notes: opts.notes.trim() } : {}),
    ...(opts.branch ? { branch: opts.branch } : {})
  }
}

/**
 * Display order: everything open first (loudest, then oldest — an old high
 * priority is the thing that has been ignored longest), then the done pile with
 * the most recently ticked on top so undoing a mistake is one click away.
 */
export function sortTodos(todos: RepoTodo[]): RepoTodo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done) return (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt)
    if (WEIGHT[a.priority] !== WEIGHT[b.priority]) return WEIGHT[b.priority] - WEIGHT[a.priority]
    return a.createdAt - b.createdAt
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
  return todos.map((td) => {
    if (td.id !== id) return td
    if (td.done) {
      const { doneAt: _doneAt, ...rest } = td
      return { ...rest, done: false }
    }
    return { ...td, done: true, doneAt: now }
  })
}

export function patchTodo(todos: RepoTodo[], id: string, patch: Partial<Omit<RepoTodo, 'id'>>): RepoTodo[] {
  return todos.map((td) => (td.id === id ? { ...td, ...patch } : td))
}

export function removeTodo(todos: RepoTodo[], id: string): RepoTodo[] {
  return todos.filter((td) => td.id !== id)
}

export function clearDoneTodos(todos: RepoTodo[]): RepoTodo[] {
  return todos.filter((td) => !td.done)
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
