/** Where a terminal's display name can come from, strongest first: a manual
 *  alias, the title the running program pushed via OSC 0/2 (claude, vim,
 *  ssh…), the polled foreground process name. The OSC title beats the process
 *  name because the latter can be unhelpful — Claude Code's executable, for
 *  one, is literally named after its version ("2.1.238"). */
export interface TitleSources {
  alias?: string
  osc?: string
  proc?: string
}

/** Idle shells also push OSC titles — prompt boilerplate like
 *  "user@host:~/path" or a bare cwd. That is noise, not a name: treat it as
 *  absent so the tab falls back to the process name ("zsh"). Titles set by
 *  real programs (claude's status line, vim's file, a running command) pass. */
export function isShellBoilerplate(title: string): boolean {
  return /^\S+@\S+\s*:/.test(title) || /^[~/]/.test(title) || /^[A-Za-z]:[\\/]/.test(title)
}

function oscOrNothing(osc: string | undefined): string {
  const t = osc?.trim() ?? ''
  return t && !isShellBoilerplate(t) ? t : ''
}

export function panelDisplayName(s: TitleSources): string {
  return s.alias?.trim() || oscOrNothing(s.osc) || s.proc?.trim() || 'zsh'
}

/** A group's label: its alias wins; a group holding a single panel borrows
 *  that panel's live title (an OSC title as-is, a process name with the
 *  group's stable number so plain shells still read "zsh 1", "zsh 2");
 *  split groups keep the numbered default. */
export function groupDisplayName(alias: string, num: number, single: TitleSources | null): string {
  const a = alias.trim()
  if (a) return a
  if (single) {
    const panelAlias = single.alias?.trim()
    if (panelAlias) return panelAlias
    const osc = oscOrNothing(single.osc)
    if (osc) return osc
    const proc = single.proc?.trim()
    if (proc) return `${proc} ${num}`
  }
  return `zsh ${num}`
}
