import type { DevicePlatform, LaunchConfig, RunDevice } from '../../../shared/types'
import { launchHaystack } from './launchActions'

/**
 * Pointing a launch config at a device.
 *
 * VS Code's device picker belongs to the Flutter extension, but the idea is not
 * Flutter's: React Native, Expo, Capacitor and xcodebuild all take a target, and
 * each spells it differently. This module works out which family a config
 * belongs to, which platforms it could possibly run on, and how to write the
 * chosen device into the command Gitcito is about to spawn.
 *
 * Everything a config launches also gets the choice as environment variables,
 * which is the only lever available when the config runs a wrapper script we
 * must not rewrite.
 */

export type DeviceFamily =
  | 'flutter'
  | 'rn-ios'
  | 'rn-android'
  | 'expo-run-ios'
  | 'expo-run-android'
  | 'expo'
  | 'cap-ios'
  | 'cap-android'
  | 'xcodebuild'
  | null

/** Which family's command line this config spawns (null = no device concept). */
export function deviceFamily(config: LaunchConfig, scripts: Record<string, string> = {}): DeviceFamily {
  if (Array.isArray(config.compound)) return null
  const type = (config.type ?? '').toLowerCase()
  const program = typeof config.program === 'string' ? config.program : ''
  // A Dart-Code config never names the CLI: a `lib/` entrypoint is `flutter run`.
  if ((type === 'dart' || type === 'flutter') && (!program || /(^|[/\\])lib[/\\]/.test(program))) return 'flutter'

  const h = launchHaystack(config, scripts)
  if (!h) return null
  if (/(^|[\s/\\'"])flutter(\.bat|\.exe)?\s+(run|attach)($|[\s'"])/.test(h)) return 'flutter'
  if (/expo(-cli)?\s+run:?\s*ios/.test(h)) return 'expo-run-ios'
  if (/expo(-cli)?\s+run:?\s*android/.test(h)) return 'expo-run-android'
  if (/expo(-cli)?\s+start/.test(h)) return 'expo'
  if (/react-native\s+run-ios/.test(h)) return 'rn-ios'
  if (/react-native\s+run-android/.test(h)) return 'rn-android'
  if (/(cap|capacitor)\s+run\s+ios/.test(h)) return 'cap-ios'
  if (/(cap|capacitor)\s+run\s+android/.test(h)) return 'cap-android'
  if (/(^|[\s/\\'"])xcodebuild($|[\s'"])/.test(h)) return 'xcodebuild'
  return null
}

/** Platforms a family can be pointed at — the filter for the device picker. */
export function familyPlatforms(family: DeviceFamily): DevicePlatform[] {
  switch (family) {
    case 'flutter':
      return ['ios', 'android', 'macos', 'windows', 'linux', 'web', 'other']
    case 'rn-ios':
    case 'expo-run-ios':
    case 'cap-ios':
    case 'xcodebuild':
      return ['ios']
    case 'rn-android':
    case 'expo-run-android':
    case 'cap-android':
      return ['android']
    case 'expo':
      return ['ios', 'android']
    default:
      return []
  }
}

/** The union across a repo's configs — which devices are worth listing at all. */
export function repoDevicePlatforms(
  configs: LaunchConfig[],
  scripts: Record<string, string> = {}
): DevicePlatform[] {
  const seen = new Set<DevicePlatform>()
  for (const c of configs) for (const p of familyPlatforms(deviceFamily(c, scripts))) seen.add(p)
  return [...seen]
}

/** True when this repo has anything a device could be selected for. */
export function repoWantsDevices(configs: LaunchConfig[], scripts: Record<string, string> = {}): boolean {
  return repoDevicePlatforms(configs, scripts).length > 0
}

/** Ids we are willing to paste into a shell command line unquoted. */
const SAFE_ID = /^[A-Za-z0-9._:@-]+$/

function hasFlag(hay: string, ...flags: string[]): boolean {
  return flags.some((f) => new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(=|\\s|$)`).test(hay))
}

/**
 * Return the config with the chosen device written into it. A config that
 * already names a device is left alone — an explicit `-d` in launch.json is the
 * author's decision, not something a picker should quietly override.
 */
export function applyDevice(
  config: LaunchConfig,
  device: RunDevice | null,
  scripts: Record<string, string> = {}
): LaunchConfig {
  if (!device) return config
  const family = deviceFamily(config, scripts)
  if (!family) return config

  // The device is always in the environment, even when we cannot touch the
  // command line: a wrapper script can read it, and `ANDROID_SERIAL` is what
  // makes a plain `adb`/Gradle flow hit the right handset.
  const env: Record<string, string> = {
    ...(config.env ?? {}),
    GITCITO_DEVICE_ID: device.id,
    GITCITO_DEVICE_NAME: device.name,
    GITCITO_DEVICE_PLATFORM: device.platform
  }
  // An AVD name is not a serial — setting it would point adb at nothing.
  if (device.platform === 'android' && device.source !== 'avd') env['ANDROID_SERIAL'] = device.id

  const next: LaunchConfig = { ...config, env }
  if (!SAFE_ID.test(device.id)) return next

  const command = typeof config.command === 'string' ? config.command : ''
  const args = (config.args ?? []).map((a) => String(a))
  const argLine = args.join(' ')

  const appendCommand = (suffix: string): LaunchConfig => ({ ...next, command: `${command} ${suffix}` })

  switch (family) {
    case 'flutter': {
      // Dart-Code's own `deviceId` wins, as does an explicit -d.
      if (typeof config.deviceId === 'string' && config.deviceId) return next
      if (hasFlag(argLine, '-d', '--device-id')) return next
      if (command) return hasFlag(command, '-d', '--device-id') ? next : appendCommand(`-d ${device.id}`)
      return { ...next, args: [...args, '-d', device.id] }
    }
    case 'rn-ios':
      // The RN CLI takes a simulator by udid; `--simulator` wants a name and
      // would need quoting, so udid is both safer and unambiguous.
      return !command || hasFlag(command, '--udid', '--simulator') ? next : appendCommand(`--udid ${device.id}`)
    case 'rn-android':
      return !command || hasFlag(command, '--deviceId') ? next : appendCommand(`--deviceId=${device.id}`)
    case 'expo-run-ios':
    case 'expo-run-android':
      return !command || hasFlag(command, '--device', '-d') ? next : appendCommand(`--device ${device.id}`)
    case 'cap-ios':
    case 'cap-android':
      return !command || hasFlag(command, '--target') ? next : appendCommand(`--target ${device.id}`)
    case 'xcodebuild':
      return !command || hasFlag(command, '-destination') ? next : appendCommand(`-destination id=${device.id}`)
    default:
      // `expo start` has no device flag — the environment is all it gets.
      return next
  }
}
