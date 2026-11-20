import { applySecrets, extractSecrets, stripSettingsSecrets } from '../src/shared/secrets'
import { editInstance } from '../src/shared/gitlabInstance'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { activeProfileAuth, boundProfileAuth, profileGitlabInstance, readSettings } from '../src/main/settings'
import { providerOfHost } from '../src/main/credentials'
import { parseRemoteUrl } from '../src/main/hosting'
import { defaultSettings } from '../src/shared/types'

/**
 * A GitLab token (or link) belongs to one instance. These run against a real
 * settings file: the rule lives in settings.profileAuth, the one place every
 * push, clone and hosting call resolves a profile's GitLab credential.
 */
const dirs: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

async function withProfiles(profiles: Array<{ id: string; gitlabUrl?: string }>, repoProfiles = {}): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'gitcito-gl-'))
  dirs.push(dir)
  vi.spyOn(app, 'getPath').mockReturnValue(dir)
  const base = defaultSettings()
  const settings = {
    ...base,
    onboardingCompleted: true,
    activeProfileId: profiles[0].id,
    repoProfiles,
    profiles: profiles.map((p) => ({
      ...base.profiles[0],
      id: p.id,
      name: p.id,
      gitlabUrl: p.gitlabUrl,
      links: { gitlab: { source: 'git', login: `${p.id}-user` } }
    }))
  }
  writeFileSync(join(dir, 'gitcito-settings.json'), JSON.stringify(settings))
  await readSettings() // refreshes the known-instance registry, as the app's first read does
}

const SELF_REMOTE = 'https://git.example.org/team/app.git'
const COM_REMOTE = 'https://gitlab.com/team/app.git'

describe('GitLab credentials stay on their own instance', () => {
  it('a gitlab.com profile gives nothing to a self-managed remote', async () => {
    await withProfiles([{ id: 'personal' }, { id: 'work', gitlabUrl: 'git.example.org' }])
    expect(await activeProfileAuth('gitlab', SELF_REMOTE)).toEqual({})
    expect((await activeProfileAuth('gitlab', COM_REMOTE)).link?.login).toBe('personal-user')
  })

  it('a self-managed profile gives nothing to gitlab.com', async () => {
    await withProfiles([{ id: 'work', gitlabUrl: 'https://git.example.org' }])
    expect(await activeProfileAuth('gitlab', COM_REMOTE)).toEqual({})
    expect((await activeProfileAuth('gitlab', SELF_REMOTE)).link?.login).toBe('work-user')
    expect(await profileGitlabInstance()).toBe('https://git.example.org')
  })

  it('a repository bound to the self-managed profile resolves it there', async () => {
    await withProfiles([{ id: 'personal' }, { id: 'work', gitlabUrl: 'git.example.org' }], { '/r': 'work' })
    expect((await boundProfileAuth('gitlab', '/r', SELF_REMOTE))?.link?.login).toBe('work-user')
    expect(await boundProfileAuth('gitlab', '/r', COM_REMOTE)).toEqual({})
  })

  it('recognises a configured instance as GitLab, and only that one', async () => {
    await withProfiles([{ id: 'work', gitlabUrl: 'git.example.org' }])
    expect(providerOfHost('git.example.org')).toBe('gitlab')
    expect(providerOfHost('other.example.org')).toBeUndefined()
    expect(parseRemoteUrl('git@git.example.org:team/sub/app.git')).toMatchObject({
      provider: 'gitlab',
      owner: 'team/sub',
      repo: 'app',
      base: 'https://git.example.org'
    })
  })
})

describe.each(['gitlab', 'forgejo'] as const)('%s token issuer', (provider) => {
  it('does not transfer a credential through an address edit or an address-only import', () => {
    const settings = defaultSettings()
    const address = `${provider}Url` as const
    const field = `${provider}Token` as const
    const issuer = `${provider}TokenIssuer` as const
    const profile = { ...settings.profiles[0], [address]: 'https://one.example', [issuer]: 'https://one.example', [field]: 'sample' }
    settings.profiles = [profile]
    const saved = extractSecrets(settings)
    const plain = stripSettingsSecrets(settings)
    expect(applySecrets(plain, saved).profiles[0][field]).toBe('sample')
    expect({ ...profile, ...editInstance(profile, provider, 'https://two.example') }[field]).toBe('')
    plain.profiles[0][address] = 'https://two.example'
    expect(applySecrets(plain, saved).profiles[0][field]).toBe('')
    expect(extractSecrets({ ...settings, profiles: [{ ...profile, [address]: 'https://two.example' }] })).toEqual({})
  })
})

it('restores a pre-instance GitLab token only on gitlab.com', () => {
  const settings = defaultSettings()
  const store = { [settings.profiles[0].id]: { gitlabToken: 'legacy' } }
  expect(applySecrets(settings, store).profiles[0].gitlabToken).toBe('legacy')
  settings.profiles[0].gitlabUrl = 'https://other.example'
  expect(applySecrets(settings, store).profiles[0].gitlabToken).toBe('')
})
