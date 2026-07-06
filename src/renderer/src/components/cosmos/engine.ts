import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/** Reads a CSS custom property off :root (the app's live theme) into a THREE.Color. */
export function themeColor(varName: string, fallback: string): THREE.Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return new THREE.Color(v || fallback)
}

/** Deterministic seed -> hue color, so the same author/file always gets the same color. */
export function seedColor(seed: string, s = 65, l = 60): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, ${s}%, ${l}%)`
}

export interface PickedNode {
  id: string
  label: string
}

const raycaster = new THREE.Raycaster()
const pickerVec = new THREE.Vector2()

/** Raycasts from a screen point (client coords) through `camera` into `scene`,
 *  returning the first instanced-mesh node hit (nodes carry their id/label in
 *  `mesh.userData.nodeMeta`, aligned to instance index). */
export function pickNodeAt(
  clientX: number,
  clientY: number,
  domRect: DOMRect,
  camera: THREE.Camera,
  scene: THREE.Scene
): PickedNode | null {
  pickerVec.x = ((clientX - domRect.left) / domRect.width) * 2 - 1
  pickerVec.y = -((clientY - domRect.top) / domRect.height) * 2 + 1
  raycaster.setFromCamera(pickerVec, camera)
  const hits = raycaster.intersectObjects(scene.children, true)
  for (const hit of hits) {
    const mesh = hit.object as THREE.InstancedMesh
    const meta = mesh.userData?.nodeMeta as PickedNode[] | undefined
    if (meta && hit.instanceId !== undefined && meta[hit.instanceId]) return meta[hit.instanceId]
  }
  return null
}

export interface CosmosEngine {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  dispose(): void
}

export function createEngine(container: HTMLElement, onFrame?: (dtSeconds: number) => void): CosmosEngine {
  const scene = new THREE.Scene()
  const bg = themeColor('--bg-0', '#0a0a0f')
  scene.background = bg
  scene.fog = new THREE.FogExp2(bg.getHex(), 0.0016)

  const camera = new THREE.PerspectiveCamera(58, container.clientWidth / container.clientHeight, 0.1, 8000)
  camera.position.set(0, 90, 480)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.35
  controls.minDistance = 10
  controls.maxDistance = 3000

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const point = new THREE.PointLight(themeColor('--accent', '#7c9dff'), 1.4, 3000)
  point.position.set(300, 300, 300)
  scene.add(point)

  const onResize = (): void => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)

  const clock = new THREE.Clock()
  let raf = 0
  const animate = (): void => {
    raf = requestAnimationFrame(animate)
    const dt = Math.min(0.1, clock.getDelta())
    onFrame?.(dt)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose(): void {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }
}
