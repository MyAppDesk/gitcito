import type { AccountLink } from './types'

/**
 * Whether `s` can be an account name in a link. It is written into git's
 * credential protocol (`username=…`, one field per line) and passed to
 * `gh --user=`, and links travel with imported or securely shared settings —
 * so a line break would add fields to that request (a `host=` of the sender's
 * choosing), and a leading dash would read as a flag. No account name has either.
 */
export function isAccountLogin(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s\x00-\x1f\x7f-][^\x00-\x1f\x7f]{0,254}$/.test(s)
}

/** A well-formed link, or undefined — the one gate every stored or received link goes through. */
export function validAccountLink(value: unknown): AccountLink | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { source, login } = value as { source?: unknown; login?: unknown }
  if (source !== 'git' && source !== 'gh') return undefined
  return isAccountLogin(login) ? { source, login } : undefined
}

/** A profile's credentials for one provider: its PAT and/or its machine-login link. */
export interface HostAuthInput {
  token?: string
  link?: AccountLink
}

/**
 * Which profile's credentials a hosting API call should use.
 *
 * - A repository bound to a profile uses that profile — its PAT, else its link,
 *   else nothing. The same rule `activeProfileToken` applies to fetch and push,
 *   so one repository never authenticates as two accounts. This holds for
 *   background refreshes of tabs that are not active, where the renderer only
 *   knows the active profile.
 * - Otherwise the PAT the renderer sent, else the active profile's PAT and
 *   link. The renderer sends no PAT until Settings is opened (only
 *   `settings:unlock` decrypts), and it never sends links, so the active
 *   profile is read here.
 *
 * An empty result means the profile is not connected for this provider. A
 * machine-wide login is never used without a link — see `apiToken`.
 */
export async function pickHostAuth(opts: {
  sent?: string
  /** Present only when the repository is explicitly bound to a profile. */
  bound?: HostAuthInput
  active?: () => Promise<HostAuthInput>
}): Promise<HostAuthInput> {
  const clean = (a: HostAuthInput): HostAuthInput => ({ token: a.token?.trim() || undefined, link: a.link })
  if (opts.bound) return clean(opts.bound)
  const sent = opts.sent?.trim()
  if (sent) return { token: sent }
  return opts.active ? clean(await opts.active()) : {}
}

/**
 * Whether `held` — another profile's link for the same provider — is the account
 * a sign-in just found: same login (case-insensitive, as hosts treat them), or
 * the same machine entry (same source and stored login).
 */
export function linkHoldsAccount(held: AccountLink | undefined, login: string, found: AccountLink): boolean {
  if (!held) return false
  const eq = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()
  return eq(held.login, login) || (held.source === found.source && eq(held.login, found.login))
}
