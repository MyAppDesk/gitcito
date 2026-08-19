import { describe, expect, it } from 'vitest'
import { validateJsonReply } from '../src/main/ai'

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
})
