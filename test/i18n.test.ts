import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const I18N_DIR = join(ROOT, 'src/renderer/src/i18n')

/** One dictionary file per locale; `en.ts` is the reference the rest match. */
const LOCALES = readdirSync(I18N_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => f.replace(/\.ts$/, ''))

const source = (locale: string): string => readFileSync(join(I18N_DIR, `${locale}.ts`), 'utf8')

/** Keys declared in a dictionary object literal, in source order. */
function keysOf(src: string): string[] {
  return [...src.matchAll(/^ {2}['"]([^'"]+)['"]:/gm)].map((m) => m[1])
}

/** Key → the set of {placeholder} names its value interpolates. */
function placeholdersOf(src: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const m of src.matchAll(/^ {2}['"]([^'"]+)['"]: ['"](.*?)['"],?$/gm)) {
    out.set(m[1], new Set([...m[2].matchAll(/\{(\w+)\}/g)].map((v) => v[1])))
  }
  return out
}

describe('i18n', () => {
  it('has no hardcoded user-facing strings in the renderer', () => {
    // Throws (and prints every offending file:line) when the guard fails.
    execFileSync('node', [join(ROOT, 'scripts/check-i18n.mjs')], { stdio: 'pipe' })
  })

  it('ships at least the English reference locale', () => {
    expect(LOCALES).toContain('en')
    expect(keysOf(source('en')).length).toBeGreaterThan(0)
  })

  it.each(LOCALES)('%s declares no duplicate keys', (locale) => {
    const keys = keysOf(source(locale))
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([])
  })

  it.each(LOCALES.filter((l) => l !== 'en'))('%s covers exactly the English keys', (locale) => {
    // `Dict = typeof en` already catches missing keys at compile time; this also
    // catches stale keys a locale kept after English dropped them.
    expect([...keysOf(source(locale))].sort()).toEqual([...keysOf(source('en'))].sort())
  })

  it.each(LOCALES.filter((l) => l !== 'en'))(
    '%s keeps every {placeholder} the English string uses',
    (locale) => {
      const en = placeholdersOf(source('en'))
      const other = placeholdersOf(source(locale))
      const mismatched: string[] = []
      for (const [key, expected] of en) {
        const actual = other.get(key)
        if (!actual) continue
        if ([...expected].sort().join(',') !== [...actual].sort().join(',')) mismatched.push(key)
      }
      expect(mismatched).toEqual([])
    }
  )
})
