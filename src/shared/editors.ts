/**
 * External editors — the table of editors "Open in editor" knows how to launch,
 * and the pure argv building that turns a template into a `spawn()` argument
 * list. No Node APIs here: the renderer needs the same table to label its menus,
 * and the main process needs it to actually launch.
 *
 * Jumping to a line needs the editor's own CLI (`code`, `subl`, `zed`, …). A
 * macOS `.app` bundle can only be handed a path, so a bundle-launched editor
 * opens the file at the top — the UI hides the "at line" wording in that case.
 */

export type EditorId = 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'sublime' | 'jetbrains' | 'xcode' | 'custom'

export interface EditorPreset {
  id: Exclude<EditorId, 'custom'>
  /** Product name — never translated. */
  name: string
  /** CLI executables to look for on PATH, best first. */
  bins: string[]
  /** macOS application bundles to fall back to, as found under /Applications. */
  macApps: string[]
  /** Windows executables, relative to a Program Files-style root. */
  winPaths: string[]
  /** argv template for a file. `{path}` `{line}` `{col}` are substituted. */
  fileArgs: string
  /** argv template for a directory. */
  folderArgs: string
}

/** How an editor was located, which decides whether line jumping is possible. */
export type EditorSource = 'cli' | 'app'

export interface DetectedEditor {
  id: EditorId
  name: string
  /** Absolute path to the executable, or to the `.app` bundle when `source` is 'app'. */
  command: string
  source: EditorSource
}

/** The user's choice, persisted in settings. */
export interface EditorSetting {
  id: EditorId
  /** Executable or `.app` bundle. Resolved by detection for presets, typed by
   *  the user for `custom`. */
  command: string
  /** Display name — the preset's product name, or whatever the user called their
   *  custom command. */
  name: string
  source: EditorSource
  /** `custom` only: argv template for a file. Falls back to `{path}`. */
  fileArgs?: string
  /** `custom` only: argv template for a directory. Falls back to `{path}`. */
  folderArgs?: string
}

export const EDITOR_PRESETS: EditorPreset[] = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    bins: ['code', 'code-insiders'],
    macApps: ['Visual Studio Code.app'],
    winPaths: ['Microsoft VS Code\\Code.exe'],
    // `-g` is VS Code's goto form; without it the `path:line` suffix is read as
    // part of the filename.
    fileArgs: '-g {path}:{line}:{col}',
    folderArgs: '{path}'
  },
  {
    id: 'cursor',
    name: 'Cursor',
    bins: ['cursor'],
    macApps: ['Cursor.app'],
    winPaths: ['cursor\\Cursor.exe'],
    fileArgs: '-g {path}:{line}:{col}',
    folderArgs: '{path}'
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    bins: ['windsurf'],
    macApps: ['Windsurf.app'],
    winPaths: ['Windsurf\\Windsurf.exe'],
    fileArgs: '-g {path}:{line}:{col}',
    folderArgs: '{path}'
  },
  {
    id: 'zed',
    name: 'Zed',
    bins: ['zed'],
    macApps: ['Zed.app'],
    winPaths: ['Zed\\zed.exe'],
    fileArgs: '{path}:{line}:{col}',
    folderArgs: '{path}'
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    bins: ['subl'],
    macApps: ['Sublime Text.app'],
    winPaths: ['Sublime Text\\subl.exe'],
    fileArgs: '{path}:{line}:{col}',
    folderArgs: '{path}'
  },
  {
    id: 'jetbrains',
    name: 'JetBrains IDE',
    bins: ['idea', 'webstorm', 'pycharm', 'rustrover', 'goland', 'clion', 'rider', 'phpstorm'],
    macApps: ['IntelliJ IDEA.app', 'WebStorm.app', 'PyCharm.app', 'RustRover.app', 'GoLand.app', 'CLion.app'],
    winPaths: [],
    fileArgs: '--line {line} --column {col} {path}',
    folderArgs: '{path}'
  },
  {
    id: 'xcode',
    name: 'Xcode',
    bins: ['xed'],
    macApps: ['Xcode.app'],
    winPaths: [],
    // `xed --line N file` opens the file at that line in Xcode.
    fileArgs: '--line {line} {path}',
    folderArgs: '{path}'
  }
]

export function presetFor(id: EditorId): EditorPreset | undefined {
  return EDITOR_PRESETS.find((p) => p.id === id)
}

/**
 * Can this editor be told which line to land on? Only when it was found as a
 * CLI — an `.app` bundle is launched through `open`, which forwards a path and
 * nothing else.
 */
export function supportsLine(setting: EditorSetting): boolean {
  if (setting.source !== 'cli') return false
  const template = setting.id === 'custom' ? setting.fileArgs : presetFor(setting.id)?.fileArgs
  return !!template && template.includes('{line}')
}

/** Split an argv template on whitespace, keeping "quoted runs" together. */
function tokenize(template: string): string[] {
  const out: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let started = false
  for (const ch of template) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      started = true
      continue
    }
    if (/\s/.test(ch)) {
      if (started) out.push(current)
      current = ''
      started = false
      continue
    }
    current += ch
    started = true
  }
  if (started) out.push(current)
  return out
}

/** What to open. `path` is absolute; `line`/`col` are 1-based and ignored when
 *  the editor cannot accept them. */
export interface EditorTarget {
  path: string
  line?: number
  col?: number
  isDir?: boolean
  /** Repository root, for a custom template that wants the workspace too. */
  repo?: string
}

export interface EditorVars {
  path: string
  line?: number
  col?: number
  /** Repository root — useful in a custom template that opens a workspace. */
  repo?: string
}

/**
 * Turn an argv template into a concrete argument list. Tokens are substituted,
 * never re-split afterwards, so a path containing spaces stays one argument.
 * A token whose placeholders all resolve to nothing is dropped — that is what
 * keeps `--line {line}` from degrading into a bare `--line`.
 */
export function editorArgs(template: string, vars: EditorVars): string[] {
  const line = vars.line && vars.line > 0 ? String(vars.line) : ''
  // A column without a line is meaningless — and `path::3` is a filename no
  // editor recognises — so the column only survives when the line does.
  const col = line ? String(vars.col && vars.col > 0 ? vars.col : 1) : ''
  const args: string[] = []
  for (const token of tokenize(template)) {
    const hadPlaceholder = /\{(path|line|col|repo)\}/.test(token)
    const value = token
      .replace(/\{path\}/g, vars.path)
      .replace(/\{line\}/g, line)
      .replace(/\{col\}/g, col)
      .replace(/\{repo\}/g, vars.repo ?? '')
    // A bare `{line}` that resolved to nothing takes its flag with it: leaving
    // `--line` behind makes the CLI read the following path as the flag's value.
    if (hadPlaceholder && !value.trim()) {
      const previous = args[args.length - 1]
      if (previous?.startsWith('-')) args.pop()
      continue
    }
    // `{path}:{line}:{col}` with no line collapses to a trailing `::`.
    args.push(value.replace(/:+$/, ''))
  }
  return args
}

/**
 * The full launch plan for a target: which executable, which arguments. Returns
 * null when the setting carries no command, i.e. nothing is configured yet.
 */
export function editorLaunch(
  setting: EditorSetting,
  target: EditorTarget
): { command: string; args: string[]; source: EditorSource } | null {
  if (!setting.command) return null
  const preset = presetFor(setting.id)
  const fileArgs = setting.id === 'custom' ? setting.fileArgs || '{path}' : (preset?.fileArgs ?? '{path}')
  const folderArgs = setting.id === 'custom' ? setting.folderArgs || '{path}' : (preset?.folderArgs ?? '{path}')
  const template = target.isDir ? folderArgs : fileArgs
  return {
    command: setting.command,
    args: editorArgs(template, {
      path: target.path,
      line: supportsLine(setting) ? target.line : undefined,
      col: target.col,
      repo: target.repo
    }),
    source: setting.source
  }
}
