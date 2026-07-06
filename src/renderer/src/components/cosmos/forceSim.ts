/** Minimal 3D force-directed layout (Fruchterman-Reingold style): repulsion between
 *  all node pairs, spring attraction along edges, mild center gravity. Run for a
 *  fixed iteration count to "cook" a stable layout up front, rather than
 *  simulating every render frame — cheaper and avoids visible jitter. */

export interface ForceSimEdge {
  a: string
  b: string
  weight?: number
}

export interface ForceSimOptions {
  iterations?: number
  repulsion?: number
  springLength?: number
  springStrength?: number
  gravity?: number
  spread?: number
}

export function layoutForceGraph3D(
  nodeIds: string[],
  edges: ForceSimEdge[],
  opts: ForceSimOptions = {}
): Map<string, [number, number, number]> {
  const n = nodeIds.length
  const result = new Map<string, [number, number, number]>()
  if (n === 0) return result

  const { iterations = 160, repulsion = 24, springLength = 32, springStrength = 0.05, gravity = 0.015, spread = 220 } = opts

  const idx = new Map(nodeIds.map((id, i) => [id, i]))
  const pos = new Float32Array(n * 3)
  const vel = new Float32Array(n * 3)

  for (let i = 0; i < n; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = spread * (0.35 + 0.65 * Math.random())
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
  }

  const edgeIdx: { a: number; b: number; w: number }[] = []
  for (const e of edges) {
    const a = idx.get(e.a)
    const b = idx.get(e.b)
    if (a === undefined || b === undefined || a === b) continue
    edgeIdx.push({ a, b, w: e.weight ?? 1 })
  }

  const force = new Float32Array(n * 3)

  for (let iter = 0; iter < iterations; iter++) {
    force.fill(0)
    const cooling = 1 - iter / iterations

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i * 3] - pos[j * 3]
        let dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        let dz = pos[i * 3 + 2] - pos[j * 3 + 2]
        let distSq = dx * dx + dy * dy + dz * dz
        if (distSq < 1) distSq = 1
        const dist = Math.sqrt(distSq)
        const f = (repulsion * repulsion) / distSq
        dx = (dx / dist) * f
        dy = (dy / dist) * f
        dz = (dz / dist) * f
        force[i * 3] += dx
        force[i * 3 + 1] += dy
        force[i * 3 + 2] += dz
        force[j * 3] -= dx
        force[j * 3 + 1] -= dy
        force[j * 3 + 2] -= dz
      }
    }

    for (const e of edgeIdx) {
      const dx = pos[e.b * 3] - pos[e.a * 3]
      const dy = pos[e.b * 3 + 1] - pos[e.a * 3 + 1]
      const dz = pos[e.b * 3 + 2] - pos[e.a * 3 + 2]
      const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy + dz * dz))
      const f = springStrength * (dist - springLength) * e.w
      const fx = (dx / dist) * f
      const fy = (dy / dist) * f
      const fz = (dz / dist) * f
      force[e.a * 3] += fx
      force[e.a * 3 + 1] += fy
      force[e.a * 3 + 2] += fz
      force[e.b * 3] -= fx
      force[e.b * 3 + 1] -= fy
      force[e.b * 3 + 2] -= fz
    }

    for (let i = 0; i < n; i++) {
      force[i * 3] -= pos[i * 3] * gravity
      force[i * 3 + 1] -= pos[i * 3 + 1] * gravity
      force[i * 3 + 2] -= pos[i * 3 + 2] * gravity

      vel[i * 3] = (vel[i * 3] + force[i * 3]) * 0.82 * cooling
      vel[i * 3 + 1] = (vel[i * 3 + 1] + force[i * 3 + 1]) * 0.82 * cooling
      vel[i * 3 + 2] = (vel[i * 3 + 2] + force[i * 3 + 2]) * 0.82 * cooling

      pos[i * 3] += vel[i * 3]
      pos[i * 3 + 1] += vel[i * 3 + 1]
      pos[i * 3 + 2] += vel[i * 3 + 2]
    }
  }

  for (let i = 0; i < n; i++) {
    result.set(nodeIds[i], [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]])
  }
  return result
}
