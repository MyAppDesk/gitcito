/**
 * Native window capabilities shared by construction and startup.
 *
 * Keeping the window explicitly maximizable lets the operating system own its
 * standard maximize gestures: Fn-Control-F on macOS and Win-Up on Windows.
 */
export const MAIN_WINDOW_STATE = {
  show: false,
  maximizable: true
} as const

interface MaximizableWindow {
  maximize(): void
  show(): void
}

/** Reveal the first rendered frame at its maximized size and give it focus. */
export function showMainWindow(win: MaximizableWindow): void {
  win.maximize()
  win.show()
}
