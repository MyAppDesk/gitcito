import type { Terminal } from '@xterm/xterm'
import {
  COMPLETING_COMMAND,
  FRESH_LINE,
  completionContext,
  completionInput,
  rankNames,
  trackInput,
  type CompletionKind,
  type LineState,
  type ScriptMatch
} from '../lib/termComplete'
import { t } from '../i18n'

/** Name → what it runs, as the main process reads it for one kind of list. */
interface Completions {
  items: Record<string, string>
}

export interface TermSuggest {
  /** Every chunk the user sends to the shell. */
  onInput(data: string): void
  /** A key while the list is open: true when it was ours (Tab, ↑, ↓, Esc). */
  handleKey(e: KeyboardEvent): boolean
  dispose(): void
}

/** How long a read is trusted: long enough to type a name. */
const COMPLETIONS_TTL_MS = 4000

/**
 * The suggestion list of one shell terminal: a small popup at the cursor, filled
 * from the shell's current directory — package.json or composer.json scripts,
 * Makefile targets, git branches. Plain DOM, like the terminal it sits on.
 */
export function createTermSuggest(opts: {
  term: Terminal
  container: HTMLElement
  ptyId: number
  send: (data: string) => void
}): TermSuggest {
  const { term, container, ptyId, send } = opts
  let state: LineState = FRESH_LINE
  let match: ScriptMatch | null = null
  let selected = 0
  // Esc hides the list until the line changes again.
  let dismissedFor: string | null = null
  const cache = new Map<CompletionKind, { at: number; value: Completions | null }>()
  let disposed = false

  const el = document.createElement('div')
  el.className = 'term-suggest'
  el.setAttribute('role', 'listbox')
  el.hidden = true
  container.appendChild(el)

  const completions = async (kind: CompletionKind): Promise<Completions | null> => {
    const hit = cache.get(kind)
    if (hit && Date.now() - hit.at < COMPLETIONS_TTL_MS) return hit.value
    const value = (await window.api.term.completions(ptyId, kind).catch(() => null)) as Completions | null
    cache.set(kind, { at: Date.now(), value })
    return value
  }

  const close = (): void => {
    match = null
    el.hidden = true
  }

  const place = (): void => {
    const screen = term.element?.querySelector('.xterm-screen') as HTMLElement | null
    if (!screen || !term.cols || !term.rows) return
    const cellW = screen.clientWidth / term.cols
    const cellH = screen.clientHeight / term.rows
    const x = term.buffer.active.cursorX * cellW
    const y = term.buffer.active.cursorY * cellH
    el.style.left = `${Math.max(0, Math.min(x, container.clientWidth - el.offsetWidth - 4))}px`
    // Below the cursor, or above it when the list would run off the bottom.
    const below = y + cellH + 2
    el.style.top = `${below + el.offsetHeight > container.clientHeight ? Math.max(0, y - el.offsetHeight - 2) : below}px`
  }

  const render = (src: Completions): void => {
    if (!match) return close()
    el.replaceChildren()
    match.names.forEach((name, i) => {
      const row = document.createElement('div')
      row.className = `term-suggest-row${i === selected ? ' selected' : ''}`
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(i === selected))
      const n = document.createElement('span')
      n.className = 'term-suggest-name'
      n.textContent = name
      const cmd = document.createElement('span')
      cmd.className = 'term-suggest-cmd'
      cmd.textContent = src.items[name] ?? ''
      row.append(n, cmd)
      row.addEventListener('mousedown', (e) => {
        e.preventDefault() // keep focus in the terminal
        selected = i
        accept()
        term.focus()
      })
      el.appendChild(row)
    })
    const hint = document.createElement('div')
    hint.className = 'term-suggest-hint'
    hint.textContent = t('terminal.suggestHint')
    el.appendChild(hint)
    el.hidden = false
    place()
  }

  let lastSrc: Completions | null = null
  const refresh = async (): Promise<void> => {
    // Cheap checks first: only a command with a list is worth asking the main process about.
    if (!state.known || !COMPLETING_COMMAND.test(state.line) || state.line === dismissedFor) return close()
    const ctx = completionContext(state)
    if (!ctx) return close()
    const src = await completions(ctx.kind)
    if (disposed) return
    // The line may have moved on while the read was out (git can take a moment):
    // rank against what is typed now, and leave a different kind to its own refresh.
    const now = completionContext(state)
    if (!now || now.kind !== ctx.kind || state.line === dismissedFor) return
    lastSrc = src
    const names = src ? rankNames(now.partial, Object.keys(src.items)) : []
    if (!src || !names.length) return close()
    const next: ScriptMatch = { partial: now.partial, names }
    if (!match || match.names.join('\n') !== next.names.join('\n')) selected = 0
    match = next
    render(src)
  }

  const accept = (): void => {
    if (!match) return
    const keys = completionInput(match.partial, match.names[selected])
    send(keys)
    state = trackInput(state, keys)
    close()
  }

  return {
    onInput(data) {
      state = trackInput(state, data)
      if (state.line !== dismissedFor) dismissedFor = null
      void refresh()
    },
    handleKey(e) {
      if (el.hidden || !match || e.type !== 'keydown') return false
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault()
        accept()
        return true
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const n = match.names.length
        selected = (selected + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
        if (lastSrc) render(lastSrc)
        return true
      }
      if (e.key === 'Escape') {
        dismissedFor = state.line
        close()
        return true
      }
      return false
    },
    dispose() {
      disposed = true
      el.remove()
    }
  }
}
