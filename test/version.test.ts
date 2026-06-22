import { describe, it, expect } from 'vitest'
import { compareVersions, isNewerVersion } from '../src/shared/version'

describe('compareVersions', () => {
  it('orders by major/minor/patch', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })
  it('tolerates a leading v and missing segments', () => {
    expect(compareVersions('v1.1.0', '1.0.0')).toBe(1)
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
  })
  it('ranks a prerelease below the final release', () => {
    expect(compareVersions('1.0.0', '1.0.0-rc.1')).toBe(1)
    expect(compareVersions('1.0.0-rc.1', '1.0.0-rc.2')).toBe(-1)
  })
})

describe('isNewerVersion', () => {
  it('is true only for strictly newer candidates', () => {
    expect(isNewerVersion('1.1.0', '1.0.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('0.9.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('v1.0.1', 'v1.0.0')).toBe(true)
  })
})
