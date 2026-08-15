import { ipcMain } from 'electron'
import { execFile, spawn } from 'child_process'
import { accessSync, constants, existsSync } from 'fs'
import { homedir } from 'os'
import { delimiter, join } from 'path'
import { EDITOR_PRESETS, editorLaunch } from '../shared/editors'
import type { DetectedEditor, EditorSetting, EditorTarget } from '../shared/editors'

/**
 * Finding and launching the user's external editor.
 *
 * Detection prefers the editor's CLI over its application bundle, because only
 * the CLI accepts a line number. `fixPath()` has already merged the login
 * shell's PATH into this process, so a `code` installed by VS Code's "Install
 * 'code' command in PATH" is visible here even when the app was opened from the
 * Dock.
 *
 * Nothing here ever goes through a shell: the command and its arguments are
 * passed to `spawn` as an argv array, so a path with a space, a quote or a `;`
 * is data, not syntax.
 */

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** First directory on PATH holding an executable called `bin`. */
function onPath(bin: string): string | null {
  const names = process.platform === 'win32' ? [`${bin}.cmd`, `${bin}.exe`, `${bin}.bat`] : [bin]
  for (const dir of (process.env['PATH'] || '').split(delimiter).filter(Boolean)) {
    for (const name of names) {
      const full = join(dir, name)
      if (isExecutable(full)) return full
    }
  }
  return null
}

/** macOS bundle in either the system or the per-user Applications folder. */
function macApp(bundle: string): string | null {
  for (const root of ['/Applications', join(homedir(), 'Applications')]) {
    const full = join(root, bundle)
    if (existsSync(full)) return full
  }
  return null
}

function winExe(relative: string): string | null {
  const roots = [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.env['LOCALAPPDATA'] ? join(process.env['LOCALAPPDATA'], 'Programs') : undefined
  ].filter((r): r is string => !!r)
  for (const root of roots) {
    const full = join(root, relative)
    if (existsSync(full)) return full
  }
  return null
}

/**
 * Every editor we can find on this machine, CLI installs first. Cheap enough to
 * run on demand (a handful of `stat` calls), so Settings re-scans each time it
 * opens rather than caching a stale answer.
 */
export function detectEditors(): DetectedEditor[] {
  const found: DetectedEditor[] = []
  for (const preset of EDITOR_PRESETS) {
    const cli = preset.bins.map(onPath).find(Boolean)
    if (cli) {
      found.push({ id: preset.id, name: preset.name, command: cli, source: 'cli' })
      continue
    }
    if (process.platform === 'darwin') {
      const bundle = preset.macApps.map(macApp).find(Boolean)
      if (bundle) {
        found.push({ id: preset.id, name: preset.name, command: bundle, source: 'app' })
        continue
      }
    }
    if (process.platform === 'win32') {
      const exe = preset.winPaths.map(winExe).find(Boolean)
      if (exe) found.push({ id: preset.id, name: preset.name, command: exe, source: 'cli' })
    }
  }
  return found
}

/**
 * Launch the configured editor on a target. Resolves to an empty string on
 * success, or to the failure message — the renderer toasts it rather than
 * throwing, since "my editor did not open" is a nuisance, not an error state.
 */
export function openInEditor(setting: EditorSetting, target: EditorTarget): Promise<string> {
  const plan = editorLaunch(setting, target)
  if (!plan) return Promise.resolve('No editor is configured.')

  return new Promise((resolve) => {
    // A macOS bundle is not an executable; `open -a` is the supported way in,
    // and it takes the path only — hence no line jumping for bundles.
    if (plan.source === 'app') {
      execFile('open', ['-a', plan.command, target.path], (err) => resolve(err ? err.message : ''))
      return
    }
    const child = spawn(plan.command, plan.args, { detached: true, stdio: 'ignore' })
    child.once('error', (err) => resolve(err.message))
    // Detached and unref'd so quitting Gitcito never takes the editor with it.
    child.unref()
    resolve('')
  })
}

export function registerEditorHandlers(): void {
  ipcMain.handle('editor:detect', () => detectEditors())
  ipcMain.handle('editor:open', (_e, setting: EditorSetting, target: EditorTarget) => {
    if (!setting?.command || typeof target?.path !== 'string') return 'No editor is configured.'
    return openInEditor(setting, target)
  })
}
