import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { execFile } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import { basicAuthFor } from '../src/main/git'

// An Azure DevOps PAT used to be handed to git with an EMPTY username. Git then
// never sends the password at all — the request goes out without an
// Authorization header and git reports "Authentication failed", although the
// token is valid. A local server shows what git really sends.
describe('Azure DevOps credentials', () => {
  let server: Server
  let port = 0
  const received: string[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      const auth = req.headers.authorization
      received.push(auth ? Buffer.from(auth.replace(/^Basic /, ''), 'base64').toString() : '')
      // Challenge first, as Azure does; refuse after, so git stops either way.
      res.writeHead(auth ? 403 : 401, auth ? {} : { 'WWW-Authenticate': 'Basic realm="test"' })
      res.end()
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  /** What git sent when its credential helper answered with `cred`. */
  const sentBy = (cred: { username: string; password: string }): Promise<string[]> => {
    received.length = 0
    const helper = `!f() { test "$1" = get && printf 'username=%s\\npassword=%s\\n' '${cred.username}' '${cred.password}'; }; f`
    return new Promise((resolve) =>
      execFile(
        'git',
        ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`, 'ls-remote', `http://127.0.0.1:${port}/repo`],
        { env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '' }, timeout: 15000 },
        () => resolve([...received])
      )
    )
  }

  it('never gives git an empty username for a PAT', () => {
    expect(basicAuthFor('azure', 'tok', 'https://dev.azure.com/org/proj/_git/repo')).toEqual({ username: 'pat', password: 'tok' })
  })

  it("uses the username Azure wrote into the remote URL when there is one", () => {
    expect(basicAuthFor('azure', 'tok', 'https://example-org@dev.azure.com/example-org/project/_git/repo')).toEqual({
      username: 'example-org',
      password: 'tok'
    })
  })

  it('so git actually sends the token', async () => {
    const cred = basicAuthFor('azure', 'SECRET', 'https://dev.azure.com/org/proj/_git/repo')!
    expect(await sentBy(cred)).toContain('pat:SECRET')
  })

  it('whereas with an empty username git sends no credentials at all (the old behaviour)', async () => {
    expect(await sentBy({ username: '', password: 'SECRET' })).not.toContain(':SECRET')
  })
})
