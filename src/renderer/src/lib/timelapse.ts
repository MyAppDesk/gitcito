import type { TimelapseCommit } from '../../../shared/types'

/**
 * Layout and simulation for the repository timelapse — the animation that
 * replays a repo's whole history as its files appearing, pulsing and dying.
 *
 * Kept free of canvas and React so the interesting part (where a file lands,
 * what a commit does to the world) is unit-testable; the component only draws
 * whatever state this produces.
 */

/** One file, as a dot on the canvas. */
export interface TlNode {
  path: string
  /** Position in 0..1 space, so the canvas can be any size. */
  x: number
  y: number
  color: string
  /** Grows every time the file is touched — busy files end up bigger. */
  weight: number
  /** False once the file is deleted; kept around to fade out. */
  alive: boolean
  /** Index of the commit that last touched it (-1 = never). */
  lastTouched: number
  /** Index of the commit that removed it (-1 = still alive). */
  diedAt: number
}

export interface TlState {
  nodes: Map<string, TlNode>
  /** Last applied commit index, -1 before anything has been applied. */
  index: number
  /** Files currently alive. */
  alive: number
  /** Distinct authors seen so far. */
  authors: Set<string>
}

/** Stable 32-bit hash, so a file always lands in the same spot. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Top-level folder a path belongs to; files at the root share one group. */
export function topFolder(path: string): string {
  const slash = path.indexOf('/')
  return slash === -1 ? '/' : path.slice(0, slash)
}

/**
 * Every top-level folder in the history, ordered by how many files it holds
 * (biggest first) so the busiest areas get the roomiest clusters.
 */
export function folderOrder(commits: TimelapseCommit[]): string[] {
  const counts = new Map<string, Set<string>>()
  for (const c of commits) {
    for (const f of c.files) {
      const folder = topFolder(f.path)
      const set = counts.get(folder)
      if (set) set.add(f.path)
      else counts.set(folder, new Set([f.path]))
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .map(([folder]) => folder)
}

/**
 * Where a file sits: one disc per top-level folder arranged around the centre,
 * and a deterministic spot inside its own disc. Positions never move, so the
 * eye can follow a file across the whole run.
 */
export function placeFile(path: string, folders: string[], palette: string[]): { x: number; y: number; color: string } {
  const folder = topFolder(path)
  const fi = Math.max(0, folders.indexOf(folder))
  const n = Math.max(1, folders.length)
  // Cluster centre on a circle; a single folder sits in the middle instead.
  const clusterAngle = (fi / n) * Math.PI * 2
  const clusterR = n === 1 ? 0 : 0.3
  const cx = 0.5 + Math.cos(clusterAngle) * clusterR
  const cy = 0.5 + Math.sin(clusterAngle) * clusterR

  const h = hashString(path)
  const angle = ((h % 3600) / 3600) * Math.PI * 2
  // sqrt keeps the dots evenly spread instead of bunching at the centre.
  const radius = Math.sqrt(((h >>> 12) % 1000) / 1000) * (n === 1 ? 0.42 : 0.17)
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    color: palette[fi % palette.length]
  }
}

export function emptyState(): TlState {
  return { nodes: new Map(), index: -1, alive: 0, authors: new Set() }
}

/**
 * Apply one commit to the world: added files are born, modified ones grow,
 * deleted ones die. Mutates and returns the same state — this runs once per
 * animation frame at speed, and a fresh Map per commit would be wasteful.
 */
export function applyCommit(
  state: TlState,
  commit: TimelapseCommit,
  index: number,
  folders: string[],
  palette: string[]
): TlState {
  state.index = index
  state.authors.add(commit.author)
  for (const file of commit.files) {
    const existing = state.nodes.get(file.path)
    if (file.status === 'D') {
      if (existing?.alive) {
        existing.alive = false
        existing.diedAt = index
        state.alive--
      }
      continue
    }
    if (existing) {
      if (!existing.alive) {
        existing.alive = true
        existing.diedAt = -1
        state.alive++
      }
      existing.weight = Math.min(existing.weight + 1, 40)
      existing.lastTouched = index
      continue
    }
    const { x, y, color } = placeFile(file.path, folders, palette)
    state.nodes.set(file.path, { path: file.path, x, y, color, weight: 1, alive: true, lastTouched: index, diedAt: -1 })
    state.alive++
  }
  return state
}

/** Replay from scratch up to (and including) `index`. Used when scrubbing back. */
export function stateAt(
  commits: TimelapseCommit[],
  index: number,
  folders: string[],
  palette: string[]
): TlState {
  const state = emptyState()
  for (let i = 0; i <= index && i < commits.length; i++) {
    applyCommit(state, commits[i], i, folders, palette)
  }
  return state
}

/**
 * How bright a node's "just changed" halo is, 1 → 0 over `fade` commits.
 * Dead nodes fade out entirely instead.
 */
export function nodeGlow(node: TlNode, index: number, fade = 12): number {
  if (node.lastTouched < 0) return 0
  const age = index - node.lastTouched
  if (age < 0 || age > fade) return 0
  return 1 - age / fade
}

/** Opacity of a node: dead ones dissolve over `fade` commits, then vanish. */
export function nodeAlpha(node: TlNode, index: number, fade = 20): number {
  if (node.alive) return 1
  const age = index - node.diedAt
  if (age >= fade) return 0
  return Math.max(0, 1 - age / fade)
}
