import { execFileSync } from 'child_process'

/**
 * macOS/Linux GUI apps launched from Finder/Dock/Spotlight (not a terminal)
 * inherit a minimal PATH — typically just `/usr/bin:/bin:/usr/sbin:/sbin`.
 * That breaks anything relying on tools installed via nvm / Homebrew / asdf,
 * most visibly git hooks (husky → `npm`/`node`) which then fail with
 * `command not found` (exit 127).
 *
 * Fix: once at startup, ask the user's *login* shell for its real PATH and
 * merge it into `process.env.PATH`, so every child process we spawn (git, and
 * therefore its hooks) sees the same PATH the user gets in their terminal.
 *
 * Mirrors what the `fix-path` / `shell-env` packages do, inlined to avoid an
 * ESM-only dependency in the CJS main bundle. Best-effort: never throws.
 */
export function fixPath(): void {
  // Windows GUI apps already inherit the full system/user PATH.
  if (process.platform === 'win32') return

  const shell = process.env['SHELL'] || '/bin/zsh'
  // Unique markers so we can extract PATH even if rc files print banners.
  const begin = '__GITCITO_PATH_BEGIN__'
  const end = '__GITCITO_PATH_END__'

  // `${PATH}` must be brace-wrapped — `$PATH${end}` would glue the marker into
  // the variable name (`$PATHmarker` → empty), yielding no PATH at all.
  const script = `echo "${begin}\${PATH}${end}"`

  const ask = (args: string[]): string | undefined => {
    try {
      const out = execFileSync(shell, args, {
        encoding: 'utf8',
        timeout: 5000,
        // A login shell with no tty can emit job-control noise on stderr; drop it.
        stdio: ['ignore', 'pipe', 'ignore']
      })
      return out.match(new RegExp(`${begin}(.*)${end}`))?.[1]?.trim() || undefined
    } catch {
      return undefined
    }
  }

  try {
    // `-ilc`: interactive login shell so ~/.zprofile, ~/.zshrc, nvm, etc. load.
    // Interactive rc files can hang without a tty (prompt frameworks, compinit),
    // so fall back to a plain login shell rather than losing PATH entirely.
    const resolved = ask(['-ilc', script]) ?? ask(['-lc', script])
    if (!resolved) return

    // Merge: shell PATH first (its tools win), then anything we already had,
    // de-duplicated so the variable doesn't grow unbounded across launches.
    const merged = [...resolved.split(':'), ...(process.env['PATH'] || '').split(':')]
      .map((p) => p.trim())
      .filter(Boolean)

    process.env['PATH'] = [...new Set(merged)].join(':')
  } catch {
    // Shell missing, timed out, or misbehaved — keep the inherited PATH.
  }
}
