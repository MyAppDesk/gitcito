import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatCompleteJson, validateJsonReply } from '../src/main/ai'
import { migrateAIConfig } from '../src/shared/aiAccounts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI JSON validation', () => {
  it('awaits an asynchronous semantic validator', async () => {
    const result = await validateJsonReply<{ value: string }>('{"value":"x"}', {
      name: 'async_test',
      schema: { type: 'object' },
      validate: async (value) =>
        (value as { value?: string }).value === 'x' ? [] : ['value must be x']
    })
    expect(result).toEqual({ value: { value: 'x' }, errors: [] })
  })

  it('returns parse errors without invoking semantic validation', async () => {
    let called = false
    const result = await validateJsonReply('not json', {
      name: 'parse_test',
      schema: {},
      validate: () => {
        called = true
        return []
      }
    })
    expect(called).toBe(false)
    expect(result.errors[0]).toContain('not valid JSON')
  })

  it('accepts valid JSON after a self-hosted model think block', async () => {
    const result = await validateJsonReply<{ value: string }>(
      '<think>We need produce one object.</think>\n```json\n{"value":"x"}\n```',
      {
        name: 'thinking_test',
        schema: { type: 'object' },
        validate: () => []
      }
    )
    expect(result).toEqual({ value: { value: 'x' }, errors: [] })
  })

  it('bounds structured output and disables thinking for a custom endpoint', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'default'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'bounded_test',
      schema: { type: 'object' },
      validate: () => [],
      maxTokens: 2048
    })

    expect(bodies).toHaveLength(1)
    expect(bodies[0].max_tokens).toBe(2048)
    expect(bodies[0].chat_template_kwargs).toEqual({ enable_thinking: false })
  })

  it('does not send the self-hosted thinking toggle to OpenAI', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'openai',
      endpoint: 'http://127.0.0.1:8000/v1',
      apiKey: 'test-key',
      model: 'gpt-test'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'hosted_test',
      schema: { type: 'object' },
      validate: () => [],
      maxTokens: 256
    })

    expect(bodies).toHaveLength(1)
    expect(bodies[0].chat_template_kwargs).toBeUndefined()
    expect(bodies[0].max_tokens).toBe(256)
  })

  it('can start in prompt-only JSON mode for an unreliable self-hosted schema adapter', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'default'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'prompt_only_test',
      schema: { type: 'object' },
      validate: () => [],
      maxTokens: 1024,
      nativeStructuredOutput: false
    })

    expect(bodies).toHaveLength(1)
    expect(bodies[0].response_format).toBeUndefined()
    expect(bodies[0].chat_template_kwargs).toEqual({ enable_thinking: false })
    expect(bodies[0].max_tokens).toBe(1024)
  })

  it('retries without the thinking toggle when a strict custom gateway rejects it', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        bodies.push(body)
        if (bodies.length === 1) {
          return new Response('unknown field chat_template_kwargs', { status: 400 })
        }
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'default'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'fallback_test',
      schema: { type: 'object' },
      validate: () => [],
      maxTokens: 256
    })

    expect(bodies).toHaveLength(2)
    expect(bodies[0].chat_template_kwargs).toEqual({ enable_thinking: false })
    expect(bodies[1].chat_template_kwargs).toBeUndefined()
    expect(bodies[1].max_tokens).toBe(256)
  })

  it('falls back to prompt-only JSON when native structured validation is exhausted', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        bodies.push(body)
        if (bodies.length === 1) {
          return new Response(
            JSON.stringify({
              error: {
                message: 'DiffusionGemma failed to produce a schema-valid structured response after 3 attempt(s)',
                type: 'structured_output_validation_error',
                code: 502
              }
            }),
            { status: 502, headers: { 'content-type': 'application/json' } }
          )
        }
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'default'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'validation_fallback_test',
      schema: { type: 'object' },
      validate: () => [],
      maxTokens: 4096
    })

    expect(bodies).toHaveLength(2)
    expect(bodies[0].response_format).toBeDefined()
    expect(bodies[1].response_format).toBeUndefined()
    expect(bodies[1].chat_template_kwargs).toEqual({ enable_thinking: false })
    expect(bodies[1].max_tokens).toBe(4096)
  })

  it('also drops native structured output when a correction attempt exhausts it', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        bodies.push(body)
        if (bodies.length === 1) {
          return new Response('{"choices":[{"message":{"content":"{}"}}]}', {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        }
        if (bodies.length === 2) {
          return new Response(
            '{"error":{"message":"DiffusionGemma failed to produce a schema-valid structured response after 3 attempt(s)","type":"structured_output_validation_error","code":502}}',
            { status: 502, headers: { 'content-type': 'application/json' } }
          )
        }
        return new Response('{"choices":[{"message":{"content":"{\\"value\\":\\"x\\"}"}}]}', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      })
    )

    const cfg = migrateAIConfig({
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'default'
    })
    await chatCompleteJson(cfg, [{ role: 'user', content: 'Return JSON.' }], 'test', {
      name: 'correction_fallback_test',
      schema: { type: 'object' },
      validate: (value) =>
        (value as { value?: string }).value === 'x' ? [] : ['value must equal x'],
      maxTokens: 512
    })

    expect(bodies).toHaveLength(3)
    expect(bodies[0].response_format).toBeDefined()
    expect(bodies[1].response_format).toBeDefined()
    expect(bodies[2].response_format).toBeUndefined()
    expect(bodies[2].max_tokens).toBe(512)
  })
})
