import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { readFile, readlink } from 'fs/promises'
import { dirname, join } from 'path'
import { promisify } from 'util'

/**
 * The npm scripts the terminal can suggest: those of the package.json nearest
 * the shell's *current* directory, so `cd frontend` suggests the frontend's.
 */

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface PackageScripts {
  dir: string
  manager: PackageManager
  /** Script name → its command, in package.json order. */
  scripts: Record<string, string>
}

const pexecFile = promisify(execFile)

/** The lockfile in a package's directory says which tool runs its scripts. */
export function detectPackageManager(files: readonly string[]): PackageManager {
  if (files.includes('pnpm-lock.yaml')) return 'pnpm'
  if (files.includes('yarn.lock')) return 'yarn'
  if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun'
  return 'npm'
}

/** Where the shell is now: Linux reads /proc, macOS asks lsof, elsewhere unknown. */
export async function shellCwd(pid: number | undefined): Promise<string | null> {
  if (!pid) return null
  try {
    if (process.platform === 'linux') return await readlink(`/proc/${pid}/cwd`)
    if (process.platform === 'darwin') {
      const { stdout } = await pexecFile('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { timeout: 2000 })
      const line = stdout.split('\n').find((l) => l.startsWith('n'))
      return line ? line.slice(1) : null
    }
  } catch {
    // The shell exited, or the platform hides it: fall back to the start dir.
  }
  return null
}

/** The nearest directory at or above `start` holding a package.json — a few levels at most. */
export function nearestPackageDir(start: string, maxUp = 8): string | null {
  let dir = start
  for (let i = 0; i <= maxUp; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  return null
}

export async function readPackageScripts(cwd: string): Promise<PackageScripts | null> {
  const dir = nearestPackageDir(cwd)
  if (!dir) return null
  let parsed: { scripts?: Record<string, unknown> }
  try {
    parsed = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as typeof parsed
  } catch {
    return null
  }
  const scripts: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed.scripts ?? {})) if (typeof v === 'string') scripts[k] = v
  const lockfiles = ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'].filter((f) => existsSync(join(dir, f)))
  return { dir, manager: detectPackageManager(lockfiles), scripts }
}
