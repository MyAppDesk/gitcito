import { create } from 'zustand'
import type { AnalyzeResult, Problem, ProblemSeverity } from '../../../shared/types'
import { useUIStore } from './ui'
import { t, interp } from '../i18n'

/**
 * The Problems panel's state: one analyzer sweep per repo, plus the filters the
 * panel shows.
 *
 * Sweeps are never automatic. These commands are the repository's own toolchain
 * — `tsc`, `eslint`, `cargo clippy` — and running them costs real seconds and
 * real CPU, so they happen when the user asks and only then.
 */

export interface ProblemsState {
  resultByRepo: Record<string, AnalyzeResult>
  runningByRepo: Record<string, boolean>
  /** Analyzers the repo asks for, known before the first sweep. */
  availableByRepo: Record<string, string[]>

  /** Panel filters — global, not per repo: they express how you like to read. */
  severities: ProblemSeverity[]
  changedOnly: boolean
  query: string

  detect(repoPath: string): Promise<void>
  run(repoPath: string): Promise<void>
  cancel(repoPath: string): void
  toggleSeverity(severity: ProblemSeverity): void
  setChangedOnly(on: boolean): void
  setQuery(query: string): void
  problemsFor(repoPath: string): Problem[]
}

export const useProblemsStore = create<ProblemsState>((set, get) => ({
  resultByRepo: {},
  runningByRepo: {},
  availableByRepo: {},
  severities: [],
  changedOnly: false,
  query: '',

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

  problemsFor: (repoPath) => get().resultByRepo[repoPath]?.problems ?? []
}))
