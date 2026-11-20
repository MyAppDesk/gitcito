import { execFile, type ChildProcess } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { isAbsolute, join, relative } from 'path'
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
  for (const p of [absFile, relFile]) {
    if (!p) continue
    const m = new RegExp(`(?:^|[\\s(/])${esc(p)}:(\\d+):\\d+`).exec(message)
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
  return { runner, installed: existsSync(binPath(repoPath, runner)) }
}

const binPath = (repoPath: string, runner: TestRunner): string =>
  join(repoPath, 'node_modules', '.bin', process.platform === 'win32' ? `${runner}.cmd` : runner)

const running = new Map<string, ChildProcess>()

export async function runTests(repoPath: string): Promise<TestRunResult> {
  const started = Date.now()
  cancelTests(repoPath)
  const { runner, installed } = installedRunner(repoPath)
  if (!runner || !installed) throw new Error(runner ? `${runner} is not installed (node_modules)` : 'no test runner')
  const out = join(tmpdir(), `gitcito-tests-${process.pid}-${Date.now()}.json`)
  const args =
    runner === 'vitest'
      ? ['run', '--reporter=json', `--outputFile=${out}`]
      : ['--json', `--outputFile=${out}`, '--testLocationInResults']
  const printed = await new Promise<string>((done) => {
    const child = execFile(
      binPath(repoPath, runner),
      args,
      {
        cwd: repoPath,
        timeout: TEST_TIMEOUT,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        // A .cmd shim only runs through a shell on Windows.
        shell: process.platform === 'win32',
        // CI: no watch mode, no interactive prompts. Colour off: the report is read, not shown.
        env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }
      },
      // A failing suite exits non-zero — that is the normal case, not an error.
      (_err, stdout, stderr) => done(`${stderr}\n${stdout}`)
    )
    running.set(repoPath, child)
  })
  running.delete(repoPath)
  const ms = Date.now() - started
  const json = await readFile(out, 'utf8').catch(() => null)
  await rm(out, { force: true })
  if (!json) {
    const tail = stripAnsi(printed).trim().slice(-MESSAGE_CAP)
    return { runner, files: [], passed: 0, failed: 0, skipped: 0, ms, error: tail || '(no output)' }
  }
  return { ...parseTestReport(json, repoPath, runner), ms }
}

export function cancelTests(repoPath: string): void {
  try {
    running.get(repoPath)?.kill()
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
