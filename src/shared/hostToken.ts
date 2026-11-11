/**
 * Which personal access token a hosting API call should use.
 *
 * - A repository bound to a profile uses that profile's token, or none — the
 *   same rule `activeProfileToken` applies to fetch and push, so one repository
 *   never authenticates as two accounts. This holds for background refreshes of
 *   tabs that are not active, where the renderer only knows the active profile.
 * - Otherwise the token the renderer sent, else the active profile's. The
 *   renderer sends none until Settings is opened (only `settings:unlock`
 *   decrypts), which is why the active profile is consulted at all.
 *
 * `undefined` means "no PAT": the caller then borrows git's credential helper.
 */
export function pickHostToken(opts: {
  sent?: string
  /** Present only when the repository is explicitly bound to a profile. */
  bound?: { token?: string }
  active?: () => Promise<string | undefined>
}): Promise<string | undefined> {
  const clean = (s: string | undefined): string | undefined => s?.trim() || undefined
  if (opts.bound) return Promise.resolve(clean(opts.bound.token))
  const sent = clean(opts.sent)
  if (sent || !opts.active) return Promise.resolve(sent)
  return opts.active().then(clean)
}
