// Heuristics for masking secret values in the UI, so a screenshot /
// screen-share / shoulder-surfer never leaks credentials. Masking is
// display-only — it never alters the file on disk or what gets staged.
// Path-based detection lives in shared/secretFiles (also used by main).

export { isSecretFile } from '../../../shared/secretFiles'

const MASK = '••••••'
// key = value  /  export KEY="value"  /  key: value  — capture the assigned value.
const ASSIGN = /^(\s*(?:export\s+)?[A-Za-z_][\w.-]*\s*[:=]\s*)(.+\S)\s*$/

/**
 * Mask the value of a single `KEY=value` style line, leaving the key, operator
 * and any leading comment intact. Lines without an assignment pass through.
 */
export function maskSecretLine(line: string): string {
  if (/^\s*#/.test(line)) return line // comment
  const m = ASSIGN.exec(line)
  if (!m) return line
  return `${m[1]}${MASK}`
}
