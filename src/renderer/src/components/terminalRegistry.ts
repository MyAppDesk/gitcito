import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useTermTitlesStore } from '../stores/termTitles'

export interface TermHandle {
  term: Terminal
  fit: FitAddon
  container: HTMLDivElement
  ptyId: number | null
  fitSafely(): void
  pasteText(text: string): void
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

export function getOrCreateTerm(panelId: string, cwd: string, launchId?: number): TermHandle {
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
  // Make http(s) URLs in the output clickable — open in the default browser.
  term.loadAddon(
    new WebLinksAddon((event, uri) => {
      event.preventDefault()
      void window.api.openExternal(uri)
    })
  )
  term.open(container)

  const isLaunch = launchId != null
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
    pasteText(text) {
      if (handle.ptyId == null || !text) return
      const send = isLaunch ? window.api.launch.input : window.api.term.input
      send(handle.ptyId, text)
    },
    dispose() {
      cleanups.forEach((c) => c())
      if (handle.ptyId != null) {
        if (isLaunch) window.api.launch.stop(handle.ptyId)
        else window.api.term.kill(handle.ptyId)
      }
      useTermTitlesStore.getState().clear(panelId)
      term.dispose()
      container.remove()
      registry.delete(panelId)
    }
  }
  registry.set(panelId, handle)

  if (isLaunch) {
    // Bind to the already-spawned launch pty (created in main by launch:run).
    handle.ptyId = launchId!
    cleanups.push(window.api.launch.onData(launchId!, (data) => term.write(data)))
    cleanups.push(
      window.api.launch.onExit(launchId!, (code) =>
        term.write(`\r\n\x1b[90m[process exited with code ${code}]\x1b[0m\r\n`)
      )
    )
    term.onData((data) => window.api.launch.input(launchId!, data))
    term.onResize(({ cols, rows }) => window.api.launch.resize(launchId!, cols, rows))
    return handle
  }

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

    // Poll the foreground process name (VSCode-style auto title).
    const poll = (): void => {
      void window.api.term.procName(id).then((name) => {
        if (name) useTermTitlesStore.getState().set(panelId, name)
      })
    }
    poll()
    const timer = window.setInterval(poll, 2000)
    cleanups.push(() => window.clearInterval(timer))
  })

  return handle
}

export function disposeTerm(panelId: string): void {
  registry.get(panelId)?.dispose()
}
