import { describe, it, expect, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { gitService, gitMethodIsRead } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'

afterAll(cleanupFixtures)

// The 8-byte PNG signature is enough: the method checks location, type and
// size, never decodes.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('repoImage', () => {
  it('is a read', () => {
    expect(gitMethodIsRead('repoImage')).toBe(true)
  })

  it('reads an image inside the repository as a data URL', async () => {
    const R = cloneFixture('bisect-bug')
    mkdirSync(join(R, 'assets'))
    writeFileSync(join(R, 'assets', 'logo.png'), PNG)
    const url = await gitService.repoImage(R, 'assets/logo.png')
    expect(url).toBe(`data:image/png;base64,${PNG.toString('base64')}`)
  })

  it('returns null for a broken path instead of throwing', async () => {
    const R = cloneFixture('bisect-bug')
    expect(await gitService.repoImage(R, 'nope/missing.png')).toBeNull()
    expect(await gitService.repoImage(R, '')).toBeNull()
  })

  it('refuses files that are not images', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, 'notes.txt'), 'hello')
    expect(await gitService.repoImage(R, 'notes.txt')).toBeNull()
  })

  it('refuses paths that escape the repository, directly or through a symlink', async () => {
    const R = cloneFixture('bisect-bug')
    const outside = mkdtempSync(join(tmpdir(), 'gitcito-img-'))
    writeFileSync(join(outside, 'secret.png'), PNG)
    expect(await gitService.repoImage(R, relative(R, join(outside, 'secret.png')))).toBeNull()
    expect(await gitService.repoImage(R, join(outside, 'secret.png'))).toBeNull()
    symlinkSync(join(outside, 'secret.png'), join(R, 'link.png'))
    expect(await gitService.repoImage(R, 'link.png')).toBeNull()
  })

  it('refuses an image too large for a tab icon', async () => {
    const R = cloneFixture('bisect-bug')
    writeFileSync(join(R, 'huge.png'), Buffer.alloc(1024 * 1024 + 1))
    expect(await gitService.repoImage(R, 'huge.png')).toBeNull()
  })
})
