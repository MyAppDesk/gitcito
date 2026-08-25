import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { homedir } from 'os'
import { lstat, readlink, symlink, unlink, mkdir, writeFile } from 'fs/promises'

const execFileAsync = promisify(execFile)

// Standard-ish PATH locations, checked in order — mirrors what VS Code / Sublime
// install to. /usr/local/bin is the traditional choice and exists out of the box
// on Intel Macs; Apple Silicon Homebrew installs favor /opt/homebrew/bin, which
// is usually already on PATH for brew users.
const CANDIDATE_DIRS =
  process.platform === 'darwin'
    ? ['/usr/local/bin', '/opt/homebrew/bin']
    : // Linux: prefer the per-user directory, which needs no escalation and is
      // on PATH by default on every modern distribution. /usr/local/bin stays
      // as the fallback for a system-wide install.
      [join(homedir(), '.local', 'bin'), '/usr/local/bin']
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
  if (process.platform !== 'darwin') return Promise.reject(new Error('No privilege escalation available'))
  const script = `do shell script ${JSON.stringify(command)} with administrator privileges`
  return execFileAsync('osascript', ['-e', script]).then(() => undefined)
}

async function install(): Promise<{ ok: boolean; error?: string }> {
  // Windows has no symlink-into-PATH convention and needs an installer-written
  // .cmd shim instead; until that exists, saying so is better than failing at
  // the first `ln`.
  if (process.platform === 'win32') return { ok: false, error: 'Not supported on Windows yet' }
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

// ─── `gitcito --wait` — the git editor ──────────────────────────────────────

/**
 * Sentinel files a `gitcito --wait` shell process is currently blocked on.
 *
 * The shim polls for its sentinel and returns to git the moment it disappears,
 * so deleting one is the *only* signal that matters — and never deleting one
 * hangs `git commit` indefinitely. Everything below exists to guarantee that
 * every sentinel we take responsibility for is eventually removed: on save, on
 * cancel, on window close, on quit.
 */
const pendingWaits = new Map<string, string>()

export function trackWait(sentinel: string, file: string): void {
  pendingWaits.set(sentinel, file)
}

/** Release a waiting `git` process. Safe to call twice. */
async function releaseWait(sentinel: string): Promise<void> {
  pendingWaits.delete(sentinel)
  await unlink(sentinel).catch(() => undefined)
}

/** Release every outstanding wait — called when the app is going away, so a
 *  quit mid-edit aborts the commit instead of freezing the terminal. */
export async function releaseAllWaits(): Promise<void> {
  await Promise.all([...pendingWaits.keys()].map((s) => releaseWait(s)))
}

export function registerCliHandlers(): void {
  ipcMain.handle('cli:isInstalled', () => isInstalled())
  ipcMain.handle('cli:install', () => install())
  ipcMain.handle('cli:uninstall', () => uninstall())

  // The renderer finished (or abandoned) an edit git is waiting on. `content`
  // null means cancel: git treats an empty message as "abort the commit", which
  // is the safe reading of a closed dialog.
  ipcMain.handle(
    'cli:finishEdit',
    async (_e, sentinel: string, content: string | null): Promise<{ ok: boolean; error?: string }> => {
      // Only a sentinel we handed out is honoured, and the file written is the
      // one *we* recorded for it — the renderer never names a path to write to.
      const file = pendingWaits.get(sentinel)
      if (!file) return { ok: false, error: 'No edit is pending' }
      try {
        await writeFile(file, content ?? '', 'utf8')
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      } finally {
        await releaseWait(sentinel)
      }
    }
  )
}
