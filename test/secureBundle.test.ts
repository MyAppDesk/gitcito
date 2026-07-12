import { describe, it, expect } from 'vitest'
import {
  packBundle,
  unpackBundle,
  readBundleHeader,
  isSafeRelPath,
  BundleError,
  BUNDLE_FORMAT
} from '../src/main/secureBundle'
import { isSecretFile } from '../src/shared/secretFiles'

// Round-trip and safety tests for the .gitcito secure-bundle format.
// These are pure (no Electron, no fs) — packing runs scrypt, so each
// pack/unpack costs a few hundred ms by design.

const FILES = [
  { path: '.env', content: Buffer.from('API_KEY=sk-live-abc123\nDB=postgres://u:p@h/db\n') },
  { path: 'app/.env.prod', content: Buffer.from('NODE_ENV=production\n') },
  { path: 'certs/dev.pem', content: Buffer.from([0, 1, 2, 250, 251, 252]) }, // binary-ish
  { path: 'scripts/run.sh', content: Buffer.from('#!/bin/sh\necho hi\n'), executable: true }
]

describe('secure bundle pack/unpack', () => {
  const bundle = packBundle('myproject', FILES, 'correct horse battery')

  it('round-trips files, paths, binary content and the executable bit', () => {
    const out = unpackBundle(bundle, 'correct horse battery')
    expect(out.map((f) => f.path)).toEqual(FILES.map((f) => f.path))
    for (let i = 0; i < FILES.length; i++) {
      expect(out[i].content.equals(FILES[i].content)).toBe(true)
    }
    expect(out[3].executable).toBe(true)
    expect(out[0].executable).toBeUndefined()
  })

  it('exposes only the envelope without the password', () => {
    const header = readBundleHeader(bundle)
    expect(header).toEqual({
      project: 'myproject',
      createdAt: expect.any(Number),
      fileCount: 4
    })
    // No plaintext leakage: neither file paths nor contents appear in the JSON.
    expect(bundle).not.toContain('API_KEY')
    expect(bundle).not.toContain('.env')
  })

  it('rejects a wrong password via the GCM auth tag', () => {
    expect(() => unpackBundle(bundle, 'wrong password')).toThrowError(
      expect.objectContaining({ code: 'bad-password' })
    )
  })

  it('rejects a tampered payload', () => {
    const raw = JSON.parse(bundle)
    const bytes = Buffer.from(raw.payload, 'base64')
    bytes[0] ^= 0xff
    raw.payload = bytes.toString('base64')
    expect(() => unpackBundle(JSON.stringify(raw), 'correct horse battery')).toThrowError(
      expect.objectContaining({ code: 'bad-password' })
    )
  })

  it('rejects non-bundle and future-version input', () => {
    expect(readBundleHeader('not json at all')).toBeNull()
    expect(readBundleHeader('{"format":"something-else"}')).toBeNull()
    expect(() => readBundleHeader(JSON.stringify({ format: BUNDLE_FORMAT, version: 99 }))).toThrowError(BundleError)
    expect(() => unpackBundle('{}', 'x')).toThrowError(expect.objectContaining({ code: 'invalid' }))
  })
})

describe('isSafeRelPath', () => {
  it('accepts normal relative paths', () => {
    expect(isSafeRelPath('.env')).toBe(true)
    expect(isSafeRelPath('app/.env.prod')).toBe(true)
    expect(isSafeRelPath('deep/nested/dir/file.txt')).toBe(true)
  })

  it('rejects traversal and absolute paths', () => {
    expect(isSafeRelPath('../outside')).toBe(false)
    expect(isSafeRelPath('a/../../outside')).toBe(false)
    expect(isSafeRelPath('/etc/passwd')).toBe(false)
    expect(isSafeRelPath('C:\\windows\\system32')).toBe(false)
    expect(isSafeRelPath('a\\..\\b')).toBe(false)
    expect(isSafeRelPath('')).toBe(false)
    expect(isSafeRelPath('a//b')).toBe(false)
    expect(isSafeRelPath('./a')).toBe(false)
  })
})

describe('isSecretFile (shared)', () => {
  it('flags env and key files, allows templates', () => {
    expect(isSecretFile('.env')).toBe(true)
    expect(isSecretFile('app/.env.prod')).toBe(true)
    expect(isSecretFile('certs/dev.pem')).toBe(true)
    expect(isSecretFile('.env.example')).toBe(false)
    expect(isSecretFile('src/index.ts')).toBe(false)
  })
})
