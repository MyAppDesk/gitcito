import { execFile } from 'child_process'
import { existsSync, readdirSync, realpathSync } from 'fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import { ipcMain } from 'electron'
import type { AnalyzeResult, Problem, ProblemSeverity } from '../shared/types'

/**
 * Problems — the project's own analyzer output, normalised.
 *
 * Every analyzer worth running already prints machine-readable diagnostics, so
 * this is an adapter table rather than a protocol: detect what the repo asks
 * for from the files it carries, run those tools, parse them into one shape.
 * No language server, no daemon, nothing running in the background.
 *
 * It runs **only when the user asks** — `tsc --noEmit` on a large repo is tens
 * of seconds, and these commands execute the repository's own toolchain, which
 * is not something to do behind someone's back on open.
 */

/** Past this the panel is a wall of text and the renderer starts to hurt. */
const MAX_PROBLEMS = 5000
/** A analyzer that has not answered by now is not going to be useful. */
const ANALYZER_TIMEOUT = 120_000
/** `git check-ignore` on a few thousand paths is one fast process, not a sweep. */
const GIT_TIMEOUT = 20_000

interface Analyzer {
  id: string
  /** Does this repo ask for the tool at all? */
  detect(repoPath: string): boolean
  /** Command + args, or null when the tool is not on this machine. */
  command(repoPath: string): { cmd: string; args: string[] } | null
  parse(stdout: string, stderr: string, repoPath: string): Problem[]
}

/** Cached per repo: `realpathSync` is a syscall and `rel` runs per diagnostic. */
const realPaths = new Map<string, string>()

function realRepo(repoPath: string): string {
  const known = realPaths.get(repoPath)
  if (known !== undefined) return known
  let real = repoPath
  try {
    real = realpathSync.native(repoPath)
  } catch {
    // Gone or unreadable — the path as given is the best we have.
  }
  realPaths.set(repoPath, real)
  return real
}

/**
 * Repo-relative, forward slashes — what the UI groups and filters on.
 *
 * A tool that resolved symlinks on its way (Node's `process.cwd()` does) hands
 * back a path under the repo's *physical* location, which is not the path the
 * user opened. Relative to the given root that produces a `../../..` chain, so
 * when the first attempt escapes the repo, the physical root gets a turn.
 */
function rel(repoPath: string, file: string): string {
  const abs = isAbsolute(file) ? file : resolve(repoPath, file)
  let r = relative(repoPath, abs)
  if (r.startsWith('..')) {
    const viaReal = relative(realRepo(repoPath), physical(abs))
    if (!viaReal.startsWith('..')) r = viaReal
  }
  return (r || file).split(sep).join('/')
}

/** Cache the resolved directories: a whole run's diagnostics share a handful. */
const physicalDirs = new Map<string, string>()

/**
 * The physical path of `p`, resolving symlinks in whatever part of it exists.
 * A diagnostic can name a file that is gone by the time we look, so the deepest
 * existing ancestor is resolved and the rest kept as written.
 */
function physical(p: string): string {
  const dir = dirname(p)
  const known = physicalDirs.get(dir)
  if (known !== undefined) return join(known, basename(p))
  let cursor = dir
  const tail: string[] = []
  for (;;) {
    try {
      const resolved = join(realpathSync.native(cursor), ...tail)
      physicalDirs.set(dir, resolved)
      return join(resolved, basename(p))
    } catch {
      const parent = dirname(cursor)
      if (parent === cursor) {
        physicalDirs.set(dir, dir)
        return p
      }
      tail.unshift(basename(cursor))
      cursor = parent
    }
  }
}

/** A project-local binary beats whatever is on PATH; npx is the last resort. */
function localBin(repoPath: string, name: string): { cmd: string; args: string[] } {
  const exe = process.platform === 'win32' ? `${name}.cmd` : name
  const local = join(repoPath, 'node_modules', '.bin', exe)
  if (existsSync(local)) return { cmd: local, args: [] }
  return { cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['--no-install', name] }
}

// ─── Parsers (pure — covered by the test suite) ──────────────────────────────

/** `dart analyze --format=machine`:
 *  `SEVERITY|TYPE|CODE|FILE|LINE|COL|LENGTH|MESSAGE`, message backslash-escaped. */
export function parseDartAnalyze(stdout: string, repoPath = ''): Problem[] {
  const out: Problem[] = []
  for (const line of stdout.split('\n')) {
    const parts = line.split('|')
    if (parts.length < 8) continue
    const [severity, , code, file, lineNo, col] = parts
    const message = parts.slice(7).join('|').replace(/\\(.)/g, '$1').trim()
    if (!file || !message) continue
    out.push({
      file: rel(repoPath, file),
      line: Number(lineNo) || 1,
      col: Number(col) || 1,
      severity: severity === 'ERROR' ? 'error' : severity === 'WARNING' ? 'warning' : 'info',
      message,
      ...(code ? { code } : {}),
      source: 'dart'
    })
  }
  return out
}

/** `tsc --noEmit --pretty false`: `file(line,col): error TS2304: message`. */
export function parseTsc(stdout: string, repoPath = ''): Problem[] {
  const out: Problem[] = []
  const re = /^(.+?)\((\d+),(\d+)\): (error|warning|info) ([A-Z]+\d+): (.*)$/
  for (const line of stdout.split('\n')) {
    const m = re.exec(line.trim())
    if (!m) continue
    out.push({
      file: rel(repoPath, m[1]),
      line: Number(m[2]),
      col: Number(m[3]),
      severity: m[4] as ProblemSeverity,
      message: m[6].trim(),
      code: m[5],
      source: 'tsc'
    })
  }
  return out
}

/** `eslint -f json`: one entry per file, `severity` 1 = warning, 2 = error. */
export function parseEslint(stdout: string, repoPath = ''): Problem[] {
  let raw: unknown
  try {
    raw = JSON.parse(stdout.slice(stdout.indexOf('['), stdout.lastIndexOf(']') + 1))
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: Problem[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const f = entry as { filePath?: unknown; messages?: unknown }
    if (typeof f.filePath !== 'string' || !Array.isArray(f.messages)) continue
    for (const msg of f.messages) {
      if (typeof msg !== 'object' || msg === null) continue
      const m = msg as Record<string, unknown>
      if (typeof m.message !== 'string') continue
      out.push({
        file: rel(repoPath, f.filePath),
        line: Number(m.line) || 1,
        col: Number(m.column) || 1,
        severity: m.severity === 2 ? 'error' : 'warning',
        message: m.message,
        ...(typeof m.ruleId === 'string' && m.ruleId ? { code: m.ruleId } : {}),
        source: 'eslint'
      })
    }
  }
  return out
}

/** `cargo clippy --message-format=short` / `go vet`: `file:line:col: level: msg`.
 *  Both write to stderr, and neither marks the level the same way, so the level
 *  is read when present and assumed a warning when it is not. */
export function parseLineDiagnostics(text: string, repoPath: string, source: string): Problem[] {
  const out: Problem[] = []
  const re = /^(.+?):(\d+):(\d+):\s*(?:(error|warning|note|help)(?:\[([^\]]+)\])?:\s*)?(.+)$/
  for (const line of text.split('\n')) {
    const m = re.exec(line.trim())
    if (!m) continue
    const level = m[4]
    // `note:` / `help:` lines are continuations of the diagnostic above them.
    if (level === 'note' || level === 'help') continue
    out.push({
      file: rel(repoPath, m[1]),
      line: Number(m[2]),
      col: Number(m[3]),
      severity: level === 'error' ? 'error' : 'warning',
      message: m[6].trim(),
      ...(m[5] ? { code: m[5] } : {}),
      source
    })
  }
  return out
}

/** `ruff check --output-format=json`. */
export function parseRuff(stdout: string, repoPath = ''): Problem[] {
  let raw: unknown
  try {
    raw = JSON.parse(stdout.slice(stdout.indexOf('['), stdout.lastIndexOf(']') + 1))
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: Problem[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    const loc = (e.location ?? {}) as { row?: unknown; column?: unknown }
    if (typeof e.filename !== 'string' || typeof e.message !== 'string') continue
    out.push({
      file: rel(repoPath, e.filename),
      line: Number(loc.row) || 1,
      col: Number(loc.column) || 1,
      // Ruff reports lint findings, not compile errors.
      severity: 'warning',
      message: e.message,
      ...(typeof e.code === 'string' && e.code ? { code: e.code } : {}),
      source: 'ruff'
    })
  }
  return out
}

// ─── The adapter table ───────────────────────────────────────────────────────

function hasEslintConfig(repoPath: string): boolean {
  try {
    return readdirSync(repoPath).some((f) => /^(eslint\.config\.[cm]?[jt]s|\.eslintrc(\.[a-z]+)?)$/.test(f))
  } catch {
    return false
  }
}

const ANALYZERS: Analyzer[] = [
  {
    id: 'dart',
    detect: (r) => existsSync(join(r, 'pubspec.yaml')),
    command: () => ({ cmd: 'dart', args: ['analyze', '--format=machine', '.'] }),
    parse: (stdout, stderr, repoPath) => parseDartAnalyze(stdout + stderr, repoPath)
  },
  {
    id: 'tsc',
    detect: (r) => existsSync(join(r, 'tsconfig.json')),
    command: (r) => {
      const bin = localBin(r, 'tsc')
      return { cmd: bin.cmd, args: [...bin.args, '--noEmit', '--pretty', 'false'] }
    },
    parse: (stdout, stderr, repoPath) => parseTsc(stdout + stderr, repoPath)
  },
  {
    id: 'eslint',
    detect: hasEslintConfig,
    command: (r) => {
      const bin = localBin(r, 'eslint')
      return { cmd: bin.cmd, args: [...bin.args, '.', '-f', 'json', '--no-error-on-unmatched-pattern'] }
    },
    parse: (stdout, _stderr, repoPath) => parseEslint(stdout, repoPath)
  },
  {
    id: 'clippy',
    detect: (r) => existsSync(join(r, 'Cargo.toml')),
    command: () => ({ cmd: 'cargo', args: ['clippy', '--message-format=short', '--quiet'] }),
    parse: (_stdout, stderr, repoPath) => parseLineDiagnostics(stderr, repoPath, 'clippy')
  },
  {
    id: 'go vet',
    detect: (r) => existsSync(join(r, 'go.mod')),
    command: () => ({ cmd: 'go', args: ['vet', './...'] }),
    parse: (_stdout, stderr, repoPath) => parseLineDiagnostics(stderr, repoPath, 'go vet')
  },
  {
    id: 'ruff',
    detect: (r) => existsSync(join(r, 'ruff.toml')) || existsSync(join(r, 'pyproject.toml')),
    command: () => ({ cmd: 'ruff', args: ['check', '--output-format=json', '.'] }),
    parse: (stdout, _stderr, repoPath) => parseRuff(stdout, repoPath)
  }
]

// ─── Where the projects are ──────────────────────────────────────────────────
// A repository is not always one project sitting at its own root: a Flutter app
// under mobile/, a web package under apps/web, a Rust crate under crates/. The
// markers are looked for a few levels down, not only at the top.

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  'out',
  'target',
  '.dart_tool',
  'vendor',
  'Pods',
  '.next',
  '.venv',
  'venv',
  '__pycache__',
  'coverage'
])
/** Deep enough for an app under apps/web, shallow enough to stay instant. */
const MAX_DEPTH = 3
/** A monorepo with fifty packages must not spawn fifty compilers. */
const MAX_ROOTS = 12

function walkRoots(repoPath: string, dir: string, depth: number, acc: string[]): void {
  if (acc.length >= MAX_ROOTS) return
  if (ANALYZERS.some((a) => a.detect(dir))) acc.push(dir)
  if (depth >= MAX_DEPTH) return
  let entries: import('fs').Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue
    walkRoots(repoPath, join(dir, e.name), depth + 1, acc)
  }
}

/**
 * One (analyzer, directory) pair per project to sweep.
 *
 * A nested project of the *same* kind is skipped when an ancestor already has
 * that analyzer: a root `tsconfig.json` is how a TypeScript project says it
 * covers what is beneath it, and running the compiler twice over the same files
 * only produces the same diagnostics twice.
 */
function analyzerJobs(repoPath: string): { analyzer: Analyzer; dir: string }[] {
  const roots: string[] = []
  walkRoots(repoPath, repoPath, 0, roots)
  roots.sort((a, b) => a.length - b.length)
  const jobs: { analyzer: Analyzer; dir: string }[] = []
  for (const analyzer of ANALYZERS) {
    const kept: string[] = []
    for (const dir of roots) {
      if (!analyzer.detect(dir)) continue
      if (kept.some((k) => dir.startsWith(k + sep))) continue
      kept.push(dir)
      jobs.push({ analyzer, dir })
    }
  }
  return jobs
}

/** The sweep Gitcito would run: one entry per analyzer per project directory. */
export function analyzerPlan(repoPath: string): { id: string; dir: string }[] {
  return analyzerJobs(repoPath).map((j) => ({ id: j.analyzer.id, dir: j.dir }))
}

/** Which analyzers this repo asks for — the panel names them before running. */
export function detectAnalyzers(repoPath: string): string[] {
  return [...new Set(analyzerPlan(repoPath).map((j) => j.id))]
}

const SEVERITY_RANK: Record<ProblemSeverity, number> = { error: 0, warning: 1, info: 2 }

/** Deduplicate (two tools can report the same line) and sort for display. */
export function normaliseProblems(problems: Problem[]): Problem[] {
  const seen = new Set<string>()
  const out: Problem[] = []
  for (const p of problems) {
    const key = `${p.file}:${p.line}:${p.col}:${p.message}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.line - b.line ||
      a.col - b.col
  )
}

/**
 * Drop diagnostics about files git ignores.
 *
 * A tool pointed at the project root will happily lint whatever it finds, and
 * what it finds includes generated output — `.next/build/chunks`, a bundled
 * `dist`, a vendored copy. Hundreds of complaints about machine-written code
 * bury the handful about yours, and the repository has already stated which
 * files it does not care about. Tracked files are never dropped, even when a
 * pattern matches them: committing generated output is a choice, and `git
 * check-ignore` respects it.
 */
export async function dropIgnored(repoPath: string, problems: Problem[]): Promise<Problem[]> {
  // Nothing in a dependency tree is ever the user's problem, ignored or not.
  const candidates = problems.filter((p) => !p.file.split('/').includes('node_modules'))
  const files = [...new Set(candidates.map((p) => p.file))]
  if (files.length === 0) return candidates
  const ignored = await new Promise<Set<string>>((done) => {
    const child = execFile(
      'git',
      ['check-ignore', '--stdin', '-z'],
      { cwd: repoPath, timeout: GIT_TIMEOUT, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (err, stdout) => {
        // Exit 1 simply means "none of them are ignored"; anything worse (no
        // git, not a repo) means we cannot tell, and we keep everything.
        const failed = !!err && (!('code' in err) || (err.code !== 1 && err.code !== 0))
        done(failed ? new Set() : new Set(stdout.toString().split('\0').filter(Boolean)))
      }
    )
    child.stdin?.end(files.join('\0'))
  })
  return ignored.size === 0 ? candidates : candidates.filter((p) => !ignored.has(p.file))
}

/** Running sweeps, so a second click cancels rather than piling up. */
const running = new Map<string, { kill(): void }[]>()

function runTool(
  repoPath: string,
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((done) => {
    const child = execFile(
      cmd,
      args,
      { cwd: repoPath, timeout: ANALYZER_TIMEOUT, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        // A non-zero exit is the *normal* outcome here: every one of these tools
        // exits non-zero precisely when it found something. Only a failure to
        // start (ENOENT) means we learned nothing.
        const spawnFailed = !!err && 'code' in err && (err.code === 'ENOENT' || err.code === 'EACCES')
        done(spawnFailed ? null : { stdout: stdout.toString(), stderr: stderr.toString() })
      }
    )
    running.get(repoPath)?.push(child)
  })
}

/**
 * Run every analyzer the repo asks for, in parallel, and fold the results into
 * one sorted list.
 */
export async function analyzeRepo(repoPath: string): Promise<AnalyzeResult> {
  const started = Date.now()
  cancelAnalyze(repoPath)
  running.set(repoPath, [])
  const jobs = analyzerJobs(repoPath)
  const ran: string[] = []
  const missing: string[] = []
  const collected: Problem[] = []

  await Promise.all(
    jobs.map(async ({ analyzer, dir }) => {
      const spec = analyzer.command(dir)
      if (!spec) {
        if (!missing.includes(analyzer.id)) missing.push(analyzer.id)
        return
      }
      // Each tool runs in its own project directory — that is where its config
      // lives and what its relative paths are measured from.
      const res = await runTool(dir, spec.cmd, spec.args)
      if (!res) {
        if (!missing.includes(analyzer.id)) missing.push(analyzer.id)
        return
      }
      if (!ran.includes(analyzer.id)) ran.push(analyzer.id)
      // Parsed against the project, then re-anchored to the repository root so
      // the panel groups a monorepo's files under one tree.
      for (const problem of analyzer.parse(res.stdout, res.stderr, dir)) {
        collected.push({ ...problem, file: rel(repoPath, resolve(dir, problem.file)) })
      }
    })
  )
  running.delete(repoPath)

  const problems = normaliseProblems(await dropIgnored(repoPath, collected))
  return {
    problems: problems.slice(0, MAX_PROBLEMS),
    ran,
    missing,
    truncated: problems.length > MAX_PROBLEMS,
    ms: Date.now() - started
  }
}

export function cancelAnalyze(repoPath: string): void {
  for (const child of running.get(repoPath) ?? []) {
    try {
      child.kill()
    } catch {
      /* already gone */
    }
  }
  running.delete(repoPath)
}

export function registerAnalyzeHandlers(): void {
  ipcMain.handle('analyze:run', (_e, repoPath: string) => analyzeRepo(repoPath))
  ipcMain.handle('analyze:detect', (_e, repoPath: string) => detectAnalyzers(repoPath))
  ipcMain.on('analyze:cancel', (_e, repoPath: string) => cancelAnalyze(repoPath))
}
