// Scrolling the center viewer to a specific source line. Shared by the AI
// citation buttons (HoverExplain) and the VSCode-style search results trees,
// which open a file straight at the matching line.

/** How long the target row keeps its highlight after being revealed. */
const FLASH_MS = 2000

/** The row element for `line` in whichever view is currently mounted, if any. */
function rowFor(line: number): Element | null {
  const direct = document.querySelector(`.file-content .code-line:nth-child(${line})`)
  if (direct) return direct
  // Diff and blame views carry the real line number in a gutter cell instead.
  const gutter = [...document.querySelectorAll('.diff-line .diff-gutter, .blame-line .code-no')].find(
    (g) => g.textContent?.trim() === String(line)
  )
  return gutter?.parentElement ?? null
}

/**
 * Scroll the viewer to `line` and flash it, when that line is already rendered.
 * Returns true when the row was found.
 */
export function revealLine(line: number, opts?: { flash?: boolean }): boolean {
  const row = rowFor(line)
  if (!row) return false
  row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  if (opts?.flash !== false) {
    document.querySelectorAll('.line-target').forEach((el) => el.classList.remove('line-target'))
    row.classList.add('line-target')
    setTimeout(() => row.classList.remove('line-target'), FLASH_MS)
  }
  return true
}

/**
 * Same, but for a line in a file that is still loading: retries each frame
 * until the row appears or `timeoutMs` elapses. Returns a cancel function so
 * callers can drop a pending reveal when the view changes underneath them.
 */
export function revealLineWhenReady(line: number, timeoutMs = 4000): () => void {
  let raf = 0
  let cancelled = false
  const started = performance.now()
  const tick = (): void => {
    if (cancelled) return
    if (revealLine(line)) return
    if (performance.now() - started > timeoutMs) return
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
  }
}
