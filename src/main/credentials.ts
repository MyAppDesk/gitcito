import { execFile } from 'child_process'
import type { RepoHost } from '../shared/types'

/**
 * Credentials borrowed from git's own credential helper.
 *
 * Every machine that can `git clone` a private repo already has a working
 * credential for it — stored by osxkeychain, or minted on demand by Git
 * Credential Manager (which does the Entra ID / OAuth dance for Azure DevOps
 * and GitHub). Gitcito used to ignore all of that and demand its own PAT per
 * provider per profile, which is why multi-org Azure DevOps was painful: one
 * PAT field cannot hold four organizations' tokens.
 *
 * Asking `git credential fill` instead makes the credential *per URL*, so every
 * organization resolves independently with no configuration at all. A PAT typed
 * into Settings still wins — this is the fallback for when none is set.
 */

export interface GitCredential {
  username: string
  password: string
}

/** How the helper may behave when it has nothing cached. */
export interface FillOpts {
  /** Allow the helper to open a login window / prompt. Off for background polling. */
  interactive?: boolean
  /** Run inside this repo so repo-local `credential.*` config applies. */
  repoPath?: string
}

export type GitHubCliAuthStatus = 'missing' | 'signed-out' | 'authenticated'

/** Credential lookups are cached per key for this long, to avoid spawning git per API call. */
const TTL_MS = 5 * 60 * 1000
/** A helper that opens a GUI gets this long; a silent one should answer immediately. */
const TIMEOUT_INTERACTIVE_MS = 120_000
const TIMEOUT_SILENT_MS = 10_000

interface CacheEntry {
  cred: GitCredential | null
  at: number
}
const cache = new Map<string, CacheEntry>()

/**
 * The parts of a URL the credential helper matches on. Only https is handled:
 * ssh remotes authenticate through the agent and never reach this path.
 */
function describe(url: string): { protocol: string; host: string; path: string } | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return {
      protocol: u.protocol.replace(':', ''),
      host: u.host, // includes a non-default port, which git wants
      path: u.pathname.replace(/^\/+/, '').replace(/\.git$/, '')
    }
  } catch {
    return null
  }
}

/**
 * Cache key. Azure DevOps puts the organization in the first path segment and
 * each org needs its own token, so the key has to include it — keying on host
 * alone would hand org B the credential minted for org A.
 */
function cacheKey(d: { protocol: string; host: string; path: string }): string {
  const org = d.host.endsWith('dev.azure.com') ? d.path.split('/')[0] : ''
  return `${d.protocol}://${d.host}/${org}`
}

/** Feed a `key=value` block to a `git credential <verb>` command. */
function runCredential(
  verb: 'fill' | 'reject',
  input: string,
  opts: FillOpts
): Promise<string | null> {
  const interactive = !!opts.interactive
  const args: string[] = []
  if (opts.repoPath) args.push('-C', opts.repoPath)
  // `credential.interactive=false` is honoured by Git Credential Manager; the
  // env vars cover git itself and GCM's older name for the same switch.
  if (!interactive) args.push('-c', 'credential.interactive=false')
  args.push('credential', verb)

  const env: NodeJS.ProcessEnv = { ...process.env }
  if (!interactive) {
    env.GIT_TERMINAL_PROMPT = '0'
    env.GCM_INTERACTIVE = 'never'
  }

  return new Promise((resolve) => {
    const child = execFile(
      'git',
      args,
      { env, timeout: interactive ? TIMEOUT_INTERACTIVE_MS : TIMEOUT_SILENT_MS },
      (err, stdout) => resolve(err ? null : stdout)
    )
    child.stdin?.end(input)
  })
}

export function parseCredential(stdout: string): GitCredential | null {
  const out: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0) out[line.slice(0, eq)] = line.slice(eq + 1).replace(/\r$/, '')
  }
  // A helper that knows nothing returns the request back without a password.
  if (!out.password) return null
  return { username: out.username ?? '', password: out.password }
}

/**
 * Ask git for the credential it would use for `url`, or null when no helper is
 * configured, none is cached and prompting is off, or the helper failed.
 */
export async function credentialFor(url: string, opts: FillOpts = {}): Promise<GitCredential | null> {
  const d = describe(url)
  if (!d) return null

  const key = cacheKey(d)
  const hit = cache.get(key)
  // A cached miss is honoured too, so background polling on an unconfigured host
  // does not respawn git every few seconds. An interactive ask ignores it: the
  // user is explicitly trying to connect and deserves the login window.
  if (hit && Date.now() - hit.at < TTL_MS && !(opts.interactive && !hit.cred)) return hit.cred

  const stdout = await runCredential('fill', `protocol=${d.protocol}\nhost=${d.host}\npath=${d.path}\n\n`, opts)
  const cred = stdout ? parseCredential(stdout) : null
  cache.set(key, { cred, at: Date.now() })
  return cred
}

/**
 * Tell git a credential was rejected, so the helper erases it and mints a fresh
 * one next time. Called when the host answers 401/403 with a helper-sourced
 * credential — otherwise an expired token stays cached until it is evicted.
 */
export async function forgetCredential(url: string, cred: GitCredential): Promise<void> {
  const d = describe(url)
  if (!d) return
  cache.delete(cacheKey(d))
  await runCredential(
    'reject',
    `protocol=${d.protocol}\nhost=${d.host}\npath=${d.path}\nusername=${cred.username}\npassword=${cred.password}\n\n`,
    {}
  )
}

/** Drop every cached lookup (e.g. after the user edits their tokens). */
export function clearCredentialCache(): void {
  cache.clear()
}

/**
 * An Entra ID / OAuth access token is a JWT; a PAT is opaque. The distinction
 * matters because the two want different Authorization schemes on most hosts.
 */
export function isJwt(token: string): boolean {
  return /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(token)
}

/**
 * The token a host's REST API should use, preferring one the user typed into
 * Settings and falling back to whatever git already has for that remote.
 * Returns the source too, so a 401 can invalidate a borrowed credential.
 */
export async function apiToken(
  remoteUrl: string,
  configured: string | undefined,
  opts: FillOpts = {}
): Promise<{ token: string; cred?: GitCredential } | null> {
  if (configured?.trim()) return { token: configured.trim() }
  const cred = await credentialFor(remoteUrl, opts)
  return cred ? { token: cred.password, cred } : null
}

/** Whether any credential helper is configured at all — used to explain the setup state. */
export async function hasCredentialHelper(repoPath?: string): Promise<boolean> {
  const args = repoPath ? ['-C', repoPath] : []
  return new Promise((resolve) => {
    execFile('git', [...args, 'config', '--get-all', 'credential.helper'], (err, stdout) =>
      resolve(!err && stdout.trim().length > 0)
    )
  })
}

/**
 * Explain why Git could not borrow a GitHub credential without ever reading or
 * returning the token itself. `gh auth status` is non-interactive: success means
 * the CLI has an account, while any ordinary failure means it is installed but
 * signed out (or its saved login is no longer valid).
 */
export function githubCliAuthStatus(): Promise<GitHubCliAuthStatus> {
  return new Promise((resolve) => {
    execFile('gh', ['auth', 'status', '--hostname', 'github.com'], { timeout: TIMEOUT_SILENT_MS }, (err) => {
      if (!err) return resolve('authenticated')
      resolve((err as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'signed-out')
    })
  })
}

/** Provider a host name belongs to, for picking the right Authorization scheme. */
export function providerOfHost(host: string): RepoHost | undefined {
  const h = host.toLowerCase()
  if (h === 'github.com' || h.endsWith('.github.com')) return 'github'
  if (h === 'dev.azure.com' || h.endsWith('.visualstudio.com')) return 'azure'
  if (h === 'gitlab.com' || h.endsWith('.gitlab.com')) return 'gitlab'
  if (h === 'bitbucket.org' || h.endsWith('.bitbucket.org')) return 'bitbucket'
  return undefined
}
