/**
 * Facts about a repository that can be counted rather than guessed: what it is
 * written in, and what it declares as a dependency. Pure functions over file
 * lists and manifest text, so nothing here can be wrong in an interesting way.
 * Shared: main computes them, the renderer formats them.
 */

import type { DependencyRef, LanguageStat } from './types'

const BY_EXTENSION: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin',
  kts: 'Kotlin', swift: 'Swift', m: 'Objective-C', mm: 'Objective-C++',
  c: 'C', h: 'C', cc: 'C++', cpp: 'C++', cxx: 'C++', hpp: 'C++', hh: 'C++',
  cs: 'C#', php: 'PHP', dart: 'Dart', ex: 'Elixir', exs: 'Elixir',
  scala: 'Scala', clj: 'Clojure', hs: 'Haskell', lua: 'Lua', pl: 'Perl',
  r: 'R', jl: 'Julia', zig: 'Zig', vue: 'Vue', svelte: 'Svelte',
  css: 'CSS', scss: 'Sass', sass: 'Sass', less: 'Less',
  html: 'HTML', htm: 'HTML', sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  fish: 'Shell', ps1: 'PowerShell', sql: 'SQL', graphql: 'GraphQL',
  gql: 'GraphQL', proto: 'Protobuf', md: 'Markdown', mdx: 'Markdown',
  json: 'JSON', yml: 'YAML', yaml: 'YAML', toml: 'TOML', xml: 'XML'
}

const BY_FILENAME: Record<string, string> = {
  dockerfile: 'Docker',
  makefile: 'Make',
  rakefile: 'Ruby',
  gemfile: 'Ruby',
  'cmakelists.txt': 'CMake'
}

/** Languages that describe configuration rather than the program itself. */
const SUPPORTING = new Set(['JSON', 'YAML', 'TOML', 'XML', 'Markdown'])

/** The language a file counts as, or null when it doesn't count as any. */
export function languageOf(path: string): string | null {
  const name = (path.split('/').pop() ?? '').toLowerCase()
  const byName = BY_FILENAME[name]
  if (byName) return byName
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return null
  return BY_EXTENSION[name.slice(dot + 1)] ?? null
}

/**
 * Share of the codebase per language, by bytes, largest first. Config and docs
 * are counted separately so a repo full of JSON fixtures doesn't read as a JSON
 * project; pass `includeSupporting` to fold them back in.
 */
export function languageBreakdown(
  files: { path: string; size: number }[],
  opts: { includeSupporting?: boolean } = {}
): LanguageStat[] {
  const totals = new Map<string, { bytes: number; files: number }>()
  for (const file of files) {
    const language = languageOf(file.path)
    if (!language) continue
    if (!opts.includeSupporting && SUPPORTING.has(language)) continue
    const entry = totals.get(language) ?? { bytes: 0, files: 0 }
    entry.bytes += Math.max(0, file.size)
    entry.files++
    totals.set(language, entry)
  }
  const total = [...totals.values()].reduce((sum, e) => sum + e.bytes, 0)
  return [...totals.entries()]
    .map(([language, e]) => ({
      language,
      bytes: e.bytes,
      files: e.files,
      share: total > 0 ? e.bytes / total : 0
    }))
    .sort((a, b) => b.bytes - a.bytes || a.language.localeCompare(b.language))
}

/** Keeps the biggest languages and rolls the tail into one "Other" slice. */
export function topLanguages(stats: LanguageStat[], max = 8): LanguageStat[] {
  if (stats.length <= max) return stats
  const head = stats.slice(0, max)
  const tail = stats.slice(max)
  return [
    ...head,
    {
      language: 'Other',
      bytes: tail.reduce((s, l) => s + l.bytes, 0),
      files: tail.reduce((s, l) => s + l.files, 0),
      share: tail.reduce((s, l) => s + l.share, 0)
    }
  ]
}

// ─── Declared dependencies ──────────────────────────────────────────────────

/** Manifest files worth parsing, by lowercased basename. */
export const MANIFEST_FILES = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'cargo.toml',
  'go.mod',
  'pubspec.yaml',
  'composer.json',
  'gemfile'
]

function parsePackageJson(content: string): DependencyRef[] {
  try {
    const json = JSON.parse(content) as Record<string, Record<string, string> | undefined>
    const out: DependencyRef[] = []
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(json[field] ?? {})) {
        out.push({ name, version: String(version), dev: field === 'devDependencies' })
      }
    }
    return out
  } catch {
    return []
  }
}

/** `name = "1.0"`, `name = { version = "1.0" }` and bare `name` table headers. */
function parseCargoToml(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  let dev = false
  let inDeps = false
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    const section = /^\[([^\]]+)\]$/.exec(line)
    if (section) {
      const name = section[1]
      inDeps = /(^|\.)(dependencies|dev-dependencies|build-dependencies)$/.test(name)
      dev = /dev-dependencies|build-dependencies/.test(name)
      // `[dependencies.foo]` declares foo itself.
      const nested = /^(?:.*\.)?(?:dev-)?dependencies\.(.+)$/.exec(name)
      if (nested) out.push({ name: nested[1], version: '', dev })
      continue
    }
    if (!inDeps || !line || line.startsWith('#')) continue
    const entry = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(line)
    if (!entry) continue
    const version = /"([^"]+)"/.exec(entry[2])?.[1] ?? ''
    out.push({ name: entry[1], version, dev })
  }
  return out
}

function parsePyprojectToml(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  // PEP 621: dependencies = ["requests>=2", …]
  const pep621 = /dependencies\s*=\s*\[([^\]]*)\]/s.exec(content)
  if (pep621) {
    for (const match of pep621[1].matchAll(/"([^"]+)"|'([^']+)'/g)) {
      const spec = (match[1] ?? match[2]).trim()
      const name = /^[A-Za-z0-9._-]+/.exec(spec)?.[0]
      if (name) out.push({ name, version: spec.slice(name.length).trim(), dev: false })
    }
  }
  // Poetry: [tool.poetry.dependencies] name = "^1.0"
  let inPoetry = false
  let dev = false
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    const section = /^\[([^\]]+)\]$/.exec(line)
    if (section) {
      inPoetry = /^tool\.poetry\.(dev-)?dependencies$|^tool\.poetry\.group\..+\.dependencies$/.test(section[1])
      dev = /dev/.test(section[1])
      continue
    }
    if (!inPoetry || !line || line.startsWith('#')) continue
    const entry = /^([A-Za-z0-9._-]+)\s*=\s*(.+)$/.exec(line)
    if (entry && entry[1].toLowerCase() !== 'python') {
      out.push({ name: entry[1], version: /"([^"]+)"/.exec(entry[2])?.[1] ?? '', dev })
    }
  }
  return out
}

function parseRequirementsTxt(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('-')) continue
    const name = /^[A-Za-z0-9._-]+/.exec(line)?.[0]
    if (name) out.push({ name, version: line.slice(name.length).trim(), dev: false })
  }
  return out
}

function parseGoMod(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  let inBlock = false
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (/^require\s*\($/.test(line)) {
      inBlock = true
      continue
    }
    if (inBlock && line === ')') {
      inBlock = false
      continue
    }
    const single = /^require\s+(\S+)\s+(\S+)/.exec(line)
    if (single) {
      out.push({ name: single[1], version: single[2], dev: false })
      continue
    }
    if (!inBlock || !line || line.startsWith('//')) continue
    const entry = /^(\S+)\s+(\S+)/.exec(line)
    if (entry) out.push({ name: entry[1], version: entry[2], dev: /\/\/ indirect/.test(line) })
  }
  return out
}

function parsePubspecYaml(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  let dev = false
  let inDeps = false
  for (const raw of content.split('\n')) {
    if (/^dependencies:\s*$/.test(raw)) {
      inDeps = true
      dev = false
      continue
    }
    if (/^dev_dependencies:\s*$/.test(raw)) {
      inDeps = true
      dev = true
      continue
    }
    if (/^\S/.test(raw)) {
      inDeps = false
      continue
    }
    if (!inDeps) continue
    const entry = /^\s{2}([A-Za-z0-9_]+):\s*(.*)$/.exec(raw)
    if (entry && entry[1] !== 'sdk') {
      out.push({ name: entry[1], version: entry[2].trim().replace(/['"]/g, ''), dev })
    }
  }
  return out
}

function parseGemfile(content: string): DependencyRef[] {
  const out: DependencyRef[] = []
  for (const match of content.matchAll(/^\s*gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/gm)) {
    out.push({ name: match[1], version: match[2] ?? '', dev: false })
  }
  return out
}

/** Direct dependencies declared by one manifest, or [] if it can't be read. */
export function parseManifest(path: string, content: string): DependencyRef[] {
  const name = (path.split('/').pop() ?? '').toLowerCase()
  if (name === 'package.json' || name === 'composer.json') return parsePackageJson(content)
  if (name === 'cargo.toml') return parseCargoToml(content)
  if (name === 'pyproject.toml') return parsePyprojectToml(content)
  if (name === 'requirements.txt') return parseRequirementsTxt(content)
  if (name === 'go.mod') return parseGoMod(content)
  if (name === 'pubspec.yaml') return parsePubspecYaml(content)
  if (name === 'gemfile') return parseGemfile(content)
  return []
}

// ─── Signal vs scaffolding ──────────────────────────────────────────────────

// Packages that say nothing about what a project *is*: type stubs, loaders,
// lint/format plugins, polyfills. Nobody describes their stack as "react-dom
// and ts-loader".
const NOISE = [
  /^@types\//,
  /^@typescript-eslint\//,
  /^eslint(-|$)/,
  /^prettier(-|$)/,
  /-loader$/,
  /^babel-|^@babel\//,
  /^postcss(-|$)/,
  /^autoprefixer$/,
  /^core-js$/,
  /^tslib$/,
  /^rimraf$|^cross-env$|^npm-run-all$|^concurrently$/,
  /^husky$|^lint-staged$/,
  /^@rollup\/|^rollup-plugin-/,
  /^vite-plugin-/,
  /^webpack-(cli|dev-server|merge)$/,
  /^ts-node$|^tsx$|^nodemon$/
]

// Sub-packages that ride along with the framework they belong to: knowing a
// React app also has react-dom is not information.
const IMPLIED: Record<string, string> = {
  'react-dom': 'react',
  'react-native': 'react',
  'vue-router': 'vue',
  '@angular/common': '@angular/core',
  '@angular/platform-browser': '@angular/core',
  'next-auth': 'next'
}

/** True when a dependency is scaffolding rather than part of the stack's story. */
export function isNoiseDependency(name: string): boolean {
  return NOISE.some((re) => re.test(name))
}

/**
 * The frameworks a project is built on, recognised by name. Each carries a
 * badge so the stack reads at a glance instead of as a list of packages.
 */
const FRAMEWORKS: { match: RegExp; label: string; badge: string; kind: string }[] = [
  { match: /^next$/, label: 'Next.js', badge: '▲', kind: 'framework' },
  { match: /^nuxt$/, label: 'Nuxt', badge: '◈', kind: 'framework' },
  { match: /^@remix-run\//, label: 'Remix', badge: '💿', kind: 'framework' },
  { match: /^astro$/, label: 'Astro', badge: '🚀', kind: 'framework' },
  { match: /^@angular\/core$/, label: 'Angular', badge: '🅰', kind: 'framework' },
  { match: /^react$/, label: 'React', badge: '⚛', kind: 'ui' },
  { match: /^vue$/, label: 'Vue', badge: '🟩', kind: 'ui' },
  { match: /^svelte$|^@sveltejs\/kit$/, label: 'Svelte', badge: '🔥', kind: 'ui' },
  { match: /^solid-js$/, label: 'Solid', badge: '🔷', kind: 'ui' },
  { match: /^electron$/, label: 'Electron', badge: '⚡', kind: 'runtime' },
  { match: /^tauri|^@tauri-apps\//, label: 'Tauri', badge: '🦀', kind: 'runtime' },
  { match: /^react-native$/, label: 'React Native', badge: '📱', kind: 'runtime' },
  { match: /^flutter$/, label: 'Flutter', badge: '🐦', kind: 'framework' },
  { match: /^tailwindcss$/, label: 'Tailwind', badge: '🌊', kind: 'styling' },
  { match: /^bootstrap$/, label: 'Bootstrap', badge: '🅱', kind: 'styling' },
  { match: /^express$/, label: 'Express', badge: '🚏', kind: 'server' },
  { match: /^fastify$/, label: 'Fastify', badge: '🏎', kind: 'server' },
  { match: /^@nestjs\/core$/, label: 'NestJS', badge: '🐱', kind: 'server' },
  { match: /^django$/i, label: 'Django', badge: '🎸', kind: 'framework' },
  { match: /^flask$/i, label: 'Flask', badge: '🧪', kind: 'framework' },
  { match: /^fastapi$/i, label: 'FastAPI', badge: '⚡', kind: 'framework' },
  { match: /^rails$/i, label: 'Rails', badge: '🛤', kind: 'framework' },
  { match: /^laravel\//i, label: 'Laravel', badge: '🎯', kind: 'framework' },
  { match: /^github\.com\/gin-gonic\/gin$/, label: 'Gin', badge: '🍸', kind: 'server' },
  { match: /^github\.com\/labstack\/echo/, label: 'Echo', badge: '📣', kind: 'server' },
  { match: /^axum$|^actix-web$/, label: 'Rust web', badge: '🦀', kind: 'server' },
  { match: /^tokio$/, label: 'Tokio', badge: '🌀', kind: 'runtime' },
  { match: /^spring-boot|^org\.springframework/, label: 'Spring', badge: '🌱', kind: 'framework' },
  { match: /^vite$/, label: 'Vite', badge: '⚡', kind: 'build' },
  { match: /^webpack$/, label: 'webpack', badge: '📦', kind: 'build' },
  { match: /^esbuild$/, label: 'esbuild', badge: '⚙', kind: 'build' },
  { match: /^typescript$/, label: 'TypeScript', badge: 'TS', kind: 'language' },
  { match: /^vitest$|^jest$/, label: 'Vitest/Jest', badge: '✅', kind: 'testing' },
  { match: /^@playwright\/test$|^playwright$/, label: 'Playwright', badge: '🎭', kind: 'testing' },
  { match: /^cypress$/, label: 'Cypress', badge: '🌲', kind: 'testing' },
  { match: /^prisma$|^@prisma\/client$/, label: 'Prisma', badge: '🔺', kind: 'data' },
  { match: /^mongoose$/, label: 'Mongoose', badge: '🍃', kind: 'data' },
  { match: /^sqlite3$|^better-sqlite3$|go-sqlite3$/, label: 'SQLite', badge: '🗄', kind: 'data' },
  { match: /^pg$|^postgres$/, label: 'Postgres', badge: '🐘', kind: 'data' },
  { match: /^redis$/, label: 'Redis', badge: '🧠', kind: 'data' }
]

export interface FrameworkHit {
  label: string
  badge: string
  kind: string
  dep: string
}

/** Recognised frameworks, one per label, in the order they are declared. */
export function detectFrameworks(deps: DependencyRef[]): FrameworkHit[] {
  const hits = new Map<string, FrameworkHit>()
  for (const dep of deps) {
    for (const fw of FRAMEWORKS) {
      if (fw.match.test(dep.name) && !hits.has(fw.label)) {
        hits.set(fw.label, { label: fw.label, badge: fw.badge, kind: fw.kind, dep: dep.name })
      }
    }
  }
  return [...hits.values()]
}

/**
 * The dependencies worth showing a human: scaffolding dropped, and sub-packages
 * folded into the framework that implies them.
 */
export function meaningfulDependencies(deps: DependencyRef[]): DependencyRef[] {
  const present = new Set(deps.map((d) => d.name))
  return deps.filter((dep) => {
    if (isNoiseDependency(dep.name)) return false
    const impliedBy = IMPLIED[dep.name]
    return !(impliedBy && present.has(impliedBy))
  })
}

/** Manifests present in the repo, shallowest first — the root one leads. */
export function findManifests(paths: string[], max = 6): string[] {
  return paths
    .filter((path) => MANIFEST_FILES.includes((path.split('/').pop() ?? '').toLowerCase()))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .slice(0, max)
}
