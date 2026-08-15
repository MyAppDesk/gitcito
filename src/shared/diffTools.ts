/**
 * External diff and merge tools.
 *
 * Gitcito does not keep its own table of Kaleidoscope/Beyond Compare/Meld
 * invocations: git already ships one, knows which of them are installed, and
 * lets a user add their own with `difftool.<name>.cmd`. So the whole feature is
 * a reader for `git difftool --tool-help` plus two commands. Anything the user
 * has already configured for the CLI works here unchanged.
 */

export interface DiffToolInfo {
  /** The `--tool=` value, e.g. `kdiff3`. */
  id: string
  /** Git's own one-line description. */
  description: string
  /** True when git found the tool on this machine. */
  available: boolean
}

/**
 * Parse `git difftool --tool-help` / `git mergetool --tool-help`:
 *
 *     'git difftool --tool=<tool>' may be set to one of the following:
 *             opendiff         Use FileMerge (requires a graphical session)
 *
 *     The following tools are valid, but not currently available:
 *             meld             Use Meld (requires a graphical session)
 *
 * Everything before the "not currently available" heading is installed; what
 * follows is a catalogue git knows but cannot find. Trailing prose after the
 * lists is not indented, which is what separates it from a tool row.
 */
export function parseToolHelp(stdout: string): DiffToolInfo[] {
  const tools: DiffToolInfo[] = []
  let available = true
  for (const raw of stdout.split('\n')) {
    if (/not currently available/i.test(raw)) {
      available = false
      continue
    }
    // Tool rows are indented; headings and the closing prose are not.
    if (!/^\s+\S/.test(raw)) continue
    const match = /^\s+(\S+)\s*(.*)$/.exec(raw.replace(/\s+$/, ''))
    if (!match) continue
    const [, id, description] = match
    // The closing prose is indented on some git builds ("Some of the tools…").
    if (!/^[\w.+-]+$/.test(id)) continue
    tools.push({ id, description: description.trim(), available })
  }
  return tools
}

/** Installed tools first, then the rest, each alphabetically. */
export function sortTools(tools: DiffToolInfo[]): DiffToolInfo[] {
  return [...tools].sort((a, b) =>
    a.available === b.available ? a.id.localeCompare(b.id) : a.available ? -1 : 1
  )
}

/** What the settings UI and the per-file actions need to know. */
export interface DiffToolConfig {
  /** `diff.tool`, empty when unset. */
  diffTool: string
  /** `merge.tool`, empty when unset. */
  mergeTool: string
  /** Tools offered for diffing. */
  diffTools: DiffToolInfo[]
  /** Tools offered for merging — git's two lists differ. */
  mergeTools: DiffToolInfo[]
  /** `mergetool.keepBackup`; when true a `.orig` file is left behind. */
  keepBackup: boolean
}
