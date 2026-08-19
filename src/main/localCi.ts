// Local CI: run the repository's GitHub Actions workflows on this machine via
// nektos/act — deliberately an *optional integration*, not a bundled runtime.
// Gitcito only orchestrates: it detects act and Docker, lists workflow files,
// spawns `act` and streams its output. Installing the tools is the user's
// explicit choice, guided by the UI.
import { ipcMain } from 'electron'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { parseWorkflowName, type LocalCiStatus, type LocalCiVerdict, type LocalCiWorkflow } from '../shared/localCi'

const pexecFile = promisify(execFile)

/** One run per repo at a time; a second Run press means "restart". */
const running = new Map<string, ReturnType<typeof spawn>>()

async function status(): Promise<LocalCiStatus> {
  const act = await pexecFile('act', ['--version'])
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
  running.get(repoPath)?.kill('SIGTERM')
  running.delete(repoPath)
}

/**
 * Spawn act for one workflow file and stream its output to the caller's window
 * over `localci:data`. Resolves with the exit code (null when killed). The
 * workflow name is taken from our own listing, so the path never leaves
 * `.github/workflows/`.
 */
function run(repoPath: string, workflowFile: string, sender: Electron.WebContents): Promise<number | null> {
  if (workflowFile.includes('/') || workflowFile.includes('..')) {
    return Promise.reject(new Error(`Not a workflow filename: ${workflowFile}`))
  }
  cancel(repoPath)
  return new Promise((resolve, reject) => {
    const child = spawn('act', ['--workflows', join('.github', 'workflows', workflowFile), '--rm'], {
      cwd: repoPath,
      env: process.env
    })
    running.set(repoPath, child)
    const emit = (chunk: Buffer): void => {
      if (!sender.isDestroyed()) sender.send('localci:data', { repoPath, chunk: chunk.toString() })
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
}

// Exported for tests (vitest imports the module directly, no IPC).
export const localCiService = { status, workflows, run, cancel, record, verdicts }
