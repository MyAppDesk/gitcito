import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { activeProfileAuth, readSettings } from '../src/main/settings'
import { providerOfHost } from '../src/main/credentials'
import { parseRemoteUrl } from '../src/main/hosting'
import { basicAuthFor } from '../src/main/git'
import { forgejoCompareUrl, mapForgejoPull } from '../src/main/forgejo'
import { extractSecrets, stripSettingsSecrets } from '../src/shared/secrets'
import { forgejoInstanceOf, forgejoTokenUrl, remoteIsOnForgejo } from '../src/shared/gitlabInstance'
import { defaultSettings } from '../src/shared/types'

const FJ = 'https://git.example.org'

describe('Forgejo instance matching', () => {
  it('takes owner/repo on the configured instance only', () => {
    expect(forgejoInstanceOf('https://git.example.org/me/app.git', [FJ])).toEqual({ base: FJ, path: 'me/app' })
    expect(forgejoInstanceOf('ssh://git@git.example.org:2222/me/app.git', [FJ])).toEqual({ base: FJ, path: 'me/app' })
    // Forgejo has no subgroups: a deeper path is not a repository URL.
    expect(forgejoInstanceOf('https://git.example.org/me/app/extra.git', [FJ])).toBeNull()
    expect(forgejoInstanceOf('https://other.example.org/me/app.git', [FJ])).toBeNull()
  })

  it('has no default instance', () => {
    expect(remoteIsOnForgejo('https://codeberg.org/me/app.git', null)).toBe(false)
    expect(forgejoTokenUrl('')).toBeNull()
    expect(forgejoTokenUrl('git.example.org')).toBe(`${FJ}/user/settings/applications`)
  })
})

describe('Forgejo API mapping', () => {
  it('maps a pull into the shared PR shape, reading drafts from either marker', () => {
    const base = { number: 7, html_url: `${FJ}/me/app/pulls/7`, user: { login: 'ana' }, head: { ref: 'feat', sha: 'abc' }, base: { ref: 'main' } }
    expect(mapForgejoPull({ ...base, title: 'Add x' })).toEqual({
      id: 7,
      title: 'Add x',
      author: 'ana',
      sourceBranch: 'feat',
      targetBranch: 'main',
      url: `${FJ}/me/app/pulls/7`,
      isDraft: false,
      headSha: 'abc'
    })
    expect(mapForgejoPull({ ...base, title: 'WIP: Add x' }).isDraft).toBe(true)
    expect(mapForgejoPull({ ...base, title: 'Add x', draft: true }).isDraft).toBe(true)
  })

  it('builds the compare page and sends the token as the password', () => {
    expect(forgejoCompareUrl(FJ, 'me', 'app', 'main', 'feat/x')).toBe(`${FJ}/me/app/compare/main...feat%2Fx`)
    expect(basicAuthFor('forgejo', ' tok ')).toEqual({ username: 'oauth2', password: 'tok' })
  })
})

describe('Forgejo token storage', () => {
  it('is a secret: kept out of the settings JSON and out of exports', () => {
    const s = defaultSettings()
    const settings = { ...s, profiles: [{ ...s.profiles[0], forgejoToken: 'fj-secret' }] }
    expect(extractSecrets(settings)[settings.profiles[0].id]?.forgejoToken).toBe('fj-secret')
    expect(stripSettingsSecrets(settings).profiles[0].forgejoToken).toBe('')
  })
})

describe('Forgejo credentials stay on their own instance', () => {
  const dirs: string[] = []
  afterEach(() => {
    vi.restoreAllMocks()
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  async function withProfile(forgejoUrl?: string): Promise<void> {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-fj-'))
    dirs.push(dir)
    vi.spyOn(app, 'getPath').mockReturnValue(dir)
    const s = defaultSettings()
    const profile = { ...s.profiles[0], forgejoUrl, links: { forgejo: { source: 'git' as const, login: 'me' } } }
    writeFileSync(join(dir, 'gitcito-settings.json'), JSON.stringify({ ...s, onboardingCompleted: true, profiles: [profile] }))
    await readSettings()
  }

  it('recognises the configured server and resolves the credential only there', async () => {
    await withProfile('git.example.org')
    expect(providerOfHost('git.example.org')).toBe('forgejo')
    expect(parseRemoteUrl('git@git.example.org:me/app.git')).toMatchObject({ provider: 'forgejo', owner: 'me', repo: 'app', base: FJ })
    expect((await activeProfileAuth('forgejo', 'https://git.example.org/me/app.git')).link?.login).toBe('me')
    expect(await activeProfileAuth('forgejo', 'https://codeberg.org/me/app.git')).toEqual({})
  })

  it('a profile without an address has no Forgejo credential at all', async () => {
    await withProfile(undefined)
    expect(await activeProfileAuth('forgejo')).toEqual({})
    expect(providerOfHost('git.example.org')).toBeUndefined()
  })
})
