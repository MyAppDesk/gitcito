import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { ipcMain } from 'electron'
import type { RunDevice, RunDeviceSnapshot } from '../shared/types'

const pexec = promisify(execFile)

/**
 * Run targets — the phones, simulators, emulators and desktops a launch config
 * can be pointed at, gathered from whichever SDK CLIs the machine has.
 *
 * Four tools know about devices and none of them agrees with the others:
 * `flutter devices` (everything, already normalised, but only for Flutter
 * installs), `xcrun simctl` (iOS simulators, macOS only), `adb` (attached
 * Android devices and *booted* emulators) and `emulator -list-avds` (Android
 * emulators that are still cold). We ask all of them, in parallel, and merge.
 *
 * Everything here is best-effort: a missing SDK is a normal state, not an
 * error. What we cannot find is reported in `missing` so the UI can say why the
 * list is short instead of showing an empty menu with no explanation.
 */

/** Long enough for a cold `flutter devices`, short enough to not wedge the UI. */
const FLUTTER_TIMEOUT = 25_000
const TOOL_TIMEOUT = 10_000

async function run(cmd: string, args: string[], timeout = TOOL_TIMEOUT): Promise<string | null> {
  try {
    const { stdout } = await pexec(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
    return stdout
  } catch {
    // Missing binary, non-zero exit, timeout — all mean "this source has
    // nothing to tell us", and none of them should surface as a failure.
    return null
  }
}

/** First existing path among the usual SDK locations, else the bare name (PATH). */
function androidTool(name: 'adb' | 'emulator'): string {
  const exe = process.platform === 'win32' ? `${name}.exe` : name
  const sub = name === 'adb' ? 'platform-tools' : 'emulator'
  const roots = [
    process.env['ANDROID_HOME'],
    process.env['ANDROID_SDK_ROOT'],
    process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Android', 'sdk')
      : process.platform === 'win32'
        ? join(process.env['LOCALAPPDATA'] ?? homedir(), 'Android', 'Sdk')
        : join(homedir(), 'Android', 'Sdk')
  ].filter((r): r is string => !!r)
  for (const root of roots) {
    const p = join(root, sub, exe)
    if (existsSync(p)) return p
  }
  return exe
}

// ─── Parsers (pure — covered by the test suite) ──────────────────────────────

/** `flutter devices --machine` — JSON, possibly behind a line of SDK warnings. */
export function parseFlutterDevices(stdout: string): RunDevice[] {
  const start = stdout.indexOf('[')
  const end = stdout.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  let raw: unknown
  try {
    raw = JSON.parse(stdout.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: RunDevice[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const d = entry as Record<string, unknown>
    const id = typeof d.id === 'string' ? d.id : ''
    const name = typeof d.name === 'string' ? d.name : id
    if (!id) continue
    const target = typeof d.targetPlatform === 'string' ? d.targetPlatform : ''
    const platform = flutterPlatform(target)
    const emulator = d.emulator === true
    out.push({
      id,
      name,
      platform,
      kind:
        platform === 'web'
          ? 'web'
          : platform === 'macos' || platform === 'windows' || platform === 'linux'
            ? 'desktop'
            : emulator
              ? 'simulator'
              : 'device',
      // `flutter devices` only ever lists things that are up right now.
      running: true,
      source: 'flutter',
      ...(typeof d.sdk === 'string' && d.sdk ? { detail: d.sdk } : {})
    })
  }
  return out
}

function flutterPlatform(target: string): RunDevice['platform'] {
  if (target.startsWith('ios')) return 'ios'
  if (target.startsWith('android')) return 'android'
  if (target.startsWith('darwin')) return 'macos'
  if (target.startsWith('windows')) return 'windows'
  if (target.startsWith('linux')) return 'linux'
  if (target.startsWith('web')) return 'web'
  return 'other'
}

/** `flutter emulators` — `id • name • manufacturer • platformType` per line. */
export function parseFlutterEmulators(stdout: string): RunDevice[] {
  const out: RunDevice[] = []
  for (const line of stdout.split('\n')) {
    if (!line.includes('•')) continue
    const parts = line.split('•').map((p) => p.trim())
    if (parts.length < 4 || !parts[0]) continue
    const platform = parts[3].toLowerCase().startsWith('ios') ? 'ios' : 'android'
    out.push({
      id: parts[0],
      name: parts[1] || parts[0],
      platform,
      kind: 'simulator',
      // An emulator listed here is one that is *not* running — a booted one
      // shows up in `flutter devices` instead.
      running: false,
      source: 'flutter-emulator',
      ...(parts[2] ? { detail: parts[2] } : {})
    })
  }
  return out
}

/** `xcrun simctl list devices available --json`. */
export function parseSimctl(stdout: string): RunDevice[] {
  let raw: unknown
  try {
    raw = JSON.parse(stdout)
  } catch {
    return []
  }
  const devices = (raw as { devices?: unknown } | null)?.devices
  if (typeof devices !== 'object' || devices === null) return []
  const out: RunDevice[] = []
  for (const [runtime, list] of Object.entries(devices as Record<string, unknown>)) {
    // "com.apple.CoreSimulator.SimRuntime.iOS-18-0" → "iOS 18.0". Anything that
    // is not iOS (watchOS, tvOS) has nothing here that could run it.
    const tag = runtime.split('.').pop() ?? ''
    if (!/^iOS-/i.test(tag)) continue
    const version = tag.replace(/^iOS-/i, '').replace(/-/g, '.')
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (typeof entry !== 'object' || entry === null) continue
      const d = entry as Record<string, unknown>
      if (d.isAvailable === false) continue
      const udid = typeof d.udid === 'string' ? d.udid : ''
      const name = typeof d.name === 'string' ? d.name : udid
      if (!udid) continue
      out.push({
        id: udid,
        name,
        platform: 'ios',
        kind: 'simulator',
        running: d.state === 'Booted',
        source: 'simctl',
        detail: `iOS ${version}`
      })
    }
  }
  return out
}

/** `adb devices -l` — attached handsets and already-booted emulators. */
export function parseAdbDevices(stdout: string): RunDevice[] {
  const out: RunDevice[] = []
  for (const line of stdout.split('\n').slice(1)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [id, state, ...rest] = trimmed.split(/\s+/)
    if (!id || !state) continue
    // `offline` / `unauthorized` devices cannot take a run — listing them as
    // ready is how you get a launch that fails five seconds later.
    if (state !== 'device') continue
    const model = rest.find((p) => p.startsWith('model:'))?.slice(6).replace(/_/g, ' ')
    out.push({
      id,
      name: model || id,
      platform: 'android',
      kind: id.startsWith('emulator-') ? 'simulator' : 'device',
      running: true,
      source: 'adb',
      ...(model ? { detail: id } : {})
    })
  }
  return out
}

/** `emulator -list-avds` — one AVD name per line, all of them cold. */
export function parseAvds(stdout: string): RunDevice[] {
  const out: RunDevice[] = []
  for (const line of stdout.split('\n')) {
    const name = line.trim()
    // The tool prefixes warnings on some SDK versions; AVD names never contain
    // whitespace.
    if (!name || /\s/.test(name) || name.startsWith('INFO') || name.includes(':')) continue
    out.push({
      id: name,
      name: name.replace(/_/g, ' '),
      platform: 'android',
      kind: 'simulator',
      running: false,
      source: 'avd'
    })
  }
  return out
}

const PLATFORM_ORDER: RunDevice['platform'][] = ['ios', 'android', 'macos', 'windows', 'linux', 'web', 'other']

/**
 * Fold the sources into one list. The same simulator is reported by up to three
 * tools, so entries are keyed by platform + name: a running entry always beats a
 * cold one, and Flutter's version wins ties because its id is the one
 * `flutter run -d` expects.
 */
export function mergeDevices(lists: RunDevice[][]): RunDevice[] {
  const byKey = new Map<string, RunDevice>()
  const rank = (d: RunDevice): number => (d.running ? 2 : 0) + (d.source.startsWith('flutter') ? 1 : 0)
  for (const list of lists) {
    for (const d of list) {
      const key = `${d.platform}:${d.name.toLowerCase()}`
      const prev = byKey.get(key)
      if (!prev || rank(d) > rank(prev)) byKey.set(key, prev ? { ...d, running: d.running || prev.running } : d)
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      Number(b.running) - Number(a.running) ||
      PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) ||
      a.name.localeCompare(b.name)
  )
}

// ─── Collection ──────────────────────────────────────────────────────────────

/**
 * Every run target this machine can offer. `flutter` is only asked when the
 * folder is actually a Flutter/Dart project — outside one it is a slow way to
 * learn nothing, and the other tools already cover simulators and handsets.
 */
export async function listRunDevices(repoPath: string): Promise<RunDeviceSnapshot> {
  const isDart = existsSync(join(repoPath, 'pubspec.yaml'))
  const missing: string[] = []
  const adb = androidTool('adb')
  const emulator = androidTool('emulator')

  const [flutterDevices, flutterEmulators, simctl, adbOut, avds] = await Promise.all([
    isDart ? run('flutter', ['devices', '--machine'], FLUTTER_TIMEOUT) : Promise.resolve(null),
    isDart ? run('flutter', ['emulators'], FLUTTER_TIMEOUT) : Promise.resolve(null),
    process.platform === 'darwin' ? run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']) : Promise.resolve(null),
    run(adb, ['devices', '-l']),
    run(emulator, ['-list-avds'])
  ])

  if (isDart && flutterDevices === null) missing.push('flutter')
  if (process.platform === 'darwin' && simctl === null) missing.push('xcrun simctl')
  if (adbOut === null) missing.push('adb')
  if (avds === null) missing.push('emulator')

  const devices = mergeDevices([
    flutterDevices ? parseFlutterDevices(flutterDevices) : [],
    flutterEmulators ? parseFlutterEmulators(flutterEmulators) : [],
    simctl ? parseSimctl(simctl) : [],
    adbOut ? parseAdbDevices(adbOut) : [],
    avds ? parseAvds(avds) : []
  ])
  return { devices, missing }
}

/**
 * Start a cold simulator/emulator. Resolves once the boot command has been
 * accepted — the device takes another while to appear, so the caller refreshes
 * rather than waiting here.
 */
export async function bootRunDevice(device: RunDevice): Promise<{ ok: true } | { error: string }> {
  try {
    if (device.source === 'flutter-emulator') {
      await pexec('flutter', ['emulators', '--launch', device.id], { timeout: FLUTTER_TIMEOUT, windowsHide: true })
      return { ok: true }
    }
    if (device.source === 'simctl') {
      await pexec('xcrun', ['simctl', 'boot', device.id], { timeout: TOOL_TIMEOUT, windowsHide: true })
      // Booting only starts the runtime; the Simulator window is separate.
      await pexec('open', ['-a', 'Simulator'], { timeout: TOOL_TIMEOUT }).catch(() => undefined)
      return { ok: true }
    }
    if (device.source === 'avd') {
      // The emulator process outlives us by design — detach it, or quitting
      // Gitcito would take the running Android device down with it.
      const child = spawn(androidTool('emulator'), ['-avd', device.id], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })
      child.unref()
      return { ok: true }
    }
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export function registerDeviceHandlers(): void {
  ipcMain.handle('devices:list', (_e, repoPath: string) => listRunDevices(repoPath))
  ipcMain.handle('devices:boot', (_e, device: RunDevice) => bootRunDevice(device))
}
