import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { promisify } from 'util'
import { gitSupportsCredentialEnv } from './gitCredentialEnv'
import type { DoctorStatus, EnvCheck } from '../shared/types'

/**
 * The machine-wide environment check: what Gitcito relies on outside its own
 * bundle. The repository doctor (repoConfig.ts) answers "can this repo build
 * here"; this answers "will the app itself behave" — the failures that
 * otherwise surface as a vague error the first time a push or a terminal runs.
 *
 * Every check is read-only. A repair is a shell command for the user to copy;
 * the app never runs sudo or rewrites global config on its own.
 */

const pexecFile = promisify(execFile)

/** Short: the page waits on the slowest check, and `gh auth status` goes to the network. */
const TIMEOUT = 10_000

/** Stdout and stderr of a command, even when it exits non-zero (`gh auth status` does when signed out). */
async function capture(file: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await pexecFile(file, args, {
      cwd: homedir(),
      timeout: TIMEOUT,
      env: { ...process.env, GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' }
    })
    return `${stdout}\n${stderr}`
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
    if (e.code === 'ENOENT') throw err
    return `${e.stdout ?? ''}\n${e.stderr ?? ''}`
  }
}

// ─── Pure readings (tested) ─────────────────────────────────────────────────

export function gitVersionCheck(versionOutput: string): EnvCheck {
  const v = gitSupportsCredentialEnv(versionOutput)
  const actual = /(\d+\.\d+(?:\.\d+)?)/.exec(versionOutput)?.[1]
  return { id: 'git', status: v.ok ? 'ok' : 'warn', ...(actual ? { actual } : {}) }
}

/**
 * `credential.helper` values, in config order, from `git config -z` — each value
 * ends in a NUL, so an empty value (which resets the list: only the helpers
 * after the last one count) cannot be mistaken for a trailing newline.
 */
export function credentialHelperCheck(configOutput: string): EnvCheck {
  // What follows the last NUL is not a value (a newline, stderr).
  const values = configOutput.split('\0').slice(0, -1).map((v) => v.trim())
  const reset = values.lastIndexOf('')
  const helpers = values.slice(reset + 1)
  if (!helpers.length) return { id: 'credentialHelper', status: 'warn' }
  // `store` keeps passwords in plain text in ~/.git-credentials.
  const plain = helpers.find((h) => h.split(/\s+/)[0] === 'store')
  if (plain) return { id: 'credentialHelper', status: 'warn', actual: 'store' }
  return { id: 'credentialHelper', status: 'ok', actual: helpers[helpers.length - 1] }
}

/** The token scopes `gh auth status` reports, or null when it names none (signed out, fine-grained token). */
export function ghTokenScopes(statusOutput: string): string[] | null {
  const m = /Token scopes:\s*(.+)/i.exec(statusOutput)
  if (!m) return null
  const scopes = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
  return scopes.length && !(scopes.length === 1 && scopes[0].toLowerCase() === 'none') ? scopes : null
}

export const GH_WORKFLOW_FIX = 'gh auth refresh -h github.com -s workflow'

export function ghCheck(statusOutput: string): EnvCheck | null {
  const scopes = ghTokenScopes(statusOutput)
  if (!scopes) return null
  return scopes.includes('workflow')
    ? { id: 'gh', status: 'ok', actual: scopes.join(', ') }
    : { id: 'gh', status: 'warn', actual: scopes.join(', '), fix: GH_WORKFLOW_FIX }
}

/**
 * Below this, a few large repositories open at once — each watches up to 4000
 * directories (watcher.ts) — plus an editor doing the same can run out, and new
 * folders stop refreshing the status. Old kernels default to 8192.
 */
export const MIN_INOTIFY_WATCHES = 65_536
export const INOTIFY_FIX =
  'echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/90-inotify.conf && sudo sysctl --system'

export function inotifyCheck(raw: string): EnvCheck | null {
  const n = Number.parseInt(raw.trim(), 10)
  if (!Number.isFinite(n)) return null
  const status: DoctorStatus = n >= MIN_INOTIFY_WATCHES ? 'ok' : 'warn'
  return { id: 'inotify', status, actual: String(n), ...(status === 'warn' ? { fix: INOTIFY_FIX } : {}) }
}

// ─── The probes ─────────────────────────────────────────────────────────────

async function probeGit(): Promise<EnvCheck> {
  try {
    return gitVersionCheck(await capture('git', ['--version']))
  } catch {
    return { id: 'git', status: 'fail' }
  }
}

async function probeLfs(): Promise<EnvCheck> {
  const out = await capture('git', ['lfs', 'version']).catch(() => '')
  const actual = /git-lfs\/(\S+)/.exec(out)?.[1]
  // Only repositories that use LFS need it, so missing is a warning, not a failure.
  return actual ? { id: 'lfs', status: 'ok', actual } : { id: 'lfs', status: 'warn' }
}

function probeTerminal(): EnvCheck {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node-pty')
    return { id: 'terminal', status: 'ok' }
  } catch {
    // A source checkout can rebuild it; an installed app has to be reinstalled.
    return { id: 'terminal', status: 'warn', ...(app?.isPackaged ? {} : { fix: 'npm rebuild node-pty' }) }
  }
}

async function probeCredentialHelper(): Promise<EnvCheck> {
  const out = await capture('git', ['config', '-z', '--get-all', 'credential.helper']).catch(() => '')
  return credentialHelperCheck(out)
}

async function probeGh(): Promise<EnvCheck | null> {
  // Not installed, or not signed in: the GitHub CLI is optional, so no row.
  const out = await capture('gh', ['auth', 'status', '--hostname', 'github.com']).catch(() => '')
  return ghCheck(out)
}

async function probeInotify(): Promise<EnvCheck | null> {
  if (process.platform !== 'linux') return null
  const raw = await readFile('/proc/sys/fs/inotify/max_user_watches', 'utf8').catch(() => '')
  return inotifyCheck(raw)
}

export async function checkEnvironment(): Promise<EnvCheck[]> {
  const probes: Promise<EnvCheck | null>[] = [
    probeGit(),
    probeLfs(),
    Promise.resolve(probeTerminal()),
    probeCredentialHelper(),
    probeGh(),
    probeInotify()
  ]
  // One probe that throws must not take the page down with it.
  const settled = await Promise.all(probes.map((p) => p.catch(() => null)))
  return settled.filter((c): c is EnvCheck => c !== null)
}

export function registerEnvironmentHandlers(): void {
  ipcMain.handle('env:check', () => checkEnvironment())
}
