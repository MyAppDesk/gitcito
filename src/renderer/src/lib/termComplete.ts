/**
 * Suggestions in the terminal: `npm run <script>`, `composer run`, `make
 * <target>` and `git checkout <branch>`.
 *
 * The app never sees the shell's line editor — only the keys sent to it — so
 * it follows the line typed since the last Enter and gives up the moment it
 * cannot be sure: history (↑), cursor moves and the shell's own Tab all change
 * the line out of sight. A wrong completion is worse than none.
 */

export interface LineState {
  line: string
  /** False once the line may differ from what we tracked; true again after Enter. */
  known: boolean
}

export const FRESH_LINE: LineState = { line: '', known: true }

const PASTE_START = '\x1b[200~'
const PASTE_END = '\x1b[201~'

/** Fold one chunk of terminal input into the tracked line. */
export function trackInput(state: LineState, data: string): LineState {
  let { line, known } = state
  // Bracketed paste: the text in between is typed as-is.
  if (data.startsWith(PASTE_START)) {
    const body = data.slice(PASTE_START.length).replace(PASTE_END, '')
    return body.includes('\r') || body.includes('\n') ? FRESH_LINE : { line: line + body, known }
  }
  // Any other escape sequence moves the cursor or recalls history.
  if (data.includes('\x1b')) return { line, known: false }
  for (const ch of data) {
    if (ch === '\r' || ch === '\n' || ch === '\x03') return FRESH_LINE // Enter, Ctrl+C
    if (ch === '\x15') line = '' // Ctrl+U clears the line
    else if (ch === '\x7f' || ch === '\b') line = line.slice(0, -1)
    else if (ch === '\t' || ch < ' ') known = false // the shell's own completion, or another control key
    else line += ch
  }
  return { line, known }
}

export type Runner = 'npm' | 'pnpm' | 'yarn' | 'bun'

/** Where a command's completions come from — one reader each in the main process. */
export type CompletionKind = 'scripts' | 'composer' | 'make' | 'branches'

/**
 * The commands that get a list, and what fills it. Each pattern ends on the
 * word being typed, so the list only shows while that word is the last one.
 */
const COMMANDS: readonly { kind: CompletionKind; re: RegExp }[] = [
  { kind: 'scripts', re: /^\s*(?:npm\s+(?:run|run-script)|pnpm(?:\s+run)?|yarn(?:\s+run)?|bun\s+run)\s+(\S*)$/ },
  { kind: 'composer', re: /^\s*composer\s+(?:run|run-script)\s+(\S*)$/ },
  // Short flags such as -j4 may come first; a flag taking a separate value (-C dir) is not followed.
  { kind: 'make', re: /^\s*make\s+(?:-[A-Za-z]\S*\s+)*([^\s-]\S*|)$/ },
  // No flags: `git checkout -b x` names a new branch, so existing ones would only be in the way.
  { kind: 'branches', re: /^\s*git\s+(?:checkout|switch|merge|rebase)\s+([^\s-]\S*|)$/ }
]

/** The word that starts any command with a list — a cheap test before asking the main process. */
export const COMPLETING_COMMAND = /^\s*(?:npm|pnpm|yarn|bun|composer|make|git)\s/

export interface CompletionContext {
  kind: CompletionKind
  /** What has been typed of the name so far. */
  partial: string
}

/** Which list fits the line, or null when none does or the line is not known. */
export function completionContext(state: LineState): CompletionContext | null {
  if (!state.known) return null
  for (const { kind, re } of COMMANDS) {
    const m = re.exec(state.line)
    if (m) return { kind, partial: m[1] }
  }
  return null
}

/** Names fitting `partial`, best first: those starting with it, then those containing it. */
export function rankNames(partial: string, names: readonly string[], max = 8): string[] {
  const p = partial.toLowerCase()
  const starts = names.filter((s) => s.toLowerCase().startsWith(p))
  const contains = names.filter((s) => !s.toLowerCase().startsWith(p) && s.toLowerCase().includes(p))
  return [...starts, ...contains].filter((s) => s !== partial).slice(0, max)
}

export interface ScriptMatch {
  /** What has been typed of the script name so far. */
  partial: string
  /** Matching script names, best first. */
  names: string[]
}

/**
 * The scripts that fit the line, or null when the line is not a run command.
 * Names starting with what was typed come first, then names containing it.
 */
export function matchScripts(state: LineState, scripts: readonly string[], max = 8): ScriptMatch | null {
  const ctx = completionContext(state)
  if (!ctx || ctx.kind !== 'scripts') return null
  const names = rankNames(ctx.partial, scripts, max)
  return names.length ? { partial: ctx.partial, names } : null
}

/** The keys that turn the typed partial into `name`: erase what does not fit, then type the rest. */
export function completionInput(partial: string, name: string): string {
  if (name.startsWith(partial)) return name.slice(partial.length)
  return '\x7f'.repeat(partial.length) + name
}
