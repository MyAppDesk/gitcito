import { afterAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cancelTests, detectTestRunner, failureLine, installedRunner, parseTestReport, runTests, stripAnsi } from '../src/main/testRunner'
import { filterTestFiles } from '../src/renderer/src/lib/testResults'

const temp: string[] = []
afterAll(() => {
  for (const d of temp) rmSync(d, { recursive: true, force: true })
})

describe('detectTestRunner', () => {
  it('reads vitest or jest from the dependencies, vitest first', () => {
    expect(detectTestRunner(JSON.stringify({ devDependencies: { vitest: '^3' } }))).toBe('vitest')
    expect(detectTestRunner(JSON.stringify({ dependencies: { jest: '^29' } }))).toBe('jest')
    expect(detectTestRunner(JSON.stringify({ devDependencies: { jest: '1', vitest: '1' } }))).toBe('vitest')
    expect(detectTestRunner(JSON.stringify({ devDependencies: { mocha: '1' } }))).toBeNull()
    expect(detectTestRunner('{ broken')).toBeNull()
  })
})

describe('failureLine', () => {
  it('finds the frame in the test file, absolute or relative', () => {
    const abs = '/repo/src/cache.test.ts'
    expect(failureLine('AssertionError\n    at /repo/src/cache.ts:3:1\n    at /repo/src/cache.test.ts:27:35', abs, 'src/cache.test.ts')).toBe(27)
    expect(failureLine('AssertionError\n ❯ src/cache.test.ts:12:9', abs, 'src/cache.test.ts')).toBe(12)
    expect(failureLine('Error: boom (/repo/src/cache.test.ts:40:2)', abs, 'src/cache.test.ts')).toBe(40)
    expect(failureLine('no frames here', abs, 'src/cache.test.ts')).toBeUndefined()
    // Another file's frame is not this test's line.
    expect(failureLine('at /repo/src/other.test.ts:5:1', abs, 'src/cache.test.ts')).toBeUndefined()
    // …not even one whose path ends the same way (a root test vs lib/ of the same name).
    expect(failureLine('Error\n    at /repo/lib/math.test.mjs:88:3', '/repo/math.test.mjs', 'math.test.mjs')).toBeUndefined()
    expect(failureLine('Error\n ❯ math.test.mjs:9:3', '/repo/math.test.mjs', 'math.test.mjs')).toBe(9)
  })
})

describe('parseTestReport', () => {
  it('builds the tree, failures first, and a nameless entry for a file that never ran', () => {
    const report = {
      testResults: [
        {
          name: '/repo/src/a.test.ts',
          status: 'passed',
          assertionResults: [{ ancestorTitles: ['parser'], title: 'reads', status: 'passed', duration: 3.4, failureMessages: [] }]
        },
        {
          name: '/repo/src/b.test.ts',
          status: 'failed',
          assertionResults: [
            { ancestorTitles: [], title: 'skipped one', status: 'pending', duration: 0 },
            {
              ancestorTitles: ['cache', 'index'],
              title: 'keeps it',
              status: 'failed',
              duration: 12,
              failureMessages: ['\u001b[31mAssertionError: expected 2 to be 1\u001b[0m\n    at /repo/src/b.test.ts:27:35']
            }
          ]
        },
        { name: '/repo/src/c.test.ts', status: 'failed', message: 'SyntaxError: Unexpected token\n ❯ src/c.test.ts:4:1', assertionResults: [] }
      ]
    }
    const r = parseTestReport(JSON.stringify(report), '/repo', 'vitest')
    expect(r.files.map((f) => [f.file, f.status])).toEqual([
      ['src/b.test.ts', 'failed'],
      ['src/c.test.ts', 'failed'],
      ['src/a.test.ts', 'passed']
    ])
    const b = r.files[0]
    expect(b.tests[0]).toEqual({ name: 'cache › index › keeps it', status: 'failed', ms: 12, message: 'AssertionError: expected 2 to be 1\n    at /repo/src/b.test.ts:27:35', line: 27 })
    expect(b.tests[1]).toMatchObject({ name: 'skipped one', status: 'skipped' })
    expect(r.files[1].tests).toEqual([{ name: '', status: 'failed', ms: 0, message: 'SyntaxError: Unexpected token\n ❯ src/c.test.ts:4:1', line: 4 }])
    expect([r.passed, r.failed, r.skipped]).toEqual([1, 2, 1])
  })

  it('strips colour codes', () => {
    expect(stripAnsi('\u001b[1m\u001b[31mred\u001b[39m\u001b[22m')).toBe('red')
  })
})

describe('filterTestFiles', () => {
  const files = [
    { file: 'src/a.test.ts', status: 'failed' as const, tests: [
      { name: 'parser › reads', status: 'passed' as const, ms: 1 },
      { name: 'parser › fails', status: 'failed' as const, ms: 1 }
    ] },
    { file: 'src/cache.test.ts', status: 'passed' as const, tests: [{ name: 'keeps', status: 'passed' as const, ms: 1 }] }
  ]
  it('keeps only failures, or what matches the query, dropping emptied files', () => {
    expect(filterTestFiles(files, { failedOnly: true, query: '' }).map((f) => f.tests.map((t) => t.name))).toEqual([['parser › fails']])
    expect(filterTestFiles(files, { failedOnly: false, query: 'reads' }).map((f) => f.tests.length)).toEqual([1])
    // A matching path keeps the whole file.
    expect(filterTestFiles(files, { failedOnly: false, query: 'cache' }).map((f) => f.file)).toEqual(['src/cache.test.ts'])
  })
})

describe('runTests — a real vitest run', () => {
  it('runs the installed vitest and reads its JSON report, from a path with a space and an &', async () => {
    // No shell in between: a space or an `&` in the path must reach vitest as plain characters.
    const root = mkdtempSync(join(tmpdir(), 'gitcito-tests-'))
    temp.push(root)
    const dir = join(root, 'my app & co')
    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', type: 'module', devDependencies: { vitest: '*' } }))
    // The runner this repository already has — nothing is downloaded. A junction needs no admin on Windows.
    symlinkSync(resolve('node_modules', 'vitest'), join(dir, 'node_modules', 'vitest'), 'junction')
    writeFileSync(join(dir, 'vitest.config.mjs'), 'export default {}\n')
    writeFileSync(
      join(dir, 'math.test.mjs'),
      [
        "import { describe, it, expect } from 'vitest'",
        "describe('math', () => {",
        "  it('adds', () => { expect(1 + 1).toBe(2) })",
        "  it('breaks', () => {",
        '    expect(2 + 2).toBe(5)',
        '  })',
        "  it.skip('later', () => {})",
        '})',
        ''
      ].join('\n')
    )
    expect(installedRunner(dir)).toEqual({ runner: 'vitest', installed: true })
    const r = await runTests(dir)
    expect(r.error).toBeUndefined()
    expect(r.runner).toBe('vitest')
    expect([r.passed, r.failed, r.skipped]).toEqual([1, 1, 1])
    const broken = r.files[0].tests.find((t) => t.status === 'failed')
    expect(broken?.name).toBe('math › breaks')
    expect(broken?.message).toContain('expected 4 to be 5')
    expect(broken?.line).toBe(5)
    expect(r.files[0].file).toBe('math.test.mjs')
  }, 60_000)

  it('answers "unavailable" for a runner declared but not installed, instead of an English error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-tests-'))
    temp.push(dir)
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { jest: '*' } }))
    expect(installedRunner(dir)).toEqual({ runner: 'jest', installed: false })
    expect(await runTests(dir)).toMatchObject({ unavailable: true, files: [] })
  })

  it('reports a stopped run as cancelled, not as a runner that wrote no report', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-tests-'))
    temp.push(dir)
    // A stand-in "vitest" whose entry just waits, so there is time to stop it.
    mkdirSync(join(dir, 'node_modules', 'vitest'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '*' } }))
    writeFileSync(join(dir, 'node_modules', 'vitest', 'package.json'), JSON.stringify({ bin: { vitest: 'wait.cjs' } }))
    writeFileSync(join(dir, 'node_modules', 'vitest', 'wait.cjs'), 'setTimeout(() => {}, 30000)\n')
    const run = runTests(dir)
    setTimeout(() => cancelTests(dir), 300)
    const r = await run
    expect(r.cancelled).toBe(true)
    expect(r.error).toBeUndefined()
  }, 20_000)

  it('cancels before the report directory is ready and the process has started', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-tests-'))
    temp.push(dir)
    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '*' } }))
    symlinkSync(resolve('node_modules', 'vitest'), join(dir, 'node_modules', 'vitest'), 'junction')
    const result = runTests(dir)
    cancelTests(dir)
    expect(await result).toMatchObject({ cancelled: true, files: [] })
  })

  it('keeps a stopped run cancelled when a new run starts before it has exited', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-tests-'))
    temp.push(dir)
    mkdirSync(join(dir, 'node_modules', 'vitest'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '*' } }))
    writeFileSync(join(dir, 'node_modules', 'vitest', 'package.json'), JSON.stringify({ bin: { vitest: 'slow-exit.cjs' } }))
    // Takes a moment to die after SIGTERM, so the next run starts while it is still going.
    writeFileSync(
      join(dir, 'node_modules', 'vitest', 'slow-exit.cjs'),
      "process.on('SIGTERM', () => setTimeout(() => process.exit(1), 200)); setTimeout(() => {}, 5000)\n"
    )
    const first = runTests(dir)
    await new Promise((r) => setTimeout(r, 300))
    cancelTests(dir)
    const second = runTests(dir) // Run, clicked again right away
    expect((await first).cancelled).toBe(true)
    cancelTests(dir)
    expect((await second).cancelled).toBe(true)
  }, 20_000)
})
