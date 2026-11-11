/**
 * Hand git one credential for one host, for one command, without writing it
 * anywhere.
 *
 * The profile's PAT (or linked login) used to be spliced into the remote URL in
 * `.git/config` for the duration of a fetch or push and put back afterwards: a
 * crash in between left it on disk, two operations raced for `config.lock`, and
 * a read (`ls-remote`) had to put the token in its argv instead — readable by
 * any local user in the process list.
 *
 * Instead, git's own config-from-environment (`GIT_CONFIG_COUNT`/`KEY`/`VALUE`,
 * git ≥ 2.31) registers a credential helper for this host only, after an empty
 * entry that clears any helper the user configured for it — so the profile's
 * account answers, not whichever login the machine holds, and the token is never
 * offered to the helper to `store`. The helper is a shell one-liner that prints
 * the pair from two environment variables, so the secret is in neither the
 * config nor an argument list.
 */

export const GIT_USERNAME_VAR = 'GITCITO_GIT_USERNAME'
export const GIT_PASSWORD_VAR = 'GITCITO_GIT_PASSWORD'

// Answers `get` only; `store` and `erase` are no-ops, so nothing persists it.
const HELPER = `!f() { test "$1" = get || exit 0; printf 'username=%s\\npassword=%s\\n' "$${GIT_USERNAME_VAR}" "$${GIT_PASSWORD_VAR}"; }; f`

export interface BasicCredential {
  username: string
  password: string
}

/**
 * Environment additions that make git authenticate `url`'s host with `cred`.
 * Null when it cannot apply: not https, an unparseable URL, or a value with a
 * line break (the credential protocol is line-based; such a value would add
 * fields of its own).
 */
export function gitCredentialEnv(
  url: string,
  cred: BasicCredential,
  base: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv | null {
  let origin: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    origin = `${u.protocol}//${u.host}`
  } catch {
    return null
  }
  if (/[\r\n\0]/.test(cred.username) || /[\r\n\0]/.test(cred.password) || !cred.password) return null

  // Append to config the caller may already pass this way rather than replace it.
  const n = Number.parseInt(base.GIT_CONFIG_COUNT ?? '', 10)
  const at = Number.isFinite(n) && n > 0 ? n : 0
  const key = `credential.${origin}.helper`
  return {
    GIT_CONFIG_COUNT: String(at + 2),
    [`GIT_CONFIG_KEY_${at}`]: key,
    [`GIT_CONFIG_VALUE_${at}`]: '',
    [`GIT_CONFIG_KEY_${at + 1}`]: key,
    [`GIT_CONFIG_VALUE_${at + 1}`]: HELPER,
    [GIT_USERNAME_VAR]: cred.username,
    [GIT_PASSWORD_VAR]: cred.password
  }
}
