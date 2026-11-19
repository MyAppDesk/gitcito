import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { WebContents } from 'electron'

// The Linux watch — one non-recursive watch per tracked directory — forced on
// whatever platform runs the suite, since that is the path CI on macOS skips.
process.env.GITCITO_WATCH_PER_DIR = '1'
const { clearWatch, setWatch } = await import('../src/main/watcher')

describe('per-directory watcher', () => {
  let repo: string
  const events: Array<{ path: string; light: boolean }> = []
  const sender = {
    id: 9002,
    once: () => undefined,
    isDestroyed: () => false,
    send: (_channel: string, payload: { path: string; light: boolean }) => events.push(payload)
  } as unknown as WebContents
  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', repo, '-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {
      stdio: 'ignore'
    })
  }
  const settle = (ms = 700): Promise<void> => new Promise((r) => setTimeout(r, ms))

  beforeAll(async () => {
    repo = mkdtempSync(join(tmpdir(), 'gitcito-watch-dir-'))
    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    mkdirSync(join(repo, 'src'))
    writeFileSync(join(repo, 'src', 'app.ts'), 'one\n')
    git('add', '.')
    git('commit', '-q', '-m', 'one')
    // A branch that brings in a directory main does not have.
    git('checkout', '-q', '-b', 'feature')
    mkdirSync(join(repo, 'lib'))
    writeFileSync(join(repo, 'lib', 'new.ts'), 'one\n')
    git('add', '.')
    git('commit', '-q', '-m', 'lib')
    git('checkout', '-q', 'main')
    setWatch(sender, repo)
    await settle(400)
  })

  afterAll(() => {
    clearWatch(sender.id)
    rmSync(repo, { recursive: true, force: true })
  })

  it('reports an edit in a tracked subdirectory as a light refresh', async () => {
    events.length = 0
    writeFileSync(join(repo, 'src', 'app.ts'), 'two\n')
    await settle()
    expect(events).toContainEqual({ path: repo, light: true })
    git('checkout', '-q', '--', '.')
    await settle()
  })

  it('watches a directory a checkout brings in, once the re-scan runs', async () => {
    git('checkout', '-q', 'feature')
    // The re-scan waits a second for the checkout's burst to settle.
    await settle(1800)
    events.length = 0
    writeFileSync(join(repo, 'lib', 'new.ts'), 'two\n')
    await settle()
    expect(events).toContainEqual({ path: repo, light: true })
  })
})
