export type TerminalShortcutAction = 'toggle' | 'new' | 'close'

/**
 * Fixed terminal shortcuts. Toggle uses the physical Control key on every OS;
 * new/close use the app's usual Cmd-or-Ctrl modifier, but only while xterm owns
 * focus so they do not replace the workspace tab shortcuts elsewhere.
 */
export function terminalShortcutFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  terminalFocused: boolean
): TerminalShortcutAction | null {
  if (
    event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    (event.code === 'Backquote' || event.key === '`')
  ) {
    return 'toggle'
  }
  if (!terminalFocused || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return null
  const key = event.key.toLowerCase()
  if (key === 't') return 'new'
  if (key === 'w') return 'close'
  return null
}

interface TerminalGroupLike {
  id: string
  panels: { id: string }[]
  activePanelId: string
}

export interface TerminalCloseTarget {
  groupId: string
  panelId: string
  hidePanel: boolean
}

/** Resolve the focused xterm and whether removing it leaves no terminals. */
export function terminalCloseTarget(
  groups: readonly TerminalGroupLike[],
  activeGroupId: string | null
): TerminalCloseTarget | null {
  const group = groups.find((item) => item.id === activeGroupId)
  if (!group || !group.panels.some((panel) => panel.id === group.activePanelId)) return null
  const terminalCount = groups.reduce((count, item) => count + item.panels.length, 0)
  return {
    groupId: group.id,
    panelId: group.activePanelId,
    hidePanel: terminalCount === 1
  }
}
