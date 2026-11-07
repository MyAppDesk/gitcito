import { ipcMain, WebContents } from 'electron'
import { spawn, ChildProcess, execFile } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

interface TermSession {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  /** Name of the foreground process running in the pty (e.g. zsh, claude, vim). */
  procName(): string
}

let nextId = 1
const sessions = new Map<number, TermSession>()

function defaultShell(): string {
  if (process.platform === 'win32') return process.env['COMSPEC'] || 'powershell.exe'
  return process.env['SHELL'] || '/bin/zsh'
}

/**
 * Args that make the shell a *login* shell.
 *
 * Without them zsh/bash skip ~/.zprofile, ~/.zlogin and ~/.bash_profile — which
 * is where version managers and `brew shellenv` put themselves on PATH. The
 * symptom is a tool that runs fine in Terminal.app (always a login shell)
 * failing here with `command not found`.
 */
function shellArgs(): string[] {
  return process.platform === 'win32' ? [] : ['-l']
}

/** Maps the `terminalShell` setting to an executable + args. Unknown values are
 *  treated as a custom executable path. POSIX ignores the setting (SHELL is
 *  already the user's choice); a login-shell arg is kept there. */
function resolveShell(sel?: string): { file: string; args: string[] } {
  if (process.platform !== 'win32') return { file: defaultShell(), args: shellArgs() }
  switch (sel) {
    case 'powershell':
      return { file: 'powershell.exe', args: ['-NoLogo'] }
    case 'pwsh':
      return { file: 'pwsh.exe', args: ['-NoLogo'] }
    case 'cmd':
      return { file: 'cmd.exe', args: [] }
    case 'gitbash':
      return { file: 'C:\\Program Files\\Git\\bin\\bash.exe', args: ['-i', '-l'] }
    case 'wsl':
      return { file: 'wsl.exe', args: [] }
    case 'system':
      return { file: defaultShell(), args: [] }
    default:
      // ''/undefined → system default; anything else is a custom exe path.
      return { file: sel?.trim() ? sel.trim() : defaultShell(), args: [] }
  }
}

function createPty(wc: WebContents, id: number, cwd: string, cols: number, rows: number, shell?: string, poshTheme?: string): TermSession | null {
  try {
    interface PtyProcess {
      write(data: string): void
      resize(cols: number, rows: number): void
      kill(): void
      onData(cb: (data: string) => void): void
      onExit(cb: () => void): void
      /** node-pty getter: title of the current foreground process. */
      readonly process: string
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pty = require('node-pty') as {
      spawn(file: string, args: string[], opts: Record<string, unknown>): PtyProcess
    }
    const sh = resolveShell(shell)
    // Oh My Posh honors $env:POSH_THEME at `oh-my-posh init` — inject the
    // configured theme so a bare name resolves under %POSH_THEMES_PATH%.
    const theme = poshTheme?.trim()
    const poshEnv =
      theme &&
      (theme.includes('\\') || theme.includes('/') || /\.(json|yaml|yml)$/.test(theme)
        ? theme
        : process.env.POSH_THEMES_PATH
          ? `${process.env.POSH_THEMES_PATH}\\${theme}.omp.json`
          : theme)
    const p = pty.spawn(sh.file, sh.args, {
      name: 'xterm-256color',
      cwd,
      cols,
      rows,
      // TERM is often unset when the app is launched from Finder/Dock.
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        ...(poshEnv ? { POSH_THEME: poshEnv } : {})
      } as Record<string, string>
    })
    p.onData((d) => !wc.isDestroyed() && wc.send(`term:data:${id}`, d))
    p.onExit(() => {
      sessions.delete(id)
      if (!wc.isDestroyed()) wc.send(`term:exit:${id}`)
    })
    return {
      write: (d) => {
        try {
          p.write(d)
        } catch {
          /* session dying or already dead */
        }
      },
      resize: (c, r) => {
        // The pty's fd can go invalid between the exit event and this call
        // (or after a sleep/wake cycle) — node-pty's resize throws ENOTTY
        // synchronously in that case, which would otherwise crash main.
        if (c <= 0 || r <= 0) return
        try {
          p.resize(c, r)
        } catch {
          // ignore — the session is dying or already dead
        }
      },
      kill: () => {
        try {
          p.kill()
        } catch {
          /* already gone */
        }
      },
      procName: () => {
        try {
          return p.process
        } catch {
          return ''
        }
      }
    }
  } catch {
    return null
  }
}

function createFallback(wc: WebContents, id: number, cwd: string): TermSession {
  const child: ChildProcess = spawn(defaultShell(), shellArgs(), {
    cwd,
    env: { ...process.env, TERM: 'dumb' }
  })
  const send = (text: string): void => {
    if (!wc.isDestroyed()) wc.send(`term:data:${id}`, text)
  }
  const sendChunk = (d: Buffer): void => send(d.toString().replace(/(?<!\r)\n/g, '\r\n'))
  child.stdout?.on('data', sendChunk)
  child.stderr?.on('data', sendChunk)
  child.on('exit', () => {
    sessions.delete(id)
    if (!wc.isDestroyed()) wc.send(`term:exit:${id}`)
  })

  send(`\x1b[90m(basic shell mode — node-pty unavailable; run "npm rebuild node-pty" for a full terminal)\x1b[0m\r\n`)
  send(`\x1b[36m${cwd}\x1b[0m $ `)

  // Minimal line editor: echo locally, send full lines to the shell's stdin.
  let buffer = ''
  return {
    write: (d) => {
      for (const ch of d) {
        if (ch === '\r' || ch === '\n') {
          send('\r\n')
          child.stdin?.write(buffer + '\n')
          buffer = ''
        } else if (ch === '\x7f' || ch === '\b') {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1)
            send('\b \b')
          }
        } else if (ch === '\x03') {
          buffer = ''
          send('^C\r\n$ ')
        } else if (ch >= ' ' || ch === '\t') {
          buffer += ch
          send(ch)
        }
      }
    },
    resize: () => undefined,
    kill: () => child.kill(),
    procName: () => defaultShell().split('/').pop() || ''
  }
}

/** Directory holding `*.omp.json` theme files. POSH_THEMES_PATH is set by the
 *  installer/scoop; winget and scoop installs land in well-known places. */
function poshThemeDir(): string | null {
  if (process.platform !== 'win32') return null
  const home = process.env.USERPROFILE || process.env.HOME || ''
  const candidates = [
    process.env.POSH_THEMES_PATH,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'oh-my-posh', 'themes') : null,
    home ? join(home, 'scoop', 'apps', 'oh-my-posh', 'current', 'themes') : null
  ].filter((d): d is string => !!d)
  return candidates.find((d) => { try { return existsSync(d) } catch { return false } }) ?? null
}

function findPoshExe(): string | null {
  if (process.platform !== 'win32') return null
  const home = process.env.USERPROFILE || process.env.HOME || ''
  const candidates = [
    process.env.POSH_EXE,
    home ? join(home, 'scoop', 'shims', 'oh-my-posh.exe') : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'oh-my-posh', 'bin', 'oh-my-posh.exe') : null,
    'oh-my-posh.exe', // PATH
    'oh-my-posh'
  ].filter((p): p is string => !!p)
  for (const p of candidates) {
    try {
      if (p.includes('\\') || p.includes('/')) {
        if (existsSync(p)) return p
      } else {
        return p // bare name: let spawn resolve it via PATH; failure is caught
      }
    } catch { /* keep looking */ }
  }
  return null
}

/** Resolve a `terminalPoshTheme` value to a config path: bare names look up the
 *  themes dir, anything with a path separator / .json ext is used as given. */
function poshThemePath(theme: string): string | null {
  const t = theme.trim()
  if (!t) return null
  if (/[/\\]|\.json$/i.test(t)) return t
  const dir = poshThemeDir()
  return dir ? join(dir, `${t}.omp.json`) : null
}

export function registerTerminalHandlers(): void {
  ipcMain.handle('term:create', (e, cwd: string, cols: number, rows: number, shell?: string, poshTheme?: string) => {
    const id = nextId++
    const session = createPty(e.sender, id, cwd, cols, rows, shell, poshTheme) ?? createFallback(e.sender, id, cwd)
    sessions.set(id, session)
    return id
  })
  ipcMain.handle('term:process', (_e, id: number) => sessions.get(id)?.procName() ?? '')
  ipcMain.handle('term:posh-themes', () => {
    const dir = poshThemeDir()
    if (!dir) return { dir: null, exe: null, themes: [] as string[] }
    try {
      const themes = readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith('.omp.json'))
        .map((f) => f.slice(0, -'.omp.json'.length))
        .sort((a, b) => a.localeCompare(b))
      return { dir, exe: findPoshExe(), themes }
    } catch {
      return { dir, exe: findPoshExe(), themes: [] as string[] }
    }
  })
  ipcMain.handle('term:posh-preview', (_e, theme: string) => new Promise<string | null>((resolve) => {
    const exe = findPoshExe()
    const config = poshThemePath(theme)
    if (!exe || !config) return resolve(null)
    // `print primary` renders the prompt to stdout as ANSI escapes — the same
    // bytes the shell would emit, so the settings preview is pixel-honest.
    execFile(exe, ['print', 'primary', '--config', config, '--shell', 'pwsh'],
      { timeout: 5000, windowsHide: true, maxBuffer: 64 * 1024 },
      (err, stdout) => resolve(err ? null : stdout))
  }))
  ipcMain.on('term:input', (_e, id: number, data: string) => sessions.get(id)?.write(data))
  ipcMain.on('term:resize', (_e, id: number, cols: number, rows: number) => sessions.get(id)?.resize(cols, rows))
  ipcMain.on('term:kill', (_e, id: number) => {
    sessions.get(id)?.kill()
    sessions.delete(id)
  })
}
