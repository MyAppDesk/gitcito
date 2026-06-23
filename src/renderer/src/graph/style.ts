import type {
  GraphPalette,
  GraphEdgeStyle,
  GraphDensity,
  GraphLineWidth
} from '../../../shared/types'
import { GRAPH_COLORS } from './layout'

// ─── Built-in graph palettes ─────────────────────────────────────────────────
// `classic` mirrors the historical hard-coded rails so existing repos look
// unchanged. The rest are alternative lane-colour sets the user can pick.

export const GRAPH_PALETTES: GraphPalette[] = [
  { id: 'classic', name: 'Classic', builtin: true, colors: [...GRAPH_COLORS] },
  {
    id: 'neon',
    name: 'Neon',
    builtin: true,
    colors: ['#a855f7', '#22d3ee', '#34d399', '#f97316', '#f43f5e', '#eab308', '#3b82f6', '#ec4899', '#84cc16', '#14b8a6']
  },
  {
    id: 'pastel',
    name: 'Pastel',
    builtin: true,
    colors: ['#b3a4f0', '#9fd8e6', '#a8e6c1', '#f6c89a', '#f3a8be', '#f0dca0', '#a9c2f0', '#e3b0e3', '#c4e6a0', '#9fe0d4']
  },
  {
    id: 'ocean',
    name: 'Ocean',
    builtin: true,
    colors: ['#3b82f6', '#06b6d4', '#0ea5e9', '#14b8a6', '#6366f1', '#2dd4bf', '#0891b2', '#818cf8', '#22d3ee', '#38bdf8']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    builtin: true,
    colors: ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#e11d48', '#fb923c', '#d946ef', '#facc15', '#f43f5e', '#fbbf24']
  },
  {
    id: 'forest',
    name: 'Forest',
    builtin: true,
    colors: ['#22c55e', '#16a34a', '#84cc16', '#65a30d', '#0d9488', '#4d7c0f', '#10b981', '#a3b18a', '#15803d', '#bef264']
  },
  {
    id: 'aurora',
    name: 'Aurora',
    builtin: true,
    colors: ['#22d3ee', '#34d399', '#a78bfa', '#f472b6', '#2dd4bf', '#818cf8', '#4ade80', '#e879f9', '#38bdf8', '#c084fc']
  },
  {
    id: 'mono',
    name: 'Mono',
    builtin: true,
    // Single-hue ladder — reads as a calm monochrome graph.
    colors: ['#8b8fa3', '#6c5ce7', '#9b8df0', '#5a5f7d', '#7f8ff4', '#a9afcb', '#6471d6', '#b585f7', '#4a4f6d', '#cdd2e8']
  }
]

export function allGraphPalettes(custom: GraphPalette[]): GraphPalette[] {
  return [...GRAPH_PALETTES, ...custom]
}

export function findGraphPalette(id: string, custom: GraphPalette[]): GraphPalette {
  return allGraphPalettes(custom).find((p) => p.id === id) ?? GRAPH_PALETTES[0]
}

/** Build a lane→colour resolver for a palette's colour list. */
export function colorForPalette(colors: string[]): (index: number) => string {
  const safe = colors.length > 0 ? colors : GRAPH_COLORS
  return (index: number) => safe[((index % safe.length) + safe.length) % safe.length]
}

// ─── Geometry knobs ──────────────────────────────────────────────────────────

export const DENSITY_ROW_H: Record<GraphDensity, number> = {
  compact: 22,
  comfortable: 28,
  spacious: 36
}

export const LINE_WIDTH_PX: Record<GraphLineWidth, number> = {
  thin: 1.5,
  normal: 2,
  thick: 3
}

/**
 * SVG path for a child→parent rail segment, drawn per the chosen edge style.
 *   rounded  — vertical run, rounded 90° corner, horizontal exit (the default)
 *   sharp    — same L-shape but hard corners
 *   curved   — a smooth horizontal-tangent S-curve
 *   straight — a direct diagonal line
 */
export function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: GraphEdgeStyle = 'rounded'
): string {
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`

  if (style === 'straight') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  if (style === 'curved') {
    const my = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${my} ${x2} ${my} ${x2} ${y2}`
  }

  const r = style === 'sharp' ? 0 : Math.min(7, Math.abs(x2 - x1) * 0.45)
  if (r === 0) {
    if (x2 > x1) return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`
    return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`
  }
  if (x2 > x1) {
    // Merge edge: exit right at child row, rounded corner, straight down to parent
    return `M ${x1} ${y1} L ${x2 - r} ${y1} Q ${x2} ${y1} ${x2} ${y1 + r} L ${x2} ${y2}`
  }
  // Branch edge: straight down in own lane, rounded corner, exit left to parent lane
  return `M ${x1} ${y1} L ${x1} ${y2 - r} Q ${x1} ${y2} ${x1 - r} ${y2} L ${x2} ${y2}`
}
