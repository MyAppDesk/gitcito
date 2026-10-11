import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The credential helper is mocked here, not run for real: the behaviour under
 * test is how often Gitcito *asks* git, and a real osxkeychain would raise the
 * very dialog this suite exists to keep quiet.
 */
type ExecCallback = (err: (Error & { killed?: boolean }) | null, stdout: string) => void
interface Spawn {
  args: string[]
  input: string
  answer: ExecCallback
}

const spawns: Spawn[] = []

vi.mock('child_process', () => ({
  execFile: (_cmd: string, args: string[], _opts: unknown, cb: ExecCallback) => {
    const spawn: Spawn = { args, input: '', answer: cb }
    spawns.push(spawn)
    return { stdin: { end: (input: string) => (spawn.input = input) } }
  }
}))

const { credentialFor, clearCredentialCache } = await import('../src/main/credentials')

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
