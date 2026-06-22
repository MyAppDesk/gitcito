import { ipcMain, WebContents } from 'electron'
import { spawn, ChildProcess } from 'child_process'

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

function createPty(wc: WebContents, id: number, cwd: string, cols: number, rows: number): TermSession | null {
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
    const p = pty.spawn(defaultShell(), [], {
      name: 'xterm-256color',
      cwd,
      cols,
      rows,
      env: process.env as Record<string, string>
    })
    p.onData((d) => !wc.isDestroyed() && wc.send(`term:data:${id}`, d))
    p.onExit(() => {
      sessions.delete(id)
      if (!wc.isDestroyed()) wc.send(`term:exit:${id}`)
    })
    return {
      write: (d) => p.write(d),
      resize: (c, r) => p.resize(c, r),
      kill: () => p.kill(),
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
  const child: ChildProcess = spawn(defaultShell(), [], {
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

export function registerTerminalHandlers(): void {
  ipcMain.handle('term:create', (e, cwd: string, cols: number, rows: number) => {
    const id = nextId++
    const session = createPty(e.sender, id, cwd, cols, rows) ?? createFallback(e.sender, id, cwd)
    sessions.set(id, session)
    return id
  })
  ipcMain.handle('term:process', (_e, id: number) => sessions.get(id)?.procName() ?? '')
  ipcMain.on('term:input', (_e, id: number, data: string) => sessions.get(id)?.write(data))
  ipcMain.on('term:resize', (_e, id: number, cols: number, rows: number) => sessions.get(id)?.resize(cols, rows))
  ipcMain.on('term:kill', (_e, id: number) => {
    sessions.get(id)?.kill()
    sessions.delete(id)
  })
}
