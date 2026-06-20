// Heuristics for spotting secret-bearing files and masking their values in the
// UI, so a screenshot / screen-share / shoulder-surfer never leaks credentials.
// Masking is display-only — it never alters the file on disk or what gets staged.

const SECRET_FILE_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\.[\w.-]+)?$/i, // .env, .env.local, .env.production…
  /(^|\/)\.envrc$/i,
  /\.(pem|key|p12|pfx|keystore|jks)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pgpass$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)credentials(\.json)?$/i,
  /(^|\/)secrets?\.(ya?ml|json|toml|ini)$/i
]

// Committed-by-design templates that merely share the .env shape — never masked
// or guarded, since they hold placeholders, not real secrets.
const SECRET_FILE_ALLOW = /(^|\/)\.env\.(example|sample|template|dist|defaults?)$/i

/** True when a path looks like it holds credentials. */
export function isSecretFile(path: string): boolean {
  if (SECRET_FILE_ALLOW.test(path)) return false
  return SECRET_FILE_PATTERNS.some((re) => re.test(path))
}

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
