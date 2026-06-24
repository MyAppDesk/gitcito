import type { GraphCommit } from '../../../shared/types'

export interface GraphNode {
  hash: string
  row: number
  lane: number
  color: number
}

export interface GraphEdgeSpec {
  fromRow: number
  fromLane: number
  toRow: number
  toLane: number
  color: number
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
  for (let row = 0; row < commits.length; row++) {
    const c = commits[row]
    if (!spurs.has(c.hash)) continue
    const parent = c.parents[0] ? nodes.get(c.parents[0]) : undefined
    const lo = row
    const hi = parent ? parent.row : row
    // Sit just right of the busiest real (or already-placed spur) lane in the
    // rows this spur spans, so it never collides with a real branch.
    let maxLane = 0
    for (const n of nodes.values()) {
      if (n.row >= lo && n.row <= hi) maxLane = Math.max(maxLane, n.lane)
    }
    const lane = maxLane + 1
    nodes.set(c.hash, { hash: c.hash, row, lane, color: colorCounter++ })
    laneCount = Math.max(laneCount, lane + 1)
  }

  // Edges: child → parent using final node positions.
  for (const c of commits) {
    const child = nodes.get(c.hash)
    if (!child) continue
    for (const p of c.parents) {
      const parent = nodes.get(p)
      if (!parent) continue // parent beyond the loaded window
      edges.push({
        fromRow: child.row,
        fromLane: child.lane,
        toRow: parent.row,
        toLane: parent.lane,
        // Color the line by the endpoint furthest from the trunk (higher lane) —
        // i.e. the "new" thing: a diverging branch tip (or a stash spur) takes
        // the child's colour, a merged-in branch takes the incoming parent's.
        // Same-lane segments keep the shared lane colour.
        color: child.lane >= parent.lane ? child.color : parent.color
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
