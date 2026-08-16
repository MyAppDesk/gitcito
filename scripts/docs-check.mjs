#!/usr/bin/env node
/**
 * Docs guard — fails when the app grows a user-facing surface the handbook does
 * not cover, or when the handbook rots.
 *
 * Documentation drifts because nothing breaks when it does. This makes
 * something break: add a modal, a page tab or a command-palette entry, and this
 * asks where it is explained. Answer it in `scripts/docs-map.json` — either by
 * pointing at a page in `docs/help/`, or by recording, in writing, why the
 * surface is not a feature of its own.
 *
 * Run it with `npm run lint:docs`. It also runs as part of the test suite.
 *
 * It checks four things:
 *   1. Every modal kind, page-tab type and palette command is mapped.
 *   2. Every page the map points at exists.
 *   3. Every handbook page has complete front matter.
 *   4. No page links to a missing page or a missing image.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HELP_DIR = join(ROOT, 'docs/help')
const SHOTS_DIR = join(ROOT, 'docs/screenshots')
const MAP = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-map.json'), 'utf8'))

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const problems = []
const fail = (what, detail) => problems.push({ what, detail })

// ── What the app exposes ───────────────────────────────────────────────────
const ui = read('src/renderer/src/stores/ui.ts')
const modalBlock = ui.split('export type ModalSpec')[1]?.split('export type FileViewSource')[0] ?? ''
const modals = [...new Set([...modalBlock.matchAll(/kind: '([\w-]+)'/g)].map((m) => m[1]))]

const types = read('src/shared/types.ts')
const pageBlock = types.split('export type PageContent')[1]?.split('/**')[0] ?? ''
const pages = [...new Set([...pageBlock.matchAll(/\{ type: '([\w-]+)'/g)].map((m) => m[1]))]

const palette = read('src/renderer/src/components/CommandPalette.tsx')
const commands = [...new Set([...palette.matchAll(/id: '([\w-]+)', title:/g)].map((m) => m[1]))]

// The right column is a surface too: a tab there is as findable as a modal, and
// went undocumented once because nothing asked about it.
const panelBlock = ui.split('rightPanelTab:')[1]?.split('\n')[0] ?? ''
const panels = [...new Set([...panelBlock.matchAll(/'([\w-]+)'/g)].map((m) => m[1]))]

// ── What the handbook holds ────────────────────────────────────────────────
const files = readdirSync(HELP_DIR).filter((f) => f.endsWith('.md'))
const pageIds = new Set(files.map((f) => f.replace(/\.md$/, '')))
const shots = new Set(existsSync(SHOTS_DIR) ? readdirSync(SHOTS_DIR) : [])

if (pageIds.size === 0) fail('handbook', 'docs/help/ has no pages at all')

// 1 + 2 — every surface is mapped, and every mapping resolves.
const SECTIONS = { modal: 'modals', 'page tab': 'pages', command: 'commands', 'right panel tab': 'panels' }
for (const [group, values] of [
  ['modal', modals],
  ['page tab', pages],
  ['command', commands],
  ['right panel tab', panels]
]) {
  const section = MAP[SECTIONS[group]]
  for (const id of values) {
    const target = section.covered[id]
    if (target === undefined && section.exempt[id] === undefined) {
      fail(
        `${group} "${id}" is undocumented`,
        `Add it to scripts/docs-map.json — point it at a page in docs/help/, or exempt it with a reason.`
      )
      continue
    }
    if (target !== undefined && !pageIds.has(target)) {
      fail(`${group} "${id}" points at a missing page`, `docs/help/${target}.md does not exist`)
    }
  }
  // A mapping left behind after the feature is gone is also rot.
  for (const id of Object.keys(section.covered)) {
    if (!values.includes(id)) fail(`${group} "${id}" no longer exists`, 'Remove it from scripts/docs-map.json')
  }
}

// 3 — front matter is what the sidebar and the search run on.
for (const file of files) {
  const src = readFileSync(join(HELP_DIR, file), 'utf8')
  if (!src.startsWith('---')) {
    fail(`${file} has no front matter`, 'Needs title, category, order, summary, keywords')
    continue
  }
  const head = src.slice(3, src.indexOf('\n---', 3))
  for (const field of ['title', 'category', 'order', 'summary', 'keywords']) {
    if (!new RegExp(`^${field}:\\s*\\S`, 'm').test(head)) fail(`${file} is missing "${field}"`, 'front matter')
  }
}

// 4 — links and images have to resolve, in the app and on GitHub alike.
for (const file of files) {
  const src = readFileSync(join(HELP_DIR, file), 'utf8')
  for (const [, target] of src.matchAll(/\]\(([\w-]+)\.md\)/g)) {
    if (!pageIds.has(target)) fail(`${file} links to a missing page`, `${target}.md`)
  }
  for (const [, image] of src.matchAll(/\]\(\.\.\/screenshots\/([\w.-]+)\)/g)) {
    if (!shots.has(image)) fail(`${file} shows a missing image`, `docs/screenshots/${image}`)
  }
}

// 5 — translated handbooks, one directory per locale (`docs/help/es/…`).
//
// A translation is allowed to be partial: an untranslated page falls back to
// English at runtime, which is better than blocking the other sixty. What is
// not allowed is a page that does not exist in English (a stale id nobody will
// ever see), a broken link, or an image path that forgot it is one level
// deeper — `../screenshots/` resolves from `docs/help/`, not from `docs/help/es/`.
const localeDirs = readdirSync(HELP_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

let translatedCount = 0
for (const locale of localeDirs) {
  const dir = join(HELP_DIR, locale)
  const localeFiles = readdirSync(dir).filter((f) => f.endsWith('.md'))
  translatedCount += localeFiles.length

  for (const file of localeFiles) {
    const id = file.replace(/\.md$/, '')
    const where = `${locale}/${file}`
    if (!pageIds.has(id)) {
      fail(`${where} has no English original`, `docs/help/${file} does not exist — rename or remove it`)
      continue
    }
    const src = readFileSync(join(dir, file), 'utf8')
    if (!src.startsWith('---')) {
      fail(`${where} has no front matter`, 'Needs title, category, order, summary, keywords')
      continue
    }
    const head = src.slice(3, src.indexOf('\n---', 3))
    for (const field of ['title', 'category', 'order', 'summary', 'keywords']) {
      if (!new RegExp(`^${field}:\\s*\\S`, 'm').test(head)) fail(`${where} is missing "${field}"`, 'front matter')
    }
    for (const [, target] of src.matchAll(/\]\(([\w-]+)\.md\)/g)) {
      if (!pageIds.has(target)) fail(`${where} links to a missing page`, `${target}.md`)
    }
    // From a locale directory the repo-relative hop is one deeper.
    for (const [, image] of src.matchAll(/\]\(\.\.\/\.\.\/screenshots\/([\w.-]+)\)/g)) {
      if (!shots.has(image)) fail(`${where} shows a missing image`, `docs/screenshots/${image}`)
    }
    if (/\]\(\.\.\/screenshots\//.test(src)) {
      fail(`${where} uses a top-level image path`, 'From docs/help/<locale>/ it must be ../../screenshots/')
    }
  }
}

if (problems.length) {
  console.error(`✖ docs: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`)
  for (const { what, detail } of problems) console.error(`  ${what}\n    ${detail}`)
  console.error('')
  process.exit(1)
}

const translated = localeDirs.length
  ? ` ${translatedCount} translated pages across ${localeDirs.length} locales.`
  : ''
console.log(
  `✔ docs: ${pageIds.size} handbook pages cover ${modals.length} modals, ${pages.length} page tabs, ${panels.length} right panel tabs and ${commands.length} commands.${translated}`
)
