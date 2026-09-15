import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { rmSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  registryFilePath,
  listRepos,
  rememberRepo,
  forgetRepo,
  scanRoots,
  locateRepo
} from '../src/main/repoRegistry'
import { cloneFixture, cleanupFixtures } from './fixtures'

beforeEach(() => {
  rmSync(registryFilePath(), { force: true })
})

const dirs: string[] = []
function tempRepo(): string {
  const d = mkdtempSync(join(tmpdir(), 'gitcito-reg-'))
  dirs.push(d)
  return d
}

afterAll(() => {
  cleanupFixtures()
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
})

describe('repoRegistry', () => {
  it('starts empty', async () => {
    expect(await listRepos()).toEqual([])
  })

  it('remembers a repo and survives a reload', async () => {
    const dir = tempRepo()
    await rememberRepo(dir)
    const repos = await listRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].path).toBe(dir)
    expect(repos[0].source).toBe('opened')
    expect(repos[0].lastOpenedAt).toBeGreaterThan(0)
  })

  it('upserts rather than duplicating, and bumps lastOpenedAt', async () => {
    const dir = tempRepo()
    await rememberRepo(dir)
    const first = (await listRepos())[0].lastOpenedAt
    await new Promise((r) => setTimeout(r, 1100))
    await rememberRepo(dir)
    const repos = await listRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].lastOpenedAt).toBeGreaterThan(first)
  })

  it('marks a deleted folder missing instead of dropping it', async () => {
    const dir = tempRepo()
    await rememberRepo(dir)
    rmSync(dir, { recursive: true, force: true })
    const repos = await listRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].missing).toBe(true)
  })

  it('forgets a repo without touching disk', async () => {
    const dir = tempRepo()
    await rememberRepo(dir)
    await forgetRepo(dir)
    expect(await listRepos()).toEqual([])
    expect(existsSync(dir)).toBe(true)
  })

  it('rejects a path that is not safe', async () => {
    await rememberRepo('')
    expect(await listRepos()).toEqual([])
  })

  it('populates branch from .git when remembering a real repo', async () => {
    const dir = cloneFixture('file-nav')
    await rememberRepo(dir)
    const repos = await listRepos()
    expect(repos[0].branch).toBe('main')
  })

  it('keeps an opened repo opened when a scan finds it again', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gitcito-scanroot-'))
    dirs.push(parent)
    const dir = join(parent, 'alpha')
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')

    await rememberRepo(dir)
    await scanRoots([{ path: parent, depth: 2 }])
    const entry = (await listRepos()).find((r) => r.path === dir)
    expect(entry?.source).toBe('opened')
    expect(entry?.lastOpenedAt).toBeGreaterThan(0)
  })

  it('adds a repo found only by a scan as scanned, unopened', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gitcito-scanroot-'))
    dirs.push(parent)
    const dir = join(parent, 'beta')
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')

    await scanRoots([{ path: parent, depth: 2 }])
    const entry = (await listRepos()).find((r) => r.path === dir)
    expect(entry?.source).toBe('scanned')
    expect(entry?.lastOpenedAt).toBe(0)
    expect(entry?.branch).toBe('develop')
  })

  it('counts only what a scan added, not the registry it returns', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gitcito-scanroot-'))
    dirs.push(parent)
    for (const name of ['one', 'two']) {
      mkdirSync(join(parent, name, '.git'), { recursive: true })
      writeFileSync(join(parent, name, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    }
    await rememberRepo(tempRepo())

    const first = await scanRoots([{ path: parent, depth: 2 }])
    expect(first.added).toBe(2)
    expect(first.repos).toHaveLength(3)

    const again = await scanRoots([{ path: parent, depth: 2 }])
    expect(again.added).toBe(0)
  })

  it('files a padded path under its trimmed spelling', async () => {
    const dir = tempRepo()
    await rememberRepo(` ${dir} `)
    await rememberRepo(dir)
    const repos = await listRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].path).toBe(dir)
  })

  it('locates a moved repo, keeping its identity', async () => {
    const dir = tempRepo()
    await rememberRepo(dir)
    const moved = tempRepo()
    mkdirSync(join(moved, '.git'), { recursive: true })
    writeFileSync(join(moved, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    await locateRepo(dir, moved)
    const repos = await listRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0].path).toBe(moved)
    expect(repos[0].missing).toBe(false)
  })

  it('does not lose entries when remembers race a scan (write queue)', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gitcito-scanroot-'))
    dirs.push(parent)
    const scanned = join(parent, 'gamma')
    mkdirSync(join(scanned, '.git'), { recursive: true })
    writeFileSync(join(scanned, '.git', 'HEAD'), 'ref: refs/heads/main\n')

    const opened = [tempRepo(), tempRepo(), tempRepo(), tempRepo(), tempRepo()]
    await Promise.all([
      scanRoots([{ path: parent, depth: 2 }]),
      ...opened.map((d) => rememberRepo(d))
    ])

    const repos = await listRepos()
    for (const d of opened) expect(repos.some((r) => r.path === d)).toBe(true)
    expect(repos.some((r) => r.path === scanned)).toBe(true)
  })
})
