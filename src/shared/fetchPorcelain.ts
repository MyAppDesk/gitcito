import type { ForcedRefUpdate } from './types'

/**
 * Decoder for `git fetch --porcelain`, which prints one machine-readable line
 * per updated ref:
 *
 *     <flag> <old-oid> <new-oid> <local-ref>
 *
 * The flag is a space for a fast-forward, `*` for a new ref, `-` for a pruned
 * one, `t` for a tag update and **`+` for a forced update** — the one that
 * matters here, because it means someone rewrote history on the remote and the
 * commits you already reviewed are gone.
 */
export function parseForcedUpdates(out: string): ForcedRefUpdate[] {
  const forced: ForcedRefUpdate[] = []
  for (const line of out.split('\n')) {
    if (!line.startsWith('+')) continue
    const [, oldSha, newSha, ref] = line.split(' ')
    // A zero old-oid would mean "brand new ref", which is not a rewrite.
    if (!oldSha || !newSha || !ref || /^0+$/.test(oldSha)) continue
    forced.push({
      ref: ref.replace(/^refs\/remotes\//, ''),
      oldSha,
      newSha
    })
  }
  return forced
}
