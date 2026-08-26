import type { LaunchConfig } from '../../../shared/types'
import type { TranslationKey } from '../i18n'

/**
 * Hot actions — the keystrokes a running dev process already listens for.
 *
 * `flutter run` reloads on `r`, Metro on `r`, nodemon on `rs⏎`, Vitest reruns
 * on `a`. Restarting the whole launch config to get that is the slow way round:
 * it kills the process, re-runs every `preLaunchTask` and loses the app's state,
 * where the keystroke costs a second and keeps it. This module works out which
 * runtime a config actually spawns and what keys it answers to; the toolbar
 * writes `send` straight to the session's stdin.
 *
 * Detection is textual and therefore fallible — a config can always override it
 * with a `"gitcito": { "hotActions": [...] }` block (an empty array turns the
 * buttons off).
 */

/** Which glyph the toolbar draws for an action. */
export type HotIcon =
  | 'reload'
  | 'restart'
  | 'rerun'
  | 'failed'
  | 'snapshot'
  | 'menu'
  | 'debugger'
  | 'browser'
  | 'clear'
  | 'paint'
  | 'perf'
  | 'platform'
  | 'devtools'
  | 'urls'
  | 'cloud'

export interface HotAction {
  /** Stable id — used as a React key and in the context menu. */
  id: string
  /** Exact bytes written to the session's stdin. */
  send: string
  /** What the user pressed, for the tooltip ("r", "rs ⏎"). */
  keyHint: string
  icon: HotIcon
  /** Dictionary key for the label. Absent only for a config's own override. */
  labelKey?: TranslationKey
  /** Literal label from a `gitcito.hotActions` override (repo-authored copy). */
  label?: string
  /** Primary actions get a button of their own; the rest live in the ⋯ menu. */
  primary?: boolean
}

export interface HotRuntime {
  /** Stable runtime id (`flutter`, `vite`, …), also used by the tests. */
  id: string
  /** Product name, shown in the tooltip. Not translated — it is a name. */
  name: string
  actions: HotAction[]
}

const act = (
  id: string,
  send: string,
  keyHint: string,
  icon: HotIcon,
  labelKey: TranslationKey,
  primary = false
): HotAction => ({ id, send, keyHint, icon, labelKey, primary })

/** `\n` is what a readline-based CLI needs; a raw-mode one takes the bare key. */
const ENTER = '\n'

const FLUTTER: HotAction[] = [
  act('reload', 'r', 'r', 'reload', 'launch.hotReload', true),
  act('restart', 'R', 'R', 'restart', 'launch.hotRestart', true),
  act('paint', 'p', 'p', 'paint', 'launch.hotDebugPaint'),
  act('perf', 'P', 'P', 'perf', 'launch.hotPerfOverlay'),
  act('platform', 'o', 'o', 'platform', 'launch.hotTogglePlatform'),
  act('devtools', 'v', 'v', 'devtools', 'launch.hotDevTools')
]

const EXPO: HotAction[] = [
  act('reload', 'r', 'r', 'reload', 'launch.hotReload', true),
  act('menu', 'm', 'm', 'menu', 'launch.hotDevMenu'),
  act('debugger', 'j', 'j', 'debugger', 'launch.hotDebugger')
]

const METRO: HotAction[] = [
  act('reload', 'r', 'r', 'reload', 'launch.hotReload', true),
  act('menu', 'd', 'd', 'menu', 'launch.hotDevMenu'),
  act('debugger', 'j', 'j', 'debugger', 'launch.hotDebugger')
]

const VITE: HotAction[] = [
  act('restart', `r${ENTER}`, 'r ⏎', 'restart', 'launch.hotRestartServer', true),
  act('browser', `o${ENTER}`, 'o ⏎', 'browser', 'launch.hotOpenBrowser'),
  act('urls', `u${ENTER}`, 'u ⏎', 'urls', 'launch.hotShowUrls'),
  act('clear', `c${ENTER}`, 'c ⏎', 'clear', 'launch.hotClearConsole')
]

const NODEMON: HotAction[] = [act('restart', `rs${ENTER}`, 'rs ⏎', 'restart', 'launch.hotRestartServer', true)]

const VITEST: HotAction[] = [
  act('all', 'a', 'a', 'rerun', 'launch.hotRerunAll', true),
  act('failed', 'f', 'f', 'failed', 'launch.hotRerunFailed', true),
  act('snapshot', 'u', 'u', 'snapshot', 'launch.hotUpdateSnapshots')
]

const MOCHA: HotAction[] = [act('restart', `rs${ENTER}`, 'rs ⏎', 'restart', 'launch.hotRerunAll', true)]

const AVA: HotAction[] = [
  act('all', `r${ENTER}`, 'r ⏎', 'rerun', 'launch.hotRerunAll', true),
  act('snapshot', `u${ENTER}`, 'u ⏎', 'snapshot', 'launch.hotUpdateSnapshots', true)
]

// `dotnet watch` applies most edits on its own; Ctrl+R is the escape hatch for
// the ones hot reload has to refuse (a signature change, a new type).
const DOTNET: HotAction[] = [act('restart', '\x12', 'Ctrl+R', 'restart', 'launch.hotRestart', true)]

const WRANGLER: HotAction[] = [
  act('browser', 'b', 'b', 'browser', 'launch.hotOpenBrowser', true),
  act('devtools', 'd', 'd', 'devtools', 'launch.hotDevTools'),
  act('local', 'l', 'l', 'cloud', 'launch.hotToggleLocal'),
  act('clear', 'c', 'c', 'clear', 'launch.hotClearConsole')
]

const JEST: HotAction[] = [
  act('all', 'a', 'a', 'rerun', 'launch.hotRerunAll', true),
  act('failed', 'f', 'f', 'failed', 'launch.hotRerunFailed', true),
  act('changed', 'o', 'o', 'rerun', 'launch.hotOnlyChanged'),
  act('snapshot', 'u', 'u', 'snapshot', 'launch.hotUpdateSnapshots')
]

/** A command word: preceded by start-of-line, whitespace, a path separator or a
 *  quote — so `electron-vite` never reads as `vite`. */
function word(name: string): RegExp {
  return new RegExp(`(^|[\\s/\\\\'"])${name}(\\.(cmd|bat|exe|js|mjs))?($|[\\s'"])`)
}

/**
 * Runtimes whose CLI listens on stdin, most specific first. Order matters:
 * `expo start` also mentions Metro, and `vitest` contains `vite`.
 *
 * Deliberately absent: everything that reloads on its own with no keys to press
 * — `node --watch`, `ng serve`, `cargo watch`, `next dev`, `tsc --watch`,
 * webpack-dev-server. A button that sends a key nothing reads is worse than no
 * button, because it looks like it did something.
 */
const RUNTIMES: { id: string; name: string; actions: HotAction[]; match(hay: string): boolean }[] = [
  {
    id: 'flutter',
    name: 'Flutter',
    actions: FLUTTER,
    match: (h) => /(^|[\s/\\'"])flutter(\.bat|\.exe)?\s+(run|attach)($|[\s'"])/.test(h)
  },
  {
    id: 'expo',
    name: 'Expo',
    actions: EXPO,
    match: (h) => /(^|[\s/\\'"])expo(-cli)?\s+(start|run)/.test(h)
  },
  {
    id: 'metro',
    name: 'Metro',
    actions: METRO,
    match: (h) => /react-native\s+(start|run-)/.test(h) || word('metro').test(h)
  },
  {
    id: 'vitest',
    name: 'Vitest',
    actions: VITEST,
    // `vitest run` is a single pass with no watcher to talk to; an explicit
    // `--watch` puts it back.
    match: (h) => word('vitest').test(h) && (!/(^|\s)vitest\s+run($|\s)/.test(h) || /--watch\b/.test(h))
  },
  {
    id: 'jest',
    name: 'Jest',
    actions: JEST,
    // Jest is only interactive in watch mode.
    match: (h) => word('jest').test(h) && /--watch(all)?\b/.test(h)
  },
  {
    id: 'mocha',
    name: 'Mocha',
    // Mocha only reads stdin while watching.
    actions: MOCHA,
    match: (h) => word('mocha').test(h) && /--watch\b|(^|\s)-w($|\s)/.test(h)
  },
  {
    id: 'ava',
    name: 'AVA',
    actions: AVA,
    match: (h) => word('ava').test(h) && /--watch\b|(^|\s)-w($|\s)/.test(h)
  },
  {
    id: 'dotnet',
    name: 'dotnet watch',
    actions: DOTNET,
    match: (h) => /(^|[\s/\\'"])dotnet\s+watch($|[\s'"])/.test(h)
  },
  {
    id: 'wrangler',
    name: 'Wrangler',
    actions: WRANGLER,
    match: (h) => /(^|[\s/\\'"])wrangler(\.cmd)?\s+(dev|pages\s+dev)($|[\s'"])/.test(h)
  },
  {
    id: 'nodemon',
    name: 'nodemon',
    actions: NODEMON,
    match: (h) => word('nodemon').test(h)
  },
  {
    id: 'vite',
    name: 'Vite',
    actions: VITE,
    // `vite build` is a one-shot compile; dev / serve / preview all have the
    // shortcut bar.
    match: (h) => word('vite').test(h) && !/(^|\s)vite\s+build($|\s)/.test(h)
  }
]

/** Package-manager invocations whose script body is the command that really runs. */
const SCRIPT_CALL = /(?:^|&&|;|\|\||\s)(?:npm|pnpm|yarn|bun)(?:\s+run)?\s+([\w:@./-]+)/g

/**
 * Everything about a config that names a program, flattened into one lowercase
 * string, with `npm run dev`-style references replaced by the script body from
 * package.json (two levels deep — a script that calls another script).
 */
export function launchHaystack(config: LaunchConfig, scripts: Record<string, string> = {}): string {
  const parts: string[] = []
  const push = (v: unknown): void => {
    if (typeof v === 'string') parts.push(v)
    else if (Array.isArray(v)) for (const x of v) push(x)
  }
  push(config.command)
  push(config.runtimeExecutable)
  push(config.runtimeArgs)
  push(config.program)
  push(config.module)
  push(config.args)
  let hay = parts.join(' ').toLowerCase()
  // Expand `npm run <script>` twice: repos routinely have `dev` → `dev:web` →
  // the real `vite` line. A `seen` set keeps a self-referential script finite.
  const seen = new Set<string>()
  for (let depth = 0; depth < 2; depth++) {
    const found: string[] = []
    for (const m of hay.matchAll(SCRIPT_CALL)) {
      const name = m[1]
      if (seen.has(name)) continue
      seen.add(name)
      const body = scripts[name]
      if (body) found.push(body.toLowerCase())
    }
    if (found.length === 0) break
    hay = `${hay} ${found.join(' ')}`
  }
  return hay
}

const ICONS = new Set<HotIcon>([
  'reload',
  'restart',
  'rerun',
  'failed',
  'snapshot',
  'menu',
  'debugger',
  'browser',
  'clear',
  'paint',
  'perf',
  'platform',
  'devtools',
  'urls',
  'cloud'
])

/** Read a `"gitcito": { "hotActions": [...] }` block off a config. Returns null
 *  when there is none, and an empty array when the repo turned the buttons off. */
function overrideActions(config: LaunchConfig): HotAction[] | null {
  const block = config.gitcito
  if (typeof block !== 'object' || block === null) return null
  const raw = (block as { hotActions?: unknown }).hotActions
  if (!Array.isArray(raw)) return null
  const out: HotAction[] = []
  for (const [i, entry] of raw.entries()) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as { label?: unknown; send?: unknown; icon?: unknown; primary?: unknown }
    if (typeof e.label !== 'string' || typeof e.send !== 'string' || !e.send) continue
    const icon = typeof e.icon === 'string' && ICONS.has(e.icon as HotIcon) ? (e.icon as HotIcon) : 'reload'
    out.push({
      id: `custom-${i}`,
      send: e.send,
      // Show what a person would type: a trailing newline reads as ⏎.
      keyHint: e.send.replace(/\r?\n$/, ' ⏎').replace(/\r/g, ''),
      icon,
      label: e.label,
      // Repo-authored actions are all primary unless the block says otherwise —
      // a config that bothered to list them wants them reachable.
      primary: e.primary !== false
    })
  }
  return out
}

/**
 * The hot actions available for a running config, or null when its process has
 * nothing to listen with. `scripts` is the workspace folder's package.json
 * scripts (see `LaunchGroup.scripts`).
 */
export function detectHotRuntime(config: LaunchConfig, scripts: Record<string, string> = {}): HotRuntime | null {
  const custom = overrideActions(config)
  if (custom) return custom.length > 0 ? { id: 'custom', name: config.name, actions: custom } : null

  // A compound is a set of sessions, not a process — each member is detected on
  // its own when its session is selected.
  if (Array.isArray(config.compound)) return null

  const type = (config.type ?? '').toLowerCase()
  const program = typeof config.program === 'string' ? config.program : ''
  // Dart-Code configs never spell out the CLI: main.ts turns `type: "dart"` with
  // a `lib/` entrypoint into `flutter run`, and anything else into `dart run`,
  // which has no interactive keys.
  if ((type === 'dart' || type === 'flutter') && (!program || /(^|[/\\])lib[/\\]/.test(program))) {
    return { id: 'flutter', name: 'Flutter', actions: FLUTTER }
  }

  const hay = launchHaystack(config, scripts)
  if (!hay) return null
  const hit = RUNTIMES.find((r) => r.match(hay))
  return hit ? { id: hit.id, name: hit.name, actions: hit.actions } : null
}

/** The subset that gets its own toolbar button. */
export function primaryActions(runtime: HotRuntime): HotAction[] {
  return runtime.actions.filter((a) => a.primary)
}

/** The rest — shown in the toolbar's overflow menu. */
export function overflowActions(runtime: HotRuntime): HotAction[] {
  return runtime.actions.filter((a) => !a.primary)
}
