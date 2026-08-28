import { describe, it, expect, afterEach, vi } from 'vitest'
import { adoJson, azureAuth, githubCredentialMessage, providerBaseUrl } from '../src/main/hosting'
import { isJwt, parseCredential, providerOfHost } from '../src/main/credentials'

/** A JWT-shaped token — only the header/payload/signature *shape* is checked. */
const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJhZG8ifQ.c2ln'
const PAT = 'abcdefghijklmnopqrstuvwxyz234567'

function stubFetch(status: number, body: string | null, contentType = 'application/json'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType } }))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('azureAuth', () => {
  it('sends a PAT as Basic with an empty username', () => {
    expect(azureAuth(PAT)).toBe(`Basic ${Buffer.from(`:${PAT}`).toString('base64')}`)
  })

  it('sends an Entra ID access token as Bearer', () => {
    // Git Credential Manager hands out JWTs, not PATs. Basic-encoding one is
    // rejected by Azure DevOps.
    expect(azureAuth(JWT)).toBe(`Bearer ${JWT}`)
  })
})

describe('adoJson', () => {
  it('parses a normal JSON response', async () => {
    stubFetch(200, JSON.stringify({ value: [{ name: 'repo' }] }))
    await expect(adoJson<{ value: unknown[] }>('https://dev.azure.com/org/_apis/x', PAT)).resolves.toEqual({
      value: [{ name: 'repo' }]
    })
  })

  it('treats a 203 sign-in page as an auth failure, not a parse error', async () => {
    // Azure DevOps answers unauthenticated API calls with 203 + an HTML sign-in
    // page. res.ok is true for 203, so this used to surface as
    // "Unexpected token '<'" from JSON.parse instead of an auth error.
    stubFetch(203, '<!DOCTYPE html><html><body>Sign In</body></html>', 'text/html')
    await expect(adoJson('https://dev.azure.com/org/_apis/x', PAT)).rejects.toThrow(/rejected the credential/i)
  })

  it('surfaces the API message on a real error', async () => {
    stubFetch(404, JSON.stringify({ message: 'TF200016: project does not exist' }))
    await expect(adoJson('https://dev.azure.com/org/_apis/x', PAT)).rejects.toThrow(/TF200016/)
  })

  it('falls back to a status message when the error body is not JSON', async () => {
    stubFetch(500, 'upstream exploded', 'text/plain')
    await expect(adoJson('https://dev.azure.com/org/_apis/x', PAT)).rejects.toThrow(/500/)
  })

  it('accepts an empty body (204 No Content)', async () => {
    stubFetch(204, null)
    await expect(adoJson('https://dev.azure.com/org/_apis/x', PAT)).resolves.toBeUndefined()
  })
})

describe('providerBaseUrl', () => {
  it('keys Azure DevOps credentials per organization', () => {
    // Each org needs its own token, so they must not share a credential key.
    expect(providerBaseUrl('azure', 'contoso')).toBe('https://dev.azure.com/contoso')
    expect(providerBaseUrl('azure', 'fabrikam')).toBe('https://dev.azure.com/fabrikam')
  })

  it('uses the canonical host for the other providers', () => {
    expect(providerBaseUrl('github')).toBe('https://github.com')
    expect(providerBaseUrl('gitlab')).toBe('https://gitlab.com')
    expect(providerBaseUrl('bitbucket')).toBe('https://bitbucket.org')
  })
})

describe('parseCredential', () => {
  it('reads the username and password a helper printed', () => {
    expect(parseCredential('protocol=https\nhost=dev.azure.com\nusername=me\npassword=secret\n')).toEqual({
      username: 'me',
      password: 'secret'
    })
  })

  it('tolerates a password containing "="', () => {
    expect(parseCredential('password=a=b=c\n')).toEqual({ username: '', password: 'a=b=c' })
  })

  it('returns null when the helper knows nothing', () => {
    // A helper with no match echoes the request back, without a password.
    expect(parseCredential('protocol=https\nhost=dev.azure.com\n')).toBeNull()
  })

  it('strips carriage returns', () => {
    expect(parseCredential('username=me\r\npassword=secret\r\n')).toEqual({ username: 'me', password: 'secret' })
  })
})

describe('isJwt', () => {
  it('recognises an access token', () => {
    expect(isJwt(JWT)).toBe(true)
  })

  it('does not mistake a PAT for one', () => {
    expect(isJwt(PAT)).toBe(false)
    expect(isJwt('ghp_abcdef')).toBe(false)
    expect(isJwt('')).toBe(false)
  })
})

describe('providerOfHost', () => {
  it('maps the cloud hosts', () => {
    expect(providerOfHost('github.com')).toBe('github')
    expect(providerOfHost('dev.azure.com')).toBe('azure')
    expect(providerOfHost('contoso.visualstudio.com')).toBe('azure')
    expect(providerOfHost('gitlab.com')).toBe('gitlab')
    expect(providerOfHost('bitbucket.org')).toBe('bitbucket')
  })

  it('does not claim an unrelated host', () => {
    expect(providerOfHost('git.example.com')).toBeUndefined()
  })
})

describe('GitHub credential guidance', () => {
  it('distinguishes a missing GitHub CLI', () => {
    expect(githubCredentialMessage('missing')).toContain('GitHub CLI (gh) is not installed')
    expect(githubCredentialMessage('missing')).toContain('gh auth login')
  })

  it('distinguishes an installed but signed-out GitHub CLI', () => {
    expect(githubCredentialMessage('signed-out')).toContain('installed but not authenticated')
    expect(githubCredentialMessage('signed-out')).toContain('gh auth login')
  })

  it('explains when gh is authenticated but not wired into Git', () => {
    expect(githubCredentialMessage('authenticated')).toContain('gh auth setup-git')
  })

  it('does not claim a signed-out CLI when the probe merely timed out', () => {
    const msg = githubCredentialMessage('unknown')
    expect(msg).toContain('timed out')
    expect(msg).not.toContain('not authenticated')
    expect(msg).not.toContain('not installed')
  })
})
