import * as THREE from 'three'
import type { CosmosCommit } from '../../../../../shared/types'
import { seedColor } from '../engine'

export const GOURCE_MAX_FILES = 600
const MAX_FILES = GOURCE_MAX_FILES
const TARGET_DURATION_S = 90 // default playback length for a full history run
const BURST_POOL = 48
const BURST_TRAVEL_S = 0.7
const PULSE_DECAY_PER_S = 1.6

interface TreeNode {
  id: string
  depth: number
  isFile: boolean
  children: TreeNode[]
  position: [number, number, number]
  color: string
  baseSize: number
}

function extColor(path: string): string {
  const dot = path.lastIndexOf('.')
  const ext = dot >= 0 ? path.slice(dot) : path
  return seedColor(ext, 55, 62)
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { id: '', depth: 0, isFile: false, children: [], position: [0, 0, 0], color: '#8890a0', baseSize: 2.4 }
  const byPath = new Map<string, TreeNode>([['', root]])
  for (const p of paths) {
    const segs = p.split('/')
    let cur = root
    let curPath = ''
    segs.forEach((seg, i) => {
      curPath = curPath ? `${curPath}/${seg}` : seg
      let node = byPath.get(curPath)
      if (!node) {
        const isFile = i === segs.length - 1
        node = { id: curPath, depth: i + 1, isFile, children: [], position: [0, 0, 0], color: isFile ? extColor(curPath) : '#8890a0', baseSize: isFile ? 0.9 : 1.6 }
        byPath.set(curPath, node)
        cur.children.push(node)
      }
      cur = node
    })
  }
  return root
}

function layoutTree(root: TreeNode): void {
  const place = (node: TreeNode, angleStart: number, angleEnd: number, radius: number): void => {
    const angle = (angleStart + angleEnd) / 2
    node.position = [radius * Math.cos(angle), -node.depth * 9, radius * Math.sin(angle)]
    if (!node.children.length) return
    const step = (angleEnd - angleStart) / node.children.length
    node.children.forEach((child, i) => place(child, angleStart + i * step, angleStart + (i + 1) * step, radius + 22))
  }
  root.position = [0, 0, 0]
  const step = (Math.PI * 2) / Math.max(1, root.children.length)
  root.children.forEach((child, i) => place(child, i * step, (i + 1) * step, 22))
}

function flatten(root: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(root)
  for (const c of root.children) flatten(c, out)
  return out
}

export interface GourceController {
  group: THREE.Group
  capped: boolean
  totalFiles: number
  isPlaying: boolean
  progress: number // 0..1
  currentDate: number // unix seconds of most recently processed commit, 0 if none yet
  play(): void
  pause(): void
  setSpeedMultiplier(mult: number): void
  seek(fraction: number): void
  tick(dtSeconds: number): void
  dispose(): void
}

export function buildGourceTree(commitsDesc: CosmosCommit[]): GourceController {
  const commits = [...commitsDesc].reverse() // chronological, oldest first
  const fileTouches = new Map<string, number>()
  for (const c of commits) for (const f of c.files) fileTouches.set(f.path, (fileTouches.get(f.path) ?? 0) + 1)
  const topFiles = [...fileTouches.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_FILES)
  const fileSet = new Set(topFiles.map(([p]) => p))
  const capped = fileTouches.size > MAX_FILES

  const root = buildTree([...fileSet])
  layoutTree(root)
  const nodes = flatten(root)
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]))

  const authorNames = new Map<string, string>()
  for (const c of commits) {
    const key = c.authorEmail || c.authorName
    if (!authorNames.has(key)) authorNames.set(key, c.authorName)
  }
  const authorKeys = [...authorNames.keys()]
  const authorPos = new Map<string, THREE.Vector3>()
  authorKeys.forEach((key, i) => {
    const angle = (i / Math.max(1, authorKeys.length)) * Math.PI * 2
    authorPos.set(key, new THREE.Vector3(260 * Math.cos(angle), 200, 260 * Math.sin(angle)))
  })

  const group = new THREE.Group()

  // Tree nodes: one instanced mesh, per-instance pulse tracked separately.
  const treeGeo = new THREE.SphereGeometry(1, 10, 7)
  const treeMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 })
  const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, Math.max(1, nodes.length))
  treeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, nodes.length) * 3), 3)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const pulses = new Float32Array(nodes.length)
  nodes.forEach((node, i) => {
    dummy.position.set(...node.position)
    dummy.scale.setScalar(node.baseSize)
    dummy.updateMatrix()
    treeMesh.setMatrixAt(i, dummy.matrix)
    color.set(node.color)
    treeMesh.setColorAt(i, color)
  })
  treeMesh.instanceMatrix.needsUpdate = true
  if (treeMesh.instanceColor) treeMesh.instanceColor.needsUpdate = true
  treeMesh.userData.nodeMeta = nodes.map((n) => ({ id: n.id, label: n.id || '(root)' }))
  group.add(treeMesh)

  // Author ring markers.
  const authorGeo = new THREE.SphereGeometry(1, 10, 7)
  const authorMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.6, roughness: 0.3 })
  const authorMesh = new THREE.InstancedMesh(authorGeo, authorMat, Math.max(1, authorKeys.length))
  authorMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, authorKeys.length) * 3), 3)
  authorKeys.forEach((key, i) => {
    const p = authorPos.get(key)!
    dummy.position.copy(p)
    dummy.scale.setScalar(3.2)
    dummy.updateMatrix()
    authorMesh.setMatrixAt(i, dummy.matrix)
    color.set(seedColor(key, 80, 65))
    authorMesh.setColorAt(i, color)
  })
  authorMesh.instanceMatrix.needsUpdate = true
  if (authorMesh.instanceColor) authorMesh.instanceColor.needsUpdate = true
  authorMesh.userData.nodeMeta = authorKeys.map((key) => ({ id: `author:${key}`, label: authorNames.get(key) ?? key }))
  group.add(authorMesh)

  // Burst particle pool: small glowing spheres that travel author -> file.
  interface Burst {
    mesh: THREE.Mesh
    from: THREE.Vector3
    to: THREE.Vector3
    t: number // 0..1 progress
    active: boolean
  }
  const burstGeo = new THREE.SphereGeometry(1.1, 6, 6)
  const bursts: Burst[] = Array.from({ length: BURST_POOL }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 })
    const mesh = new THREE.Mesh(burstGeo, mat)
    mesh.visible = false
    group.add(mesh)
    return { mesh, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, active: false }
  })
  let burstCursor = 0

  const spawnBurst = (from: THREE.Vector3, to: THREE.Vector3, hex: string): void => {
    const b = bursts[burstCursor]
    burstCursor = (burstCursor + 1) % bursts.length
    b.from.copy(from)
    b.to.copy(to)
    b.t = 0
    b.active = true
    b.mesh.visible = true
    ;(b.mesh.material as THREE.MeshBasicMaterial).color.set(hex)
  }

  const first = commits[0]?.timestamp ?? 0
  const last = commits[commits.length - 1]?.timestamp ?? 0
  const span = Math.max(1, last - first)
  const baseSpeed = span / TARGET_DURATION_S

  const state = {
    simTime: 0, // seconds since `first`
    index: 0,
    playing: false,
    speedMult: 1,
    currentDate: 0
  }

  const pulseNode = (id: string): void => {
    const i = nodeIndex.get(id)
    if (i === undefined) return
    pulses[i] = 1
  }

  const advanceTo = (targetSimTime: number, spawnEffects: boolean): void => {
    while (state.index < commits.length) {
      const c = commits[state.index]
      if (c.timestamp - first > targetSimTime) break
      if (spawnEffects) {
        const from = authorPos.get(c.authorEmail || c.authorName)
        const hex = seedColor(c.authorEmail || c.authorName, 80, 65)
        for (const f of c.files) {
          if (!fileSet.has(f.path)) continue
          const i = nodeIndex.get(f.path)
          if (i === undefined) continue
          const node = nodes[i]
          if (from) spawnBurst(from, new THREE.Vector3(...node.position), hex)
          pulseNode(f.path)
          const parentId = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''
          if (parentId) pulseNode(parentId)
        }
      }
      state.currentDate = c.timestamp
      state.index += 1
    }
    state.simTime = targetSimTime
  }

  return {
    group,
    capped,
    totalFiles: fileTouches.size,
    get isPlaying() {
      return state.playing
    },
    get progress() {
      return span > 0 ? Math.min(1, state.simTime / span) : 0
    },
    get currentDate() {
      return state.currentDate
    },
    play(): void {
      state.playing = true
    },
    pause(): void {
      state.playing = false
    },
    setSpeedMultiplier(mult: number): void {
      state.speedMult = mult
    },
    seek(fraction: number): void {
      const target = Math.max(0, Math.min(1, fraction)) * span
      if (target < state.simTime) {
        state.index = 0
        state.currentDate = 0
      }
      advanceTo(target, false)
    },
    tick(dtSeconds: number): void {
      if (state.playing && state.index < commits.length) {
        advanceTo(state.simTime + dtSeconds * baseSpeed * state.speedMult, true)
      }

      let matrixDirty = false
      for (let i = 0; i < pulses.length; i++) {
        if (pulses[i] <= 0) continue
        pulses[i] = Math.max(0, pulses[i] - PULSE_DECAY_PER_S * dtSeconds)
        const node = nodes[i]
        const scale = node.baseSize * (1 + pulses[i] * 2.4)
        dummy.position.set(...node.position)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        treeMesh.setMatrixAt(i, dummy.matrix)
        matrixDirty = true
      }
      if (matrixDirty) treeMesh.instanceMatrix.needsUpdate = true

      for (const b of bursts) {
        if (!b.active) continue
        b.t += dtSeconds / BURST_TRAVEL_S
        if (b.t >= 1) {
          b.active = false
          b.mesh.visible = false
          continue
        }
        b.mesh.position.lerpVectors(b.from, b.to, b.t)
        ;(b.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - b.t
      }
    },
    dispose(): void {
      treeGeo.dispose()
      treeMat.dispose()
      authorGeo.dispose()
      authorMat.dispose()
      burstGeo.dispose()
      for (const b of bursts) (b.mesh.material as THREE.MeshBasicMaterial).dispose()
    }
  }
}
