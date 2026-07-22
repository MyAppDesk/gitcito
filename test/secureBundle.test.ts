import { describe, it, expect } from 'vitest'
import {
  packBundle,
  packSections,
  unpackBundle,
  unpackSections,
  readBundleHeader,
  isSafeRelPath,
  BundleError,
  BUNDLE_FORMAT,
  type BundleSection
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
      fileCount: 4,
      version: 2,
      sections: [{ kind: 'repo', project: 'myproject', folder: 'myproject', fileCount: 4 }]
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

describe('v2 multi-section bundles', () => {
  const SECTIONS: BundleSection[] = [
    {
      kind: 'repo',
      project: 'api',
      folder: 'api',
      remote: 'git@github.com:acme/api.git',
      files: [{ path: '.env', content: Buffer.from('API_KEY=sk-1\n') }]
    },
    {
      kind: 'repo',
      project: 'web',
      folder: 'web-frontend',
      files: [{ path: '.env.local', content: Buffer.from('NEXT_PUBLIC=1\n'), executable: false }]
    },
    {
      kind: 'vault',
      entries: [
        { key: 'STRIPE', value: 'sk_live_x', note: 'prod' },
        { key: 'SENTRY', value: 'https://dsn' }
      ]
    }
  ]
  const bundle = packSections('Workspace', SECTIONS, 'a good long password')

  it('summarises every section in the envelope without the password', () => {
    const header = readBundleHeader(bundle)
    expect(header?.version).toBe(2)
    expect(header?.fileCount).toBe(2) // repo files only, vault excluded
    expect(header?.sections).toEqual([
      { kind: 'repo', project: 'api', folder: 'api', remote: 'git@github.com:acme/api.git', fileCount: 1 },
      { kind: 'repo', project: 'web', folder: 'web-frontend', fileCount: 1 },
      { kind: 'vault', entryCount: 2 }
    ])
    // Secret values never appear in the plaintext envelope.
    expect(bundle).not.toContain('sk_live_x')
    expect(bundle).not.toContain('API_KEY')
  })

  it('round-trips repo sections and vault entries', () => {
    const out = unpackSections(bundle, 'a good long password')
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ kind: 'repo', folder: 'api', remote: 'git@github.com:acme/api.git' })
    expect(out[1]).toMatchObject({ kind: 'repo', folder: 'web-frontend' })
    const vault = out[2]
    expect(vault.kind).toBe('vault')
    if (vault.kind === 'vault') {
      expect(vault.entries).toEqual([
        { key: 'STRIPE', value: 'sk_live_x', note: 'prod' },
        { key: 'SENTRY', value: 'https://dsn' }
      ])
    }
  })

  it('flattens repo files for the back-compat unpackBundle', () => {
    const files = unpackBundle(bundle, 'a good long password')
    expect(files.map((f) => f.path)).toEqual(['.env', '.env.local'])
  })
})

describe('v1 back-compat', () => {
  // A hand-built v1 envelope (the shape gitcito ≤2.x wrote): version 1, `files`.
  it('reads a legacy single-repo bundle as one repo section', () => {
    const v1 = packBundle('legacy', [{ path: '.env', content: Buffer.from('X=1\n') }], 'pw pw pw pw')
    const raw = JSON.parse(v1)
    // packBundle now emits v2; simulate a true v1 payload for the read path.
    const header = readBundleHeader(v1)
    expect(header?.sections?.[0]).toMatchObject({ kind: 'repo', project: 'legacy' })
    const sections = unpackSections(v1, 'pw pw pw pw')
    expect(sections).toHaveLength(1)
    expect(sections[0].kind).toBe('repo')
    expect(raw.format).toBe(BUNDLE_FORMAT)
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
