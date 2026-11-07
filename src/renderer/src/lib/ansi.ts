/** Minimal ANSI SGR parser for rendering `oh-my-posh print primary` output as
 *  inline-styled React spans. Not a terminal emulator — only SGR color/style
 *  codes matter for a prompt preview; every other escape sequence is dropped. */

export interface AnsiSpan {
  text: string
  style: {
    color?: string
    backgroundColor?: string
    fontWeight?: 'bold'
    fontStyle?: 'italic'
    textDecoration?: 'underline'
  }
}

const STANDARD: string[] = [
  '#000000', '#aa0000', '#00aa00', '#aa5500', '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
  '#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff'
]

/** xterm 256-color palette index → hex. */
function color256(n: number): string | null {
  if (n < 0 || n > 255) return null
  if (n < 16) return STANDARD[n]
  if (n < 232) {
    const c = n - 16
    const r = Math.floor(c / 36), g = Math.floor((c % 36) / 6), b = c % 6
    const level = (v: number): number => (v === 0 ? 0 : 55 + v * 40)
    return `#${[level(r), level(g), level(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  }
  const gray = 8 + (n - 232) * 10
  return `#${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}`
}

interface SgrState {
  fg?: string
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

function applySgr(state: SgrState, codes: number[]): void {
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i]
    if (c === 0) {
      delete state.fg; delete state.bg; delete state.bold; delete state.italic; delete state.underline
    } else if (c === 1) state.bold = true
    else if (c === 3) state.italic = true
    else if (c === 4) state.underline = true
    else if (c === 22) delete state.bold
    else if (c === 23) delete state.italic
    else if (c === 24) delete state.underline
    else if (c >= 30 && c <= 37) state.fg = STANDARD[c - 30]
    else if (c === 38 || c === 48) {
      const isFg = c === 38
      const mode = codes[i + 1]
      if (mode === 5) {
        const col = color256(codes[i + 2])
        if (col) isFg ? (state.fg = col) : (state.bg = col)
        i += 2
      } else if (mode === 2) {
        const [r, g, b] = codes.slice(i + 2, i + 5)
        if ([r, g, b].every((v) => typeof v === 'number')) {
          const hex = `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
          isFg ? (state.fg = hex) : (state.bg = hex)
        }
        i += 4
      }
    } else if (c === 39) delete state.fg
    else if (c >= 40 && c <= 47) state.bg = STANDARD[c - 40]
    else if (c === 49) delete state.bg
    else if (c >= 90 && c <= 97) state.fg = STANDARD[c - 90 + 8]
    else if (c >= 100 && c <= 107) state.bg = STANDARD[c - 100 + 8]
  }
}

/** Strips non-SGR escape sequences (cursor moves, OSC hyperlinks/titles, etc.)
 *  that would otherwise leak into the preview text. CSI final bytes live in
 *  0x40–0x7E; `[@-ln-~]` is that range minus `m`, so SGR sequences survive. */
const OTHER_ESCAPES = /\x1b\[[0-?]*[ -/]*[@-ln-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()#][0-9A-Z]|\x1b[=>DM78E-HLMNPXZ\\^_]/g

export function ansiToSpans(data: string): AnsiSpan[] {
  const cleaned = data.replace(OTHER_ESCAPES, '').replace(/\r\n?/g, '\n')
  const spans: AnsiSpan[] = []
  const state: SgrState = {}
  let buf = ''
  let i = 0

  const flush = (): void => {
    if (!buf) return
    const style: AnsiSpan['style'] = {}
    if (state.fg) style.color = state.fg
    if (state.bg) style.backgroundColor = state.bg
    if (state.bold) style.fontWeight = 'bold'
    if (state.italic) style.fontStyle = 'italic'
    if (state.underline) style.textDecoration = 'underline'
    spans.push({ text: buf, style })
    buf = ''
  }

  while (i < cleaned.length) {
    const ch = cleaned[i]
    if (ch === '\x1b' && cleaned[i + 1] === '[') {
      const m = /^\x1b\[([\d;]*)m/.exec(cleaned.slice(i))
      if (m) {
        flush()
        const codes = m[1] === '' ? [0] : m[1].split(';').map((s) => (s === '' ? 0 : parseInt(s, 10)))
        applySgr(state, codes)
        i += m[0].length
        continue
      }
      // Incomplete or non-SGR CSI after OTHER_ESCAPES — drop the ESC byte.
      i++
      continue
    }
    if (ch === '\x1b') {
      i++
      continue
    }
    buf += ch
    i++
  }
  flush()
  return spans
}
