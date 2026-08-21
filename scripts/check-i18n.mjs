#!/usr/bin/env node
/**
 * i18n guard — fails when a user-facing string is hardcoded in the renderer
 * instead of going through the per-locale dictionaries in
 * `src/renderer/src/i18n/` (`en.ts`, `es.ts`, …).
 *
 * Run it with `npm run lint:i18n`. It also runs as part of the test suite
 * (`test/i18n.test.ts`) and on pre-commit.
 *
 * Escape hatches, in order of preference:
 *   1. `// i18n-ignore <reason>` on the same line, or on the line above.
 *   2. Add the exact string to `scripts/i18n-allowlist.json` when it is a
 *      proper noun, a filename, a git/CLI token, or anything else that must
 *      read the same in every language.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_DIR = join(ROOT, 'src/renderer/src')
const ALLOWLIST = new Set(
  JSON.parse(readFileSync(join(ROOT, 'scripts/i18n-allowlist.json'), 'utf8')).allow
)

/** Files that hold no user-facing copy at all. */
const SKIP_PATH = [
  '/i18n/',
  '.test.ts',
  '.d.ts',
  '/components/cosmos/shaders',
  'vite-env'
]

/** Props / object keys whose string value is rendered to the user. */
const UI_PROPS = [
  'label',
  'title',
  'placeholder',
  'aria-label',
  'ariaLabel',
  'alt',
  'tooltip',
  'description',
  'subtitle',
  'heading',
  'header',
  'confirmLabel',
  'cancelLabel',
  'okLabel',
  'emptyText',
  'emptyLabel',
  'hint',
  'summary',
  'caption',
  'legend'
]

/** Calls whose first string argument is shown to the user. */
const UI_CALLS = ['pushToast', 'toast', 'notify', 'showError', 'confirmDialog']

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(full)) out.push(full)
  }
  return out
}

/**
 * Heuristic: does this literal read like human copy rather than an
 * identifier, class name, path, or protocol token?
 */
function isHumanCopy(s) {
  const str = s.trim()
  if (str.length < 2) return false
  if (!/[A-Za-z]/.test(str)) return false
  if (ALLOWLIST.has(str)) return false
  // Already translated: a template literal built from t()/interp().
  if (/\$\{\s*(t|tr|interp)\(/.test(str)) return false
  // A dictionary key passed around as data ("settings.termPlaceBottom").
  if (/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(str)) return false
  // Identifiers, kebab/snake keys, CSS classes, enum values, sample values.
  if (/^[a-z0-9]+([-_.][a-z0-9]+)*$/.test(str)) return false
  // camelCase identifiers.
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(str)) return false
  // PascalCase identifiers / component names ("FileTree", "RepoCosmos").
  // A single capitalized word ("Dismiss") IS copy, so require two humps.
  if (/^([A-Z][a-z0-9]*){2,}$/.test(str)) return false
  // SCREAMING_CASE.
  if (/^[A-Z][A-Z0-9_]*$/.test(str)) return false
  // Paths, urls, globs, selectors, filenames, CLI flags, format strings.
  if (/^(https?:|\/|\.\/|\.\.\/|#|\?|@|\*|%|\$|--)/.test(str)) return false
  if (/^[\w.@/-]+\.[A-Za-z0-9]{1,6}$/.test(str)) return false
  if (!/\s/.test(str) && str.includes('/')) return false
  // Dotfile names (".windsurfrules", ".aiderignore").
  if (/^\.[\w.-]+$/.test(str)) return false
  // CSS declarations and lengths.
  if (str.includes('var(--') || /^\d+(\.\d+)?(px|em|rem|%|vh|vw)\b/.test(str)) return false
  // Must contain at least one lowercase letter — pure acronyms are usually keys.
  if (!/[a-z]/.test(str)) return false
  return true
}

const violations = []

for (const file of walk(SCAN_DIR)) {
  const rel = relative(ROOT, file)
  const posix = file.replace(/\\/g, '/')
  if (SKIP_PATH.some((p) => posix.includes(p))) continue
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, i) => {
    const prev = lines[i - 1] ?? ''
    if (line.includes('i18n-ignore') || /^\s*(\/\/|\{?\/\*)\s*i18n-ignore/.test(prev)) return
    // Ignore comment-only lines.
    const code = line.replace(/^\s*(\/\/|\*).*$/, '')
    if (!code.trim()) return

    const add = (col, kind, text) =>
      violations.push({ rel, line: i + 1, col, kind, text: text.trim() })

    // 1. UI-bearing props and object keys: label="…" / label: '…'
    for (const prop of UI_PROPS) {
      const re = new RegExp(
        `(?:^|[\\s{(,])['"]?${prop}['"]?\\s*[=:]\\s*\\{?\\s*['"\`]([^'"\`]{2,120})['"\`]`,
        'g'
      )
      let m
      while ((m = re.exec(code))) {
        if (isHumanCopy(m[1])) add(m.index, prop, m[1])
      }
    }

    // 2. JSX text nodes: >Some copy</   (tsx only — `=>` and generics in .ts
    //    files would otherwise look like tags)
    if (file.endsWith('.tsx')) {
      const jsxText = /(?<![=-])>([^<>{}\n]*[A-Za-z]{2}[^<>{}\n]*)<\//g
      let m2
      while ((m2 = jsxText.exec(code))) {
        if (isHumanCopy(m2[1])) add(m2.index, 'jsx-text', m2[1])
      }
    }

    // 3. Copy chosen inline: `{cond ? 'Show less' : 'Show more'}`.
    //    Skipped on className/style lines — those ternaries pick CSS, not copy.
    if (file.endsWith('.tsx') && !/className=|style=/.test(code)) {
      const ternary = /\?\s*'([^']{2,120})'\s*:\s*'([^']{2,120})'/g
      let m3
      while ((m3 = ternary.exec(code))) {
        for (const side of [m3[1], m3[2]]) if (isHumanCopy(side)) add(m3.index, 'ternary', side)
      }
    }

    // 4. Toast / dialog calls with a literal first argument.
    for (const fn of UI_CALLS) {
      const re = new RegExp(`\\b${fn}\\s*\\(\\s*['"\`]([^'"\`]{2,160})['"\`]`, 'g')
      let m
      while ((m = re.exec(code))) {
        if (isHumanCopy(m[1])) add(m.index, fn, m[1])
      }
    }
  })
}

if (violations.length) {
  const byFile = new Map()
  for (const v of violations) {
    if (!byFile.has(v.rel)) byFile.set(v.rel, [])
    byFile.get(v.rel).push(v)
  }
  console.error(
    `\n✖ ${violations.length} hardcoded user-facing string(s) in ${byFile.size} file(s).\n` +
      `  Every string the user can read must come from src/renderer/src/i18n/.\n` +
      `  Add the key to EVERY locale file there (en.ts, es.ts, …) and render it with \`t('your.key')\`.\n` +
      `  If the string must not be translated (proper noun, filename, git token), add it to\n` +
      `  scripts/i18n-allowlist.json or annotate the line with \`// i18n-ignore <reason>\`.\n`
  )
  for (const [rel, vs] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.error(`  ${rel}  (${vs.length})`)
    for (const v of vs) console.error(`    ${rel}:${v.line}  [${v.kind}] ${v.text}`)
  }
  console.error('')
  process.exit(1)
}

console.log('✔ i18n: no hardcoded user-facing strings found.')
