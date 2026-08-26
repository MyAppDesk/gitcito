import { describe, it, expect } from 'vitest'
import {
  parseDartAnalyze,
  parseTsc,
  parseEslint,
  parseLineDiagnostics,
  parseRuff,
  normaliseProblems,
  detectAnalyzers,
  analyzerPlan
} from '../src/main/analyze'
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real-shaped output from each analyzer. These formats are the contract between
// Gitcito and six tools it does not control, so they are pinned here.

describe('problems: analyzer parsers', () => {
  const repo = '/repo'

  it('parses dart analyze --format=machine, unescaping the message', () => {
    const out = [
      'INFO|LINT|unused_import|/repo/lib/main.dart|3|8|29|Unused import: \\|package:x\\|.',
      'WARNING|STATIC_WARNING|unused_local|/repo/lib/a.dart|10|5|4|The value of the local variable is not used.',
      'ERROR|COMPILE_TIME_ERROR|undefined_method|/repo/lib/b.dart|42|11|6|The method is not defined.',
      'not a diagnostic line'
    ].join('\n')
    const problems = parseDartAnalyze(out, repo)
    expect(problems.map((p) => [p.file, p.line, p.severity, p.code])).toEqual([
      ['lib/main.dart', 3, 'info', 'unused_import'],
      ['lib/a.dart', 10, 'warning', 'unused_local'],
      ['lib/b.dart', 42, 'error', 'undefined_method']
    ])
    // The message keeps its pipes: they are escaped, not separators.
    expect(problems[0].message).toBe('Unused import: |package:x|.')
  })

  it('parses tsc --pretty false', () => {
    const out = [
      "src/a.ts(12,5): error TS2304: Cannot find name 'x'.",
      'src/b.tsx(1,1): warning TS6133: Declared but never read.',
      'Found 2 errors.'
    ].join('\n')
    expect(parseTsc(out, repo).map((p) => [p.file, p.line, p.col, p.severity, p.code])).toEqual([
      ['src/a.ts', 12, 5, 'error', 'TS2304'],
      ['src/b.tsx', 1, 1, 'warning', 'TS6133']
    ])
  })

  it('parses eslint -f json, mapping its numeric severity', () => {
    const json = JSON.stringify([
      {
        filePath: '/repo/src/a.ts',
        messages: [
          { ruleId: 'no-unused-vars', severity: 2, message: 'x is defined but never used.', line: 4, column: 7 },
          { ruleId: 'eqeqeq', severity: 1, message: 'Expected ===.', line: 9, column: 3 }
        ]
      },
      { filePath: '/repo/src/clean.ts', messages: [] }
    ])
    const problems = parseEslint(json, repo)
    expect(problems.map((p) => [p.file, p.severity, p.code])).toEqual([
      ['src/a.ts', 'error', 'no-unused-vars'],
      ['src/a.ts', 'warning', 'eqeqeq']
    ])
  })

  it('parses the file:line:col shape shared by clippy and go vet', () => {
    const clippy = [
      'src/main.rs:10:5: warning[clippy::needless_return]: unneeded `return` statement',
      'src/lib.rs:3:1: error: cannot find value `foo` in this scope',
      'src/lib.rs:3:1: note: this is a continuation line'
    ].join('\n')
    const problems = parseLineDiagnostics(clippy, repo, 'clippy')
    // The note is part of the diagnostic above it, not a problem of its own.
    expect(problems.map((p) => [p.file, p.severity, p.code])).toEqual([
      ['src/main.rs', 'warning', 'clippy::needless_return'],
      ['src/lib.rs', 'error', undefined]
    ])
    // go vet prints no level at all; unlabelled is a warning, not an error.
    const vet = parseLineDiagnostics('cmd/main.go:7:2: unreachable code', repo, 'go vet')
    expect(vet[0]).toMatchObject({ file: 'cmd/main.go', line: 7, severity: 'warning', source: 'go vet' })
  })

  it('parses ruff --output-format=json', () => {
    const json = JSON.stringify([
      { filename: '/repo/app.py', code: 'F401', message: '`os` imported but unused', location: { row: 1, column: 8 } }
    ])
    expect(parseRuff(json, repo)[0]).toMatchObject({ file: 'app.py', line: 1, col: 8, code: 'F401' })
  })

  it('returns nothing rather than throwing on junk', () => {
    expect(parseEslint('command not found', repo)).toEqual([])
    expect(parseRuff('', repo)).toEqual([])
    expect(parseTsc('', repo)).toEqual([])
    expect(parseDartAnalyze('Analyzing...\n', repo)).toEqual([])
  })
})

describe('problems: paths from a symlinked repo root', () => {
  it('relativises a physical path against the root the user opened', () => {
    // Node's process.cwd() resolves symlinks, so a tool started in a symlinked
    // checkout reports paths under the physical directory. Relative to the
    // opened path that is a ../../.. chain — useless as a group header.
    const base = mkdtempSync(join(tmpdir(), 'gitcito-symlink-'))
    const real = join(base, 'real')
    const link = join(base, 'link')
    try {
      mkdirSync(join(real, 'src'), { recursive: true })
      symlinkSync(real, link, 'dir')
      const out = parseTsc(`${join(real, 'src', 'a.ts')}(3,1): error TS1005: ';' expected.`, link)
      expect(out[0].file).toBe('src/a.ts')
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

describe('problems: normalising the merged list', () => {
  const p = (file: string, line: number, severity: 'error' | 'warning' | 'info', message = 'm'): never =>
    ({ file, line, col: 1, severity, message, source: 's' }) as never

  it('drops duplicates two tools both reported', () => {
    expect(normaliseProblems([p('a.ts', 1, 'error'), p('a.ts', 1, 'error')])).toHaveLength(1)
  })

  it('sorts by file, then severity, then position', () => {
    const sorted = normaliseProblems([
      p('b.ts', 5, 'warning'),
      p('a.ts', 9, 'warning'),
      p('a.ts', 2, 'error'),
      p('a.ts', 1, 'info')
    ])
    expect(sorted.map((x) => [x.file, x.severity])).toEqual([
      ['a.ts', 'error'],
      ['a.ts', 'warning'],
      ['a.ts', 'info'],
      ['b.ts', 'warning']
    ])
  })
})

describe('problems: analyzer detection', () => {
  it('finds projects that are not at the repository root', () => {
    // A Flutter app under mobile/ and a web package under apps/web is a normal
    // repository shape, and neither has a marker at the top level.
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-nested-'))
    try {
      mkdirSync(join(dir, 'mobile'), { recursive: true })
      mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
      writeFileSync(join(dir, 'mobile', 'pubspec.yaml'), 'name: app\n')
      writeFileSync(join(dir, 'apps', 'web', 'tsconfig.json'), '{}')
      const plan = analyzerPlan(dir)
      expect(plan.map((j) => j.id).sort()).toEqual(['dart', 'tsc'])
      expect(plan.find((j) => j.id === 'dart')?.dir).toBe(join(dir, 'mobile'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not run the same analyzer again inside a project it already covers', () => {
    // A root tsconfig.json is how a TypeScript project says it covers what is
    // beneath it; compiling twice yields the same diagnostics twice.
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-nested-'))
    try {
      mkdirSync(join(dir, 'packages', 'ui'), { recursive: true })
      writeFileSync(join(dir, 'tsconfig.json'), '{}')
      writeFileSync(join(dir, 'packages', 'ui', 'tsconfig.json'), '{}')
      expect(analyzerPlan(dir)).toEqual([{ id: 'tsc', dir }])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('asks for exactly the tools the repo carries config for', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-analyze-'))
    try {
      expect(detectAnalyzers(dir)).toEqual([])
      writeFileSync(join(dir, 'pubspec.yaml'), 'name: app\n')
      writeFileSync(join(dir, 'tsconfig.json'), '{}')
      expect(detectAnalyzers(dir).sort()).toEqual(['dart', 'tsc'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
