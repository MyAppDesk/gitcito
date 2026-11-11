import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gitCredentialEnv, GIT_PASSWORD_VAR } from '../src/main/gitCredentialEnv'

// Real git, no network: `git credential fill` asks the configured helpers, which
// is exactly what a fetch or push does before it talks to the host.
describe('profile credential handed to git through the environment', () => {
  let dir: string
  let env: NodeJS.ProcessEnv
  let storeFile: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitcito-credenv-'))
    storeFile = join(dir, 'stored-credentials')
    writeFileSync(storeFile, 'https://machine-user:machine-secret@github.com\nhttps://machine-user:machine-secret@gitlab.com\n')
    // "The machine": a global config whose helper holds another account.
    const globalConfig = join(dir, 'gitconfig')
    writeFileSync(globalConfig, `[credential]\n\thelper = store --file=${storeFile}\n`)
    env = { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const fill = (extra: NodeJS.ProcessEnv, host: string): Record<string, string> => {
    const out = execFileSync('git', ['credential', 'fill'], {
      input: `protocol=https\nhost=${host}\npath=acme/widgets.git\n\n`,
      env: { ...env, ...extra },
      encoding: 'utf8'
    })
    return Object.fromEntries(out.trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)))
  }

  it("answers with the profile's account, not the login the machine's helper holds", () => {
    const extra = gitCredentialEnv('https://github.com/acme/widgets.git', { username: 'oauth2', password: 'profile-pat' }, env)
    expect(extra).not.toBeNull()
    const cred = fill(extra!, 'github.com')
    expect(cred.username).toBe('oauth2')
    expect(cred.password).toBe('profile-pat')
  })

  it('applies to that host only: another host still gets the machine helper', () => {
    const extra = gitCredentialEnv('https://github.com/acme/widgets.git', { username: 'oauth2', password: 'profile-pat' }, env)
    const cred = fill(extra!, 'gitlab.com')
    expect(cred.password).toBe('machine-secret')
  })

  it('keeps the token out of the config and never lets a helper store it', () => {
    const extra = gitCredentialEnv('https://github.com/acme/widgets.git', { username: 'oauth2', password: 'profile-pat' }, env)!
    expect(Object.entries(extra).filter(([k]) => k.startsWith('GIT_CONFIG_')).map(([, v]) => v).join(' ')).not.toContain('profile-pat')
    expect(extra[GIT_PASSWORD_VAR]).toBe('profile-pat')
    // What git does after a successful push: offer the credential to every helper to keep.
    execFileSync('git', ['credential', 'approve'], {
      input: 'protocol=https\nhost=github.com\nusername=oauth2\npassword=profile-pat\n\n',
      env: { ...env, ...extra }
    })
    expect(readFileSync(storeFile, 'utf8')).not.toContain('profile-pat')
  })

  it('appends to config already passed through the environment instead of replacing it', () => {
    const extra = gitCredentialEnv('https://github.com/x.git', { username: 'u', password: 'p' }, { GIT_CONFIG_COUNT: '1' })!
    expect(extra.GIT_CONFIG_COUNT).toBe('3')
    expect(extra.GIT_CONFIG_KEY_1).toBe('credential.https://github.com.helper')
    expect(extra.GIT_CONFIG_KEY_0).toBeUndefined()
  })

  it('refuses what it cannot hand over safely', () => {
    const ok = { username: 'u', password: 'p' }
    expect(gitCredentialEnv('git@github.com:acme/x.git', ok)).toBeNull()
    expect(gitCredentialEnv('http://github.com/acme/x.git', ok)).toBeNull()
    expect(gitCredentialEnv('https://github.com/x.git', { username: 'u', password: 'p\nhost=evil' })).toBeNull()
    expect(gitCredentialEnv('https://github.com/x.git', { username: 'u', password: '' })).toBeNull()
  })

  it('keeps a non-default port in the scope', () => {
    const extra = gitCredentialEnv('https://git.example.com:8443/x.git', { username: 'u', password: 'p' }, {})!
    expect(extra.GIT_CONFIG_KEY_0).toBe('credential.https://git.example.com:8443.helper')
  })
})
