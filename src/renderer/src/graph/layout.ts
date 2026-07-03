import type { GraphCommit } from '../../../shared/types'

export interface GraphNode {
  hash: string
  row: number
  lane: number
  color: number
}

/**
 * What a rail segment represents, so the renderer can style it and place
 * junction dots without re-deriving topology:
 *   normal — a straight run down a single lane (child and parent share a lane)
 *   branch — a first-parent link that changes lane (a tip converging left)
 *   merge  — a second-or-later parent flowing in (the classic merge fork)
 *   spur   — a stash hanging off its parent commit (drawn dashed)
 */
export type GraphEdgeKind = 'normal' | 'branch' | 'merge' | 'spur'

export interface GraphEdgeSpec {
  fromRow: number
  fromLane: number
  toRow: number
  toLane: number
  color: number
  kind: GraphEdgeKind
  /** Hash of the child (upper) node — the segment's start. */
  fromHash: string
  /** Hash of the parent (lower) node — the segment's end. */
  toHash: string
}

export interface GraphLayout {
  nodes: Map<string, GraphNode>
  edges: GraphEdgeSpec[]
  laneCount: number
}

/**
 * Assigns a lane to every commit (gitcito-style rails) and computes edges.
 * Commits must be in topological/date order (newest first), as produced by
 * `git log --all --date-order`.
 *
 * `spurs` are hashes (e.g. stashes) that must NOT disturb the trunk: they are
 * laid out in a second pass on a dedicated lane to the right of the real
 * commits they span, with a single edge back to their parent. Without this, a spur inserted high
 * in the list would reserve the trunk lane down to its parent and push the real
 * commits onto another (differently-coloured) lane.
 */
export function layoutGraph(commits: GraphCommit[], spurs: Set<string> = new Set()): GraphLayout {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdgeSpec[] = []

  // Each lane holds the hash it is "waiting for" (the next expected commit).
  const lanes: (string | null)[] = []
  const laneColor: number[] = []
  let colorCounter = 0
  let laneCount = 0

  const firstFree = (): number => {
    const idx = lanes.indexOf(null)
    if (idx !== -1) return idx
    lanes.push(null)
    laneColor.push(0)
    return lanes.length - 1
  }

  // ── Pass 1: real commits only (skip spur rows so the trunk is undisturbed). ──
  for (let row = 0; row < commits.length; row++) {
    const c = commits[row]
    if (spurs.has(c.hash)) continue

    // Find the lane expecting this commit (leftmost wins).
    let lane = lanes.indexOf(c.hash)
    if (lane === -1) {
      lane = firstFree()
      laneColor[lane] = colorCounter++
    }

    // Other lanes also expecting this commit merge into it and free up.
    for (let j = 0; j < lanes.length; j++) {
      if (j !== lane && lanes[j] === c.hash) lanes[j] = null
    }

    nodes.set(c.hash, { hash: c.hash, row, lane, color: laneColor[lane] })
    laneCount = Math.max(laneCount, lane + 1)

    const [p0, ...rest] = c.parents

    if (p0) {
      if (lanes.includes(p0)) {
        // First parent already expected elsewhere → this lane terminates here.
        lanes[lane] = null
      } else {
        lanes[lane] = p0
      }
    } else {
      lanes[lane] = null
    }

    for (const pk of rest) {
      if (!lanes.includes(pk)) {
        const l = firstFree()
        lanes[l] = pk
        laneColor[l] = colorCounter++
        laneCount = Math.max(laneCount, l + 1)
      }
    }
  }

  // ── Pass 2: spurs (stashes) on their own lane to the right of their span. ──
  // Each spur's dashed connector runs the full [spurRow, parentRow] range, so we
  // must reserve that whole span on its lane — otherwise two stashes whose
  // connectors overlap vertically collapse onto the same lane and read as a
  // single dashed line (GitKraken keeps each stash on a distinct lane).
  const spurSpans: { lane: number; lo: number; hi: number }[] = []
  for (let row = 0; row < commits.length; row++) {
    const c = commits[row]
    if (!spurs.has(c.hash)) continue
    const parent = c.parents[0] ? nodes.get(c.parents[0]) : undefined
    const lo = row
    const hi = parent ? parent.row : row
    // Busiest real-commit lane across the rows this spur's connector spans.
    let maxLane = 0
    for (const n of nodes.values()) {
      if (spurs.has(n.hash)) continue
      if (n.row >= lo && n.row <= hi) maxLane = Math.max(maxLane, n.lane)
    }
    // Sit just right of the real branches, then step further right until no
    // previously-placed spur's span overlaps this one's rows.
    let lane = maxLane + 1
    const clashes = (l: number): boolean =>
      spurSpans.some((s) => s.lane === l && s.lo <= hi && lo <= s.hi)
    while (clashes(lane)) lane++
    spurSpans.push({ lane, lo, hi })
    nodes.set(c.hash, { hash: c.hash, row, lane, color: colorCounter++ })
    laneCount = Math.max(laneCount, lane + 1)
  }

  // Edges: child → parent using final node positions.
  for (const c of commits) {
    const child = nodes.get(c.hash)
    if (!child) continue
    const isSpur = spurs.has(c.hash)
    for (let pi = 0; pi < c.parents.length; pi++) {
      const p = c.parents[pi]
      const parent = nodes.get(p)
      if (!parent) continue // parent beyond the loaded window
      const kind: GraphEdgeKind = isSpur
        ? 'spur'
        : pi > 0
          ? 'merge'
          : child.lane === parent.lane
            ? 'normal'
            : 'branch'
      edges.push({
        fromRow: child.row,
        fromLane: child.lane,
        toRow: parent.row,
        toLane: parent.lane,
        // Color the line by the endpoint furthest from the trunk (higher lane) —
        // i.e. the "new" thing: a diverging branch tip (or a stash spur) takes
        // the child's colour, a merged-in branch takes the incoming parent's.
        // Same-lane segments keep the shared lane colour.
        color: child.lane >= parent.lane ? child.color : parent.color,
        kind,
        fromHash: c.hash,
        toHash: p
      })
    }
  }

  return { nodes, edges, laneCount }
}

export const GRAPH_COLORS = [
  '#6c5ce7', // main — purple
  '#00d4ff', // feature — cyan
  '#00e6a8', // release — mint
  '#ff7a1a', // hotfix — orange
  '#f06eb6',
  '#7f8ff4',
  '#56c6e8',
  '#ff5c7a',
  '#8ddb4f',
  '#f2cc60',
  '#4fe3c1',
  '#b585f7'
]

export const colorFor = (index: number): string => GRAPH_COLORS[index % GRAPH_COLORS.length]
