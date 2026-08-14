import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

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
      for (const [, name] of src.matchAll(/([\w.-]+\.(?:png|gif|webp))/g)) used.add(name)
    }
    const orphans = readdirSync(join(ROOT, 'docs/screenshots')).filter((f) => !used.has(f))
    expect(orphans).toEqual([])
  })
})

describe('site', () => {
  const SITE = join(ROOT, 'dist-site')

  it('builds a landing page and one page per handbook entry', () => {
    execFileSync('node', [join(ROOT, 'scripts/build-site.mjs')], { stdio: 'pipe' })
    const pages = readdirSync(join(HELP_DIR)).filter((f) => f.endsWith('.md')).length
    expect(readdirSync(join(SITE, 'help')).length).toBe(pages)
    expect(readFileSync(join(SITE, 'index.html'), 'utf8')).toContain('Download')
  })

  it('rewrites in-repo links so they resolve on the web', () => {
    const absorb = readFileSync(join(SITE, 'help/absorb.html'), 'utf8')
    // `[rebase](rebase.md)` in the Markdown must not stay a .md link.
    expect(absorb).toContain('href="./rebase.html"')
    expect(absorb).not.toMatch(/href="[\w-]+\.md"/)
    // Images move from ../screenshots to the copied assets folder.
    const timelapse = readFileSync(join(SITE, 'help/graph.html'), 'utf8')
    expect(timelapse).toContain('../assets/graph-dark.webp')
  })

  it('leaves no broken local link anywhere in the output', () => {
    const broken: string[] = []
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
      )
    for (const file of walk(SITE).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8')
      for (const [, url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        if (/^(https?:|mailto:|data:)/.test(url)) continue
        if (!existsSync(resolve(dirname(file), url))) broken.push(`${file} → ${url}`)
      }
    }
    expect(broken).toEqual([])
  })
})
