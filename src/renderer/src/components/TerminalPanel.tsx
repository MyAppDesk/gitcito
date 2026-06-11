import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

export function TerminalPanel({ cwd }: { cwd: string }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      fontFamily: 'SF Mono, JetBrains Mono, Menlo, monospace',
      fontSize: 12.5,
      cursorBlink: true,
      theme: {
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
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    fit.fit()

    let termId: number | null = null
    let disposed = false
    const cleanups: (() => void)[] = []

    void window.api.term.create(cwd, term.cols, term.rows).then((id) => {
      if (disposed) {
        window.api.term.kill(id)
        return
      }
      termId = id
      cleanups.push(window.api.term.onData(id, (data) => term.write(data)))
      cleanups.push(window.api.term.onExit(id, () => term.write('\r\n\x1b[90m[process exited]\x1b[0m\r\n')))
      term.onData((data) => window.api.term.input(id, data))
      term.onResize(({ cols, rows }) => window.api.term.resize(id, cols, rows))
      term.focus()
    })

    const observer = new ResizeObserver(() => {
      try {
        fit.fit()
      } catch {
        /* ignore */
      }
    })
    observer.observe(host)

    return () => {
      disposed = true
      observer.disconnect()
      cleanups.forEach((c) => c())
      if (termId != null) window.api.term.kill(termId)
      term.dispose()
    }
  }, [cwd])

  return <div className="terminal-host" ref={hostRef} />
}
