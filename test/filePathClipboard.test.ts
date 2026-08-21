import { describe, it, expect } from 'vitest'
import { buildFilePathClipboardPayload } from '../src/renderer/src/lib/filePathClipboard'

describe('buildFilePathClipboardPayload', () => {
  it('joins a posix absolute path from the repo root', () => {
    const payload = buildFilePathClipboardPayload(
      '/Users/name/project',
      ['src/index.ts'],
      'darwin'
    )
    expect(payload.absolute).toBe('/Users/name/project/src/index.ts')
    expect(payload.relative).toBe('src/index.ts')
  })

  it('uses native backslashes for Windows absolute paths', () => {
    const payload = buildFilePathClipboardPayload(
      'C:\\Users\\name\\project',
      ['src/index.ts'],
      'win32'
    )
    expect(payload.absolute).toBe('C:\\Users\\name\\project\\src\\index.ts')
  })

  it('normalizes mixed separators in a Windows repo root', () => {
    const payload = buildFilePathClipboardPayload(
      'C:/Users/name/project/',
      ['src\\lib\\util.ts'],
      'win32'
    )
    expect(payload.absolute).toBe('C:\\Users\\name\\project\\src\\lib\\util.ts')
  })

  it('keeps relative paths repository-relative without a leading ./', () => {
    const payload = buildFilePathClipboardPayload(
      '/tmp/repo',
      ['./src/index.ts', 'src/./lib/nested.ts'],
      'linux'
    )
    expect(payload.relative).toBe('src/index.ts\nsrc/lib/nested.ts')
    expect(payload.relative.startsWith('./')).toBe(false)
  })

  it('copies one path per line in the given visible order', () => {
    const payload = buildFilePathClipboardPayload(
      '/tmp/repo',
      ['b.ts', 'a.ts', 'c.ts'],
      'linux'
    )
    expect(payload.relative).toBe('b.ts\na.ts\nc.ts')
    expect(payload.absolute).toBe('/tmp/repo/b.ts\n/tmp/repo/a.ts\n/tmp/repo/c.ts')
  })

  it('drops duplicate paths while keeping the first occurrence', () => {
    const payload = buildFilePathClipboardPayload(
      '/tmp/repo',
      ['src/a.ts', './src/a.ts', 'src/b.ts', 'src/a.ts'],
      'darwin'
    )
    expect(payload.relative).toBe('src/a.ts\nsrc/b.ts')
  })

  it('copies deleted, renamed, untracked, and nested names without corruption', () => {
    const payload = buildFilePathClipboardPayload(
      '/tmp/repo',
      [
        'gone.ts',
        'new name.ts',
        'src/café/文件.ts',
        '.env.local',
        'dir.with.dots/nested/file.ts'
      ],
      'linux'
    )
    expect(payload.relative).toBe(
      [
        'gone.ts',
        'new name.ts',
        'src/café/文件.ts',
        '.env.local',
        'dir.with.dots/nested/file.ts'
      ].join('\n')
    )
    expect(payload.absolute.split('\n')).toEqual([
      '/tmp/repo/gone.ts',
      '/tmp/repo/new name.ts',
      '/tmp/repo/src/café/文件.ts',
      '/tmp/repo/.env.local',
      '/tmp/repo/dir.with.dots/nested/file.ts'
    ])
  })

  it('joins Windows multi-select with native separators and CRLF', () => {
    const payload = buildFilePathClipboardPayload(
      'C:\\repo',
      ['src/a.ts', 'src/b.ts'],
      'win32'
    )
    expect(payload.absolute).toBe('C:\\repo\\src\\a.ts\r\nC:\\repo\\src\\b.ts')
    expect(payload.relative).toBe('src/a.ts\r\nsrc/b.ts')
  })

  it('does not require files to exist on disk', () => {
    const payload = buildFilePathClipboardPayload(
      '/no/such/repo',
      ['deleted/missing.ts'],
      'linux'
    )
    expect(payload.absolute).toBe('/no/such/repo/deleted/missing.ts')
    expect(payload.relative).toBe('deleted/missing.ts')
  })
})
