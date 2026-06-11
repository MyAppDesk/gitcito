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
 */
export function layoutGraph(commits: GraphCommit[]): GraphLayout {
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

  for (let row = 0; row < commits.length; row++) {
    const c = commits[row]

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
        color: parent.lane === child.lane ? child.color : parent.color
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
