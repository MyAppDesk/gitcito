import { ipcMain, WebContents } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { readFile, readdir } from 'fs/promises'
import { homedir } from 'os'
import { join, relative, sep } from 'path'
import type { LaunchConfig, LaunchGroup, LaunchInput, LaunchTask } from '../shared/types'

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
  const launch = parseJsonc<{
    configurations?: LaunchConfig[]
    compounds?: {
      name?: string
      configurations?: string[]
      presentation?: { hidden?: boolean; group?: string; order?: number }
    }[]
    inputs?: LaunchInput[]
  }>(launchRaw)
  const configs = Array.isArray(launch?.configurations)
    ? launch!.configurations.filter((c): c is LaunchConfig => !!c && typeof c.name === 'string')
    : []
  // Compounds run several configs together — surface them as synthetic configs
  // tagged with their member names so the picker lists them like VS Code does.
  const compounds: LaunchConfig[] = Array.isArray(launch?.compounds)
    ? launch!.compounds
        .filter((c) => c && typeof c.name === 'string' && Array.isArray(c.configurations))
        .map((c) => ({
          name: c.name as string,
          type: 'compound',
          compound: c.configurations as string[],
          ...(c.presentation ? { presentation: c.presentation } : {})
        }))
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
  const inputs = Array.isArray(launch?.inputs)
    ? launch!.inputs.filter((i): i is LaunchInput => !!i && typeof i.id === 'string')
    : []
  return {
    id: dir,
    dir,
    label: isRoot ? 'Workspace' : rel.split(sep).join('/'),
    isRoot,
    configs: allConfigs,
    tasks,
    inputs
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
    .replace(/\$\{workspaceRoot\}/g, folder) // legacy alias
    .replace(/\$\{cwd\}/g, folder)
    .replace(/\$\{userHome\}/g, homedir())
    .replace(/\$\{pathSeparator\}/g, sep)
    .replace(/\$\{\/\}/g, sep) // shorthand for ${pathSeparator}
    .replace(/\$\{env:([^}]+)\}/g, (_m, name: string) => process.env[name] ?? '')
    .replace(/\$\{config:[^}]+\}/g, '') // editor settings — not available headless
}

function subAll(value: string | undefined, folder: string): string {
  return value ? substitute(value, folder) : ''
}

// ─── Per-platform overrides ──────────────────────────────────────────────────
// VS Code lets a launch config or task carry `windows` / `osx` / `linux` blocks
// that override the top-level keys on that OS. We merge the matching block in
// before doing anything else.

const PLATFORM_KEY = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'

function applyPlatform<T extends { [key: string]: unknown }>(obj: T): T {
  const override = obj[PLATFORM_KEY]
  if (!override || typeof override !== 'object') return obj
  return { ...obj, ...(override as Record<string, unknown>) }
}

// ─── ${input:id} resolution ──────────────────────────────────────────────────
// The renderer prompts the user for each `${input:id}` and sends the answers;
// here we deep-replace those tokens in every string of the config / tasks
// *before* doing the usual variable substitution.

function resolveInputTokens<T>(value: T, values: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(/\$\{input:([^}]+)\}/g, (m, id: string) =>
      id in values ? values[id] : m
    ) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveInputTokens(v, values)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = resolveInputTokens(v, values)
    return out as T
  }
  return value
}

/**
 * Detect launch variables we can't resolve outside the editor
 * (`${input:…}`, `${command:…}`, `${file…}`, `${selectedText}` …). Used to warn
 * instead of silently running a half-substituted command line.
 */
const UNRESOLVABLE_VAR = /\$\{(input:|command:|file|relativeFile|lineNumber|selectedText|fileBasename|fileDirname|fileExtname|defaultBuildTask)/

function hasUnresolvableVars(...values: (string | undefined)[]): boolean {
  return values.some((v) => typeof v === 'string' && UNRESOLVABLE_VAR.test(v))
}

// ─── env files ───────────────────────────────────────────────────────────────

/** Parse a dotenv-style file into KEY=VALUE pairs (best-effort, like VS Code). */
function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '')
    let val = line.slice(eq + 1).trim()
    // Strip matching surrounding quotes.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

/** Read & merge a config's `envFile` into `env` (config `env` still wins). */
async function applyEnvFile(config: LaunchConfig, folder: string, env: Record<string, string>): Promise<void> {
  if (!config.envFile) return
  const path = subAll(config.envFile, folder)
  const text = await readFile(path, 'utf-8').catch(() => null)
  if (text == null) return
  const fileEnv = parseDotenv(text)
  for (const [k, v] of Object.entries(fileEnv)) if (!(k in env)) env[k] = v
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
  // Inline any per-task env (`options.env`) ahead of the command (posix only;
  // on Windows the launch env already carries config env and we keep it simple).
  const envPairs = task.options?.env ?? {}
  const envPrefix =
    process.platform !== 'win32'
      ? Object.entries(envPairs)
          .map(([k, v]) => `${k}=${shQuote(subAll(v, folder))}`)
          .join(' ')
      : ''
  if (envPrefix) line = `${envPrefix} ${line}`
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
  const found = tasks.find((t) => t.label === label)
  if (!found) return []
  const task = applyPlatform(found)
  const out: string[] = []
  const deps = task.dependsOn ? (Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]) : []
  for (const dep of deps) out.push(...resolveTaskCommands(dep, tasks, folder, seen))
  const self = taskCommandSelf(task, folder)
  if (self) {
    // A background/watch task (`isBackground: true`, e.g. `tsc -w`, `vite`)
    // never exits — chaining it with `&&` would hang the launch forever. Run it
    // detached so the next segment can start. We can't do VS Code's
    // problem-matcher "ready" detection, so this is a best-effort head start.
    out.push(task.isBackground ? backgrounded(self) : self)
  }
  return out
}

/** Wrap a command so it runs detached and the launch chain can proceed. */
function backgrounded(cmd: string): string {
  return process.platform === 'win32' ? `start /b ${cmd}` : `( ${cmd} ) &`
}

/**
 * Turn a launch config into the ordered shell command segments to run:
 * its preLaunchTask chain (dependsOn expanded) followed by its program. A
 * `compounds` entry expands into all its member configs, in order. Collects
 * each config's `env` (and `envFile`) into `env`.
 */
async function configSegments(
  config: LaunchConfig,
  configs: LaunchConfig[],
  tasks: LaunchTask[],
  dir: string,
  env: Record<string, string>,
  seen: Set<string> = new Set()
): Promise<string[]> {
  config = applyPlatform(config)
  if (Array.isArray(config.compound)) {
    if (seen.has(config.name)) return []
    seen.add(config.name)
    const out: string[] = []
    for (const name of config.compound) {
      const member = configs.find((c) => c.name === name)
      if (member) out.push(...(await configSegments(member, configs, tasks, dir, env, seen)))
    }
    return out
  }
  // Config `env` wins over `envFile`; both are merged into the pty environment.
  for (const [k, v] of Object.entries(config.env ?? {})) env[k] = subAll(v, dir)
  await applyEnvFile(config, dir, env)
  const out: string[] = []
  if (config.preLaunchTask) out.push(...resolveTaskCommands(config.preLaunchTask, tasks, dir))
  const program = launchCommand(config, dir)
  if (program) {
    // Honour a per-config cwd for compound members (the top-level config's cwd
    // is applied to the pty directly, so it needs no wrapping).
    const cwd = config.cwd ? subAll(config.cwd, dir) : ''
    out.push(cwd && seen.size > 0 ? `( cd ${shQuote(cwd)} && ${program} )` : program)
  }
  // A `postDebugTask` runs once the program exits (we chain it after).
  if (typeof config.postDebugTask === 'string' && config.postDebugTask) {
    out.push(...resolveTaskCommands(config.postDebugTask, tasks, dir))
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

  // 3. The VS Code Extension Host can't be launched outside VS Code itself.
  if (/extensionhost/.test(type)) return ''

  // 4. Browser debug configs — we can't drive a debugger, so just open the URL.
  if (/^(pwa-)?(chrome|msedge|edge)$/.test(type)) {
    const url = typeof config.url === 'string' ? subAll(config.url, folder) : ''
    return url ? `${openCmd()} ${shQuote(url)}` : ''
  }

  // 5. Dart / Flutter — run through the flutter (or dart) CLI.
  if (type === 'dart' || type === 'flutter') return dartCommand(config, folder)

  const program = config.program ? subAll(config.program, folder) : ''
  const args = (config.args ?? []).map((a) => shQuote(subAll(a, folder)))

  // 6. Go (`dlv`-based delve adapter) — `go run` the package/file.
  if (type === 'go') {
    const target = program || (typeof config.cwd === 'string' ? subAll(config.cwd, folder) : '.')
    return ['go', 'run', shQuote(target), ...args].join(' ')
  }

  // 7. .NET (coreclr / clr) — the `program` is a built .dll, run via `dotnet`.
  if (type === 'coreclr' || type === 'clr' || type === 'dotnet') {
    if (!program) return ''
    return program.toLowerCase().endsWith('.dll')
      ? ['dotnet', shQuote(program), ...args].join(' ')
      : [shQuote(program), ...args].join(' ')
  }

  // 8. PHP (XDebug `php` adapter) — run the script through the php CLI.
  if (type === 'php') {
    if (!program) return ''
    return ['php', shQuote(program), ...args].join(' ')
  }

  // 9. Python launching a *module* (`"module": "uvicorn"` → `python -m uvicorn`).
  if ((type === 'python' || type === 'debugpy') && typeof config.module === 'string' && config.module) {
    const py = process.platform === 'win32' ? 'python' : 'python3'
    return [py, '-m', shQuote(subAll(config.module, folder)), ...args].join(' ')
  }

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
  if (type === 'ruby' || type === 'rdbg') return 'ruby'
  const ext = program.slice(program.lastIndexOf('.')).toLowerCase()
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'node'
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'tsx'
  if (ext === '.py') return process.platform === 'win32' ? 'python' : 'python3'
  if (ext === '.rb') return 'ruby'
  if (ext === '.sh') return 'bash'
  if (ext === '.php') return 'php'
  if (ext === '.pl') return 'perl'
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
    async (
      e,
      payload: {
        dir: string
        config: LaunchConfig
        configs?: LaunchConfig[]
        tasks: LaunchTask[]
        inputValues?: Record<string, string>
        cols: number
        rows: number
      }
    ): Promise<{ id: number } | { error: string }> => {
      const { dir, cols, rows } = payload
      const inputValues = payload.inputValues ?? {}
      // Substitute the user's `${input:id}` answers, then apply platform overrides.
      const config = applyPlatform(resolveInputTokens(payload.config, inputValues))
      const tasks = resolveInputTokens(payload.tasks, inputValues)
      const siblings = resolveInputTokens(payload.configs ?? [config], inputValues)
      const folder = config.cwd ? subAll(config.cwd, dir) : dir

      // Bail clearly on configs that reference editor-only variables we can't
      // resolve headlessly (interactive ${input:…}, ${command:…}, ${file…}…),
      // rather than running a half-substituted command line.
      if (hasUnresolvableVars(config.program, config.cwd, typeof config.command === 'string' ? config.command : undefined, ...(config.args ?? []), ...(config.runtimeArgs ?? []))) {
        return {
          error: `"${config.name}" uses a VS Code variable Gitcito can't resolve outside the editor (e.g. \${input:…}, \${command:…} or \${file}). Run it from VS Code instead.`
        }
      }

      const env: Record<string, string> = {}
      const parts = await configSegments(config, siblings, tasks, dir, env)

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
