import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Download, Film, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import type { TimelapseCommit } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { GRAPH_COLORS } from '../graph/layout'
import {
  applyCommit,
  emptyState,
  folderOrder,
  nodeAlpha,
  nodeGlow,
  stateAt,
  type TlState
} from '../lib/timelapse'
import { useT, interp } from '../i18n'

/** Commits per second, so a long history stays watchable. */
const SPEEDS = [4, 8, 16, 32]
const MAX_COMMITS = 2000

function formatDate(unix: number): string {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Repository timelapse — the whole history replayed as an animation: every file
 * is a dot placed by its folder, born when it is added, pulsing when touched,
 * fading when deleted.
 *
 * The video is recorded from the canvas itself (`captureStream` + MediaRecorder),
 * so exporting needs no encoder, no ffmpeg and no network — the bytes go
 * straight to a file the user picks.
 */
export function TimelapseModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const repo = useRepoStore((s) => s.repos[repoPath])
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [commits, setCommits] = useState<TimelapseCommit[] | null>(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(8)
  const [index, setIndex] = useState(-1)
  const [recording, setRecording] = useState(false)

  // The live world. A ref, not state: it changes 60 times a second and only the
  // canvas cares.
  const stateRef = useRef<TlState>(emptyState())
  const indexRef = useRef(-1)

  const folders = useMemo(() => (commits ? folderOrder(commits) : []), [commits])

  useEffect(() => {
    let cancelled = false
    gitApi
      .timelapseData(repoPath, MAX_COMMITS)
      .then((list) => !cancelled && setCommits(list))
      .catch((err) => {
        if (cancelled) return
        toast('error', err instanceof Error ? err.message : String(err))
        setCommits([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath])

  const reset = useCallback(() => {
    stateRef.current = emptyState()
    indexRef.current = -1
    setIndex(-1)
  }, [])

  /** Jump anywhere by replaying from the start — histories here are small enough. */
  const seek = useCallback(
    (to: number) => {
      if (!commits) return
      stateRef.current = stateAt(commits, to, folders, GRAPH_COLORS)
      indexRef.current = to
      setIndex(to)
    },
    [commits, folders]
  )

  // ── The animation loop ──
  useEffect(() => {
    if (!commits || commits.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let carry = 0

    const draw = (): void => {
      const { width, height } = canvas
      const state = stateRef.current
      ctx.fillStyle = '#0b0e1a'
      ctx.fillRect(0, 0, width, height)

      for (const node of state.nodes.values()) {
        const alpha = nodeAlpha(node, state.index)
        if (alpha <= 0) continue
        const x = node.x * width
        const y = node.y * height
        const r = (3 + Math.sqrt(node.weight) * 2.2) * (width / 900)
        const glow = nodeGlow(node, state.index)

        if (glow > 0) {
          ctx.globalAlpha = alpha * glow * 0.35
          ctx.fillStyle = node.color
          ctx.beginPath()
          ctx.arc(x, y, r * (2.6 + glow * 2), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = alpha * (0.55 + glow * 0.45)
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Overlay: where we are in the story.
      const commit = commits[Math.max(0, state.index)]
      if (commit && state.index >= 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.font = `600 ${Math.round(width / 45)}px system-ui, sans-serif`
        ctx.fillText(formatDate(commit.date), 24, 44)
        ctx.font = `${Math.round(width / 62)}px system-ui, sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.62)'
        ctx.fillText(commit.author, 24, 70)
        ctx.fillText(
          `${state.index + 1}/${commits.length} commits · ${state.alive} files · ${state.authors.size} authors`,
          24,
          height - 24
        )
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        const subject = commit.subject.length > 70 ? `${commit.subject.slice(0, 70)}…` : commit.subject
        ctx.fillText(subject, 24, height - 46)

        // Progress bar along the bottom edge.
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(0, height - 4, width, 4)
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(0, height - 4, (width * (state.index + 1)) / commits.length, 4)
      }
    }

    const frame = (now: number): void => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      if (playing) {
        carry += dt * speed
        while (carry >= 1 && indexRef.current < commits.length - 1) {
          carry -= 1
          indexRef.current++
          applyCommit(stateRef.current, commits[indexRef.current], indexRef.current, folders, GRAPH_COLORS)
        }
        if (indexRef.current !== index) setIndex(indexRef.current)
        if (indexRef.current >= commits.length - 1) setPlaying(false)
      }
      draw()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commits, folders, playing, speed])

  /** Record the canvas while it plays, then hand the bytes to a save dialog. */
  const exportVideo = async (): Promise<void> => {
    const canvas = canvasRef.current
    if (!canvas || !commits?.length || recording) return
    if (typeof MediaRecorder === 'undefined') {
      toast('error', t('timelapse.noRecorder'))
      return
    }
    const stream = canvas.captureStream(30)
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m)
    )
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined)
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime ?? 'video/webm' }))
    })

    setRecording(true)
    reset()
    setPlaying(true)
    recorder.start()

    // Stop a beat after the last commit lands, so the final frame is in shot.
    const runtimeMs = ((commits.length + 6) / speed) * 1000
    await new Promise((r) => setTimeout(r, runtimeMs))
    recorder.stop()
    const blob = await done
    setRecording(false)

    const name = `${repo?.name ?? 'repo'}-timelapse.webm`
    const saved = await window.api.saveBinary(name, new Uint8Array(await blob.arrayBuffer()), [
      { name: 'WebM video', extensions: ['webm'] }
    ])
    if (saved) toast('success', interp(t('timelapse.saved'), { path: saved }))
  }

  const commit = commits && index >= 0 ? commits[index] : null

  return (
    <div className="tl-root">
      <div className="tl-header">
        <Film size={15} className="tl-title-icon" />
        <h3>{t('timelapse.title')}</h3>
        {commits && <span className="tl-count">{interp(t('timelapse.commits'), { n: String(commits.length) })}</span>}
        <div className="tl-header-actions">
          <button className="btn ghost small" disabled={!commits?.length || recording} onClick={() => void exportVideo()}>
            {recording ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
            {recording ? t('timelapse.recording') : t('timelapse.export')}
          </button>
        </div>
      </div>

      <div className="tl-stage">
        <canvas ref={canvasRef} width={900} height={520} className="tl-canvas" />
        {!commits && (
          <div className="tl-overlay">
            <Loader2 size={22} className="spin" />
          </div>
        )}
        {commits?.length === 0 && <div className="tl-overlay">{t('timelapse.empty')}</div>}
        {recording && (
          <div className="tl-rec">
            <Circle size={9} fill="currentColor" /> {t('timelapse.rec')}
          </div>
        )}
      </div>

      <div className="tl-controls">
        <button className="btn ghost icon-only" disabled={recording} onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          className="btn ghost icon-only"
          disabled={recording}
          title={t('timelapse.restart')}
          onClick={() => {
            reset()
            setPlaying(true)
          }}
        >
          <RotateCcw size={14} />
        </button>
        <input
          className="tl-slider"
          type="range"
          min={-1}
          max={Math.max(0, (commits?.length ?? 1) - 1)}
          value={index}
          disabled={recording || !commits?.length}
          onChange={(e) => {
            setPlaying(false)
            seek(Number(e.target.value))
          }}
        />
        <div className="tl-speeds">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`tl-speed ${speed === s ? 'active' : ''}`}
              disabled={recording}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {commit && (
        <div className="tl-now">
          <code className="tl-sha">{commit.hash.slice(0, 7)}</code>
          <span className="tl-subject" title={commit.subject}>
            {commit.subject}
          </span>
          <span className="tl-meta">{commit.author}</span>
          <span className="tl-meta">{formatDate(commit.date)}</span>
        </div>
      )}
    </div>
  )
}
