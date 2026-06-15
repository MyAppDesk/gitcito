import { useEffect, useLayoutEffect, useRef } from 'react'
import { getOrCreateTerm } from './terminalRegistry'

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

  return (
    <div
      className="terminal-host"
      ref={hostRef}
      onClick={() => getOrCreateTerm(panelId, cwd).term.focus()}
    />
  )
}
