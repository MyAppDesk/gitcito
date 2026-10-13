import { describe, it, expect } from 'vitest'
import { parseDiff } from '../src/renderer/src/lib/diff'
import { findMovedLines, MOVED_MIN_ALNUM } from '../src/renderer/src/lib/movedLines'

const diffOf = (...body: string[]): string =>
  ['diff --git a/f b/f', '--- a/f', '+++ b/f', '@@ -1,20 +1,20 @@', ...body].join('\n')

const textOf = (diff: string, marks: Map<number, unknown>): string[] => {
  const lines = parseDiff(diff)
  return [...marks.keys()].sort((a, b) => a - b).map((i) => `${lines[i].kind}:${lines[i].text.trim()}`)
}

describe('moved code', () => {
  const block = ['function greet(name) {', "  return 'Hello, ' + name", '}']

  it('marks a block deleted in one place and added unchanged in another', () => {
    const diff = diffOf(...block.map((l) => '-' + l), ' const a = 1', ' const b = 2', ...block.map((l) => '+' + l))
    const lines = parseDiff(diff)
    const marks = findMovedLines(lines)
    expect(marks.size).toBe(6)
    const firstDel = lines.findIndex((l) => l.kind === 'del')
    const firstAdd = lines.findIndex((l) => l.kind === 'add')
    expect(marks.get(firstDel)).toEqual({ role: 'out', dir: 'down', peer: firstAdd, block: 0 })
    expect(marks.get(firstAdd)).toEqual({ role: 'in', dir: 'up', peer: firstDel, block: 0 })
  })

  it('still matches a block that moved into a deeper indent', () => {
    const diff = diffOf(...block.map((l) => '-' + l), ' if (ok) {', ...block.map((l) => '+    ' + l), ' }')
    expect(findMovedLines(parseDiff(diff)).size).toBe(6)
  })

  it('ignores blocks with too little text to be a meaningful move, like git', () => {
    expect(MOVED_MIN_ALNUM).toBe(20)
    const diff = diffOf('-  }', '-  return x', ' keep()', '+  }', '+  return x')
    expect(findMovedLines(parseDiff(diff)).size).toBe(0)
  })

  it('does not call an in-place re-indent a move', () => {
    const diff = diffOf(...block.map((l) => '-' + l), ...block.map((l) => '+  ' + l))
    expect(findMovedLines(parseDiff(diff)).size).toBe(0)
  })

  it('does not mark a line that was edited, only text that reappears unchanged', () => {
    const diff = diffOf(
      ...block.map((l) => '-' + l),
      ' middle()',
      '+function greet(name) {',
      "+  return 'Hi, ' + name",
      '+}'
    )
    // Only the opening line matches on its own, and it is too short to count.
    expect(findMovedLines(parseDiff(diff)).size).toBe(0)
  })

  it('numbers separate moved blocks so neighbours can be told apart', () => {
    const other = ['const retries = computeRetries(config)', 'const timeout = computeTimeout(config)']
    const diff = diffOf(
      ...block.map((l) => '-' + l),
      ' a()',
      ...other.map((l) => '-' + l),
      ' b()',
      ...other.map((l) => '+' + l),
      ' c()',
      ...block.map((l) => '+' + l)
    )
    const marks = findMovedLines(parseDiff(diff))
    expect(new Set([...marks.values()].map((m) => m.block))).toEqual(new Set([0, 1]))
    expect(textOf(diff, marks)).toHaveLength(10)
  })

  it('matches each added line once, preferring the longest block', () => {
    const diff = diffOf(
      "-  return 'Hello, ' + name",
      ' x()',
      ...block.map((l) => '-' + l),
      ' y()',
      ...block.map((l) => '+' + l)
    )
    const lines = parseDiff(diff)
    const marks = findMovedLines(lines)
    // The lone copy of the middle line loses to the whole block.
    const lone = lines.findIndex((l) => l.kind === 'del')
    expect(marks.has(lone)).toBe(false)
    expect(marks.size).toBe(6)
  })
})

describe('findMovedLines on large rewrites', () => {
  it('stays fast when the same short line repeats on both sides, as in a lockfile', () => {
    const body: string[] = []
    for (let i = 0; i < 6000; i++) body.push(i % 3 ? '-      "dev": true,' : `-  "node_modules/pkg-${i}": {`)
    body.push(' unchanged')
    for (let i = 0; i < 6000; i++) body.push(i % 3 ? '+      "dev": true,' : `+  "node_modules/pkg-${i + 1}": {`)
    const lines = parseDiff(diffOf(...body))
    const started = performance.now()
    findMovedLines(lines)
    expect(performance.now() - started).toBeLessThan(500)
  })

  it('still marks a move whose first line is a common one', () => {
    const closers = Array.from({ length: 20 }, () => ['-}', '+}']).flat()
    const block = ['}', 'function relocatedHelperFunction(input) {', '  return input.trim().toLowerCase()']
    const lines = parseDiff(
      diffOf(...block.map((l) => `-${l}`), ' anchor one', ...closers, ' anchor two', ...block.map((l) => `+${l}`))
    )
    const marks = findMovedLines(lines)
    const moved = lines.flatMap((l, i) => (marks.has(i) ? [l.text.trim()] : []))
    expect(moved).toContain('function relocatedHelperFunction(input) {')
  })
})
