import { describe, it, expect } from 'vitest'
import { unifiedDiff } from '../src/shared/lineDiff'
import { parseDiff } from '../src/renderer/src/lib/diff'

/** Apply a unified diff's hunks to `old` — proves the hunks are faithful. */
function apply(old: string, diff: string): string {
  const src = old === '' ? [] : old.replace(/\n$/, '').split('\n')
  const out: string[] = []
  let at = 0
  for (const hunk of diff.split(/^(?=@@ )/m).filter(Boolean)) {
    const m = /^@@ -(\d+),(\d+) \+\d+,\d+ @@/.exec(hunk)!
    const oldStart = Number(m[2]) === 0 ? Number(m[1]) : Number(m[1]) - 1
    while (at < oldStart) out.push(src[at++])
    for (const line of hunk.split('\n').slice(1)) {
      if (line.startsWith(' ')) (out.push(line.slice(1)), at++)
      else if (line.startsWith('-')) at++
      else if (line.startsWith('+')) out.push(line.slice(1))
    }
  }
  while (at < src.length) out.push(src[at++])
  return out.join('\n')
}

const lines = (n: number, f = (i: number): string => `line ${i}`): string =>
  Array.from({ length: n }, (_, i) => f(i + 1)).join('\n') + '\n'

describe('unifiedDiff', () => {
  it('is empty for identical texts', () => {
    expect(unifiedDiff('a\nb\n', 'a\nb\n')).toBe('')
  })

  it('writes one hunk with three lines of context around a change', () => {
    const old = lines(10)
    const neu = old.replace('line 5\n', 'line five\n')
    const d = unifiedDiff(old, neu)!
    expect(d).toBe(['@@ -2,7 +2,7 @@', ' line 2', ' line 3', ' line 4', '-line 5', '+line five', ' line 6', ' line 7', ' line 8'].join('\n'))
    expect(apply(old, d)).toBe(neu.replace(/\n$/, ''))
  })

  it('handles added and deleted files', () => {
    expect(unifiedDiff('', 'a\nb\n')).toBe('@@ -0,0 +1,2 @@\n+a\n+b')
    expect(unifiedDiff('a\nb\n', '')).toBe('@@ -1,2 +0,0 @@\n-a\n-b')
  })

  it('keeps far-apart changes in separate hunks, and round-trips', () => {
    const old = lines(40)
    const neu = old.replace('line 3\n', 'THREE\n').replace('line 35\n', 'line 35\nnew after 35\n')
    const d = unifiedDiff(old, neu)!
    expect(d.match(/^@@ /gm)).toHaveLength(2)
    expect(apply(old, d)).toBe(neu.replace(/\n$/, ''))
  })

  it('round-trips a scattered edit, and the app’s parser numbers it', () => {
    const old = lines(30, (i) => `v${i % 7}`)
    const neu = old.split('\n').map((l, i) => (i % 5 === 0 ? `${l}!` : l)).filter((_, i) => i !== 12).join('\n')
    const d = unifiedDiff(old, neu)!
    expect(apply(old, d)).toBe(neu.replace(/\n$/, ''))
    expect(parseDiff(d).filter((l) => l.kind === 'hunk').length).toBeGreaterThan(0)
  })

  it('gives up on a change too large to compute', () => {
    expect(unifiedDiff(lines(3000, (i) => `a${i}`), lines(3000, (i) => `b${i}`))).toBeNull()
  })
})
