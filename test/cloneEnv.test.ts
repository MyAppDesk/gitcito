import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cloneGit, gitService, noPromptEnv } from '../src/main/git'
import { cloneFixture, cleanupFixtures } from './fixtures'

/**
 * simple-git 4 drops the git-related variables a clone inherits, and throws on
 * one handed to it explicitly unless it is allowed by name. A signed-in clone
 * hands over the whole environment plus the credential, so any EDITOR, PAGER or
 * GIT_* the app was started with made it fail before git ran. These shells are
 * ordinary: an editor's terminal exports GIT_EDITOR, many profiles set PAGER.
 */
const SHELLS: Record<string, NodeJS.ProcessEnv> = {
  clean: {},
  'an editor terminal': { GIT_EDITOR: 'code --wait', EDITOR: 'vim', PAGER: 'less' },
  'a custom ssh key': { GIT_SSH_COMMAND: 'ssh -i ~/.ssh/work' }
}

const saved = { ...process.env }
const tmp: string[] = []
const scratch = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'clone-env-'))
  tmp.push(d)
  return d
}

afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
  Object.assign(process.env, saved)
})

afterAll(() => {
  for (const d of tmp) rmSync(d, { recursive: true, force: true })
  cleanupFixtures()
})

describe('a signed-in clone, whatever the app was started with', () => {
  let server: Server
  let port = 0
  const received: string[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      const auth = req.headers.authorization
      received.push(auth ? Buffer.from(auth.replace(/^Basic /, ''), 'base64').toString() : '')
      // Challenge, then refuse: git stops either way, after showing what it sent.
      res.writeHead(auth ? 403 : 401, auth ? {} : { 'WWW-Authenticate': 'Basic realm="test"' })
      res.end()
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  for (const [name, shell] of Object.entries(SHELLS)) {
    it(`reaches the server with the profile's credential — ${name}`, async () => {
      Object.assign(process.env, shell)
      received.length = 0
      // The shape gitCredentialEnv produces, for http: it only builds one for https.
      const key = `credential.http://127.0.0.1:${port}.helper`
      const cred = {
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: key,
        GIT_CONFIG_VALUE_0: '',
        GIT_CONFIG_KEY_1: key,
        GIT_CONFIG_VALUE_1: `!f() { test "$1" = get || exit 0; printf 'username=%s\\npassword=%s\\n' "$CT_U" "$CT_P"; }; f`,
        CT_U: 'pat',
        CT_P: 'secret'
      }
      const err = await cloneGit(scratch(), { ...noPromptEnv(), ...cred })
        .clone(`http://127.0.0.1:${port}/repo.git`, 'repo')
        .then(() => null, (e: Error) => e)
      // git fails on the 403; simple-git must not have refused to start it.
      expect(err?.message ?? '').not.toMatch(/environment guard|allowEnvironment|allowUnsafe/i)
      expect(received).toContain('pat:secret')
    })
  }
})

describe('a plain clone keeps working with those shells', () => {
  for (const [name, shell] of Object.entries(SHELLS)) {
    it(`clones a local repository — ${name}`, async () => {
      Object.assign(process.env, shell)
      const source = cloneFixture('absorb')
      const target = await gitService.clone(scratch(), source, 'copy')
      expect(existsSync(join(target, '.git'))).toBe(true)
    })
  }
})
