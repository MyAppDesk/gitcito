import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RENDERER = join(ROOT, 'src/renderer/src')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(css|tsx?)$/.test(name) ? [path] : []
  })
}

/**
 * A `var(--name)` with no fallback and no definition anywhere makes its whole
 * declaration invalid, and the browser says nothing: the property falls back to
 * inheritance. That is how ~150 "dimmed" captions rendered as bright as the text
 * above them, through a `--text-3` no theme ever set.
 */
describe('css custom properties', () => {
  const files = sources(RENDERER).map((p) => ({ path: p, text: readFileSync(p, 'utf8') }))
  const all = files.map((f) => f.text).join('\n')
  // Declared in a stylesheet (`--x:`), set from a theme (`setProperty('--x'`),
  // or set inline from React (`'--x':`).
  const defined = new Set([
    ...[...all.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
    ...[...all.matchAll(/setProperty\(\s*['"`](--[a-z0-9-]+)/gi)].map((m) => m[1]),
    ...[...all.matchAll(/['"](--[a-z0-9-]+)['"]\s*:/gi)].map((m) => m[1])
  ])

  it('uses no variable that is never defined, unless it carries a fallback', () => {
    const missing: string[] = []
    for (const f of files) {
      for (const m of f.text.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
        if (!defined.has(m[1])) missing.push(`${m[1]} in ${f.path.slice(ROOT.length + 1)}`)
      }
    }
    expect([...new Set(missing)]).toEqual([])
  })
})
