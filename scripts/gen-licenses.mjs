#!/usr/bin/env node
/**
 * Bundles the licence of every dependency that actually ships.
 *
 * Attribution is a shipping requirement, not a nicety: MIT, BSD and Apache all
 * ask that their notice travels with the binary. Reading `node_modules` at
 * runtime is not an option — it does not exist inside a packaged app — so the
 * texts are collected here, at build time, into a JSON the renderer imports.
 *
 * Scope is the production tree (`npm ls --omit=dev --all`) plus Electron and
 * Node, which ship as the runtime even though npm files them under devDeps.
 *
 * Run by `npm run build`; the result is committed so typecheck and tests work
 * on a fresh clone without a generate step.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/renderer/src/licenses.generated.json')

/** Files a package may keep its licence text in, in preference order. */
const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt|markdown))?$/i

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

/** The licence text a package ships, if it ships one. */
function licenseText(dir) {
  let names
  try {
    names = readdirSync(dir)
  } catch {
    return null
  }
  const hits = names.filter((n) => LICENSE_FILE.test(n)).sort()
  for (const name of hits) {
    try {
      const text = readFileSync(join(dir, name), 'utf8').trim()
      // Some packages ship a stub pointing elsewhere; a one-liner is not a text.
      if (text.length > 40) return text
    } catch {
      /* unreadable — try the next candidate */
    }
  }
  return null
}

/** npm records `license`, older packages `licenses: [{type}]`. */
function licenseId(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ')
  return 'UNKNOWN'
}

function homepage(pkg) {
  if (pkg.homepage) return pkg.homepage
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  if (!repo) return null
  return repo
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^github:/, 'https://github.com/')
}

/** Every production package directory, from npm's own resolution. */
function productionDirs() {
  const out = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== ROOT)
}

const entries = new Map()

for (const dir of productionDirs()) {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) continue
  let pkg
  try {
    pkg = readJson(manifest)
  } catch {
    continue
  }
  if (!pkg.name) continue
  entries.set(`${pkg.name}@${pkg.version}`, {
    name: pkg.name,
    version: pkg.version ?? '',
    license: licenseId(pkg),
    homepage: homepage(pkg),
    text: licenseText(dir)
  })
}

// Electron is a devDependency by convention but is the runtime the app ships.
for (const name of ['electron']) {
  const dir = join(ROOT, 'node_modules', name)
  if (!existsSync(join(dir, 'package.json'))) continue
  const pkg = readJson(join(dir, 'package.json'))
  entries.set(`${pkg.name}@${pkg.version}`, {
    name: pkg.name,
    version: pkg.version ?? '',
    license: licenseId(pkg),
    homepage: homepage(pkg),
    text: licenseText(dir)
  })
}

const list = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(OUT, `${JSON.stringify(list, null, 2)}\n`)

const withText = list.filter((e) => e.text).length
console.log(`licenses: ${list.length} packages (${withText} with full text) → ${OUT.replace(`${ROOT}/`, '')}`)
