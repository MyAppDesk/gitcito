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
import { parseWorkflowName, type LocalCiStatus, type LocalCiWorkflow } from '../shared/localCi'

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

export function registerLocalCiHandlers(): void {
  ipcMain.handle('localci:status', () => status())
  ipcMain.handle('localci:workflows', (_e, repoPath: string) => workflows(repoPath))
  ipcMain.handle('localci:run', (e, repoPath: string, workflowFile: string) => run(repoPath, workflowFile, e.sender))
  ipcMain.handle('localci:cancel', (_e, repoPath: string) => cancel(repoPath))
}

// Exported for tests (vitest imports the module directly, no IPC).
export const localCiService = { status, workflows, run, cancel }
