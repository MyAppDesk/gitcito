import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gitService } from '../src/main/git'

// Remote tags go through runGit now (no prompt, token-aware) instead of a bare
// simple-git call that asked "Username for …" on the launching terminal.
describe('remote tags', () => {
  let dir: string
  let repo: string
  const git = (...args: string[]): string => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitcito-rtags-'))
    repo = join(dir, 'repo')
    const bare = join(dir, 'remote.git')
    execFileSync('git', ['init', '-q', '--bare', bare])
    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    git('-c', 'user.name=T', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'one')
    git('remote', 'add', 'origin', bare)
    git('tag', 'v1')
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('pushes a tag, lists it from the remote, and deletes it again', async () => {
    expect(await gitService.getRemoteTags(repo, 'origin')).toEqual([])
    await gitService.pushTag(repo, 'v1', 'origin')
    expect(await gitService.getRemoteTags(repo, 'origin')).toEqual(['v1'])
    await gitService.deleteRemoteTag(repo, 'v1', 'origin')
    expect(await gitService.getRemoteTags(repo, 'origin')).toEqual([])
  })

  it('reports no tags, rather than throwing, for a remote that is not there', async () => {
    expect(await gitService.getRemoteTags(repo, 'nope')).toEqual([])
  })
})
