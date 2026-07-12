import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listCandidates, previewBundle, applyBundle } from '../src/main/secureShare'
import { packBundle } from '../src/main/secureBundle'

// End-to-end (minus dialogs/IPC) tests for secure share: candidate discovery
// walks a real directory tree, and apply writes a real bundle into a repo —
// including the traversal guard against a hand-crafted malicious bundle.

const PASSWORD = 'correct horse battery'
let repo: string
let outside: string

beforeAll(() => {
  outside = mkdtempSync(join(tmpdir(), 'gitcito-secure-outside-'))
  repo = mkdtempSync(join(tmpdir(), 'gitcito-secure-repo-'))
  writeFileSync(join(repo, '.env'), 'API_KEY=abc\n')
  mkdirSync(join(repo, 'app'))
  writeFileSync(join(repo, 'app', '.env.prod'), 'NODE_ENV=production\n')
  writeFileSync(join(repo, 'index.ts'), 'export {}\n')
  mkdirSync(join(repo, 'node_modules', 'pkg'), { recursive: true })
  writeFileSync(join(repo, 'node_modules', 'pkg', 'index.js'), 'x')
})

afterAll(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('listCandidates', () => {
  it('finds files at all depths, secrets first, and skips bulk dirs', async () => {
    const list = await listCandidates(repo)
    const paths = list.map((c) => c.path)
    expect(paths).toEqual(['.env', 'app/.env.prod', 'index.ts'])
    expect(list[0].secret).toBe(true)
    expect(list[1].secret).toBe(true)
    expect(list[2].secret).toBe(false)
    expect(paths.some((p) => p.includes('node_modules'))).toBe(false)
  })
})

describe('previewBundle / applyBundle', () => {
  const bundle = packBundle('demo', [
    { path: 'app/.env.prod', content: Buffer.from('NODE_ENV=staging\n') },
    { path: 'fresh/new.env', content: Buffer.from('NEW=1\n') },
    { path: '../escape.txt', content: Buffer.from('pwned') } // hand-crafted traversal
  ], PASSWORD)
  let bundlePath: string

  beforeAll(() => {
    bundlePath = join(outside, 'demo.gitcito')
    writeFileSync(bundlePath, bundle)
  })

  it('preview flags existing files and marks traversal paths unsafe', async () => {
    const res = await previewBundle(bundlePath, PASSWORD, repo)
    if ('error' in res) throw new Error(res.error)
    const byPath = new Map(res.files.map((f) => [f.path, f]))
    expect(byPath.get('app/.env.prod')).toMatchObject({ exists: true, safe: true })
    expect(byPath.get('fresh/new.env')).toMatchObject({ exists: false, safe: true })
    expect(byPath.get('../escape.txt')).toMatchObject({ safe: false })
  })

  it('preview rejects a wrong password', async () => {
    const res = await previewBundle(bundlePath, 'nope-nope-nope', repo)
    expect(res).toEqual({ error: 'bad-password' })
  })

  it('apply writes selected files, creates directories, and drops unsafe paths', async () => {
    const res = await applyBundle(bundlePath, PASSWORD, repo, [
      'app/.env.prod',
      'fresh/new.env',
      '../escape.txt'
    ])
    if ('error' in res) throw new Error(res.error)
    expect(res.written.sort()).toEqual(['app/.env.prod', 'fresh/new.env'])
    expect(readFileSync(join(repo, 'app', '.env.prod'), 'utf-8')).toBe('NODE_ENV=staging\n')
    expect(readFileSync(join(repo, 'fresh', 'new.env'), 'utf-8')).toBe('NEW=1\n')
    // The traversal entry must never land outside the repo.
    expect(existsSync(join(repo, '..', 'escape.txt'))).toBe(false)
  })

  it('apply only writes what was selected', async () => {
    const res = await applyBundle(bundlePath, PASSWORD, repo, ['app/.env.prod'])
    if ('error' in res) throw new Error(res.error)
    expect(res.written).toEqual(['app/.env.prod'])
  })
})
