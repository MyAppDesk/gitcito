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
  // Paint the container with the terminal bg so xterm's row-rounding leftover
  // never shows the app background — stays correct if THEME changes.
  container.style.background = THEME.background

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

  // Clipboard. xterm copies and pastes through DOM 'copy'/'paste' events,
  // which on Windows/Linux nothing ever emits — the frameless window carries
  // no Edit menu for the OS to route them through. Drive the same handlers
  // from the keyboard and the mouse instead.
  const copySelectionToClipboard = (): boolean => {
    if (!term.hasSelection()) return false
    void navigator.clipboard.writeText(term.getSelection())
    return true
  }
  const pasteFromClipboard = (): void => {
    void navigator.clipboard.readText().then(
      (text) => {
        if (!text || !term.element) return
        const data = new DataTransfer()
        data.setData('text/plain', text)
        // Route through xterm's own paste listener so multi-line text gets the
        // same sanitising and bracketed-paste treatment as an OS-level paste.
        term.element.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
        )
      },
      () => undefined
    )
  }
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown' || e.metaKey || e.altKey) return true
    if (e.ctrlKey && e.code === 'KeyC') {
      // Ctrl+Shift+C always copies; a bare Ctrl+C only steals the key while a
      // selection exists, so it keeps meaning SIGINT otherwise.
      if (e.shiftKey) {
        copySelectionToClipboard()
        return false
      }
      return !copySelectionToClipboard()
    }
    if (e.ctrlKey && e.code === 'KeyV') {
      // Ctrl+V pastes like everywhere else in the app (and VS Code's
      // terminal); Ctrl+Shift+V does the same for terminal purists.
      e.preventDefault()
      pasteFromClipboard()
      return false
    }
    if (e.code === 'Insert') {
      if (e.shiftKey && !e.ctrlKey) {
        // Chromium already binds Shift+Insert to a native paste — without
        // preventDefault the synthetic paste below lands on top of it and
        // every paste arrives twice.
        e.preventDefault()
        pasteFromClipboard()
        return false
      }
      if (e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        copySelectionToClipboard()
        return false
      }
    }
    return true
  })
  container.addEventListener('contextmenu', (e) => {
    // Windows Terminal style: right-click copies the selection, or pastes
    // when there is none.
    e.preventDefault()
    if (!copySelectionToClipboard()) pasteFromClipboard()
  })

  const isLaunch = launchId != null
  const cleanups: (() => void)[] = []

  // Programs push their own tab title via OSC 0/2 (claude, vim, ssh…); prefer
  // it over the polled process name, which can be meaningless for some
  // binaries. Disposed together with the terminal.
  term.onTitleChange((title) => useTermTitlesStore.getState().setOsc(panelId, title.trim()))

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
    term.onResize(({ cols, rows }) => {
      if (cols > 0 && rows > 0) window.api.launch.resize(launchId!, cols, rows)
    })
    // The pty was spawned before this terminal existed — ask for what it has
    // already printed, or a fast program's whole banner is lost.
    window.api.launch.attach(launchId!)
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
    term.onResize(({ cols, rows }) => {
      if (cols > 0 && rows > 0) window.api.term.resize(id, cols, rows)
    })

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
