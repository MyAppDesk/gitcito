import { spawn, type SpawnOptions } from 'node:child_process'

// Indexing a new worktree runs a third-party CLI, so it is opt-in
// (`codegraphIndexWorktrees`) and never goes through a shell with the path
// in a command string: a folder named `$(rm -rf ~)` must stay a folder name.

type Spawner = (file: string, args: string[], opts: SpawnOptions) => { unref(): void }

/** Characters cmd.exe gives meaning to even inside quotes. */
const CMD_META = /["%!^&|<>\r\n]/

/**
 * The exact process to start, or null when the path can't be passed safely.
 * POSIX: argv straight to the binary, no shell. Windows: `codegraph` is a .cmd
 * shim that Node can only start through cmd.exe, so the path goes as its own
 * quoted argument and any path carrying cmd metacharacters is refused.
 */
export function codegraphCommand(
  dir: string,
  platform: NodeJS.Platform = process.platform
): { file: string; args: string[]; verbatim: boolean } | null {
  if (!dir || dir.includes('\0')) return null
  if (platform !== 'win32') return { file: 'codegraph', args: ['init', dir], verbatim: false }
  if (CMD_META.test(dir)) return null
  return { file: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', `"codegraph init "${dir}""`], verbatim: true }
}

/** Starts `codegraph init <dir>` detached. Returns whether anything was started. */
export function indexCodegraphAsync(
  dir: string,
  enabled: boolean,
  platform: NodeJS.Platform = process.platform,
  spawner: Spawner = spawn
): boolean {
  if (!enabled) return false
  const cmd = codegraphCommand(dir, platform)
  if (!cmd) return false
  try {
    spawner(cmd.file, cmd.args, {
      cwd: dir,
      shell: false,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      windowsVerbatimArguments: cmd.verbatim
    }).unref()
    return true
  } catch {
    return false /* indexing is best-effort */
  }
}
