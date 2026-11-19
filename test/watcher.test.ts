import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { WebContents } from 'electron'
import { clearWatch, setWatch, trackedDirs } from '../src/main/watcher'

describe('trackedDirs', () => {
  it('lists the root and every directory holding a tracked file, once', () => {
    expect(trackedDirs(['README.md', 'src/a.ts', 'src/lib/b.ts', 'src/lib/c.ts']).sort()).toEqual(['', 'src', 'src/lib'])
    expect(trackedDirs([])).toEqual([''])
  })
})

// Real files, real git: what a repository switch sets up, and what it reports.
describe('repository watcher', () => {
  let repo: string
  const events: Array<{ path: string; light: boolean }> = []
  const sender = {
    id: 9001,
    once: () => undefined,
    isDestroyed: () => false,
    send: (_channel: string, payload: { path: string; light: boolean }) => events.push(payload)
  } as unknown as WebContents
  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' })
  }
  const settle = (ms = 700): Promise<void> => new Promise((r) => setTimeout(r, ms))

  beforeAll(async () => {
    repo = mkdtempSync(join(tmpdir(), 'gitcito-watch-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    mkdirSync(join(repo, 'src'))
    writeFileSync(join(repo, 'src', 'app.ts'), 'one\n')
    writeFileSync(join(repo, '.gitignore'), 'node_modules/\n')
    // An ignored tree like the one that used to cost a second per switch.
    for (let i = 0; i < 300; i++) {
      mkdirSync(join(repo, 'node_modules', `pkg${i}`), { recursive: true })
      writeFileSync(join(repo, 'node_modules', `pkg${i}`, 'index.js'), '')
    }
    git('add', '.')
    git('-c', 'user.name=T', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'one')
    const started = Date.now()
    setWatch(sender, repo)
    // The switch itself returns at once; the tree is walked asynchronously.
    expect(Date.now() - started).toBeLessThan(50)
    await settle(400)
  })

  afterAll(() => {
    clearWatch(sender.id)
    rmSync(repo, { recursive: true, force: true })
  })

  it('reports an edit to a tracked file as a light refresh', async () => {
    events.length = 0
    writeFileSync(join(repo, 'src', 'app.ts'), 'two\n')
    await settle()
    expect(events).toContainEqual({ path: repo, light: true })
  })

  it('reports a commit (a change under .git) as a full refresh', async () => {
    events.length = 0
    git('-c', 'user.name=T', '-c', 'user.email=t@example.com', 'commit', '-qam', 'two')
    await settle()
    expect(events.some((e) => e.light === false)).toBe(true)
  })

  it('stays quiet about churn inside an ignored tree', async () => {
    events.length = 0
    writeFileSync(join(repo, 'node_modules', 'pkg7', 'index.js'), 'changed')
    await settle()
    expect(events).toEqual([])
  })
})
