// Local CI: run the repository's GitHub Actions workflows on this machine via
// nektos/act — deliberately an *optional integration*, not a bundled runtime.
// Gitcito only orchestrates: it detects act and Docker, lists workflow files,
// spawns `act` and streams its output. Installing the tools is the user's
// explicit choice, guided by the UI.
import { ipcMain } from 'electron'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'
import { readdir, readFile, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  parseWorkflowName,
  type LocalCiStatus,
  type LocalCiSweepResult,
  type LocalCiVerdict,
  type LocalCiWorkflow
} from '../shared/localCi'

const pexecFile = promisify(execFile)

// Overridable so tests (and users with act outside PATH) can point at a
// different runner binary. Tests substitute a tiny script for the real act.
const actBin = (): string => process.env.GITCITO_ACT_BIN || 'act'

/** One run per repo at a time; a second Run press means "restart". */
const running = new Map<string, ReturnType<typeof spawn>>()

/** Active range sweeps, so cancel can stop the loop, not just the current child. */
const sweeping = new Map<string, { abort: boolean }>()

async function status(): Promise<LocalCiStatus> {
  const act = await pexecFile(actBin(), ['--version'])
    .then(({ stdout }) => stdout.trim())
    .catch(() => null)
  // `docker info` answers only when the daemon is actually reachable — the
  // binary existing is not enough for act to work.
  const docker = await pexecFile('docker', ['info', '--format', '{{.ServerVersion}}'])
    .then(() => true)
    .catch(() => false)
  return { act, docker }
}

async function workflows(repoPath: string): Promise<LocalCiWorkflow[]> {
  const dir = join(repoPath, '.github', 'workflows')
  const entries = await readdir(dir).catch(() => [])
  const out: LocalCiWorkflow[] = []
  for (const file of entries.sort()) {
    if (!/\.ya?ml$/.test(file)) continue
    const text = await readFile(join(dir, file), 'utf-8').catch(() => '')
    out.push({ file, name: parseWorkflowName(text) ?? file })
  }
  return out
}

function cancel(repoPath: string): void {
  const s = sweeping.get(repoPath)
  if (s) s.abort = true
  running.get(repoPath)?.kill('SIGTERM')
  running.delete(repoPath)
}

function assertWorkflowFilename(workflowFile: string): void {
  if (workflowFile.includes('/') || workflowFile.includes('..')) {
    throw new Error(`Not a workflow filename: ${workflowFile}`)
  }
}

/** Spawn act in `cwd`, streaming output over `localci:data` keyed by the repo. */
function spawnAct(
  cwd: string,
  repoPath: string,
  workflowFile: string,
  sender: Electron.WebContents,
  sha?: string
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(actBin(), ['--workflows', join('.github', 'workflows', workflowFile), '--rm'], {
      cwd,
      env: process.env
    })
    running.set(repoPath, child)
    const emit = (chunk: Buffer): void => {
      if (!sender.isDestroyed()) sender.send('localci:data', { repoPath, sha, chunk: chunk.toString() })
    }
    child.stdout.on('data', emit)
    child.stderr.on('data', emit)
    child.on('error', (err) => {
      running.delete(repoPath)
      reject(err)
    })
    child.on('close', (code) => {
      running.delete(repoPath)
      resolve(code)
    })
  })
}

/**
 * Spawn act for one workflow file and stream its output to the caller's window
 * over `localci:data`. Resolves with the exit code (null when killed). The
 * workflow name is taken from our own listing, so the path never leaves
 * `.github/workflows/`.
 */
async function run(repoPath: string, workflowFile: string, sender: Electron.WebContents): Promise<number | null> {
  assertWorkflowFilename(workflowFile)
  cancel(repoPath)
  sweeping.delete(repoPath)
  return spawnAct(repoPath, repoPath, workflowFile, sender)
}

/**
 * Run one workflow against a commit you are NOT on: the commit is checked out
 * detached into a throwaway worktree under the OS temp dir, act runs there,
 * and the verdict pins to that sha. The main working tree is never touched,
 * and the worktree is removed however the run ends.
 */
async function runAt(
  repoPath: string,
  workflowFile: string,
  sha: string,
  sender: Electron.WebContents
): Promise<{ sha: string; exit: number | null; ok: boolean; recorded: boolean }> {
  assertWorkflowFilename(workflowFile)
  const full = (await git(repoPath, ['rev-parse', '--verify', `${sha}^{commit}`])).trim()
  const dir = await mkdtemp(join(tmpdir(), 'gitcito-ci-'))
  // Bypasses gitService's repo lock on purpose, like the rest of this module:
  // a CI run can hold the repo for minutes, and the worktree add/remove pair
  // only touches worktree metadata.
  await git(repoPath, ['worktree', 'add', '--detach', dir, full])
  try {
    const exit = await spawnAct(dir, repoPath, workflowFile, sender, full)
    const ok = exit === 0
    let recorded = false
    if (exit !== null) {
      // The worktree is a pristine checkout of `full` by construction, so the
      // clean-tree honesty rule holds without re-checking.
      await recordAt(repoPath, workflowFile, ok, full)
      recorded = true
    }
    return { sha: full, exit, ok, recorded }
  } finally {
    await git(repoPath, ['worktree', 'remove', '--force', dir]).catch(() => undefined)
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Resolve a revision or range spec to the commits a sweep would run, newest
 * first. Returns the total the spec matches plus the capped head of the list,
 * so the UI can state the real cost before anything runs.
 */
async function resolveRange(
  repoPath: string,
  spec: string,
  limit: number
): Promise<{ total: number; shas: string[]; subjects: Record<string, string> }> {
  const clean = spec.trim()
  if (!clean || clean.startsWith('-')) throw new Error(`Not a revision spec: ${spec}`)
  const cap = Math.max(1, Math.min(limit, 50))
  const total = parseInt((await git(repoPath, ['rev-list', '--count', clean, '--'])).trim(), 10) || 0
  const out = await git(repoPath, ['rev-list', `--max-count=${cap}`, '--format=%H %s', '--no-commit-header', clean, '--'])
  const shas: string[] = []
  const subjects: Record<string, string> = {}
  for (const line of out.split('\n')) {
    const m = /^([0-9a-f]{40}) (.*)$/.exec(line.trim())
    if (!m) continue
    shas.push(m[1])
    subjects[m[1]] = m[2]
  }
  return { total, shas, subjects }
}

/**
 * Run one workflow across several commits, sequentially — act plus Docker is
 * heavy enough that parallel runs would fight for the machine. Progress lands
 * on `localci:sweep-progress` per commit; cancel() aborts between commits and
 * kills the one in flight.
 */
async function sweep(
  repoPath: string,
  workflowFile: string,
  shas: string[],
  sender: Electron.WebContents
): Promise<LocalCiSweepResult> {
  assertWorkflowFilename(workflowFile)
  cancel(repoPath)
  const state = { abort: false }
  sweeping.set(repoPath, state)
  const results: LocalCiSweepResult['results'] = []
  try {
    for (let i = 0; i < shas.length; i++) {
      if (state.abort) break
      const sha = shas[i]
      if (!sender.isDestroyed()) {
        sender.send('localci:sweep-progress', { repoPath, sha, index: i, total: shas.length, phase: 'start' })
      }
      const r = await runAt(repoPath, workflowFile, sha, sender).catch((err) => ({
        sha,
        exit: null,
        ok: false,
        recorded: false,
        error: err instanceof Error ? err.message : String(err)
      }))
      results.push({ sha: r.sha, exit: r.exit, ok: r.ok })
      if (!sender.isDestroyed()) {
        sender.send('localci:sweep-progress', {
          repoPath,
          sha: r.sha,
          index: i,
          total: shas.length,
          phase: 'done',
          ok: r.ok,
          exit: r.exit
        })
      }
    }
    return { results, aborted: state.abort }
  } finally {
    sweeping.delete(repoPath)
  }
}

const git = (repoPath: string, args: string[]): Promise<string> =>
  pexecFile('git', ['-C', repoPath, ...args]).then(({ stdout }) => stdout)

/**
 * Pin a finished run's verdict to the commit it tested, as a git note under
 * refs/notes/gitcito-ci. Only recorded when the working tree is CLEAN — a
 * dirty tree means the run tested something no commit contains, and a verdict
 * pinned to HEAD would lie. Notes are local and never pushed by default.
 */
async function record(repoPath: string, workflowFile: string, ok: boolean): Promise<{ recorded: boolean; sha: string }> {
  const dirty = (await git(repoPath, ['status', '--porcelain'])).trim()
  const sha = (await git(repoPath, ['rev-parse', 'HEAD'])).trim()
  if (dirty) return { recorded: false, sha }
  const note = JSON.stringify({ ok, workflow: workflowFile, at: Date.now() })
  await git(repoPath, ['notes', '--ref=gitcito-ci', 'add', '-f', '-m', note, sha])
  return { recorded: true, sha }
}

/** Pin a verdict to an explicit sha — used by worktree runs, which are clean by construction. */
async function recordAt(repoPath: string, workflowFile: string, ok: boolean, sha: string): Promise<void> {
  const note = JSON.stringify({ ok, workflow: workflowFile, at: Date.now() })
  await git(repoPath, ['notes', '--ref=gitcito-ci', 'add', '-f', '-m', note, sha])
}

/** Every recorded verdict, keyed by commit sha — feeds the graph's ✓/✗ badges. */
async function verdicts(repoPath: string): Promise<Record<string, LocalCiVerdict>> {
  const raw = await git(repoPath, ['notes', '--ref=gitcito-ci', 'list']).catch(() => '')
  const out: Record<string, LocalCiVerdict> = {}
  for (const line of raw.split('\n')) {
    const [, sha] = line.trim().split(' ')
    if (!sha) continue
    const body = await git(repoPath, ['notes', '--ref=gitcito-ci', 'show', sha]).catch(() => '')
    try {
      const parsed = JSON.parse(body) as LocalCiVerdict
      if (typeof parsed.ok === 'boolean') out[sha] = { ok: parsed.ok, workflow: parsed.workflow, at: parsed.at }
    } catch {
      /* an unreadable note is just skipped */
    }
  }
  return out
}

export function registerLocalCiHandlers(): void {
  ipcMain.handle('localci:status', () => status())
  ipcMain.handle('localci:workflows', (_e, repoPath: string) => workflows(repoPath))
  ipcMain.handle('localci:run', (e, repoPath: string, workflowFile: string) => run(repoPath, workflowFile, e.sender))
  ipcMain.handle('localci:cancel', (_e, repoPath: string) => cancel(repoPath))
  ipcMain.handle('localci:record', (_e, repoPath: string, workflowFile: string, ok: boolean) =>
    record(repoPath, workflowFile, ok)
  )
  ipcMain.handle('localci:verdicts', (_e, repoPath: string) => verdicts(repoPath))
  ipcMain.handle('localci:runAt', (e, repoPath: string, workflowFile: string, sha: string) =>
    runAt(repoPath, workflowFile, sha, e.sender)
  )
  ipcMain.handle('localci:resolveRange', (_e, repoPath: string, spec: string, limit: number) =>
    resolveRange(repoPath, spec, limit)
  )
  ipcMain.handle('localci:sweep', (e, repoPath: string, workflowFile: string, shas: string[]) =>
    sweep(repoPath, workflowFile, shas, e.sender)
  )
}

// Exported for tests (vitest imports the module directly, no IPC).
export const localCiService = { status, workflows, run, cancel, record, verdicts, runAt, resolveRange, sweep }
