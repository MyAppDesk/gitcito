/**
 * Who imports whom, read straight from the source.
 *
 * No symbol index and no model: imports are matched textually, resolved against
 * the repo's own file list, and aggregated per folder. An import that cannot be
 * resolved to a file in the repo is counted as external and dropped — the graph
 * only ever draws edges between folders that really exist.
 */

import type { ImportEdge, ImportGraph, ImportNode } from './types'

const JS_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte']
const INDEX_FILES = JS_EXT.map((e) => `index${e}`)

/** Strips line and block comments so a commented-out import isn't an edge. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const PATTERNS: { test: RegExp; extract: RegExp[] }[] = [
  {
    // JavaScript / TypeScript and friends
    test: /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$/i,
    extract: [
      /(?:^|\n)\s*import\s+[^'"();]*?from\s*['"]([^'"]+)['"]/g,
      /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
      /(?:^|\n)\s*export\s+[^'"();]*?from\s*['"]([^'"]+)['"]/g,
      /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ]
  },
  {
    test: /\.py$/i,
    extract: [/(?:^|\n)\s*from\s+([.\w]+)\s+import\s+/g, /(?:^|\n)\s*import\s+([.\w]+)/g]
  },
  {
    test: /\.go$/i,
    extract: [/(?:^|\n)\s*import\s+(?:\w+\s+)?"([^"]+)"/g, /(?:^|\n)\s*"([^"]+)"\s*(?:\/\/.*)?$/gm]
  },
  {
    test: /\.rs$/i,
    extract: [/(?:^|\n)\s*(?:pub\s+)?use\s+([\w:{}, *]+);/g, /(?:^|\n)\s*(?:pub\s+)?mod\s+(\w+)\s*;/g]
  },
  {
    test: /\.dart$/i,
    extract: [/(?:^|\n)\s*(?:import|export|part)\s+['"]([^'"]+)['"]/g]
  },
  {
    test: /\.rb$/i,
    extract: [/(?:^|\n)\s*require(?:_relative)?\s+['"]([^'"]+)['"]/g]
  },
  {
    test: /\.(c|h|cc|cpp|cxx|hpp|hh|m|mm)$/i,
    extract: [/(?:^|\n)\s*#include\s+["<]([^">]+)[">]/g]
  },
  {
    test: /\.(php)$/i,
    extract: [/(?:^|\n)\s*(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g]
  }
]

/** Raw import specifiers a file mentions, in source order, deduplicated. */
export function extractImports(path: string, content: string): string[] {
  const rules = PATTERNS.find((p) => p.test.test(path))
  if (!rules) return []
  const text = stripComments(content)
  const found = new Set<string>()
  for (const re of rules.extract) {
    for (const match of text.matchAll(re)) {
      const spec = match[1]?.trim()
      if (spec) found.add(spec)
    }
  }
  return [...found]
}

function dirOf(path: string): string {
  const cut = path.lastIndexOf('/')
  return cut === -1 ? '' : path.slice(0, cut)
}

/** Normalises `a/b/../c` and `./x` into `a/c` and `x`. */
function normalise(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out.join('/')
}

/** Tries a base path as-is, with known extensions, and as a directory index. */
function firstExisting(base: string, files: Set<string>): string | null {
  if (files.has(base)) return base
  for (const ext of JS_EXT) if (files.has(base + ext)) return base + ext
  for (const index of INDEX_FILES) if (files.has(`${base}/${index}`)) return `${base}/${index}`
  for (const ext of ['.py', '.go', '.rs', '.dart', '.rb', '.php']) {
    if (files.has(base + ext)) return base + ext
  }
  if (files.has(`${base}/__init__.py`)) return `${base}/__init__.py`
  if (files.has(`${base}/mod.rs`)) return `${base}/mod.rs`
  return null
}

/**
 * The repo file an import points at, or null when it resolves outside the repo
 * (a package, a stdlib module) — those are not edges in this graph.
 */
export function resolveImport(fromPath: string, spec: string, files: Set<string>): string | null {
  if (!spec) return null
  const here = dirOf(fromPath)

  // Relative: the common, unambiguous case.
  if (spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..') {
    return firstExisting(normalise(`${here}/${spec}`), files)
  }
  // Python's leading dots mean "up from here".
  const dots = /^(\.+)([\w.]*)$/.exec(spec)
  if (dots && spec.startsWith('.')) {
    const up = '../'.repeat(Math.max(0, dots[1].length - 1))
    return firstExisting(normalise(`${here}/${up}${dots[2].replace(/\./g, '/')}`), files)
  }
  // Common aliases for the project root.
  const alias = /^(?:@|~|#)\/(.+)$/.exec(spec)
  if (alias) {
    return firstExisting(alias[1], files) ?? firstExisting(`src/${alias[1]}`, files)
  }
  // Rust paths, and dotted Python modules, both name folders in the repo.
  const dotted = spec.replace(/^(crate|self|super)::/, '').replace(/::/g, '/').replace(/\./g, '/')
  const cleaned = dotted.split(/[{ ,*]/)[0].replace(/\/+$/, '')
  if (cleaned && !cleaned.includes(':')) {
    const direct = firstExisting(cleaned, files) ?? firstExisting(`src/${cleaned}`, files)
    if (direct) return direct
    // A sibling module named without a prefix (`mod foo;`, `require 'foo'`).
    const sibling = firstExisting(normalise(`${here}/${cleaned}`), files)
    if (sibling) return sibling
  }
  return null
}

/** The folder a file belongs to, cut to `depth` levels. '' becomes '(root)'. */
export function folderOf(path: string, depth: number): string {
  const parts = path.split('/')
  parts.pop()
  if (parts.length === 0) return '(root)'
  return parts.slice(0, Math.max(1, depth)).join('/')
}

/**
 * How deep to cut folder paths so the graph has enough nodes to be interesting
 * without turning into a hairball. Repos bury their structure at different
 * depths — `src/main` in one, `src/renderer/src/components` in another — so the
 * depth is chosen from the links themselves: the deepest cut that still fits.
 * Folders with no links at all don't count, since they are never drawn.
 */
export function pickDepth(links: { from: string; to: string }[], maxNodes = 14): number {
  let best = 1
  let bestNodes = -1
  for (let depth = 1; depth <= 6; depth++) {
    const nodes = new Set<string>()
    for (const link of links) {
      const from = folderOf(link.from, depth)
      const to = folderOf(link.to, depth)
      if (from === to) continue
      nodes.add(from)
      nodes.add(to)
    }
    if (nodes.size > maxNodes) break
    // Deeper only wins if it actually separates more folders — past the deepest
    // real folder every cut looks the same, and the shallower one is the truth.
    if (nodes.size > bestNodes) {
      bestNodes = nodes.size
      best = depth
    }
  }
  return best
}

/**
 * Aggregates file-level imports into a folder-level graph. Edges inside a
 * folder are dropped — the interesting part is which folder leans on which.
 * Pass `depth: 0` to pick the depth from the repo's own layout.
 */
export function buildImportGraph(
  files: { path: string; content: string }[],
  opts: { depth?: number; maxEdges?: number } = {}
): ImportGraph {
  const maxEdges = opts.maxEdges ?? 40
  const known = new Set(files.map((f) => f.path))

  // Resolve every import to a file once; the folder depth is applied after, so
  // trying several depths costs nothing.
  const links: { from: string; to: string }[] = []
  const fileCounts = new Map<string, number>()
  let resolved = 0
  let external = 0

  for (const file of files) {
    for (const spec of extractImports(file.path, file.content)) {
      const target = resolveImport(file.path, spec, known)
      if (!target) {
        external++
        continue
      }
      resolved++
      links.push({ from: file.path, to: target })
    }
  }

  const depth = opts.depth && opts.depth > 0 ? opts.depth : pickDepth(links)
  for (const file of files) {
    const folder = folderOf(file.path, depth)
    fileCounts.set(folder, (fileCounts.get(folder) ?? 0) + 1)
  }

  const counts = new Map<string, number>()
  for (const link of links) {
    const from = folderOf(link.from, depth)
    const to = folderOf(link.to, depth)
    if (from === to) continue // same folder: not a dependency between modules
    const key = `${from} ${to}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const allEdges: ImportEdge[] = [...counts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split(' ')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from))

  const edges = allEdges.slice(0, maxEdges)
  const used = new Set(edges.flatMap((e) => [e.from, e.to]))
  const nodes: ImportNode[] = [...used]
    .map((id) => ({
      id,
      files: fileCounts.get(id) ?? 0,
      out: edges.filter((e) => e.from === id).reduce((s, e) => s + e.count, 0),
      in: edges.filter((e) => e.to === id).reduce((s, e) => s + e.count, 0)
    }))
    .sort((a, b) => b.in + b.out - (a.in + a.out) || a.id.localeCompare(b.id))

  return { nodes, edges, depth, resolved, external, omittedEdges: allEdges.length - edges.length }
}

/**
 * The prefix every folder shares, which says nothing and eats the label. In a
 * repo where everything lives under `desktop/app`, the interesting part is what
 * comes after it.
 */
export function commonPrefix(ids: string[]): string {
  if (ids.length < 2) return ''
  const parts = ids.map((id) => id.split('/'))
  const first = parts[0]
  let shared = 0
  while (shared < first.length - 1 && parts.every((p) => p.length > shared + 1 && p[shared] === first[shared])) {
    shared++
  }
  return shared === 0 ? '' : `${first.slice(0, shared).join('/')}/`
}

/** Short label for a folder: no shared prefix, and never longer than `max`. */
export function shortLabel(id: string, prefix: string, max = 22): string {
  const trimmed = prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id
  if (trimmed.length <= max) return trimmed
  const parts = trimmed.split('/')
  // Keep the tail — the last folders are what distinguishes it.
  let out = parts[parts.length - 1]
  for (let i = parts.length - 2; i >= 0; i--) {
    const next = `${parts[i]}/${out}`
    if (next.length > max) return `…/${out}`
    out = next
  }
  return out
}

/**
 * How far a folder sits from the leaves: things nothing depends on are at the
 * top, foundations everything imports are at the bottom. Cycles settle on the
 * lowest layer that terminates, so a circular dependency can't loop forever.
 */
export function layerNodes(nodes: ImportNode[], edges: ImportEdge[]): Map<string, number> {
  const out = new Map<string, string[]>()
  for (const node of nodes) out.set(node.id, [])
  for (const edge of edges) out.get(edge.from)?.push(edge.to)

  const depth = new Map<string, number>()
  const visiting = new Set<string>()
  const walk = (id: string): number => {
    const cached = depth.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id)) return 0 // part of a cycle: stop unwinding here
    visiting.add(id)
    const children = out.get(id) ?? []
    const value = children.length === 0 ? 0 : 1 + Math.max(...children.map(walk))
    visiting.delete(id)
    depth.set(id, value)
    return value
  }
  for (const node of nodes) walk(node.id)
  return depth
}

/** Folders that only ever import — nothing in the repo depends on them. */
export function entryPoints(graph: ImportGraph): string[] {
  return graph.nodes.filter((n) => n.in === 0 && n.out > 0).map((n) => n.id)
}

/** Folders everything leans on, most depended-upon first. */
export function foundations(graph: ImportGraph, max = 3): string[] {
  return [...graph.nodes]
    .filter((n) => n.in > 0)
    .sort((a, b) => b.in - a.in)
    .slice(0, max)
    .map((n) => n.id)
}
