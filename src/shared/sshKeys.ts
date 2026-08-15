/**
 * Reading what `ssh-keygen` and `ssh-add` print. Pure string work, kept out of
 * the main process so it can be tested without an agent or a `~/.ssh` to poke
 * at — the parsing is the part that breaks between OpenSSH versions.
 *
 * Nothing here ever handles a private key. Fingerprints and public halves only.
 */

export type SshKeyType = 'ed25519' | 'rsa' | 'ecdsa' | 'dsa' | 'ed25519-sk' | 'ecdsa-sk' | 'unknown'

export interface SshKey {
  /** File name of the public key, e.g. `id_ed25519.pub`. */
  file: string
  /** Absolute path of the public key. */
  path: string
  type: SshKeyType
  bits: number
  /** `SHA256:…`, the form `ssh-add -l` prints too. */
  fingerprint: string
  /** Trailing comment, usually an email or machine name. Often empty. */
  comment: string
  /** The whole public key line, which is what a host wants pasted. */
  publicKey: string
  /** True when the agent is holding the matching private key. */
  inAgent: boolean
  /** True when the matching private key file sits next to it. */
  hasPrivate: boolean
}

/** Files in ~/.ssh that are configuration, not keys. */
const NOT_A_KEY = new Set(['config', 'known_hosts', 'known_hosts.old', 'authorized_keys', 'environment', 'rc'])

/** Public-key files in a `~/.ssh` listing, in a stable order. */
export function publicKeyFiles(entries: string[]): string[] {
  return entries
    .filter((name) => name.endsWith('.pub') && !NOT_A_KEY.has(name))
    .sort((a, b) => a.localeCompare(b))
}

function normalizeType(raw: string): SshKeyType {
  const value = raw.replace(/^\(|\)$/g, '').toLowerCase()
  const known: SshKeyType[] = ['ed25519-sk', 'ecdsa-sk', 'ed25519', 'rsa', 'ecdsa', 'dsa']
  return known.find((k) => value === k) ?? 'unknown'
}

export interface KeygenLine {
  bits: number
  fingerprint: string
  comment: string
  type: SshKeyType
}

/**
 * One line of `ssh-keygen -lf <file>` or `ssh-add -l`:
 *
 *     256 SHA256:abc123 you@example.com (ED25519)
 *
 * The comment is the middle, and may contain spaces — or be missing entirely,
 * which older OpenSSH prints as `no comment`.
 */
export function parseKeygenLine(line: string): KeygenLine | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const match = /^(\d+)\s+(\S+)\s*(.*?)\s*(?:\(([^)]+)\))?$/.exec(trimmed)
  if (!match) return null
  const [, bits, fingerprint, rawComment, rawType] = match
  if (!/^(SHA256:|MD5:|[0-9a-f]{2}:)/i.test(fingerprint)) return null
  const comment = rawComment === 'no comment' ? '' : rawComment
  return {
    bits: Number(bits),
    fingerprint,
    comment,
    type: normalizeType(rawType ?? '')
  }
}

/**
 * Fingerprints the agent is holding. `ssh-add -l` exits non-zero with a
 * human sentence when the agent is empty or unreachable, so anything that does
 * not parse as a key line is simply not a fingerprint.
 */
export function agentFingerprints(stdout: string): Set<string> {
  const out = new Set<string>()
  for (const line of stdout.split('\n')) {
    const parsed = parseKeygenLine(line)
    if (parsed) out.add(parsed.fingerprint)
  }
  return out
}

/** The private key file a public key belongs to: `id_ed25519.pub` → `id_ed25519`. */
export function privateKeyName(publicFile: string): string {
  return publicFile.replace(/\.pub$/, '')
}

/**
 * What `ssh -T git@<host>` meant. OpenSSH says "successfully authenticated" and
 * then exits 1 for GitHub, which looks like a failure and is not — so the exit
 * code alone cannot be trusted.
 */
export type SshTestResult = 'ok' | 'denied' | 'unreachable' | 'unknown'

export interface SshTest {
  result: SshTestResult
  /** Raw ssh output, shown verbatim under the verdict — it is often specific. */
  output: string
}

/** What the SSH section of Settings renders. */
export interface SshStatus {
  /** Absolute path of ~/.ssh, shown so the user knows where these live. */
  dir: string
  keys: SshKey[]
  /** False when no agent is reachable at all (SSH_AUTH_SOCK unset, or dead). */
  agentRunning: boolean
}

export function readSshTest(output: string): SshTestResult {
  const text = output.toLowerCase()
  // GitHub: "Hi user! You've successfully authenticated, but GitHub does not
  // provide shell access." GitLab: "Welcome to GitLab, @user!"
  if (/successfully authenticated|welcome to gitlab|logged in as|you can use git/.test(text)) return 'ok'
  if (/permission denied|publickey|authentication failed|access denied/.test(text)) return 'denied'
  if (/could not resolve|connection timed out|connection refused|network is unreachable|no route to host/.test(text)) {
    return 'unreachable'
  }
  return 'unknown'
}
