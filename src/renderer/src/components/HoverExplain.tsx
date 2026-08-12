import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { aiApi } from '../infrastructure/api'
import { useSettingsStore } from '../stores/settings'
import { identifierAt, isExplainableToken } from '../lib/hoverToken'
import { useT } from '../i18n'
import type { HoverExplainResult, HoverModifier, NumberedLine } from '../../../shared/types'

// Hold the modifier, point at an identifier, get one sentence about it. The
// answer comes from a numbered window of the lines the viewer has, and the line
// numbers it cites are resolved here — so every location the card shows is real.

const CLOSE_MS = 250
const CARD_WIDTH = 340

interface Target {
  token: string
  line: number
  x: number
  y: number
}

interface CardState {
  target: Target
  status: 'loading' | 'ready' | 'error'
  result: HoverExplainResult | null
  error: string
}

interface Modifiers {
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

export function modifierHeld(e: Modifiers, modifier: HoverModifier): boolean {
  switch (modifier) {
    case 'shift':
      return e.shiftKey
    case 'alt':
      return e.altKey
    case 'ctrl':
      return e.ctrlKey
    case 'meta':
      return e.metaKey
    case 'none':
    default:
      return true
  }
}

/** The key name that arms the feature, for keydown/keyup matching. */
const KEY_NAME: Record<HoverModifier, string> = {
  shift: 'Shift',
  alt: 'Alt',
  ctrl: 'Control',
  meta: 'Meta',
  none: ''
}

/** The text node and offset under the pointer, across the two caret APIs. */
function caretAt(x: number, y: number): { node: Text; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  const pos = doc.caretPositionFromPoint?.(x, y)
  if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
    return { node: pos.offsetNode as Text, offset: pos.offset }
  }
  const range = document.caretRangeFromPoint?.(x, y)
  if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
    return { node: range.startContainer as Text, offset: range.startOffset }
  }
  return null
}

/** Scrolls the viewer to a cited line, if it is still rendered. */
function revealLine(line: number): void {
  const row =
    document.querySelector(`.file-content .code-line:nth-child(${line})`) ??
    [...document.querySelectorAll('.diff-line .diff-gutter, .blame-line .code-no')].find(
      (g) => g.textContent?.trim() === String(line)
    )?.parentElement
  row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

export function useHoverExplain(opts: {
  enabled: boolean
  file: string
  lang: string
  modifier: HoverModifier
  /** The lines the viewer is showing, with their real file line numbers. */
  getLines: () => NumberedLine[]
  /** The file line number for the row an element sits in. */
  lineOf: (el: HTMLElement) => number | null
  /** Opens the long-form explanation. Omit where there is nowhere to show it. */
  onSeeMore?: (token: string, line: number) => void
}): {
  hoverProps: { onMouseMove: (e: React.MouseEvent) => void; onMouseLeave: () => void }
  /** True while the modifier is down — for a cursor affordance on the rows. */
  armed: boolean
  card: React.ReactNode
} {
  const t = useT()
  const [card, setCard] = useState<CardState | null>(null)
  const [armed, setArmed] = useState(opts.modifier === 'none')
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  // What the card is showing (or about to show), so a jitter of the pointer
  // across the same word doesn't restart the wait or re-ask.
  const shown = useRef<Target | null>(null)
  // Only the newest request may write to the card; hovering fast leaves earlier
  // answers in flight, and they are for a token nobody is pointing at.
  const requestSeq = useRef(0)
  // Read inside listeners without re-subscribing them on every render.
  const state = useRef(opts)
  state.current = opts

  const clearTimers = (): void => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
    dwellTimer.current = null
    closeTimer.current = null
  }

  const close = useCallback((): void => {
    clearTimers()
    requestSeq.current++
    shown.current = null
    setCard(null)
  }, [])

  const ask = useCallback(async (target: Target): Promise<void> => {
    const lines = state.current.getLines()
    if (lines.length === 0) return
    const seq = ++requestSeq.current
    shown.current = target
    setCard({ target, status: 'loading', result: null, error: '' })
    try {
      const result = await aiApi.hoverExplain(
        { path: state.current.file, lang: state.current.lang, token: target.token, line: target.line, lines },
        useSettingsStore.getState().activeProfile().ai
      )
      if (seq !== requestSeq.current) return
      setCard({ target, status: 'ready', result, error: '' })
    } catch (err) {
      if (seq !== requestSeq.current) return
      setCard({ target, status: 'error', result: null, error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  /** Resolves the identifier under a point, or null if there isn't one. */
  const probe = useCallback((x: number, y: number): Target | null => {
    const caret = caretAt(x, y)
    if (!caret) return null
    const el = caret.node.parentElement
    if (!el?.closest('.code-text, .diff-text')) return null

    const span = identifierAt(caret.node.textContent ?? '', caret.offset)
    if (!span) return null
    // highlight.js only wraps some tokens; an unwrapped word has no class and is
    // allowed through, while a string or comment is ruled out by its class.
    const marked = el.closest('[class*="hljs-"]')
    if (!isExplainableToken(span.text, marked?.className ?? '')) return null

    const line = state.current.lineOf(el)
    if (!line) return null

    const range = document.createRange()
    range.setStart(caret.node, span.start)
    range.setEnd(caret.node, span.end)
    const rect = range.getBoundingClientRect()
    return { token: span.text, line, x: rect.left, y: rect.bottom }
  }, [])

  const consider = useCallback(
    (x: number, y: number, held: boolean): void => {
      if (!state.current.enabled) return
      if (!held) {
        clearTimers()
        return
      }
      const target = probe(x, y)
      if (!target) {
        if (dwellTimer.current) clearTimeout(dwellTimer.current)
        dwellTimer.current = null
        return
      }
      const current = shown.current
      if (current && current.token === target.token && current.line === target.line) {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        closeTimer.current = null
        return
      }
      clearTimers()
      shown.current = target
      // A held modifier is already an explicit ask, so the wait is short.
      const dwell = state.current.modifier === 'none' ? 400 : 180
      dwellTimer.current = setTimeout(() => void ask(target), dwell)
    },
    [ask, probe]
  )

  const onMouseMove = (e: React.MouseEvent): void => {
    lastPoint.current = { x: e.clientX, y: e.clientY }
    const held = modifierHeld(e, opts.modifier)
    setArmed(held)
    // Ignore drags — that is a text selection, not a hover.
    if (e.buttons !== 0) return
    consider(e.clientX, e.clientY, held)
  }

  const onMouseLeave = (): void => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current)
    dwellTimer.current = null
    // Grace period so the pointer can travel into the card itself.
    closeTimer.current = setTimeout(close, CLOSE_MS)
  }

  // Pressing the modifier without moving the mouse should still work.
  useEffect(() => {
    if (opts.modifier === 'none') return
    const name = KEY_NAME[opts.modifier]
    const onDown = (e: KeyboardEvent): void => {
      if (e.key !== name || !lastPoint.current) return
      setArmed(true)
      consider(lastPoint.current.x, lastPoint.current.y, true)
    }
    const onUp = (e: KeyboardEvent): void => {
      if (e.key !== name) return
      setArmed(false)
      close()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [opts.modifier, consider, close])

  // A new file (or turning the feature off) invalidates whatever is showing.
  useEffect(() => close(), [opts.file, opts.enabled, close])
  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const node =
    card &&
    createPortal(
      <div
        className="hover-explain"
        style={{
          left: Math.max(8, Math.min(card.target.x, window.innerWidth - CARD_WIDTH - 8)),
          top: Math.min(card.target.y + 6, window.innerHeight - 80)
        }}
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current)
        }}
        onMouseLeave={close}
      >
        <div className="hover-explain-head">
          <Sparkles size={12} />
          <code>{card.target.token}</code>
          <span className="hover-explain-loc">
            {opts.file ? `${opts.file.split('/').pop()}:${card.target.line}` : `${t('hover.line')} ${card.target.line}`}
          </span>
        </div>

        {card.status === 'loading' && (
          <div className="hover-explain-loading">
            <Loader2 size={13} className="spin" /> {t('hover.loading')}
          </div>
        )}

        {card.status === 'error' && <div className="hover-explain-error">{card.error}</div>}

        {card.status === 'ready' && card.result && (
          <>
            <div className="hover-explain-summary">{card.result.summary}</div>
            {card.result.bullets.length > 0 && (
              <ul className="hover-explain-bullets">
                {card.result.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {card.result.lines.length > 0 && (
              <div className="hover-explain-cites">
                {card.result.lines.map((n) => (
                  <button key={n} className="hover-explain-cite" onClick={() => revealLine(n)}>
                    {t('hover.line')} {n}
                  </button>
                ))}
              </div>
            )}
            {opts.onSeeMore && (
              <div className="hover-explain-actions">
                <button
                  className="btn ghost tiny"
                  onClick={() => {
                    opts.onSeeMore?.(card.target.token, card.target.line)
                    close()
                  }}
                >
                  {t('hover.seeMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>,
      document.body
    )

  return { hoverProps: { onMouseMove, onMouseLeave }, armed, card: node }
}
