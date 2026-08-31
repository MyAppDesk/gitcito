import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GutterChange } from '../lib/diff'

const WIDTH = 84

const CHANGE_COLOR: Record<GutterChange['type'], string> = {
  add: '#3fb950',
  mod: '#58a6ff',
  del: '#f85149'
}

/** A VS Code-style overview of the whole file: each line becomes a thin bar
 *  scaled to fit, git changes get a colored edge, and a draggable rectangle
 *  tracks (and sets) the scroll position of `scrollRef`'s element. Rendered
 *  as a fixed-position portal so it floats above the scrolling body instead
 *  of scrolling away with it. */
export function FileMinimap({
  lines,
  gutterByLine,
  scrollRef
}: {
  lines: string[]
  gutterByLine: Map<number, GutterChange>
  scrollRef: React.RefObject<HTMLDivElement>
}): React.JSX.Element | null {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  // VS Code draws each source line at a fixed, small height rather than
  // stretching to fill the pane — a 12-line file should look like 12 thin
  // rows at the top, not 12 rows ballooned to fill the whole minimap. Only
  // a file long enough to overflow the pane at that height shrinks further.
  const n = Math.max(1, lines.length)
  const rowH = box ? Math.min(3, box.height / n) : 0
  const contentHeight = rowH * n

  // Track the scroll container's viewport so the minimap floats at its right
  // edge regardless of how far the container itself has scrolled.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const sync = (): void => {
      const r = el.getBoundingClientRect()
      setBox({ left: r.right - WIDTH, top: r.top, width: WIDTH, height: r.height })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [scrollRef])

  // Redraw the line overview whenever the file or its git changes change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !box) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = box.width * dpr
    canvas.height = box.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, box.width, box.height)

    const style = getComputedStyle(document.documentElement)
    ctx.fillStyle = style.getPropertyValue('--text-3').trim() || style.getPropertyValue('--text-2').trim() || '#8b949e'
    ctx.globalAlpha = 0.55
    for (let i = 0; i < n; i++) {
      const raw = lines[i] ?? ''
      const trimmed = raw.replace(/^\s+/, '')
      if (!trimmed) continue
      const indent = raw.length - trimmed.length
      const x = 6 + indent * 0.5
      const w = Math.max(0, Math.min(box.width - x - 3, trimmed.length * 1.15))
      if (w <= 0) continue
      ctx.fillRect(x, i * rowH, w, Math.max(1, rowH - 0.4))
    }
    ctx.globalAlpha = 1
    for (const [lineNo, change] of gutterByLine) {
      ctx.fillStyle = CHANGE_COLOR[change.type]
      ctx.fillRect(0, (lineNo - 1) * rowH, 3, Math.max(1.5, rowH))
    }
  }, [lines, gutterByLine, box])

  // Keep the viewport rectangle synced to the real scroll position.
  useEffect(() => {
    const scroller = scrollRef.current
    const viewport = viewportRef.current
    if (!scroller || !viewport || !box) return
    const sync = (): void => {
      const ratio = contentHeight / Math.max(1, scroller.scrollHeight)
      viewport.style.top = `${scroller.scrollTop * ratio}px`
      viewport.style.height = `${Math.max(4, Math.min(contentHeight, scroller.clientHeight * ratio))}px`
    }
    sync()
    scroller.addEventListener('scroll', sync)
    const ro = new ResizeObserver(sync)
    ro.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [scrollRef, box, contentHeight])

  const jumpTo = (clientY: number): void => {
    const scroller = scrollRef.current
    if (!scroller || !box || contentHeight <= 0) return
    const frac = Math.max(0, Math.min(1, (clientY - box.top) / contentHeight))
    scroller.scrollTop = frac * scroller.scrollHeight - scroller.clientHeight / 2
  }

  const onMouseDown = (e: React.MouseEvent): void => {
    jumpTo(e.clientY)
    const onMove = (ev: MouseEvent): void => jumpTo(ev.clientY)
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!box) return null

  return createPortal(
    <div
      ref={wrapRef}
      className="file-minimap"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      onMouseDown={onMouseDown}
    >
      <canvas ref={canvasRef} className="file-minimap-canvas" style={{ width: box.width, height: box.height }} />
      <div ref={viewportRef} className="file-minimap-viewport" />
    </div>,
    document.body
  )
}
