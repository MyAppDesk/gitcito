import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2, Play, Pause, Orbit, GitCommitVertical, TriangleAlert } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { gitApi } from '../../infrastructure/api'
import type { CosmosCommit } from '../../../../shared/types'
import { createEngine, pickNodeAt, type CosmosEngine } from './engine'
import { buildCommitGalaxy } from './modes/commitGalaxy'
import { buildGourceTree, GOURCE_MAX_FILES, type GourceController } from './modes/gourceTree'
import { useT, type TranslationKey } from '../../i18n'

type Mode = 'galaxy' | 'gource'

const MODES: { id: Mode; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'galaxy', labelKey: 'cosmos.modeGalaxy', icon: <Orbit size={13} /> },
  { id: 'gource', labelKey: 'cosmos.modeTree', icon: <GitCommitVertical size={13} /> }
]

function Scene({ commits, mode }: { commits: CosmosCommit[]; mode: Mode }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gource, setGource] = useState<GourceController | null>(null)
  const [caption, setCaption] = useState('')
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let gourceCtrl: GourceController | null = null
    let engine: CosmosEngine | null = null
    setError(null)
    setEmpty(false)
    setTooltip(null)
    setSelected(null)

    try {
      if (mode === 'gource') {
        gourceCtrl = buildGourceTree(commits)
        setGource(gourceCtrl)
        setEmpty(gourceCtrl.totalFiles === 0)
        setCaption(gourceCtrl.capped ? `Showing ${GOURCE_MAX_FILES} most-touched files of ${gourceCtrl.totalFiles}` : `${gourceCtrl.totalFiles} files`)
        engine = createEngine(container, (dt) => gourceCtrl?.tick(dt))
        engine.scene.add(gourceCtrl.group)
        engine.camera.position.set(0, 160, 420)
      } else {
        setGource(null)
        const galaxyCtrl = buildCommitGalaxy(commits)
        setEmpty(galaxyCtrl.nodeCount === 0)
        setCaption(galaxyCtrl.capped ? `Showing most recent 800 of ${commits.length} commits` : `${galaxyCtrl.nodeCount} commits`)
        let elapsed = 0
        engine = createEngine(container, (dt) => {
          elapsed += dt
          galaxyCtrl.tick(elapsed)
        })
        engine.scene.add(galaxyCtrl.group)
        const { center, radius } = galaxyCtrl
        const dist = Math.max(20, radius / Math.tan((engine.camera.fov * Math.PI) / 360)) * 1.05
        engine.camera.position.set(center.x, center.y + radius * 0.85, center.z + dist * 0.75)
        engine.controls.target.copy(center)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      engine?.dispose()
      return
    }

    const activeEngine = engine
    const onMove = (e: PointerEvent): void => {
      const rect = container.getBoundingClientRect()
      const hit = pickNodeAt(e.clientX, e.clientY, rect, activeEngine.camera, activeEngine.scene)
      container.style.cursor = hit ? 'pointer' : 'default'
      setTooltip(hit ? { x: e.clientX, y: e.clientY, label: hit.label } : null)
    }
    const onClick = (e: PointerEvent): void => {
      const rect = container.getBoundingClientRect()
      const hit = pickNodeAt(e.clientX, e.clientY, rect, activeEngine.camera, activeEngine.scene)
      setSelected(hit?.label ?? null)
    }
    container.addEventListener('pointermove', onMove)
    container.addEventListener('click', onClick)

    return () => {
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('click', onClick)
      gourceCtrl?.dispose()
      engine?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commits, mode])

  return (
    <div className="cosmos-canvas-wrap">
      <div ref={containerRef} className="cosmos-canvas" />
      {!error && !empty && <div className="cosmos-caption">{caption}</div>}
      {mode === 'gource' && gource && !error && <GourcePlayback controller={gource} />}
      {tooltip && (
        <div className="cosmos-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          {tooltip.label}
        </div>
      )}
      {selected && <div className="cosmos-selected">Selected: {selected}</div>}
      {empty && !error && (
        <div className="cosmos-empty">
          <TriangleAlert size={18} /> Not enough data for this view.
        </div>
      )}
      {error && (
        <div className="cosmos-empty cosmos-error">
          <TriangleAlert size={18} /> Failed to build scene: {error}
        </div>
      )}
    </div>
  )
}

function GourcePlayback({ controller }: { controller: GourceController }): React.JSX.Element {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    controller.play()
    setPlaying(true)
    const id = setInterval(() => setProgress(controller.progress), 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller])

  const toggle = (): void => {
    if (controller.isPlaying) controller.pause()
    else controller.play()
    setPlaying(controller.isPlaying)
  }

  const cycleSpeed = (): void => {
    const next = speed >= 4 ? 0.5 : speed * 2
    setSpeed(next)
    controller.setSpeedMultiplier(next)
  }

  return (
    <div className="cosmos-playback">
      <button className="btn ghost small" onClick={toggle}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => {
          const fraction = Number(e.target.value) / 1000
          controller.seek(fraction)
          setProgress(fraction)
        }}
      />
      <button className="btn ghost small" onClick={cycleSpeed}>
        {speed}x
      </button>
      {controller.currentDate > 0 && <span className="cosmos-date">{new Date(controller.currentDate * 1000).toLocaleDateString()}</span>}
    </div>
  )
}

export function RepoCosmos(): React.JSX.Element | null {
  const t = useT()
  const cosmos = useUIStore((s) => s.cosmos)
  const closeCosmos = useUIStore((s) => s.closeCosmos)
  const [commits, setCommits] = useState<CosmosCommit[] | null>(null)
  const [mode, setMode] = useState<Mode>('galaxy')

  useEffect(() => {
    if (!cosmos) {
      setCommits(null)
      return
    }
    setMode('galaxy')
    gitApi.cosmosData(cosmos.repoPath).then(setCommits)
  }, [cosmos])

  useEffect(() => {
    if (!cosmos) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeCosmos()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cosmos, closeCosmos])

  if (!cosmos) return null

  return (
    <AnimatePresence>
      <motion.div
        className="cosmos-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={`cosmos-chrome ${window.api.platform === 'darwin' ? 'mac' : ''}`}>
          <div className="cosmos-tabs">
            {MODES.map((m) => (
              <button key={m.id} className={`codesearch-tab ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>
                {m.icon} {t(m.labelKey)}
              </button>
            ))}
          </div>
          <button className="btn ghost small cosmos-close" onClick={closeCosmos}>
            <X size={16} />
          </button>
        </div>
        {commits ? (
          <Scene commits={commits} mode={mode} />
        ) : (
          <div className="cosmos-loading">
            <Loader2 size={24} className="spin" /> Assembling cosmos…
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
