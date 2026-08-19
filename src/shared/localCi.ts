// Pure helpers for the local-CI (act) integration. Shared main ↔ renderer and
// unit-tested without act installed.

/** What the local-CI runner found on this machine. */
export interface LocalCiStatus {
  /** `act --version` output, or null when the binary is missing. */
  act: string | null
  /** Docker daemon reachable (act cannot run without it). */
  docker: boolean
}

export interface LocalCiWorkflow {
  /** Filename under .github/workflows (e.g. "ci.yml"). */
  file: string
  /** The workflow's `name:`, or the filename when it has none. */
  name: string
}

/**
 * The top-level `name:` of a workflow YAML, without a YAML parser: the first
 * unindented `name:` line wins. Good enough for a picker label — a wrong guess
 * still runs the right file.
 */
export function parseWorkflowName(text: string): string | null {
  for (const line of text.split('\n')) {
    const m = /^name:\s*(.+?)\s*$/.exec(line)
    if (m) return m[1].replace(/^['"]|['"]$/g, '')
    // Stop scanning once real content starts — `on:`/`jobs:` mean the top of
    // the document has passed without a name.
    if (/^(on|jobs):/.test(line)) break
  }
  return null
}
