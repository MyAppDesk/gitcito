/** Payload carried by a `gitcito <dir> [-n name] [-g group]` CLI invocation.
 *  Parsed by the main process from `process.argv` on cold launch and from
 *  the `second-instance` event's argv on subsequent invocations (see
 *  src/main/index.ts), then forwarded to the renderer over IPC. */
export interface CliOpenPayload {
  path: string
  name?: string
  group?: string
}

/** Extracts `--open=<path> [--name=<name>] [--group=<group>]` from argv, as
 *  produced by the bundled shim (resources/cli/gitcito) via
 *  `open -a Gitcito --args --open=<dir> --name=<n> --group=<g>`.
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

  return {
    path,
    name: readFlag('--name'),
    group: readFlag('--group')
  }
}
