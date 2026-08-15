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

  it('states no count that a later commit would have to remember to update', () => {
    // The README once advertised "52 pages" of handbook while shipping 61, and
    // nobody noticed for months — a hand-written count is a fact with no owner.
    // Say "themes" and "translated", or interpolate the real number at build
    // time (`handbook.title` uses `{pages}`); never type the digit into prose.
    // Two shapes: the number next to its noun ("16 languages"), and the number
    // standing in for it ("the other fourteen were translated"). The second is
    // the one that slipped through first time.
    const counted =
      /\b(\d+|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)[- ](pages?|languages?|locales?|themes?|grammars?)\b|\b(the )?other (nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|\d+)\b/gi
    const offenders: string[] = []
    const sources = [
      ['README.md', readFileSync(join(ROOT, 'README.md'), 'utf8')],
      ['scripts/site-i18n/en.mjs', readFileSync(join(ROOT, 'scripts/site-i18n/en.mjs'), 'utf8')],
      ...readdirSync(HELP_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => [`docs/help/${f}`, readFileSync(join(HELP_DIR, f), 'utf8')] as const)
    ] as const

    for (const [name, src] of sources) {
      for (const [hit] of src.matchAll(counted)) offenders.push(`${name}: "${hit}"`)
    }
    expect(offenders).toEqual([])
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
    // Only the English pages: `docs/help/` also holds one directory per
    // translated locale, and a translation cannot introduce a new screenshot.
    for (const file of readdirSync(HELP_DIR).filter((f) => f.endsWith('.md'))) {
      sources.push(readFileSync(join(HELP_DIR, file), 'utf8'))
    }
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
    const pages = readdirSync(HELP_DIR).filter((f) => f.endsWith('.md')).length
    expect(readdirSync(join(SITE, 'help')).filter((f) => f.endsWith('.html')).length).toBe(pages)
    expect(readFileSync(join(SITE, 'index.html'), 'utf8')).toContain('Download')
  })

  it('builds the whole handbook again for every translated locale', () => {
    // A translation that silently stops rendering is worse than one that never
    // shipped: the language switcher would still offer it.
    const pages = readdirSync(HELP_DIR).filter((f) => f.endsWith('.md')).length
    const locales = readdirSync(HELP_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
    for (const locale of locales) {
      const built = readdirSync(join(SITE, 'help', locale)).filter((f) => f.endsWith('.html'))
      expect(built.length, `${locale} renders every page`).toBe(pages)
    }
  })

  it('marks a right-to-left locale on the page itself', () => {
    const hebrew = readFileSync(join(SITE, 'help/he/graph.html'), 'utf8')
    expect(hebrew).toContain('<html lang="he" dir="rtl">')
    // One level deeper than the English handbook, so the assets hop is longer.
    expect(hebrew).toContain('src="../../assets/')
    expect(hebrew).not.toMatch(/src="\.\.\/assets\//)
  })

  it('offers every language from any page, without leaving it', () => {
    const spanish = readFileSync(join(SITE, 'help/es/absorb.html'), 'utf8')
    expect(spanish).toContain('href="../absorb.html" lang="en"')
    expect(spanish).toContain('href="../ja/absorb.html" lang="ja"')
    expect(spanish).toContain('hreflang="x-default"')
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
