import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * One missing `}` turns every rule after it into garbage the browser drops —
 * and nothing else notices: typecheck, lint and build all pass while whole
 * screens lose their styles. A merge that resolves two appended blocks is the
 * usual way it happens.
 */
describe('styles.css', () => {
  it('has balanced braces', () => {
    const css = readFileSync(join(__dirname, '../src/renderer/src/styles.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '') // comments
      .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""') // strings may hold braces
    let depth = 0
    let line = 1
    for (const ch of css) {
      if (ch === '\n') line++
      if (ch === '{') depth++
      if (ch === '}' && --depth < 0) throw new Error(`stray "}" near line ${line}`)
    }
    expect(depth, 'a block is never closed').toBe(0)
  })
})
