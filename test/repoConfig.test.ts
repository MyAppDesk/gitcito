import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { cloneFixture, cleanupFixtures } from './fixtures'
import {
  applyDoctorFix,
  readRepoConfig,
  runRepoDoctor,
  suggestRepoConfig,
  writeRepoConfig
} from '../src/main/repoConfig'

const git = (dir: string, ...args: string[]): string =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()

afterAll(cleanupFixtures)

describe('reading and writing .gitcito.json', () => {
  it('reports a repository that has none, without inventing a config', async () => {
    const dir = cloneFixture('project-tree')
    const result = await readRepoConfig(dir)
    expect(result.exists).toBe(false)
    expect(result.config).toBeNull()
    expect(result.issues).toEqual([])
  })

  it('writes a config and reads back exactly what it stored', async () => {
    const dir = cloneFixture('project-tree')
    await writeRepoConfig(dir, { version: 1, protect: ['main'], commit: { scopes: ['ui'] } })
    const back = await readRepoConfig(dir)
    expect(back.exists).toBe(true)
    expect(back.config).toEqual({ version: 1, protect: ['main'], commit: { scopes: ['ui'] } })
    // It is a plain tracked file, so it shows up as a working-tree change.
    expect(git(dir, 'status', '--porcelain')).toContain('.gitcito.json')
  })

  it('re-validates on write rather than trusting the caller', async () => {
    const dir = cloneFixture('project-tree')
    await expect(writeRepoConfig(dir, { version: 7 } as never)).rejects.toThrow()
  })

  it('keeps the good half of a file with a bad field', async () => {
    const dir = cloneFixture('project-tree')
    writeFileSync(
      join(dir, '.gitcito.json'),
      JSON.stringify({ version: 1, protect: ['main'], requires: { hooksPath: '../elsewhere' } })
    )
    const result = await readRepoConfig(dir)
    expect(result.config?.protect).toEqual(['main'])
    expect(result.config?.requires).toBeUndefined()
    expect(result.issues).toEqual([{ field: 'requires.hooksPath', code: 'unsafe' }])
  })
})

describe('the repo doctor', () => {
  it('says nothing at all when the repository declares no requirements', async () => {
    const dir = cloneFixture('project-tree')
    await writeRepoConfig(dir, { version: 1, protect: ['main'] })
    expect(await runRepoDoctor(dir)).toEqual([])
  })

  it('finds a missing file, offers the copy, and goes green once it is there', async () => {
    const dir = cloneFixture('project-tree')
    writeFileSync(join(dir, '.env.example'), 'API_URL=http://localhost\n')
    await writeRepoConfig(dir, {
      version: 1,
      requires: { files: [{ path: '.env.local', from: '.env.example', why: 'the dev server reads it' }] }
    })

    const [check] = await runRepoDoctor(dir)
    expect(check.status).toBe('fail')
    expect(check.why).toBe('the dev server reads it')
    expect(check.fix).toEqual({ kind: 'copyFile', from: '.env.example', to: '.env.local' })

    await applyDoctorFix(dir, check.fix!)
    expect(readFileSync(join(dir, '.env.local'), 'utf8')).toContain('API_URL')
    expect((await runRepoDoctor(dir))[0].status).toBe('ok')
  })

  it('offers no copy when there is no template to copy from', async () => {
    const dir = cloneFixture('project-tree')
    await writeRepoConfig(dir, { version: 1, requires: { files: [{ path: '.env.local' }] } })
    const [check] = await runRepoDoctor(dir)
    expect(check.status).toBe('fail')
    expect(check.fix).toBeUndefined()
  })

  it('checks core.hooksPath and can set it', async () => {
    const dir = cloneFixture('project-tree')
    mkdirSync(join(dir, '.husky'), { recursive: true })
    await writeRepoConfig(dir, { version: 1, requires: { hooksPath: '.husky' } })

    const [check] = await runRepoDoctor(dir)
    expect(check.status).toBe('fail')
    expect(check.fix).toEqual({ kind: 'hooksPath', value: '.husky' })

    await applyDoctorFix(dir, check.fix!)
    expect(git(dir, 'config', '--get', 'core.hooksPath')).toBe('.husky')
    expect((await runRepoDoctor(dir))[0].status).toBe('ok')
  })

  it('accepts an absolute core.hooksPath that points at the declared directory', async () => {
    const dir = cloneFixture('project-tree')
    mkdirSync(join(dir, '.husky', '_'), { recursive: true })
    git(dir, 'config', 'core.hooksPath', join(dir, '.husky', '_'))
    await writeRepoConfig(dir, { version: 1, requires: { hooksPath: '.husky/_' } })
    const [check] = await runRepoDoctor(dir)
    expect(check.status).toBe('ok')
  })

  it('checks the node version against this machine', async () => {
    const dir = cloneFixture('project-tree')
    await writeRepoConfig(dir, { version: 1, requires: { node: '>=1' } })
    const [ok] = await runRepoDoctor(dir)
    expect(ok.status).toBe('ok')

    await writeRepoConfig(dir, { version: 1, requires: { node: '>=9999' } })
    const [bad] = await runRepoDoctor(dir)
    expect(bad.status).toBe('warn')
    expect(bad.expected).toBe('>=9999')
    expect(bad.actual).toBeTruthy()
  })

  it('skips the submodule check in a repository with no submodules', async () => {
    const dir = cloneFixture('project-tree')
    await writeRepoConfig(dir, { version: 1, requires: { submodules: true } })
    expect(await runRepoDoctor(dir)).toEqual([])
  })
})

describe('doctor repairs refuse to leave the repository or destroy work', () => {
  it('never overwrites the file it was asked to create', async () => {
    const dir = cloneFixture('project-tree')
    writeFileSync(join(dir, '.env.example'), 'A=1\n')
    writeFileSync(join(dir, '.env.local'), 'A=already mine\n')
    await expect(
      applyDoctorFix(dir, { kind: 'copyFile', from: '.env.example', to: '.env.local' })
    ).rejects.toThrow()
    expect(readFileSync(join(dir, '.env.local'), 'utf8')).toBe('A=already mine\n')
  })

  it('refuses a copy that would read or write outside the repository', async () => {
    const dir = cloneFixture('project-tree')
    await expect(
      applyDoctorFix(dir, { kind: 'copyFile', from: '../../etc/hosts', to: 'stolen' })
    ).rejects.toThrow()
    expect(existsSync(join(dir, 'stolen'))).toBe(false)
  })

  it('refuses a hooksPath that escapes, even though the loader already checked', async () => {
    const dir = cloneFixture('project-tree')
    await expect(applyDoctorFix(dir, { kind: 'hooksPath', value: '../../hooks' })).rejects.toThrow()
    // `config --get` exits 1 for a key that was never set — which is the point.
    expect(() => git(dir, 'config', '--get', 'core.hooksPath')).toThrow()
  })
})

describe('proposing a config from the repository', () => {
  it('infers requirements from the files that are already there', async () => {
    const dir = cloneFixture('project-tree')
    writeFileSync(join(dir, '.nvmrc'), 'v20.11.1\n')
    writeFileSync(join(dir, '.env.example'), 'A=1\n')
    rmSync(join(dir, '.env'))
    mkdirSync(join(dir, '.husky'), { recursive: true })

    const proposal = await suggestRepoConfig(dir)
    expect(proposal.version).toBe(1)
    expect(proposal.requires?.node).toBe('20.11.1')
    expect(proposal.requires?.hooksPath).toBe('.husky')
    expect(proposal.requires?.files).toEqual([{ path: '.env', from: '.env.example' }])
    // No .gitmodules and no LFS filter in this fixture — nothing invented.
    expect(proposal.requires?.submodules).toBeUndefined()
    expect(proposal.requires?.lfs).toBeUndefined()
  })

  it('proposes the hooks path the clone actually uses, not the directory name', async () => {
    const dir = cloneFixture('project-tree')
    mkdirSync(join(dir, '.husky', '_'), { recursive: true })
    // What husky v9 writes: an absolute path at `.husky/_`. Proposing `.husky`
    // from the directory alone would "fix" a working setup into a broken one.
    git(dir, 'config', 'core.hooksPath', join(dir, '.husky', '_'))
    expect((await suggestRepoConfig(dir)).requires?.hooksPath).toBe('.husky/_')
  })

  it('falls back to .husky only when nothing is configured', async () => {
    const dir = cloneFixture('project-tree')
    mkdirSync(join(dir, '.husky'), { recursive: true })
    expect((await suggestRepoConfig(dir)).requires?.hooksPath).toBe('.husky')
  })

  it('never writes another machine\'s absolute path into a shared file', async () => {
    const dir = cloneFixture('project-tree')
    git(dir, 'config', 'core.hooksPath', '/opt/somebody-elses/hooks')
    expect((await suggestRepoConfig(dir)).requires?.hooksPath).toBeUndefined()
  })

  it('leaves the .env requirement out when the file is already there', async () => {
    const dir = cloneFixture('project-tree')
    writeFileSync(join(dir, '.env.example'), 'A=1\n')
    // The fixture already ships a .env — nothing to propose.
    expect((await suggestRepoConfig(dir)).requires?.files).toBeUndefined()
  })

  it('lifts protected branches out of the per-clone git config', async () => {
    const dir = cloneFixture('project-tree')
    git(dir, 'config', 'gitcito.protectedbranches', 'main,release/3.x')
    expect((await suggestRepoConfig(dir)).protect).toContain('release/3.x')
  })

  it('reads the scopes the history is already using, ignoring one-offs', async () => {
    const dir = cloneFixture('project-tree')
    for (const subject of ['feat(ui): a', 'fix(ui): b', 'chore(build): c', 'docs(build): d', 'feat(once): e']) {
      git(dir, 'commit', '--allow-empty', '-m', subject)
    }
    const proposal = await suggestRepoConfig(dir)
    expect(proposal.commit?.scopes).toEqual(['build', 'ui'])
    expect(proposal.commit?.scopes).not.toContain('once')
  })

  it('turns on ticketFromBranch only when the history is full of ticket keys', async () => {
    const plain = cloneFixture('project-tree')
    expect((await suggestRepoConfig(plain)).commit?.ticketFromBranch).toBeUndefined()

    const ticketed = cloneFixture('project-tree')
    for (let i = 1; i <= 6; i++) git(ticketed, 'commit', '--allow-empty', '-m', `GC-${i}: work`)
    expect((await suggestRepoConfig(ticketed)).commit?.ticketFromBranch).toBe(true)
  })
})
