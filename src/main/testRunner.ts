import { execFile, type ChildProcess } from 'child_process'
import { existsSync, readFileSync, statSync } from 'fs'
import { mkdtemp, readFile, realpath, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { delimiter, isAbsolute, join, relative } from 'path'
import { ipcMain } from 'electron'
import type { TestCase, TestFile, TestRunner, TestRunResult, TestStatus } from '../shared/types'

/**
 * The Tests half of the Problems dock: run the project's own suite and read
 * its machine report into a tree.
 *
 * Like the analyzers, this is the repository's toolchain — real seconds, real
 * CPU, the project's own code running — so it happens only when asked. Only
 * the runner installed in node_modules runs; nothing is fetched (`npx` would
 * download a missing package).
 */

const TEST_TIMEOUT = 10 * 60_000
/** A failure message is for reading in a panel, not an archive. */
const MESSAGE_CAP = 4000

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g
export const stripAnsi = (s: string): string => s.replace(ANSI, '')

/** Which runner the repository's package.json asks for — vitest first when both are there. */
export function detectTestRunner(packageJson: string): TestRunner | null {
  let pkg: { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> }
  try {
    pkg = JSON.parse(packageJson) as typeof pkg
  } catch {
    return null
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if ('vitest' in deps) return 'vitest'
  if ('jest' in deps) return 'jest'
  return null
}

/**
 * The line in `file` where a failure happened, from the stack in its message.
 * Both absolute (`/repo/src/a.test.ts:27:35`) and repository-relative
 * (`❯ src/a.test.ts:27:35`) frames count; the first one in the test file wins.
 */
export function failureLine(message: string, absFile: string, relFile: string): number | undefined {
  const esc = (p: string): string => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // An absolute frame stands on its own; a relative one must not be the tail of
  // another path (`lib/math.test.mjs` is not the root's `math.test.mjs`).
  for (const [p, before] of [[absFile, '(?:^|[\\s(])'], [relFile, '(?:^|[\\s(❯>])']] as const) {
    if (!p) continue
    const m = new RegExp(`${before}${esc(p)}:(\\d+):\\d+`).exec(message)
    if (m) return Number(m[1])
  }
  return undefined
}

interface JsonAssertion {
  ancestorTitles?: string[]
  title?: string
  status?: string
  duration?: number | null
  failureMessages?: string[]
  location?: { line?: number } | null
}

interface JsonFile {
  name: string
  status?: string
  message?: string
  assertionResults?: JsonAssertion[]
}

const STATUS: Record<string, TestStatus> = {
  passed: 'passed',
  failed: 'failed',
  pending: 'skipped',
  skipped: 'skipped',
  todo: 'skipped',
  disabled: 'skipped'
}

/**
 * The report jest writes with `--json`, which vitest's `json` reporter
 * reproduces: one entry per test file, one assertion per test. Failed files
 * come first, and inside a file the failed tests; a file that failed before
 * running any test (a syntax error, a bad import) is one nameless failed entry
 * carrying the runner's message.
 */
export function parseTestReport(json: string, repoPath: string, runner: TestRunner): Omit<TestRunResult, 'ms'> {
  const report = JSON.parse(json) as { testResults?: JsonFile[] }
  const files: TestFile[] = []
  for (const r of report.testResults ?? []) {
    const abs = r.name
    const rel = (isAbsolute(abs) ? relative(repoPath, abs) : abs).split('\\').join('/')
    const tests: TestCase[] = (r.assertionResults ?? []).map((a) => {
      const status = STATUS[a.status ?? ''] ?? 'skipped'
      const raw = (a.failureMessages ?? []).join('\n')
      const message = raw ? stripAnsi(raw).slice(0, MESSAGE_CAP) : undefined
      const line = message ? (failureLine(message, abs, rel) ?? a.location?.line ?? undefined) : undefined
      return {
        name: [...(a.ancestorTitles ?? []), a.title ?? ''].filter(Boolean).join(' › '),
        status,
        ms: Math.round(a.duration ?? 0),
        ...(message ? { message } : {}),
        ...(line ? { line } : {})
      }
    })
    if (!tests.length && r.status === 'failed') {
      const message = stripAnsi(r.message ?? '').slice(0, MESSAGE_CAP)
      const line = failureLine(message, abs, rel)
      tests.push({ name: '', status: 'failed', ms: 0, ...(message ? { message } : {}), ...(line ? { line } : {}) })
    }
    const rank = (s: TestStatus): number => (s === 'failed' ? 0 : s === 'passed' ? 1 : 2)
    tests.sort((x, y) => rank(x.status) - rank(y.status))
    const status: TestStatus = tests.some((t) => t.status === 'failed')
      ? 'failed'
      : tests.some((t) => t.status === 'passed')
        ? 'passed'
        : 'skipped'
    files.push({ file: rel, status, tests })
  }
  files.sort((a, b) => (a.status === 'failed' ? 0 : 1) - (b.status === 'failed' ? 0 : 1) || a.file.localeCompare(b.file))
  const count = (s: TestStatus): number => files.reduce((n, f) => n + f.tests.filter((t) => t.status === s).length, 0)
  return { runner, files, passed: count('passed'), failed: count('failed'), skipped: count('skipped') }
}

/**
 * The runner's JavaScript entry, as its installed package.json declares it
 * (`bin`) — vitest's `vitest.mjs`, jest's `bin/jest.js`. Run through Node
 * directly: no `.bin` shim, so no shell on Windows to re-parse the arguments.
 */
export function runnerEntry(repoPath: string, runner: TestRunner): string | null {
  const dir = join(repoPath, 'node_modules', runner)
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { bin?: string | Record<string, string> }
    const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[runner]
    const entry = bin ? join(dir, bin) : null
    return entry && existsSync(entry) ? entry : null
  } catch {
    return null
  }
}

/** The runner this repository can run right now: declared, and installed in node_modules. */
export function installedRunner(repoPath: string): { runner: TestRunner | null; installed: boolean } {
  const pkgPath = join(repoPath, 'package.json')
  if (!existsSync(pkgPath)) return { runner: null, installed: false }
  let runner: TestRunner | null
  try {
    runner = detectTestRunner(readFileSync(pkgPath, 'utf8'))
  } catch {
    return { runner: null, installed: false }
  }
  if (!runner) return { runner: null, installed: false }
  return { runner, installed: !!runnerEntry(repoPath, runner) }
}

/**
 * The Node that runs the suite: the one on PATH — what `npm test` would use —
 * else Electron's own, run as Node, so a machine without Node still works.
 */
function nodeCommand(): { cmd: string; env: Record<string, string> } {
  const exe = process.platform === 'win32' ? 'node.exe' : 'node'
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = dir && join(dir, exe)
    try {
      if (candidate && statSync(candidate).isFile()) return { cmd: candidate, env: {} }
    } catch {
      /* not here */
    }
  }
  return { cmd: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } }
}

/** The run in flight per repository, by its id — a cancelled run must not be confused with the next one. */
const running = new Map<string, { child: ChildProcess | null; id: number }>()
/** Ids of runs the user stopped: their result is dropped, not shown as a failure. */
const cancelled = new Set<number>()
let nextRunId = 1

export async function runTests(repoPath: string): Promise<TestRunResult> {
  const started = Date.now()
  cancelTests(repoPath)
  const runId = nextRunId++
  const { runner } = installedRunner(repoPath)
  const entry = runner ? runnerEntry(repoPath, runner) : null
  // Not a failure to report in English: the panel already says which, translated.
  if (!runner || !entry) return { runner: runner ?? 'vitest', files: [], passed: 0, failed: 0, skipped: 0, ms: 0, unavailable: true }
  const run = { child: null as ChildProcess | null, id: runId }
  running.set(repoPath, run)
  let dir: string | undefined
  try {
    // A private directory, so the report's name is not guessable in the shared tmp.
    dir = await mkdtemp(join(tmpdir(), 'gitcito-tests-'))
    if (cancelled.has(runId)) {
      return { runner, files: [], passed: 0, failed: 0, skipped: 0, ms: Date.now() - started, cancelled: true }
    }
    const out = join(dir, 'report.json')
    const args =
      runner === 'vitest'
        ? ['run', '--reporter=json', `--outputFile=${out}`]
        : ['--json', `--outputFile=${out}`, '--testLocationInResults']
    const node = nodeCommand()
    const { printed, timedOut } = await new Promise<{ printed: string; timedOut: boolean }>((done) => {
      // No shell: every argument reaches the runner whole, and nothing in a path
      // (a space, an `&`) is ever read as a command.
      const child = execFile(
        node.cmd,
        [entry, ...args],
        {
          cwd: repoPath,
          timeout: TEST_TIMEOUT,
          maxBuffer: 64 * 1024 * 1024,
          windowsHide: true,
          // CI: no watch mode, no interactive prompts. Colour off: the report is read, not shown.
          env: { ...process.env, ...node.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }
        },
        // A failing suite exits non-zero — that is the normal case, not an error.
        (err, stdout, stderr) =>
          done({ printed: `${stderr}\n${stdout}`, timedOut: !!err && err.killed === true && !cancelled.has(runId) })
      )
      run.child = child
    })
    const ms = Date.now() - started
    const json = await readFile(out, 'utf8').catch(() => null)
    if (cancelled.has(runId)) return { runner, files: [], passed: 0, failed: 0, skipped: 0, ms, cancelled: true }
    if (!json) {
      const tail = stripAnsi(printed).trim().slice(-MESSAGE_CAP)
      return { runner, files: [], passed: 0, failed: 0, skipped: 0, ms, error: tail, ...(timedOut ? { timedOut: true } : {}) }
    }
    return { ...parseTestReport(json, await realpath(repoPath), runner), ms }
  } finally {
    if (running.get(repoPath)?.id === runId) running.delete(repoPath)
    cancelled.delete(runId)
    if (dir) await rm(dir, { recursive: true, force: true })
  }
}

export function cancelTests(repoPath: string): void {
  const run = running.get(repoPath)
  if (!run) return
  cancelled.add(run.id)
  try {
    run.child?.kill()
  } catch {
    /* already gone */
  }
  running.delete(repoPath)
}

export function registerTestHandlers(): void {
  ipcMain.handle('tests:detect', (_e, repoPath: string) => installedRunner(repoPath))
  ipcMain.handle('tests:run', (_e, repoPath: string) => runTests(repoPath))
  ipcMain.on('tests:cancel', (_e, repoPath: string) => cancelTests(repoPath))
}
