import { describe, it, expect } from 'vitest'
import {
  parseFlutterDevices,
  parseFlutterEmulators,
  parseSimctl,
  parseAdbDevices,
  parseAvds,
  mergeDevices,
  renameRunningEmulators
} from '../src/main/devices'

// Real-shaped output from each SDK tool. These formats are the only contract
// between Gitcito and four CLIs it does not control, so they are pinned here.

describe('run devices: flutter devices --machine', () => {
  const stdout = `Warning: dart is not on your PATH.
[
  {
    "name": "iPhone 16 Pro",
    "id": "3B7F1A22-0000-4444-9999-AAAABBBBCCCC",
    "isSupported": true,
    "targetPlatform": "ios",
    "emulator": true,
    "sdk": "iOS 18.0"
  },
  {
    "name": "Pixel 8",
    "id": "39121FDJG0018Z",
    "targetPlatform": "android-arm64",
    "emulator": false,
    "sdk": "Android 14 (API 34)"
  },
  { "name": "macOS", "id": "macos", "targetPlatform": "darwin", "emulator": false },
  { "name": "Chrome", "id": "chrome", "targetPlatform": "web-javascript", "emulator": false }
]`

  it('reads the JSON out of a noisy stdout and classifies each target', () => {
    const devices = parseFlutterDevices(stdout)
    expect(devices.map((d) => [d.id, d.platform, d.kind])).toEqual([
      ['3B7F1A22-0000-4444-9999-AAAABBBBCCCC', 'ios', 'simulator'],
      ['39121FDJG0018Z', 'android', 'device'],
      ['macos', 'macos', 'desktop'],
      ['chrome', 'web', 'web']
    ])
    // Anything flutter lists is up right now — that is what makes it runnable.
    expect(devices.every((d) => d.running)).toBe(true)
    expect(devices[0].detail).toBe('iOS 18.0')
  })

  it('survives output that is not JSON at all', () => {
    expect(parseFlutterDevices('No devices detected.')).toEqual([])
    expect(parseFlutterDevices('[not json]')).toEqual([])
  })
})

describe('run devices: the other three tools', () => {
  it('parses `flutter emulators` bullet lines as cold targets', () => {
    const out = `2 available emulators:

apple_ios_simulator • iOS Simulator • Apple • ios
Pixel_7_API_34      • Pixel 7 API 34 • Google • android
`
    const devices = parseFlutterEmulators(out)
    expect(devices.map((d) => [d.id, d.platform])).toEqual([
      ['apple_ios_simulator', 'ios'],
      ['Pixel_7_API_34', 'android']
    ])
    expect(devices.every((d) => !d.running)).toBe(true)
  })

  it('parses simctl, keeping only available iOS runtimes', () => {
    const json = JSON.stringify({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
          { udid: 'UDID-1', name: 'iPhone 16', state: 'Booted', isAvailable: true },
          { udid: 'UDID-2', name: 'iPad Air', state: 'Shutdown', isAvailable: true },
          { udid: 'UDID-3', name: 'Broken', state: 'Shutdown', isAvailable: false }
        ],
        'com.apple.CoreSimulator.SimRuntime.watchOS-11-0': [
          { udid: 'UDID-4', name: 'Apple Watch', state: 'Shutdown', isAvailable: true }
        ]
      }
    })
    const devices = parseSimctl(json)
    // The watch runtime is dropped: nothing Gitcito launches can target it.
    expect(devices.map((d) => d.id)).toEqual(['UDID-1', 'UDID-2'])
    expect(devices[0].running).toBe(true)
    expect(devices[0].detail).toBe('iOS 18.0')
  })

  it('parses `adb devices -l`, skipping anything that cannot take a run', () => {
    const out = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a
39121FDJG0018Z         device usb:1-2 product:shiba model:Pixel_8 device:shiba
R5CT10ABCDE            unauthorized
1234567890             offline
`
    const devices = parseAdbDevices(out)
    expect(devices.map((d) => [d.id, d.name, d.kind])).toEqual([
      ['emulator-5554', 'sdk gphone64 arm64', 'simulator'],
      ['39121FDJG0018Z', 'Pixel 8', 'device']
    ])
  })

  it('parses AVD names and ignores the tool’s warning lines', () => {
    const out = `INFO    | Storing crashdata
Pixel_7_API_34
Nexus_5X_API_28
`
    expect(parseAvds(out).map((d) => d.id)).toEqual(['Pixel_7_API_34', 'Nexus_5X_API_28'])
  })
})

describe('run devices: merging the sources', () => {
  it('keeps one entry per device, preferring the running, flutter-issued one', () => {
    const merged = mergeDevices([
      [
        {
          id: 'UDID-1',
          name: 'iPhone 16',
          platform: 'ios',
          kind: 'simulator',
          running: true,
          source: 'flutter'
        }
      ],
      [
        {
          id: 'UDID-1',
          name: 'iPhone 16',
          platform: 'ios',
          kind: 'simulator',
          running: true,
          source: 'simctl'
        },
        {
          id: 'UDID-2',
          name: 'iPad Air',
          platform: 'ios',
          kind: 'simulator',
          running: false,
          source: 'simctl'
        }
      ]
    ])
    expect(merged).toHaveLength(2)
    // `flutter run -d` wants flutter's id, so flutter wins the tie.
    expect(merged[0]).toMatchObject({ name: 'iPhone 16', source: 'flutter' })
    // Running first, so the list opens on what can be launched immediately.
    expect(merged.map((d) => d.running)).toEqual([true, false])
  })

  it('renames a running emulator to its real AVD name so it collides with the cold AVD entry', () => {
    // `adb devices -l` names it after the hardware model; `emulator -list-avds`
    // names it after the AVD. Without the rename these are two devices.
    const adbOut = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a
`
    const avdOut = `Pixel_9a\n`
    const running = renameRunningEmulators(parseAdbDevices(adbOut), new Map([['emulator-5554', 'Pixel_9a']]))
    const merged = mergeDevices([running, parseAvds(avdOut)])

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ id: 'emulator-5554', name: 'Pixel 9a', running: true })
  })

  it('sorts by platform once running-ness ties', () => {
    const merged = mergeDevices([
      [
        { id: 'chrome', name: 'Chrome', platform: 'web', kind: 'web', running: true, source: 'flutter' },
        { id: 'a', name: 'Pixel 8', platform: 'android', kind: 'device', running: true, source: 'adb' },
        { id: 'u', name: 'iPhone 16', platform: 'ios', kind: 'simulator', running: true, source: 'simctl' }
      ]
    ])
    expect(merged.map((d) => d.platform)).toEqual(['ios', 'android', 'web'])
  })
})
