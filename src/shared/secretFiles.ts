// Heuristics for spotting secret-bearing files by path. Shared between the
// renderer (diff/file-view masking) and the main process (secure-share file
// picker, which pre-selects likely secrets).

const SECRET_FILE_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\.[\w.-]+)?$/i, // .env, .env.local, .env.production…
  /(^|\/)\.envrc$/i,
  /\.(pem|key|p12|pfx|keystore|jks)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pgpass$/i,
  // Apple signing material. A .mobileprovision embeds the team's certificates,
  // and a .p8 is an App Store Connect key — both are committed by accident far
  // more often than on purpose. A .cer is deliberately public, so it is absent.
  /\.(mobileprovision|provisionprofile|p8)$/i,
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
