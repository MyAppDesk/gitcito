/**
 * What each `gitcito <verb>` asks the window to show.
 *
 * Pure on purpose: the CLI's verb vocabulary is a contract with a shell script
 * and a shell script is the one caller that cannot be typechecked, so the
 * mapping is worth testing on its own. `App.tsx` performs the action; this
 * module only decides which one it is.
 */

import type { CliView } from '../../../shared/cli'

/** Modals that need nothing but the repository path. */
const PLAIN_MODALS = {
  absorb: 'absorb',
  bisect: 'bisect',
  clean: 'clean',
  conflicts: 'conflict-radar',
  export: 'export',
  gitflow: 'gitflow',
  hooks: 'hooks',
  lfs: 'lfs',
  maintenance: 'maintenance',
  purge: 'history-purge',
  reflog: 'reflog',
  search: 'code-search',
  settings: 'repo-settings',
  snapshots: 'snapshots',
  sparse: 'sparse',
  stack: 'stack',
  stash: 'stash-partial',
  subtree: 'subtree',
  timelapse: 'timelapse',
  'time-machine': 'time-machine',
  todos: 'todos',
  ci: 'local-ci',
  objects: 'objects'
} as const

export type CliModalKind = (typeof PLAIN_MODALS)[keyof typeof PLAIN_MODALS]

export type CliAction =
  | { kind: 'modal'; modal: CliModalKind; arg?: string }
  /** A file-backed centre view — blame, plain contents, or its history. */
  | { kind: 'file'; mode: 'blame' | 'file' | 'history'; file: string; line?: number }
  /** Select a commit and show its details panel. `ref` still needs resolving. */
  | { kind: 'commit'; ref: string }
  /** The working tree: uncommitted changes, as the composer shows them. */
  | { kind: 'wip' }
  | { kind: 'graph' }
  | { kind: 'terminal' }
  | { kind: 'chat' }
  | { kind: 'page'; page: 'insights' | 'changelog' }

/**
 * Translate one CLI verb into the action that satisfies it.
 *
 * Returns null when the verb needs an argument it was not given — `gitcito
 * blame` with no file has nothing to show, and silently opening the repository
 * is a better outcome than guessing at a file.
 */
export function cliViewAction(view: CliView, arg?: string, line?: number): CliAction | null {
  switch (view) {
    case 'blame':
      return arg ? { kind: 'file', mode: 'blame', file: arg, line } : null
    case 'file':
      return arg ? { kind: 'file', mode: 'file', file: arg, line } : null
    case 'history':
      return arg ? { kind: 'file', mode: 'history', file: arg } : null
    case 'show':
      return arg ? { kind: 'commit', ref: arg } : null
    case 'diff':
      return { kind: 'wip' }
    case 'graph':
      return { kind: 'graph' }
    case 'terminal':
      return { kind: 'terminal' }
    case 'chat':
      return { kind: 'chat' }
    case 'insights':
      return { kind: 'page', page: 'insights' }
    case 'changelog':
      return { kind: 'page', page: 'changelog' }
    // `search` and `objects` carry their subject into the modal; the rest
    // ignore whatever came after the verb.
    case 'search':
      return { kind: 'modal', modal: 'code-search', ...(arg ? { arg } : {}) }
    case 'objects':
      return { kind: 'modal', modal: 'objects', ...(arg ? { arg } : {}) }
    default: {
      const modal = PLAIN_MODALS[view as keyof typeof PLAIN_MODALS]
      return modal ? { kind: 'modal', modal } : null
    }
  }
}
