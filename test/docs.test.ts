import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HELP_DIR = join(ROOT, 'docs/help')

describe('docs', () => {
  it('covers every user-facing surface the app exposes', () => {
    // Throws (and prints every gap) when the guard fails.
    execFileSync('node', [join(ROOT, 'scripts/docs-check.mjs')], { stdio: 'pipe' })
  })

  it('keeps the README pointing at pages that exist', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const pages = new Set(readdirSync(HELP_DIR))
    const broken = [...readme.matchAll(/docs\/help\/([\w-]+\.md)/g)]
      .map((m) => m[1])
      .filter((file) => !pages.has(file))
    expect([...new Set(broken)]).toEqual([])
  })

  it('keeps the README pointing at images that exist', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
    const shots = new Set(readdirSync(join(ROOT, 'docs/screenshots')))
    const broken = [...readme.matchAll(/docs\/screenshots\/([\w.-]+)/g)]
      .map((m) => m[1])
      .filter((file) => !shots.has(file))
    expect([...new Set(broken)]).toEqual([])
  })

  it('leaves no screenshot unused', () => {
    // An orphaned asset is either a page someone forgot to write, or dead
    // weight in the repository. Either way, worth knowing about.
    const used = new Set<string>()
    const sources = [readFileSync(join(ROOT, 'README.md'), 'utf8')]
    for (const file of readdirSync(HELP_DIR)) sources.push(readFileSync(join(HELP_DIR, file), 'utf8'))
    for (const src of sources) {
      for (const [, name] of src.matchAll(/([\w.-]+\.(?:png|gif))/g)) used.add(name)
    }
    const orphans = readdirSync(join(ROOT, 'docs/screenshots')).filter((f) => !used.has(f))
    expect(orphans).toEqual([])
  })
})
