import { useEffect, useLayoutEffect, useRef } from 'react'
import { getOrCreateTerm } from './terminalRegistry'

// POSIX single-quote a path so spaces / special chars survive when pasted.
function shellQuote(p: string): string {
  return `'${p.replace(/'/g, `'\\''`)}'`
}

// Renders one persisted terminal by attaching its registry-owned DOM container.
// The xterm instance + PTY outlive this component (repo/group/tab switches).
export function TerminalPanel({
  panelId,
  cwd,
  active
}: {
  panelId: string
  cwd: string
  active: boolean
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const handle = getOrCreateTerm(panelId, cwd)
    host.appendChild(handle.container)
    handle.fitSafely()

    const observer = new ResizeObserver(() => handle.fitSafely())
    observer.observe(host)

    return () => {
      observer.disconnect()
      // Detach (keep instance alive); container re-attaches on next mount.
      if (handle.container.parentElement === host) host.removeChild(handle.container)
    }
  }, [panelId, cwd])

  // Refit + focus when this panel becomes the visible one.
  useEffect(() => {
    if (!active) return
    const handle = getOrCreateTerm(panelId, cwd)
    handle.fitSafely()
    handle.term.focus()
  }, [active, panelId, cwd])

  const onDrop = (e: React.DragEvent): void => {
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length === 0) return
    e.preventDefault()
    e.stopPropagation()
    const paths = files
      .map((f) => window.api.getPathForFile(f))
      .filter(Boolean)
      .map(shellQuote)
    if (paths.length === 0) return
    const handle = getOrCreateTerm(panelId, cwd)
    handle.pasteText(paths.join(' '))
    handle.term.focus()
  }

  return (
    <div
      className="terminal-host"
      ref={hostRef}
      onClick={() => getOrCreateTerm(panelId, cwd).term.focus()}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={onDrop}
    />
  )
}
