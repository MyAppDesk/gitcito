import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync } from 'fs'
import { readFile, mkdir, chmod } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import {
  agentFingerprints,
  parseKeygenLine,
  privateKeyName,
  publicKeyFiles,
  readSshTest,
  type SshKey,
  type SshStatus,
  type SshTest
} from '../shared/sshKeys'

const pexecFile = promisify(execFile)

/**
 * SSH keys, the auth path Gitcito never owned but always depended on: a `git@`
 * remote authenticates through the system ssh, and `GIT_TERMINAL_PROMPT=0` does
 * nothing for it. All this module does is make that machinery inspectable —
 * which keys exist, whether the agent holds them, whether the host accepts them.
 *
 * Hard rule: **a private key is never read, never displayed, never transmitted.**
 * Only public halves and fingerprints leave this file.
 */

/**
 * Where the keys live. Normally `~/.ssh`, and only ever that.
 *
 * The screenshot harness needs a deterministic, publishable set of keys instead
 * of whoever ran it — a documentation shot must not carry a real fingerprint or
 * the email in a key comment. It gets one by pointing this at a throwaway
 * directory, and the override is honoured **only** in `--shot` mode, the same
 * flag that enables the capture bridge. A normal run cannot be redirected by an
 * environment variable.
 */
const sshDir = (): string => {
  const override = process.argv.includes('--shot') ? process.env['GITCITO_SSH_DIR'] : undefined
  return override || join(homedir(), '.ssh')
}

/** Hosts we know an SSH endpoint for, for the connection test. */
const TEST_HOSTS: Record<string, string> = {
  github: 'git@github.com',
  gitlab: 'git@gitlab.com',
  bitbucket: 'git@bitbucket.org',
  azure: 'git@ssh.dev.azure.com'
}

async function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await pexecFile(cmd, args, {
      // No tty here, so anything that would prompt must fail instead of hanging.
      env: { ...process.env, DISPLAY: '', SSH_ASKPASS: '', GIT_TERMINAL_PROMPT: '0' }
    })
    return { stdout: String(stdout), stderr: String(stderr) }
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return { stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? e.message ?? '') }
  }
}

export async function sshStatus(): Promise<SshStatus> {
  const dir = sshDir()
  if (!existsSync(dir)) return { dir, keys: [], agentRunning: false }

  const agent = await run('ssh-add', ['-l'])
  const loaded = agentFingerprints(agent.stdout)
  // "The agent has no identities" is a running agent with nothing in it; only a
  // connection failure means there is no agent to talk to.
  const agentRunning = !/could not open a connection|error connecting/i.test(agent.stderr + agent.stdout)

  const keys: SshKey[] = []
  for (const file of publicKeyFiles(readdirSync(dir))) {
    const path = join(dir, file)
    const info = parseKeygenLine((await run('ssh-keygen', ['-lf', path])).stdout)
    if (!info) continue
    const publicKey = (await readFile(path, 'utf-8').catch(() => '')).trim()
    keys.push({
      file,
      path,
      type: info.type,
      bits: info.bits,
      fingerprint: info.fingerprint,
      comment: info.comment,
      publicKey,
      inAgent: loaded.has(info.fingerprint),
      hasPrivate: existsSync(join(dir, privateKeyName(file)))
    })
  }
  return { dir, keys, agentRunning }
}

/**
 * Create an ed25519 key. Refuses to touch an existing file — overwriting a
 * private key destroys access to every host that trusts it, and no dialog makes
 * that recoverable.
 */
export async function sshGenerate(name: string, comment: string, passphrase: string): Promise<string> {
  const safe = name.trim().replace(/[^\w.@-]/g, '')
  if (!safe) throw new Error('A file name is required.')
  const dir = sshDir()
  await mkdir(dir, { recursive: true })
  await chmod(dir, 0o700).catch(() => undefined)
  const target = join(dir, safe)
  if (existsSync(target) || existsSync(`${target}.pub`)) {
    throw new Error(`A key called "${safe}" already exists. Choose another name.`)
  }
  // -N takes the passphrase directly; an empty string means "no passphrase",
  // which is what the user asked for when they leave the field blank.
  const res = await run('ssh-keygen', ['-t', 'ed25519', '-f', target, '-C', comment.trim(), '-N', passphrase])
  if (!existsSync(`${target}.pub`)) throw new Error(res.stderr.trim() || 'ssh-keygen failed.')
  return `${target}.pub`
}

/** Load a key into the running agent. Returns '' on success, else the reason. */
export async function sshAddToAgent(publicKeyPath: string, passphrase: string): Promise<string> {
  const privatePath = privateKeyName(publicKeyPath)
  if (!existsSync(privatePath)) return 'The private key for this entry is not on this machine.'
  // macOS can persist the passphrase in the login keychain, which is the whole
  // reason "add to agent" survives a reboot there.
  const args = process.platform === 'darwin' ? ['--apple-use-keychain', privatePath] : [privatePath]

  if (!passphrase) {
    const res = await run('ssh-add', args)
    return readAddResult(`${res.stdout}${res.stderr}`)
  }

  // ssh-add takes a passphrase from the tty or from an askpass helper — never
  // from stdin — and there is no tty here. The helper is a throwaway script that
  // echoes an environment variable: the passphrase never reaches disk, and never
  // reaches argv where any other process could read it off the process list.
  const { writeFile, rm, mkdtemp } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const dir = await mkdtemp(join(tmpdir(), 'gitcito-askpass-'))
  const askpass = join(dir, 'askpass.sh')
  await writeFile(askpass, '#!/bin/sh\nprintf %s "$GITCITO_SSH_PASSPHRASE"\n', { mode: 0o700 })
  try {
    const { stdout, stderr } = await pexecFile('ssh-add', args, {
      env: {
        ...process.env,
        SSH_ASKPASS: askpass,
        // OpenSSH 8.4+ honours the helper without a DISPLAY; older builds insist
        // on one, so both are set.
        SSH_ASKPASS_REQUIRE: 'force',
        DISPLAY: process.env['DISPLAY'] || ':0',
        GITCITO_SSH_PASSPHRASE: passphrase
      }
    }).catch((e: { stdout?: string; stderr?: string; message?: string }) => ({
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? ''
    }))
    return readAddResult(`${stdout}${stderr}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** ssh-add says "Identity added: …" on success and prints nothing at all on
 *  some platforms; anything else is the failure worth showing. */
function readAddResult(output: string): string {
  if (/identity added/i.test(output) || !output.trim()) return ''
  return output.trim()
}

/** `ssh -T git@host`: does this machine authenticate to that host at all? */
export async function sshTest(host: string): Promise<SshTest> {
  const target = TEST_HOSTS[host]
  if (!target) return { result: 'unknown', output: `Unknown host: ${host}` }
  const res = await run('ssh', [
    '-T',
    // A first-time host would otherwise block on the fingerprint question with
    // no tty to answer it.
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=10',
    target
  ])
  const output = `${res.stdout}${res.stderr}`.trim()
  return { result: readSshTest(output), output }
}

export function registerSshHandlers(): void {
  ipcMain.handle('ssh:status', () => sshStatus())
  ipcMain.handle('ssh:generate', (_e, name: string, comment: string, passphrase: string) =>
    sshGenerate(name, comment, passphrase)
  )
  ipcMain.handle('ssh:addToAgent', (_e, publicKeyPath: string, passphrase: string) =>
    sshAddToAgent(publicKeyPath, passphrase)
  )
  ipcMain.handle('ssh:test', (_e, host: string) => sshTest(host))
}
