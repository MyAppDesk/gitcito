import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { AIConfig } from '../src/shared/types'
import { assertKeyTransport, callModel, isLocal } from '../src/main/aiTransport'

/** Only the fields the transport reads; the rest of AIConfig is feature styling. */
const cfg = (over: Partial<AIConfig>): AIConfig =>
  ({ provider: 'custom', endpoint: '', apiKey: '', model: 'test-model', ...over }) as AIConfig

describe('isLocal — this machine only', () => {
  it('knows the loopback forms', () => {
    for (const url of [
      'http://localhost:11434/v1',
      'http://LOCALHOST/v1',
      'http://ollama.localhost/v1',
      'http://127.0.0.1:8080',
      'http://127.1.2.3/v1',
      'http://[::1]:11434/v1',
      'http://0.0.0.0:8000'
    ]) {
      expect(isLocal(url), url).toBe(true)
    }
  })

  it('does not mistake other hosts for this machine', () => {
    for (const url of [
      'http://192.168.0.10:11434/v1',
      'http://ai.intranet/v1',
      'http://localhost.attacker.test/v1',
      'http://127.0.0.1.attacker.test/v1',
      'https://api.openai.com/v1',
      'not a url'
    ]) {
      expect(isLocal(url), url).toBe(false)
    }
  })
})

describe('an API key never travels over plaintext http off this machine', () => {
  it('refuses a key to a remote http:// endpoint, naming the host', () => {
    expect(() => assertKeyTransport(cfg({ apiKey: 'sk-secret' }), 'http://ai.intranet:8080/v1')).toThrow(
      /ai\.intranet:8080.*http:\/\//
    )
  })

  it('lets https, loopback, and keyless calls through', () => {
    expect(() => assertKeyTransport(cfg({ apiKey: 'sk-secret' }), 'https://ai.intranet/v1')).not.toThrow()
    expect(() => assertKeyTransport(cfg({ apiKey: 'sk-secret' }), 'http://localhost:11434/v1')).not.toThrow()
    // A LAN Ollama without a key has nothing to leak.
    expect(() => assertKeyTransport(cfg({ apiKey: '' }), 'http://192.168.0.10:11434/v1')).not.toThrow()
    expect(() => assertKeyTransport(cfg({ apiKey: '   ' }), 'http://192.168.0.10:11434/v1')).not.toThrow()
  })
})

describe('callModel — the guard sits on the real request path', () => {
  let server: Server
  let port = 0
  const seen: string[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      seen.push(req.headers.authorization ?? '')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it('sends nothing when the endpoint is remote and plaintext', async () => {
    seen.length = 0
    // Unroutable on purpose: if the guard failed, the call would hang or fail
    // with a network error instead of the refusal.
    const call = callModel(cfg({ apiKey: 'sk-secret', endpoint: 'http://10.255.255.1:9/v1' }), [{ role: 'user', content: 'hi' }], 0)
    await expect(call).rejects.toThrow(/Refusing to send the API key/)
    expect(seen).toEqual([])
  })

  it('still talks to a local endpoint, key included', async () => {
    seen.length = 0
    const reply = await callModel(
      cfg({ apiKey: 'sk-secret', endpoint: `http://127.0.0.1:${port}/v1` }),
      [{ role: 'user', content: 'hi' }],
      0
    )
    expect(reply.text).toBe('ok')
    expect(seen).toEqual(['Bearer sk-secret'])
  })
})
