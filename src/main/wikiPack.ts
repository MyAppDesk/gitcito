/**
 * Choosing what the wiki generator is allowed to read.
 *
 * There is no symbol index here: the context is picked deterministically from
 * the repo's own file list and its churn hotspots, then packed under a byte
 * budget. Pure functions, so the choice is testable without a repo.
 */

const DOC_FIRST = /^(readme|contributing|architecture|design|changelog)/i

/** Manifests worth reading first — they name the project and its dependencies. */
const MANIFESTS = new Set([
  'package.json',
  'pyproject.toml',
  'cargo.toml',
  'go.mod',
  'pubspec.yaml',
  'composer.json',
  'gemfile',
  'build.gradle',
  'pom.xml',
  'makefile',
  'dockerfile'
])

const SKIP_DIRS = [
  'node_modules/', 'dist/', 'build/', 'out/', 'target/', 'vendor/', '.git/',
  'coverage/', '.next/', '.nuxt/', '__pycache__/', '.venv/', 'venv/',
  'Pods/', '.gradle/', '.idea/', '.dart_tool/'
]

const SKIP_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'icns', 'bmp', 'tiff', 'svg',
  'pdf', 'zip', 'gz', 'tar', 'bz2', '7z', 'rar', 'jar', 'war',
  'mp3', 'mp4', 'mov', 'avi', 'webm', 'wav', 'ogg',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'o', 'a', 'pyc', 'wasm',
  'lock', 'snap', 'map'
])

const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'cargo.lock',
  'poetry.lock', 'gemfile.lock', 'composer.lock', 'pubspec.lock',
  '.ds_store', 'thumbs.db'
])

function extensionOf(path: string): string {
  const name = path.split('/').pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** True for a file whose text could plausibly describe how the project works. */
export function isReadableSource(path: string): boolean {
  if (!path || path.length > 400) return false
  const lower = path.toLowerCase()
  if (SKIP_DIRS.some((dir) => lower.startsWith(dir.toLowerCase()) || lower.includes(`/${dir.toLowerCase()}`))) return false
  const name = lower.split('/').pop() ?? ''
  if (SKIP_FILES.has(name)) return false
  // Minified bundles are source in name only.
  if (/\.min\.[a-z0-9]+$/.test(name)) return false
  return !SKIP_EXT.has(extensionOf(lower))
}

/** Where a path sorts in the planner's list: lower is more important. */
function planRank(path: string, hotspots: Map<string, number>): number {
  const name = (path.split('/').pop() ?? '').toLowerCase()
  const depth = path.split('/').length
  const isRoot = depth === 1
  if (isRoot && DOC_FIRST.test(name)) return 0
  if (isRoot && MANIFESTS.has(name)) return 1
  if (DOC_FIRST.test(name)) return 2
  const hot = hotspots.get(path)
  if (hot !== undefined) return 3
  return 4 + Math.min(depth, 5)
}

/**
 * The file list handed to the planner: documentation and manifests first, then
 * the files the repo actually churns, then everything else shallowest-first.
 */
export function rankPlanFiles(paths: string[], hotspots: string[], max = 400): string[] {
  const rank = new Map(hotspots.map((p, i) => [p, i]))
  return paths
    .filter(isReadableSource)
    .map((path) => ({ path, rank: planRank(path, rank), hot: rank.get(path) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.hot - b.hot || a.path.localeCompare(b.path))
    .slice(0, max)
    .map((f) => f.path)
}

export interface PackedFile {
  path: string
  content: string
}

/**
 * Packs a page's files under a byte budget: each file is clipped, and files are
 * dropped from the end once the budget is spent, so a page never half-reads a
 * file it then cites.
 */
export function buildPagePack(
  files: PackedFile[],
  opts: { maxBytes?: number; maxFileBytes?: number } = {}
): { files: PackedFile[]; dropped: number } {
  const maxBytes = opts.maxBytes ?? 32000
  const maxFileBytes = opts.maxFileBytes ?? 6000

  const packed: PackedFile[] = []
  let used = 0
  let dropped = 0
  for (const file of files) {
    if (!file.content.trim()) {
      dropped++
      continue
    }
    const content =
      file.content.length > maxFileBytes ? `${file.content.slice(0, maxFileBytes)}\n…(truncated)` : file.content
    if (used + content.length > maxBytes && packed.length > 0) {
      dropped++
      continue
    }
    used += content.length
    packed.push({ path: file.path, content })
  }
  return { files: packed, dropped }
}

/** The pack as the model sees it: a delimited block per file, path-labelled. */
export function serializePack(pack: { files: PackedFile[]; dropped: number }): string {
  const blocks = pack.files.map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
  if (pack.dropped > 0) {
    blocks.push(`(${pack.dropped} further file(s) were not included — do not cite them.)`)
  }
  return blocks.join('\n\n')
}

/** Compact repo facts for the planner: churn, size and who works on it. */
export function serializeRepoFacts(facts: {
  name: string
  branch: string
  totalCommits: number
  authors: { name: string; commits: number }[]
  hotspots: { path: string; commits: number }[]
}): string {
  const authors = facts.authors
    .slice(0, 5)
    .map((a) => `${a.name} (${a.commits})`)
    .join(', ')
  const hotspots = facts.hotspots
    .slice(0, 15)
    .map((h) => `${h.path} (${h.commits} commits)`)
    .join('\n')
  return `Repository: ${facts.name}
Current branch: ${facts.branch}
Commits analysed: ${facts.totalCommits}
Most active authors: ${authors || '(unknown)'}

Most frequently changed files:
${hotspots || '(none)'}`
}
