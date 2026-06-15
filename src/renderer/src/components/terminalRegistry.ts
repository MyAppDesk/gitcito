import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

export interface TermHandle {
  term: Terminal
  fit: FitAddon
  container: HTMLDivElement
  ptyId: number | null
  fitSafely(): void
  dispose(): void
}

// Persisted across React mounts / repo switches. xterm instance + PTY survive
// because the DOM container is moved in/out of the live tree, never destroyed.
const registry = new Map<string, TermHandle>()

const THEME = {
  background: '#0f1220',
  foreground: '#d6dbe8',
  cursor: '#6c5ce7',
  selectionBackground: '#2b3759',
  black: '#1c1f2b',
  blue: '#6c5ce7',
  green: '#00e6a8',
  red: '#ff5c7a',
  yellow: '#ff7a1a',
  magenta: '#00d4ff',
  cyan: '#00d4ff'
}

export function getOrCreateTerm(panelId: string, cwd: string): TermHandle {
  const existing = registry.get(panelId)
  if (existing) return existing

  const container = document.createElement('div')
  container.className = 'terminal-host-inner'

  const term = new Terminal({
    fontFamily: 'SF Mono, JetBrains Mono, Menlo, monospace',
    fontSize: 12.5,
    cursorBlink: true,
    theme: THEME
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.open(container)

  const cleanups: (() => void)[] = []
  const handle: TermHandle = {
    term,
    fit,
    container,
    ptyId: null,
    fitSafely() {
      try {
        fit.fit()
      } catch {
        /* element not visible / zero-size */
      }
    },
    dispose() {
      cleanups.forEach((c) => c())
      if (handle.ptyId != null) window.api.term.kill(handle.ptyId)
      term.dispose()
      container.remove()
      registry.delete(panelId)
    }
  }
  registry.set(panelId, handle)

  // Defer fit until the container is attached & sized.
  void window.api.term.create(cwd, term.cols || 80, term.rows || 24).then((id) => {
    handle.ptyId = id
    cleanups.push(window.api.term.onData(id, (data) => term.write(data)))
    cleanups.push(
      window.api.term.onExit(id, () =>
        term.write('\r\n\x1b[90m[process exited]\x1b[0m\r\n')
      )
    )
    term.onData((data) => window.api.term.input(id, data))
    term.onResize(({ cols, rows }) => window.api.term.resize(id, cols, rows))
  })

  return handle
}

export function disposeTerm(panelId: string): void {
  registry.get(panelId)?.dispose()
}
