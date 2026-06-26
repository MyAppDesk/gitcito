import { ipcMain, WebContents } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { readFile, readdir } from 'fs/promises'
import { join, relative, sep } from 'path'
import type { LaunchConfig, LaunchGroup, LaunchTask } from '../shared/types'

// ─── JSONC parsing ──────────────────────────────────────────────────────────
// launch.json / tasks.json are JSON-with-comments and allow trailing commas.
// Strip both while respecting string literals, then JSON.parse.

function stripJsonc(input: string): string {
  let out = ''
  let inStr = false
  let strQuote = ''
  let inLine = false
  let inBlock = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]
    if (inLine) {
      if (ch === '\n') {
        inLine = false
        out += ch
      }
      continue
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false
        i++
      }
      continue
    }
    if (inStr) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      } else if (ch === strQuote) {
        inStr = false
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = true
      strQuote = ch
      out += ch
      continue
    }
    if (ch === '/' && next === '/') {
      inLine = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlock = true
      i++
      continue
    }
    out += ch
  }
  // Remove trailing commas before } or ].
  return out.replace(/,(\s*[}\]])/g, '$1')
}

function parseJsonc<T>(raw: string): T | null {
  try {
    return JSON.parse(stripJsonc(raw)) as T
  } catch {
    return null
  }
}

// ─── Discovery ──────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'vendor',
  'coverage',
  '.cache',
  'target',
  '.venv'
])
const MAX_DEPTH = 4

/** Recursively collect directories that contain a `.vscode/launch.json`. */
async function findVscodeDirs(root: string, dir: string, depth: number, acc: string[]): Promise<void> {
  let entries: import('fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  if (entries.some((e) => e.isDirectory() && e.name === '.vscode')) {
    try {
      await readFile(join(dir, '.vscode', 'launch.json'), 'utf-8')
      acc.push(dir)
    } catch {
      /* no launch.json in this .vscode */
    }
  }
  if (depth >= MAX_DEPTH) return
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue
    await findVscodeDirs(root, join(dir, e.name), depth + 1, acc)
  }
}

async function readGroup(repoRoot: string, dir: string): Promise<LaunchGroup | null> {
  const launchRaw = await readFile(join(dir, '.vscode', 'launch.json'), 'utf-8').catch(() => null)
  if (launchRaw == null) return null
  const launch = parseJsonc<{ configurations?: LaunchConfig[]; compounds?: { name?: string; configurations?: string[] }[] }>(
    launchRaw
  )
  const configs = Array.isArray(launch?.configurations)
    ? launch!.configurations.filter((c): c is LaunchConfig => !!c && typeof c.name === 'string')
    : []
  // Compounds run several configs together — surface them as synthetic configs
  // tagged with their member names so the picker lists them like VS Code does.
  const compounds: LaunchConfig[] = Array.isArray(launch?.compounds)
    ? launch!.compounds
        .filter((c) => c && typeof c.name === 'string' && Array.isArray(c.configurations))
        .map((c) => ({ name: c.name as string, type: 'compound', compound: c.configurations as string[] }))
    : []
  const allConfigs = [...configs, ...compounds]
  if (allConfigs.length === 0) return null

  const tasksRaw = await readFile(join(dir, '.vscode', 'tasks.json'), 'utf-8').catch(() => null)
  const tasks = tasksRaw
    ? (parseJsonc<{ tasks?: LaunchTask[] }>(tasksRaw)?.tasks ?? []).filter(
        (t): t is LaunchTask => !!t && typeof t.label === 'string'
      )
    : []

  const isRoot = dir === repoRoot
  const rel = relative(repoRoot, dir) || '.'
  return {
    id: dir,
    dir,
    label: isRoot ? 'Workspace' : rel.split(sep).join('/'),
    isRoot,
    configs: allConfigs,
    tasks
  }
}

export async function discoverLaunch(repoPath: string): Promise<LaunchGroup[]> {
  const dirs: string[] = []
  await findVscodeDirs(repoPath, repoPath, 0, dirs)
  const groups: LaunchGroup[] = []
  for (const d of dirs) {
    const g = await readGroup(repoPath, d)
    if (g) groups.push(g)
  }
  // Root group first; deeper groups sorted by path so the divider reads well.
  groups.sort((a, b) => (a.isRoot ? -1 : b.isRoot ? 1 : a.dir.localeCompare(b.dir)))
  return groups
}

// ─── Variable substitution ──────────────────────────────────────────────────
// A pragmatic subset of VS Code's variables, enough to run typical configs.

function substitute(value: string, folder: string): string {
  return value
    .replace(/\$\{workspaceFolderBasename\}/g, folder.split(sep).pop() ?? folder)
    .replace(/\$\{workspaceFolder\}/g, folder)
    .replace(/\$\{cwd\}/g, folder)
    .replace(/\$\{pathSeparator\}/g, sep)
    .replace(/\$\{env:([^}]+)\}/g, (_m, name: string) => process.env[name] ?? '')
}

function subAll(value: string | undefined, folder: string): string {
  return value ? substitute(value, folder) : ''
}

// ─── Shell-quoting ──────────────────────────────────────────────────────────

function shQuote(s: string): string {
  if (process.platform === 'win32') return /[\s"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/** Build the shell command line for a single task's own command (no deps). */
function taskCommandSelf(task: LaunchTask, folder: string): string {
  const type = (task.type ?? '').toLowerCase()
  let line: string
  if (type === 'npm' && task.script) {
    // `{ "type": "npm", "script": "build" }` → `npm run build`.
    const extra = (task.args ?? []).map((a) => shQuote(subAll(a, folder)))
    line = ['npm', 'run', shQuote(subAll(task.script, folder)), ...extra].join(' ')
  } else if (task.command) {
    // `shell` / `process` (and unknown types) — command + args, run as-is.
    const args = (task.args ?? []).map((a) => shQuote(subAll(a, folder)))
    line = [shQuote(subAll(task.command, folder)), ...args].join(' ')
  } else {
    return '' // dependsOn-only task: nothing of its own to run.
  }
  // Respect the task's working directory by wrapping in a subshell.
  const cwd = task.options?.cwd ? subAll(task.options.cwd, folder) : ''
  return cwd ? `( cd ${shQuote(cwd)} && ${line} )` : line
}

/**
 * Resolve a task into the ordered list of shell commands to run, expanding any
 * `dependsOn` chain first (depth-first, deduped, cycle-safe). VS Code runs
 * `dependsOn` before the task itself; we serialise everything into one terminal.
 */
function resolveTaskCommands(
  label: string,
  tasks: LaunchTask[],
  folder: string,
  seen: Set<string> = new Set()
): string[] {
  if (seen.has(label)) return []
  seen.add(label)
  const task = tasks.find((t) => t.label === label)
  if (!task) return []
  const out: string[] = []
  const deps = task.dependsOn ? (Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]) : []
  for (const dep of deps) out.push(...resolveTaskCommands(dep, tasks, folder, seen))
  const self = taskCommandSelf(task, folder)
  if (self) out.push(self)
  return out
}

/**
 * Turn a launch config into the ordered shell command segments to run:
 * its preLaunchTask chain (dependsOn expanded) followed by its program. A
 * `compounds` entry expands into all its member configs, in order. Collects
 * each config's `env` into `env`.
 */
function configSegments(
  config: LaunchConfig,
  configs: LaunchConfig[],
  tasks: LaunchTask[],
  dir: string,
  env: Record<string, string>,
  seen: Set<string> = new Set()
): string[] {
  if (Array.isArray(config.compound)) {
    if (seen.has(config.name)) return []
    seen.add(config.name)
    const out: string[] = []
    for (const name of config.compound) {
      const member = configs.find((c) => c.name === name)
      if (member) out.push(...configSegments(member, configs, tasks, dir, env, seen))
    }
    return out
  }
  for (const [k, v] of Object.entries(config.env ?? {})) env[k] = subAll(v, dir)
  const out: string[] = []
  if (config.preLaunchTask) out.push(...resolveTaskCommands(config.preLaunchTask, tasks, dir))
  const program = launchCommand(config, dir)
  if (program) {
    // Honour a per-config cwd for compound members (the top-level config's cwd
    // is applied to the pty directly, so it needs no wrapping).
    const cwd = config.cwd ? subAll(config.cwd, dir) : ''
    out.push(cwd && seen.size > 0 ? `( cd ${shQuote(cwd)} && ${program} )` : program)
  }
  return out
}


/** Build the shell command line that launches a config's program. */
function launchCommand(config: LaunchConfig, folder: string): string {
  const type = (config.type ?? '').toLowerCase()
  const request = (config.request ?? 'launch').toLowerCase()

  // 1. `node-terminal` (and anything with a raw `command`) — run it verbatim;
  //    it's already a full shell command line, not a program path.
  const command = typeof config.command === 'string' ? subAll(config.command, folder) : ''
  if (command) return command

  // 2. Attach configs have no program of their own. If one carries a build via
  //    preLaunchTask, the task is the work (handled by the caller); there's
  //    nothing else for us to spawn directly.
  if (request === 'attach' && !config.runtimeExecutable && typeof config.url !== 'string') return ''

  // 3. Browser debug configs — we can't drive a debugger, so just open the URL.
  if (/^(pwa-)?(chrome|msedge|edge)$/.test(type)) {
    const url = typeof config.url === 'string' ? subAll(config.url, folder) : ''
    return url ? `${openCmd()} ${shQuote(url)}` : ''
  }

  // 4. Dart / Flutter — run through the flutter (or dart) CLI.
  if (type === 'dart' || type === 'flutter') return dartCommand(config, folder)

  const program = config.program ? subAll(config.program, folder) : ''
  // Pick the executable: an explicit runtimeExecutable wins; otherwise infer an
  // interpreter from the debug `type` / file extension so a bare `program`
  // (e.g. a .js or .py file) is run *through* its runtime instead of exec'd
  // directly (which would fail with "permission denied").
  const exe = config.runtimeExecutable ? subAll(config.runtimeExecutable, folder) : interpreterFor(config, program) || program
  if (!exe) return ''
  const runtimeArgs = (config.runtimeArgs ?? []).map((a) => shQuote(subAll(a, folder)))
  // When the executable is a runtime (runtimeExecutable or an inferred
  // interpreter), `program` becomes its first argument.
  const programArg = program && exe !== program ? [shQuote(program)] : []
  const args = (config.args ?? []).map((a) => shQuote(subAll(a, folder)))
  return [shQuote(exe), ...runtimeArgs, ...programArg, ...args].join(' ')
}

/** Build a `flutter run` / `dart run` command for a Dart-Code launch config. */
function dartCommand(config: LaunchConfig, folder: string): string {
  const program = config.program ? subAll(config.program, folder) : ''
  const mode = typeof config.flutterMode === 'string' ? config.flutterMode.toLowerCase() : ''
  const args = (config.args ?? []).map((a) => shQuote(subAll(a, folder)))
  // A `lib/*.dart` entrypoint (or no program) is almost always a Flutter app;
  // a bare script path is a plain Dart program.
  const isFlutter = !program || /(^|\/)lib\//.test(program)
  if (isFlutter) {
    const modeFlag = mode === 'profile' ? ['--profile'] : mode === 'release' ? ['--release'] : []
    const target = program ? ['-t', shQuote(program)] : []
    return ['flutter', 'run', ...target, ...modeFlag, ...args].join(' ')
  }
  return ['dart', 'run', shQuote(program), ...args].join(' ')
}

/** Platform command that opens a URL/file in the default handler. */
function openCmd(): string {
  if (process.platform === 'win32') return 'start ""'
  if (process.platform === 'darwin') return 'open'
  return 'xdg-open'
}

/** Infer the interpreter for a config that has a `program` but no runtimeExecutable. */
function interpreterFor(config: LaunchConfig, program: string): string {
  const type = (config.type ?? '').toLowerCase()
  if (type === 'node' || type === 'node2' || type === 'pwa-node') return 'node'
  if (type === 'python' || type === 'debugpy') return process.platform === 'win32' ? 'python' : 'python3'
  const ext = program.slice(program.lastIndexOf('.')).toLowerCase()
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'node'
  if (ext === '.py') return process.platform === 'win32' ? 'python' : 'python3'
  if (ext === '.rb') return 'ruby'
  if (ext === '.sh') return 'bash'
  return ''
}


// ─── Session execution (pty-backed, like the integrated terminal) ────────────

interface LaunchSession {
  pid: number | null
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  signal(action: 'pause' | 'resume'): void
}

let nextId = 1
const sessions = new Map<number, LaunchSession>()

function defaultShell(): string {
  if (process.platform === 'win32') return process.env['COMSPEC'] || 'powershell.exe'
  return process.env['SHELL'] || '/bin/zsh'
}

/**
 * Spawn the launch command in a pty so output renders with colors exactly like
 * VS Code's debug terminal. The command line already `exec`s into the program
 * (after any preLaunchTask) so the pty's pid IS the program — making
 * pause/resume/stop signals hit it directly rather than an intermediate shell.
 */
function spawnSession(
  wc: WebContents,
  id: number,
  cwd: string,
  commandLine: string,
  display: string,
  env: Record<string, string>,
  cols: number,
  rows: number
): LaunchSession {
  const banner = `\x1b[90m> ${display}\x1b[0m\r\n`
  try {
    interface PtyProcess {
      readonly pid: number
      write(data: string): void
      resize(cols: number, rows: number): void
      kill(signal?: string): void
      onData(cb: (data: string) => void): void
      onExit(cb: (e: { exitCode: number }) => void): void
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pty = require('node-pty') as {
      spawn(file: string, args: string[], opts: Record<string, unknown>): PtyProcess
    }
    const shellArgs = process.platform === 'win32' ? ['-NoLogo', '-Command', commandLine] : ['-lic', commandLine]
    const p = pty.spawn(defaultShell(), shellArgs, {
      name: 'xterm-256color',
      cwd,
      cols,
      rows,
      env: { ...process.env, ...env } as Record<string, string>
    })
    if (!wc.isDestroyed()) wc.send(`launch:data:${id}`, banner)
    p.onData((d) => !wc.isDestroyed() && wc.send(`launch:data:${id}`, d))
    p.onExit(({ exitCode }) => {
      sessions.delete(id)
      if (!wc.isDestroyed()) wc.send(`launch:exit:${id}`, exitCode)
    })
    return {
      pid: p.pid,
      write: (d) => p.write(d),
      resize: (c, r) => p.resize(c, r),
      kill: () => p.kill(),
      signal: (action) => {
        if (process.platform === 'win32' || !p.pid) return
        try {
          process.kill(p.pid, action === 'pause' ? 'SIGSTOP' : 'SIGCONT')
        } catch {
          /* already gone */
        }
      }
    }
  } catch {
    return spawnFallback(wc, id, cwd, commandLine, env, banner)
  }
}

/** No node-pty: stream a plain child process (no colors, no resize). */
function spawnFallback(
  wc: WebContents,
  id: number,
  cwd: string,
  commandLine: string,
  env: Record<string, string>,
  banner: string
): LaunchSession {
  const args = process.platform === 'win32' ? ['-NoLogo', '-Command', commandLine] : ['-lic', commandLine]
  const child: ChildProcess = spawn(defaultShell(), args, { cwd, env: { ...process.env, ...env } })
  const send = (text: string): void => {
    if (!wc.isDestroyed()) wc.send(`launch:data:${id}`, text)
  }
  send(banner)
  const chunk = (d: Buffer): void => send(d.toString().replace(/(?<!\r)\n/g, '\r\n'))
  child.stdout?.on('data', chunk)
  child.stderr?.on('data', chunk)
  child.on('exit', (code) => {
    sessions.delete(id)
    if (!wc.isDestroyed()) wc.send(`launch:exit:${id}`, code ?? 0)
  })
  return {
    pid: child.pid ?? null,
    write: (d) => child.stdin?.write(d),
    resize: () => undefined,
    kill: () => child.kill(),
    signal: (action) => {
      if (process.platform === 'win32' || !child.pid) return
      try {
        process.kill(child.pid, action === 'pause' ? 'SIGSTOP' : 'SIGCONT')
      } catch {
        /* already gone */
      }
    }
  }
}

export function registerLaunchHandlers(): void {
  ipcMain.handle('launch:discover', (_e, repoPath: string) => discoverLaunch(repoPath))

  ipcMain.handle(
    'launch:run',
    (
      e,
      payload: {
        dir: string
        config: LaunchConfig
        configs?: LaunchConfig[]
        tasks: LaunchTask[]
        cols: number
        rows: number
      }
    ): { id: number } | { error: string } => {
      const { dir, config, tasks, cols, rows } = payload
      const siblings = payload.configs ?? [config]
      const folder = config.cwd ? subAll(config.cwd, dir) : dir

      const env: Record<string, string> = {}
      const parts = configSegments(config, siblings, tasks, dir, env)

      if (parts.length === 0) {
        return {
          error: `"${config.name}" isn't directly runnable from Gitcito (type "${config.type ?? '?'}"). It likely needs a debugger we can't launch.`
        }
      }

      // Run preLaunchTask(s) (and their dependsOn chain) first, then the program.
      // The *last* segment is `exec`'d (on unix) so the pty's pid becomes the
      // program itself and pause/resume/stop signals hit it directly. We skip
      // exec when the final segment is a subshell `( … )`, since `exec` only
      // takes a simple command.
      const display = parts.join(' && ')
      if (process.platform !== 'win32' && !parts[parts.length - 1].startsWith('(')) {
        parts[parts.length - 1] = `exec ${parts[parts.length - 1]}`
      }
      const commandLine = parts.join(' && ')

      const id = nextId++
      const session = spawnSession(e.sender, id, folder, commandLine, display, env, cols || 80, rows || 24)
      sessions.set(id, session)
      return { id }
    }
  )

  ipcMain.on('launch:input', (_e, id: number, data: string) => sessions.get(id)?.write(data))
  ipcMain.on('launch:resize', (_e, id: number, cols: number, rows: number) =>
    sessions.get(id)?.resize(cols, rows)
  )
  ipcMain.on('launch:signal', (_e, id: number, action: 'pause' | 'resume') =>
    sessions.get(id)?.signal(action)
  )
  ipcMain.on('launch:stop', (_e, id: number) => {
    sessions.get(id)?.kill()
    sessions.delete(id)
  })
}
