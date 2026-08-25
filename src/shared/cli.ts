/** The `gitcito` command line: what an invocation can ask the app to do, and
 *  how that request survives the trip through Chromium's argv parser.
 *
 *  Two halves live behind the one binary. Everything in this file is the
 *  *launcher* half — a request that needs the window, forwarded to the running
 *  instance over IPC. The *headless* half (`gitcito doctor`, `status`, …) never
 *  reaches Electron at all; it runs as plain Node out of `main/cliEntry.ts`. */

/** A surface the CLI can ask the window to open once the repository is on
 *  screen. Kept as a flat string union rather than the renderer's `ModalSpec`
 *  because `shared/` must not know what a modal is — the renderer owns the
 *  mapping from a verb to whatever component implements it. */
export const CLI_VIEWS = [
  'absorb',
  'bisect',
  'blame',
  'changelog',
  'chat',
  'clean',
  'conflicts',
  'diff',
  'export',
  'file',
  'gitflow',
  'graph',
  'history',
  'hooks',
  'insights',
  'lfs',
  'ci',
  'maintenance',
  'objects',
  'purge',
  'reflog',
  'search',
  'settings',
  'show',
  'snapshots',
  'sparse',
  'stack',
  'stash',
  'subtree',
  'terminal',
  'timelapse',
  'time-machine',
  'todos'
] as const

export type CliView = (typeof CLI_VIEWS)[number]

export function isCliView(value: string): value is CliView {
  return (CLI_VIEWS as readonly string[]).includes(value)
}

/** Payload carried by a `gitcito <dir> [-n name] [-g group] [verb …]` CLI
 *  invocation. Parsed by the main process from `process.argv` on cold launch
 *  and from the `second-instance` event's argv on subsequent invocations (see
 *  src/main/index.ts), then forwarded to the renderer over IPC. */
export interface CliOpenPayload {
  path: string
  name?: string
  group?: string
  /** Surface to open once the repository is on screen. */
  view?: CliView
  /** The view's subject: a ref for `show`, a path for `blame`/`file`, a query
   *  for `search`. Untrusted — the renderer treats it as data, never a path it
   *  resolves outside the repository. */
  arg?: string
  /** 1-based line to scroll to, for the file-backed views. */
  line?: number
  /** Absolute path of a file the app was asked to edit on git's behalf
   *  (`core.editor = gitcito --wait`). */
  edit?: string
  /** Sentinel file the waiting shell process polls. Main deletes it when the
   *  edit finishes, which is what unblocks git. */
  wait?: string
}

/** Extracts the `--flag=value` switches the bundled shim (resources/cli/gitcito)
 *  passes through `open -a Gitcito --args`.
 *
 *  Flags MUST use the `--flag=value` form (single token), not `--flag value`
 *  (two tokens). Electron/Chromium's command-line parser reorders argv
 *  before Electron's `second-instance` event fires — it hoists all
 *  recognized `--switch` tokens ahead of bare positional values, breaking
 *  the adjacency a two-token `--flag value` pair depends on. A single
 *  `--flag=value` token survives that reordering intact. */
export function parseCliOpenArgs(argv: string[]): CliOpenPayload | null {
  const readFlag = (flag: string): string | undefined => {
    const prefix = `${flag}=`
    const token = argv.find((a) => a.startsWith(prefix))
    return token ? token.slice(prefix.length) : undefined
  }

  const path = readFlag('--open')
  if (!path) return null

  const view = readFlag('--view')
  const lineRaw = readFlag('--line')
  const line = lineRaw && /^\d{1,9}$/.test(lineRaw) ? Number(lineRaw) : undefined

  return {
    path,
    name: readFlag('--name'),
    group: readFlag('--group'),
    // An unknown verb is dropped rather than passed on: a future shim talking
    // to an older app should still open the repository.
    view: view && isCliView(view) ? view : undefined,
    arg: readFlag('--arg'),
    line,
    edit: readFlag('--edit'),
    wait: readFlag('--wait')
  }
}
