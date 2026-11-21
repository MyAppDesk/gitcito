import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { chatCompleteJson } from '../src/main/ai'
import { runCliModel, signInSubscription, testSubscription } from '../src/main/aiCli'
import { migrateAIConfig, newAccount, resolveAI } from '../src/shared/aiAccounts'
import { defaultAIConfig } from '../src/shared/types'

describe.skipIf(process.platform === 'win32')('subscription CLI connections', () => {
  let root: string
  beforeAll(async () => { root = await mkdtemp(join(tmpdir(), 'gitcito-test-cli-')) })
  afterAll(async () => { await rm(root, { recursive: true, force: true }) })

  async function cli(name: string, body: string): Promise<string> {
    const file = join(root, name)
    await writeFile(file, '#!/bin/sh\n' + body, { mode: 0o700 })
    return file
  }

  it('sends only the probe in an empty directory', async () => {
    const file = await cli('codex', `if [ "$1" = login ]; then echo "Logged in using ChatGPT" >&2; exit; fi
[ -z "$(ls -A)" ] && [ "$(cat)" = "Reply with exactly OK." ] && echo OK`)
    expect(await testSubscription('codex', file)).toBe('connected')
  })

  it('uses the signed-in CLI’s default model for a structured feature request', async () => {
    const file = await cli('claude', `if [ "$1" = auth ]; then echo '{"loggedIn":true,"authMethod":"claude.ai"}'; exit; fi
for arg in "$@"; do [ "$arg" != "--model" ] || exit 1; done
printf '%s' '${JSON.stringify({ result: JSON.stringify({ summary: 'Update handbook' }) })}'`)
    const ai = defaultAIConfig()
    const account = { ...newAccount(ai.accounts, 'cli'), subscription: true, cliPath: file }
    const cfg = resolveAI({ ...ai, accounts: [account], defaultAccountId: account.id })
    const result = await chatCompleteJson(cfg, [{ role: 'user', content: 'Draft a summary' }], 'commitMessage', {
      name: 'commit_message', schema: { type: 'object' }, validate: () => []
    })
    expect(result).toEqual({ summary: 'Update handbook' })
  })

  it('completes provider-owned sign-in and reuses an existing session', async () => {
    const state = join(root, 'signed-in')
    const file = await cli('sign-in', `if [ "$1" = auth ] && [ "$2" = status ]; then
  if [ -f '${state}' ]; then echo '{"loggedIn":true,"authMethod":"claude.ai"}'; else exit 1; fi
else
  echo login >> '${state}'
fi`)
    expect(await signInSubscription('claude', file, new AbortController().signal)).toBe('connected')
    // A second connection must only check the session, without starting login.
    await writeFile(state, 'existing session')
    expect(await signInSubscription('claude', file, new AbortController().signal)).toBe('connected')
    expect(await readFile(state, 'utf8')).toBe('existing session')
  })

  it('cancels a pending browser sign-in', async () => {
    const ready = join(root, 'login-ready')
    const file = await cli('waiting', `if [ "$1" = auth ] && [ "$2" = status ]; then exit 1; fi
touch '${ready}'
read answer`)
    const controller = new AbortController()
    const result = signInSubscription('claude', file, controller.signal)
    try {
      await vi.waitFor(() => expect(existsSync(ready)).toBe(true), { timeout: 2000 })
    } finally {
      controller.abort()
    }
    expect(await result).toBe('failed')
  })

  it('reports missing executables, expired sessions and exhausted plans', async () => {
    expect(await testSubscription('codex', join(root, 'missing'))).toBe('missing')
    expect(await testSubscription('claude', await cli('expired', 'exit 1'))).toBe('login')
    const file = await cli('limited', `if [ "$1" = auth ]; then echo '{"loggedIn":true,"authMethod":"claude.ai"}'; exit; fi
echo "usage limit reached" >&2; exit 1`)
    expect(await testSubscription('claude', file)).toBe('limit')
  })

  it('uses subscription credentials when the app inherits API credentials', async () => {
    const file = await cli('inherited-key', `[ -z "$ANTHROPIC_API_KEY$ANTHROPIC_AUTH_TOKEN$OPENAI_API_KEY$CODEX_API_KEY" ] || exit 2
if [ "$1" = login ]; then echo "Logged in using ChatGPT"; else echo OK; fi`)
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    try {
      expect(await testSubscription('codex', file)).toBe('connected')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('preserves routing on reload and refuses a later switch to API billing', async () => {
    const ai = defaultAIConfig()
    const account = { ...newAccount(ai.accounts, 'cli'), cli: 'codex' as const, subscription: true,
      cliPath: await cli('api-billing', 'echo "Logged in using an API key"') }
    ai.accounts.push(account)
    ai.assignments.chat = { accountId: account.id, model: '' }
    const restored = migrateAIConfig(JSON.parse(JSON.stringify(ai)))
    expect(resolveAI(restored, 'commit').accountId).toBe(ai.defaultAccountId)
    const chat = resolveAI(restored, 'chat')
    expect(chat.subscription).toBe(true)
    expect(await testSubscription('codex', account.cliPath)).toBe('login')
    await expect(runCliModel(chat, [{ role: 'user', content: 'Hello' }])).rejects.toThrow('codex login')
  })
})
