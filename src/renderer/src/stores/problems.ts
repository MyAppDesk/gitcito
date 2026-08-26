import { create } from 'zustand'
import type { AnalyzeResult, CodeTodo, Problem, ProblemSeverity, TodoScanResult } from '../../../shared/types'
import type { TodoGroupBy } from '../lib/codeTodos'
import { useUIStore } from './ui'
import { t, interp } from '../i18n'

/**
 * The Problems panel's state: one analyzer sweep per repo, plus the filters the
 * panel shows.
 *
 * Sweeps are never automatic. These commands are the repository's own toolchain
 * — `tsc`, `eslint`, `cargo clippy` — and running them costs real seconds and
 * real CPU, so they happen when the user asks and only then.
 *
 * The same dock carries the TODO scan, which is the cheap half: one `git grep`
 * over tracked and untracked source, no toolchain involved. Both live here
 * because they answer the same question from two sides — what the machine
 * complains about, and what the people who wrote it already knew.
 */

/** Which half of the dock is showing. */
export type ProblemsMode = 'problems' | 'todos'

export interface ProblemsState {
  resultByRepo: Record<string, AnalyzeResult>
  runningByRepo: Record<string, boolean>
  /** Analyzers the repo asks for, known before the first sweep. */
  availableByRepo: Record<string, string[]>

  /** Panel filters — global, not per repo: they express how you like to read. */
  severities: ProblemSeverity[]
  changedOnly: boolean
  query: string

  /** The TODO half: one scan per repo, plus its own filters. */
  mode: ProblemsMode
  todoByRepo: Record<string, TodoScanResult>
  todoRunningByRepo: Record<string, boolean>
  /** Tags to keep, upper-case. Empty means every tag. */
  tags: string[]
  /** Owners to keep, lower-case; `''` is the unclaimed pile. Empty means everyone. */
  owners: string[]
  todoQuery: string
  groupBy: TodoGroupBy

  detect(repoPath: string): Promise<void>
  run(repoPath: string): Promise<void>
  cancel(repoPath: string): void
  toggleSeverity(severity: ProblemSeverity): void
  setChangedOnly(on: boolean): void
  setQuery(query: string): void
  problemsFor(repoPath: string): Problem[]

  setMode(mode: ProblemsMode): void
  scanTodos(repoPath: string): Promise<void>
  cancelTodos(repoPath: string): void
  toggleTag(tag: string): void
  toggleOwner(owner: string): void
  setTodoQuery(query: string): void
  setGroupBy(groupBy: TodoGroupBy): void
  todosFor(repoPath: string): CodeTodo[]
}

export const useProblemsStore = create<ProblemsState>((set, get) => ({
  resultByRepo: {},
  runningByRepo: {},
  availableByRepo: {},
  severities: [],
  changedOnly: false,
  query: '',
  mode: 'problems',
  todoByRepo: {},
  todoRunningByRepo: {},
  tags: [],
  owners: [],
  todoQuery: '',
  groupBy: 'tag',

  detect: async (repoPath) => {
    try {
      const available = await window.api.analyze.detect(repoPath)
      set((s) => ({ availableByRepo: { ...s.availableByRepo, [repoPath]: available } }))
    } catch {
      set((s) => ({ availableByRepo: { ...s.availableByRepo, [repoPath]: [] } }))
    }
  },

  run: async (repoPath) => {
    if (get().runningByRepo[repoPath]) return
    set((s) => ({ runningByRepo: { ...s.runningByRepo, [repoPath]: true } }))
    try {
      const result = await window.api.analyze.run(repoPath)
      set((s) => ({ resultByRepo: { ...s.resultByRepo, [repoPath]: result } }))
      if (result.missing.length > 0) {
        // Naming the tool beats an empty list with no explanation.
        useUIStore
          .getState()
          .toast('info', interp(t('problems.missingToast'), { tools: result.missing.join(', ') }))
      }
    } catch (e) {
      useUIStore.getState().toast('error', e instanceof Error ? e.message : String(e))
    } finally {
      set((s) => ({ runningByRepo: { ...s.runningByRepo, [repoPath]: false } }))
    }
  },

  cancel: (repoPath) => {
    window.api.analyze.cancel(repoPath)
    set((s) => ({ runningByRepo: { ...s.runningByRepo, [repoPath]: false } }))
  },

  toggleSeverity: (severity) =>
    set((s) => ({
      severities: s.severities.includes(severity)
        ? s.severities.filter((x) => x !== severity)
        : [...s.severities, severity]
    })),

  setChangedOnly: (changedOnly) => set({ changedOnly }),
  setQuery: (query) => set({ query }),

  problemsFor: (repoPath) => get().resultByRepo[repoPath]?.problems ?? [],

  setMode: (mode) => set({ mode }),

  scanTodos: async (repoPath) => {
    if (get().todoRunningByRepo[repoPath]) return
    set((s) => ({ todoRunningByRepo: { ...s.todoRunningByRepo, [repoPath]: true } }))
    try {
      const result = await window.api.todoScan.run(repoPath)
      set((s) => ({ todoByRepo: { ...s.todoByRepo, [repoPath]: result } }))
    } catch (e) {
      useUIStore.getState().toast('error', e instanceof Error ? e.message : String(e))
    } finally {
      set((s) => ({ todoRunningByRepo: { ...s.todoRunningByRepo, [repoPath]: false } }))
    }
  },

  cancelTodos: (repoPath) => {
    window.api.todoScan.cancel(repoPath)
    set((s) => ({ todoRunningByRepo: { ...s.todoRunningByRepo, [repoPath]: false } }))
  },

  toggleTag: (tag) =>
    set((s) => ({ tags: s.tags.includes(tag) ? s.tags.filter((x) => x !== tag) : [...s.tags, tag] })),

  toggleOwner: (owner) =>
    set((s) => ({ owners: s.owners.includes(owner) ? s.owners.filter((x) => x !== owner) : [...s.owners, owner] })),

  setTodoQuery: (todoQuery) => set({ todoQuery }),
  setGroupBy: (groupBy) => set({ groupBy }),

  todosFor: (repoPath) => get().todoByRepo[repoPath]?.todos ?? []
}))
