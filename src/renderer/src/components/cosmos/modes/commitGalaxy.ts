import * as THREE from 'three'
import type { CosmosCommit } from '../../../../../shared/types'
import { seedColor } from '../engine'

const NODE_CAP = 800
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const GROW_DURATION = 0.9 // seconds a single branch takes to extend from parent to child
const GROW_STAGGER = 0.0035 // seconds between successive commits' reveal start, oldest-first

interface Node3 {
  position: THREE.Vector3
  color: string
  size: number
  label: string
  order: number // 0-based reveal order, oldest commit first
}

interface Edge3 {
  parent: string
  child: string
  radius: number
  secondary: boolean // true for merge "fusion" links (extra parents), which don't drive growth order
}

function easeOutCubic(t: number): number {
  const c = 1 - t
  return 1 - c * c * c
}

export interface CommitGalaxyController {
  group: THREE.Group
  capped: boolean
  nodeCount: number
  center: THREE.Vector3
  radius: number
  tick(elapsedSeconds: number): void
  dispose(): void
}

/** Renders commit history as a 3D spiral galaxy: commits are placed chronologically on
 *  an expanding Fibonacci sphere (golden-angle azimuth + evenly-stepped elevation, same
 *  "grew" aesthetic as a coral colony) so the structure has real volume and grows outward
 *  from a dense core in every direction — not just a flat disc, and not an unbounded
 *  branching walk (which degenerates into a long stringy chain for the mostly-linear
 *  histories real repos have). Each commit links back to its parent(s); branch thickness
 *  reflects how many files it touched. */
export function buildCommitGalaxy(commitsDesc: CosmosCommit[]): CommitGalaxyController {
  const capped = commitsDesc.length > NODE_CAP
  const subset = commitsDesc.slice(0, NODE_CAP) // most-recent-first
  const chronological = [...subset].reverse() // oldest -> newest
  const n = Math.max(1, chronological.length)

  const spiralScale = 30 / Math.sqrt(n) // keeps density roughly constant regardless of commit count

  const nodes = new Map<string, Node3>()
  const edges: Edge3[] = []

  const labelFor = (c: CosmosCommit): string => `${c.subject} — ${c.authorName}, ${new Date(c.timestamp * 1000).toLocaleDateString()}`
  const sizeFor = (c: CosmosCommit): number => 0.5 + Math.min(2, c.files.length * 0.12)

  chronological.forEach((c, k) => {
    const r = spiralScale * Math.sqrt(k)
    const theta = k * GOLDEN_ANGLE
    const y = n === 1 ? 0 : (k / (n - 1)) * 2 - 1 // -1..1, oldest at the bottom rising to newest at the top
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))
    const position = new THREE.Vector3(ringRadius * Math.cos(theta), y, ringRadius * Math.sin(theta)).multiplyScalar(r)
    nodes.set(c.hash, { position, color: seedColor(c.authorEmail || c.authorName), size: sizeFor(c), label: labelFor(c), order: k })
  })

  for (const c of chronological) {
    for (const [pi, parentHash] of c.parents.entries()) {
      if (!nodes.has(parentHash)) continue
      edges.push({
        parent: parentHash,
        child: c.hash,
        radius: pi === 0 ? 0.1 + Math.min(0.9, c.files.length * 0.1) : 0.06,
        secondary: pi > 0
      })
    }
  }

  const group = new THREE.Group()
  const hashes = [...nodes.keys()]

  const center = new THREE.Vector3()
  for (const h of hashes) center.add(nodes.get(h)!.position)
  if (hashes.length) center.divideScalar(hashes.length)
  let radius = 1
  for (const h of hashes) radius = Math.max(radius, center.distanceTo(nodes.get(h)!.position))

  const nodeGeo = new THREE.SphereGeometry(1, 10, 7)
  const nodeMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 })
  const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, Math.max(1, hashes.length))
  nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, hashes.length) * 3), 3)
  const color = new THREE.Color()
  hashes.forEach((h, i) => {
    color.set(nodes.get(h)!.color)
    nodeMesh.setColorAt(i, color)
  })
  if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true
  nodeMesh.userData.nodeMeta = hashes.map((h) => ({ id: h, label: nodes.get(h)!.label }))
  group.add(nodeMesh)

  const edgeGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
  const edgeMat = new THREE.MeshBasicMaterial({ color: '#8899ff', transparent: true, opacity: 0.5 })
  const edgeMesh = new THREE.InstancedMesh(edgeGeo, edgeMat, Math.max(1, edges.length))
  edgeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, edges.length) * 3), 3)
  const secondaryColor = new THREE.Color('#aab0c8')
  const primaryColor = new THREE.Color('#8899ff')
  edges.forEach((e, i) => edgeMesh.setColorAt(i, e.secondary ? secondaryColor : primaryColor))
  if (edgeMesh.instanceColor) edgeMesh.instanceColor.needsUpdate = true
  group.add(edgeMesh)

  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion()
  let fullyGrown = false

  const tick = (elapsedSeconds: number): void => {
    if (fullyGrown) return
    let allDone = true

    hashes.forEach((h, i) => {
      const node = nodes.get(h)!
      const t = Math.min(1, Math.max(0, (elapsedSeconds - node.order * GROW_STAGGER) / GROW_DURATION))
      if (t < 1) allDone = false
      const eased = easeOutCubic(t)
      dummy.position.copy(node.position)
      dummy.quaternion.identity()
      dummy.scale.setScalar(node.size * eased)
      dummy.updateMatrix()
      nodeMesh.setMatrixAt(i, dummy.matrix)
    })
    nodeMesh.instanceMatrix.needsUpdate = true

    edges.forEach((e, i) => {
      const parent = nodes.get(e.parent)
      const child = nodes.get(e.child)
      if (!parent || !child) return
      const t = Math.min(1, Math.max(0, (elapsedSeconds - child.order * GROW_STAGGER) / GROW_DURATION))
      if (t < 1) allDone = false
      const eased = easeOutCubic(t)
      const end = parent.position.clone().lerp(child.position, eased)
      const mid = parent.position.clone().add(end).multiplyScalar(0.5)
      const length = parent.position.distanceTo(end)
      const dir = end.clone().sub(parent.position)
      if (dir.lengthSq() > 1e-6) quat.setFromUnitVectors(up, dir.normalize())
      dummy.position.copy(mid)
      dummy.quaternion.copy(quat)
      dummy.scale.set(e.radius, Math.max(0.001, length), e.radius)
      dummy.updateMatrix()
      edgeMesh.setMatrixAt(i, dummy.matrix)
    })
    edgeMesh.instanceMatrix.needsUpdate = true

    if (allDone) fullyGrown = true
  }

  // Prime instance matrices at t=0 so nothing flashes full-size before the
  // engine's first real tick() call lands.
  tick(0)

  return {
    group,
    capped,
    nodeCount: nodes.size,
    center,
    radius,
    tick,
    dispose(): void {
      nodeGeo.dispose()
      nodeMat.dispose()
      edgeGeo.dispose()
      edgeMat.dispose()
    }
  }
}
