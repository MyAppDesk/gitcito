import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The credential helper is mocked here, not run for real: the behaviour under
 * test is how often Gitcito *asks* git, and a real osxkeychain would raise the
 * very dialog this suite exists to keep quiet.
 */
type ExecCallback = (err: (Error & { killed?: boolean }) | null, stdout: string) => void
interface Spawn {
  cmd: string
  env?: NodeJS.ProcessEnv
  args: string[]
  input: string
  answer: ExecCallback
}

const spawns: Spawn[] = []

vi.mock('child_process', () => ({
  execFile: (cmd: string, args: string[], opts: { env?: NodeJS.ProcessEnv }, cb: ExecCallback) => {
    const spawn: Spawn = { cmd, env: opts?.env, args, input: '', answer: cb }
    spawns.push(spawn)
    // `on` because the caller guards stdin against EPIPE, as on any real stream.
    return { stdin: { on: () => undefined, end: (input: string) => (spawn.input = input) } }
  }
}))

const { apiToken, credentialFor, clearCredentialCache } = await import('../src/main/credentials')

const URL = 'https://github.com/acme/widgets.git'
const FIVE_MINUTES = 5 * 60 * 1000

const fills = (): Spawn[] => spawns.filter((s) => s.args.includes('fill'))
const answerOk = (s: Spawn): void => s.answer(null, 'protocol=https\nhost=github.com\nusername=me\npassword=tok\n')
const answerTimeout = (s: Spawn): void => s.answer(Object.assign(new Error('timed out'), { killed: true }), '')
const answerFailed = (s: Spawn): void => s.answer(Object.assign(new Error('exit 1'), { killed: false }), '')

/** Let the promise chain between `credentialFor` and the spawn settle. */
const flush = (): Promise<void> => new Promise((r) => setImmediate(r))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  spawns.length = 0
  clearCredentialCache()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('credentialFor — background polling', () => {
  it('shares one git process between concurrent background callers', async () => {
    const calls = [credentialFor(URL), credentialFor(URL), credentialFor(URL), credentialFor(URL)]
    await flush()
    expect(fills()).toHaveLength(1)

    answerOk(fills()[0])
    const results = await Promise.all(calls)
    expect(results.every((c) => c?.password === 'tok')).toBe(true)
    expect(fills()).toHaveLength(1)
  })

  it('does not retry a timed-out background lookup, even after the cache expires', async () => {
    const first = credentialFor(URL)
    await flush()
    answerTimeout(fills()[0])
    expect(await first).toBeNull()

    vi.setSystemTime(Date.now() + FIVE_MINUTES + 1)
    expect(await credentialFor(URL)).toBeNull()
    await flush()
    expect(fills()).toHaveLength(1)
  })

  it('still runs an interactive lookup for a blocked key, and a success lifts the block', async () => {
    const background = credentialFor(URL)
    await flush()
    answerTimeout(fills()[0])
    await background

    const interactive = credentialFor(URL, { interactive: true })
    await flush()
    expect(fills()).toHaveLength(2)
    expect(fills()[1].args).not.toContain('credential.interactive=false')
    answerOk(fills()[1])
    expect((await interactive)?.password).toBe('tok')

    // Unblocked: once the fresh credential expires, background polling asks again.
    vi.setSystemTime(Date.now() + FIVE_MINUTES + 1)
    const later = credentialFor(URL)
    await flush()
    expect(fills()).toHaveLength(3)
    answerOk(fills()[2])
    expect((await later)?.password).toBe('tok')
  })

  it('retries a plain failure once the cache expires', async () => {
    const first = credentialFor(URL)
    await flush()
    answerFailed(fills()[0])
    expect(await first).toBeNull()

    // Inside the TTL the cached miss is honoured.
    expect(await credentialFor(URL)).toBeNull()
    expect(fills()).toHaveLength(1)

    vi.setSystemTime(Date.now() + FIVE_MINUTES + 1)
    const retry = credentialFor(URL)
    await flush()
    expect(fills()).toHaveLength(2)
    answerOk(fills()[1])
    expect((await retry)?.password).toBe('tok')
  })

  it('drops in-flight lookups on clearCredentialCache', async () => {
    const stale = credentialFor(URL)
    await flush()
    clearCredentialCache()

    const fresh = credentialFor(URL)
    await flush()
    expect(fills()).toHaveLength(2)

    // The stale lookup timing out must not block the key for the fresh one.
    answerTimeout(fills()[0])
    await stale
    answerOk(fills()[1])
    expect((await fresh)?.password).toBe('tok')
    expect(await credentialFor(URL)).not.toBeNull()
  })
})

describe('apiToken — one account per profile', () => {
  const ghCalls = (): Spawn[] => spawns.filter((s) => s.cmd === 'gh')

  it("uses the profile's token without asking git or gh", async () => {
    expect(await apiToken(URL, { token: ' pat ' })).toEqual({ token: 'pat', source: 'token' })
    expect(spawns).toHaveLength(0)
  })

  it('does not borrow a machine login for a profile that has not linked one', async () => {
    // This was the bug: every profile showed the same gh / helper account.
    expect(await apiToken(URL, {})).toBeNull()
    expect(spawns).toHaveLength(0)
  })

  it("asks gh for the linked account by name, so two profiles get two accounts", async () => {
    const work = apiToken(URL, { link: { source: 'gh', login: 'starley-work' } })
    const home = apiToken(URL, { link: { source: 'gh', login: 'StarleyDev' } })
    await flush()
    expect(ghCalls().map((c) => c.args)).toEqual([
      ['auth', 'token', '--hostname', 'github.com', '--user=starley-work'],
      ['auth', 'token', '--hostname', 'github.com', '--user=StarleyDev']
    ])
    ghCalls()[0].answer(null, 'gho_work\n')
    ghCalls()[1].answer(null, 'gho_home\n')
    expect(await work).toEqual({ token: 'gho_work', source: 'gh', login: 'starley-work' })
    expect(await home).toEqual({ token: 'gho_home', source: 'gh', login: 'StarleyDev' })
  })

  it("asks git's helper for the linked username, cached apart from other accounts", async () => {
    const a = apiToken(URL, { link: { source: 'git', login: 'alice' } })
    const b = apiToken(URL, { link: { source: 'git', login: 'bob' } })
    await flush()
    expect(fills()).toHaveLength(2)
    expect(fills()[0].input).toContain('username=alice\n')
    expect(fills()[1].input).toContain('username=bob\n')
    fills()[0].answer(null, 'protocol=https\nhost=github.com\nusername=alice\npassword=ta\n')
    fills()[1].answer(null, 'protocol=https\nhost=github.com\nusername=bob\npassword=tb\n')
    expect(await a).toMatchObject({ token: 'ta', source: 'git', login: 'alice' })
    expect(await b).toMatchObject({ token: 'tb', source: 'git', login: 'bob' })
  })

  it('a sign-in looks for a login to link: the helper silently, then the active gh account', async () => {
    const pending = apiToken(URL, {}, { interactive: true })
    await flush()
    expect(fills()[0].env?.GCM_INTERACTIVE).toBe('never')
    answerFailed(fills()[0])
    await flush()
    expect(ghCalls()[0].args).toEqual(['auth', 'token', '--hostname', 'github.com'])
    ghCalls()[0].answer(null, 'gho_cli\n')
    expect(await pending).toEqual({ token: 'gho_cli', source: 'gh' })
  })

  it("then the helper's own login window — and git never prompts on a terminal", async () => {
    const pending = apiToken(URL, {}, { interactive: true })
    await flush()
    answerFailed(fills()[0])
    await flush()
    ghCalls()[0].answer(Object.assign(new Error('not logged in'), { killed: false }), '')
    await flush()
    const interactive = fills()[1]
    expect(interactive.env?.GIT_TERMINAL_PROMPT).toBe('0')
    expect(interactive.env?.GCM_INTERACTIVE).toBeUndefined()
    answerOk(interactive)
    expect(await pending).toMatchObject({ token: 'tok', source: 'git', login: 'me' })
  })

  it('sees a `gh auth switch` after its short cache, and shares one gh process meanwhile', async () => {
    const link = { source: 'gh' as const, login: 'StarleyDev' }
    const first = apiToken(URL, { link })
    const second = apiToken(URL, { link })
    await flush()
    expect(ghCalls()).toHaveLength(1)
    ghCalls()[0].answer(null, 'gho_old\n')
    expect(await first).toMatchObject({ token: 'gho_old' })
    expect(await second).toMatchObject({ token: 'gho_old' })

    vi.setSystemTime(Date.now() + 20_000)
    expect(await apiToken(URL, { link })).toMatchObject({ token: 'gho_old' })
    expect(ghCalls()).toHaveLength(1)

    vi.setSystemTime(Date.now() + 15_000)
    const later = apiToken(URL, { link })
    await flush()
    expect(ghCalls()).toHaveLength(2)
    ghCalls()[1].answer(null, 'gho_new\n')
    expect(await later).toMatchObject({ token: 'gho_new' })
  })

  it('refuses a linked login that would add fields to the credential protocol', async () => {
    // Links travel with imported settings: "x\nhost=…" must not make the helper
    // answer for another host, whose secret would then go to this host's API.
    expect(await apiToken(URL, { link: { source: 'git', login: 'me\nhost=gitlab.example.com' } })).toBeNull()
    expect(await apiToken(URL, { link: { source: 'gh', login: '--hostname=evil.example.com' } })).toBeNull()
    expect(spawns).toHaveLength(0)
  })

  it('never reaches for gh on a host that is not GitHub', async () => {
    expect(await apiToken('https://gitlab.com/acme/widgets.git', { link: { source: 'gh', login: 'x' } })).toBeNull()
    const pending = apiToken('https://gitlab.com/acme/widgets.git', {}, { interactive: true })
    await flush()
    answerFailed(fills()[0])
    await flush()
    answerFailed(fills()[1])
    expect(await pending).toBeNull()
    expect(ghCalls()).toHaveLength(0)
  })
})
