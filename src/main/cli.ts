import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { lstat, readlink, symlink, unlink, mkdir } from 'fs/promises'

const execFileAsync = promisify(execFile)

// Standard-ish PATH locations, checked in order — mirrors what VS Code / Sublime
// install to. /usr/local/bin is the traditional choice and exists out of the box
// on Intel Macs; Apple Silicon Homebrew installs favor /opt/homebrew/bin, which
// is usually already on PATH for brew users.
const CANDIDATE_DIRS = ['/usr/local/bin', '/opt/homebrew/bin']
const LINK_NAME = 'gitcito'

/** Path to the bundled shim script, inside the packaged app's resources (or the
 *  repo's `resources/` folder in dev). */
function shimPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'cli', 'gitcito')
    : join(__dirname, '../../resources/cli/gitcito')
}

/** First candidate dir that already exists, so we don't try to create new
 *  top-level directories the user never asked for. Falls back to the first
 *  candidate (created on demand) if none exist yet. */
async function targetDir(): Promise<string> {
  for (const dir of CANDIDATE_DIRS) {
    try {
      await lstat(dir)
      return dir
    } catch {
      // doesn't exist — try the next candidate
    }
  }
  return CANDIDATE_DIRS[0]
}

async function linkPath(): Promise<string> {
  return join(await targetDir(), LINK_NAME)
}

/** True only if the symlink exists and already points at our shim — so a
 *  same-named file installed by something else isn't reported as "installed"
 *  (or clobbered on uninstall). */
async function isInstalled(): Promise<boolean> {
  try {
    const link = await linkPath()
    const stat = await lstat(link)
    if (!stat.isSymbolicLink()) return false
    const dest = await readlink(link)
    return dest === shimPath()
  } catch {
    return false
  }
}

/** Runs a shell command with administrator privileges via the macOS Authorization
 *  dialog — same escalation path Finder/VS Code use when writing outside the
 *  user's home directory. */
function runPrivileged(command: string): Promise<void> {
  const script = `do shell script ${JSON.stringify(command)} with administrator privileges`
  return execFileAsync('osascript', ['-e', script]).then(() => undefined)
}

async function install(): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'darwin') return { ok: false, error: 'Only supported on macOS' }
  const shim = shimPath()
  const dir = await targetDir()
  const link = join(dir, LINK_NAME)
  try {
    await mkdir(dir, { recursive: true })
    try {
      await unlink(link)
    } catch {
      // nothing to remove — fine
    }
    await symlink(shim, link)
    return { ok: true }
  } catch (err) {
    // Likely EACCES/EPERM — retry with an admin-privileged shell command.
    try {
      await runPrivileged(`mkdir -p ${dir} && ln -sf ${shim} ${link}`)
      return { ok: true }
    } catch {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

async function uninstall(): Promise<{ ok: boolean; error?: string }> {
  try {
    const link = await linkPath()
    if (!(await isInstalled())) return { ok: true } // nothing to do
    try {
      await unlink(link)
    } catch (err) {
      await runPrivileged(`rm -f ${link}`).catch(() => {
        throw err
      })
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function registerCliHandlers(): void {
  ipcMain.handle('cli:isInstalled', () => isInstalled())
  ipcMain.handle('cli:install', () => install())
  ipcMain.handle('cli:uninstall', () => uninstall())
}
