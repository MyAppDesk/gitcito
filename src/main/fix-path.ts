import { execFile } from 'child_process'
import { readFileSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

/**
 * macOS/Linux GUI apps launched from Finder/Dock/Spotlight (not a terminal)
 * inherit a minimal PATH — typically just `/usr/bin:/bin:/usr/sbin:/sbin`.
 * That breaks anything relying on tools installed via nvm / Homebrew / asdf,
 * most visibly git hooks (husky → `npm`/`node`) which then fail with
 * `command not found` (exit 127).
 *
 * Asking the login shell for its PATH takes most of a second when idle and
 * several on a busy Mac, so it must never hold up the window: the PATH found
 * last launch is applied at once from a cache, and the shell is asked again in
 * the background. Without a cache, git writes (whose hooks need PATH) wait only
 * for a quick plain login shell, via `shellPathReady()`.
 *
 * Mirrors what the `fix-path` / `shell-env` packages do, inlined to avoid an
 * ESM-only dependency in the CJS main bundle. Best-effort: never throws.
 */

const BEGIN = '__GITCITO_PATH_BEGIN__'
const END = '__GITCITO_PATH_END__'
// `${PATH}` must be brace-wrapped — `$PATH${END}` would glue the marker into
// the variable name (`$PATHmarker` → empty), yielding no PATH at all.
const SCRIPT = `echo "${BEGIN}\${PATH}${END}"`

let ready: Promise<void> = Promise.resolve()

function cacheFile(): string {
  // Shared by the dev and installed apps; it holds nothing but a PATH.
  const base = process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : join(homedir(), '.cache')
  return join(base, 'Gitcito', 'shell-path')
}

function mergeIntoPath(resolved: string): void {
  // Shell PATH first (its tools win), then anything we already had,
  // de-duplicated so the variable doesn't grow unbounded across launches.
  const merged = [...resolved.split(':'), ...(process.env['PATH'] || '').split(':')]
    .map((p) => p.trim())
    .filter(Boolean)
  process.env['PATH'] = [...new Set(merged)].join(':')
}

function ask(shell: string, args: string[], timeout: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const child = execFile(shell, args, { encoding: 'utf8', timeout }, (error, stdout) => {
      // An rc file that fails late still printed PATH; only a timeout loses it.
      const found = stdout.match(new RegExp(`${BEGIN}(.*)${END}`))?.[1]?.trim()
      if (!found && error) console.warn(`Login shell PATH probe (${args[0]}) failed: ${error.message}`)
      resolve(found || undefined)
    })
    // No tty: an interactive shell reading stdin could wait forever.
    child.stdin?.end()
  })
}

async function refresh(shell: string): Promise<void> {
  // `-ilc` loads ~/.zshrc (nvm and friends) and takes 6–12 s on a busy Mac;
  // nothing waits on it, so it gets a generous timeout.
  const full = await ask(shell, ['-ilc', SCRIPT], 30000)
  if (!full) return
  mergeIntoPath(full)
  const file = cacheFile()
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, full)
}

export function fixPath(): void {
  // Windows GUI apps already inherit the full system/user PATH.
  if (process.platform === 'win32') return
  const shell = process.env['SHELL'] || '/bin/zsh'
  let cached = ''
  try {
    cached = readFileSync(cacheFile(), 'utf8').trim()
  } catch {
    // First launch, or the cache was cleared.
  }
  if (cached) mergeIntoPath(cached)
  // Without a cache, a plain login shell (no rc files, a fraction of a second)
  // gives git writes a usable PATH while the full one is still loading.
  else ready = ask(shell, ['-lc', SCRIPT], 5000).then((login) => {
    if (login) mergeIntoPath(login)
  })
  void refresh(shell).catch(() => undefined)
}

/** Resolves once git writes have a usable PATH: at once with a cache, else after the quick probe. */
export function shellPathReady(): Promise<void> {
  return ready
}
