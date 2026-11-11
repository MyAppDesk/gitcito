import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gitService, logSignaturesDisabled } from '../src/main/git'

// An empty `gpg.format` in the global config (some GUI clients write one) makes
// `git log --pretty=%G?` die at the first signed commit. The graph used to show
// only the commits above it.
describe('graph log with a broken gpg config', () => {
  let dir: string
  let repo: string
  const prevGlobal = process.env.GIT_CONFIG_GLOBAL
  const git = (...args: string[]): string => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitcito-gpgcfg-'))
    repo = join(dir, 'repo')
    const badConfig = join(dir, 'gitconfig')
    writeFileSync(badConfig, '[user]\n\tname = T\n\temail = t@example.com\n[gpg]\n\tformat = \n')
    process.env.GIT_CONFIG_GLOBAL = badConfig

    execFileSync('git', ['init', '-q', '-b', 'main', repo])
    git('commit', '-q', '--allow-empty', '-m', 'one')
    // A commit carrying a gpgsig header — enough for git to consult the gpg config.
    const body = git('cat-file', 'commit', 'HEAD').replace(
      /\n\n/,
      '\ngpgsig -----BEGIN PGP SIGNATURE-----\n \n iQEzBAABCAAdFiEE\n -----END PGP SIGNATURE-----\n\n'
    )
    const signed = execFileSync('git', ['-C', repo, 'hash-object', '-t', 'commit', '-w', '--stdin'], {
      input: body,
      encoding: 'utf8'
    }).trim()
    git('update-ref', 'refs/heads/main', signed)
    git('commit', '-q', '--allow-empty', '-m', 'three')
    git('commit', '-q', '--allow-empty', '-m', 'four')
  })

  afterAll(() => {
    if (prevGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL
    else process.env.GIT_CONFIG_GLOBAL = prevGlobal
    rmSync(dir, { recursive: true, force: true })
  })

  it('still returns the whole history, below the signed commit too', async () => {
    const commits = await gitService.log(repo)
    expect(commits.map((c) => c.subject)).toEqual(['four', 'three', 'one'])
    expect(commits.every((c) => c.signature === undefined)).toBe(true)
  })

  it('remembers the broken config, so later pages skip the failing read and still page correctly', async () => {
    await gitService.log(repo)
    expect(logSignaturesDisabled(repo)).toBe(true)
    const page = await gitService.log(repo, 2, 1)
    expect(page.map((c) => c.subject)).toEqual(['three', 'one'])
  })
})
