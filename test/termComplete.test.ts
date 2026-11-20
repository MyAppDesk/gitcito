import { describe, it, expect } from 'vitest'
import { FRESH_LINE, completionInput, matchScripts, trackInput, type LineState } from '../src/renderer/src/lib/termComplete'

const type = (keys: string[], from: LineState = FRESH_LINE): LineState => keys.reduce(trackInput, from)
const SCRIPTS = ['dev', 'build', 'build:web', 'test', 'test:watch', 'lint', 'LOCAL_SERVER']

describe('trackInput', () => {
  it('follows typing, backspace and Ctrl+U', () => {
    expect(type(['n', 'p', 'm', ' ', 'r', 'u', 'x', '\x7f', 'n']).line).toBe('npm run')
    expect(type(['npm run dev', '\x15']).line).toBe('')
  })

  it('starts over on Enter and Ctrl+C', () => {
    expect(type(['npm run dev', '\r'])).toEqual(FRESH_LINE)
    expect(type(['npm ru', '\x03'])).toEqual(FRESH_LINE)
  })

  it('stops trusting the line after history, cursor moves or the shell’s Tab', () => {
    expect(type(['npm run ', '\x1b[A']).known).toBe(false)
    expect(type(['npm run d', '\x1b[D']).known).toBe(false)
    expect(type(['npm run d', '\t']).known).toBe(false)
    // …until the next Enter.
    expect(type(['\x1b[A', '\r', 'npm']).known).toBe(true)
  })

  it('takes a bracketed paste as typed text', () => {
    expect(type(['\x1b[200~npm run bu\x1b[201~']).line).toBe('npm run bu')
  })
})

describe('matchScripts', () => {
  const at = (line: string): ReturnType<typeof matchScripts> => matchScripts({ line, known: true }, SCRIPTS)

  it('suggests every script right after the run command', () => {
    expect(at('npm run ')?.names).toEqual(SCRIPTS.slice(0, 7))
  })

  it('puts names starting with the typed text first, then ones containing it', () => {
    expect(at('npm run te')?.names).toEqual(['test', 'test:watch'])
    expect(at('npm run web')?.names).toEqual(['build:web'])
    expect(at('pnpm run LOC')?.names).toEqual(['LOCAL_SERVER'])
    expect(at('npm run local')?.names).toEqual(['LOCAL_SERVER'])
  })

  it('knows pnpm, yarn and bun, with and without run', () => {
    expect(at('pnpm d')?.names).toEqual(['dev', 'build', 'build:web']) // starts with, then contains
    expect(at('yarn run li')?.names).toEqual(['lint'])
    expect(at('bun run b')?.names).toEqual(['build', 'build:web'])
  })

  it('stays quiet when there is nothing to add or the line is unknown', () => {
    expect(at('npm install ')).toBeNull()
    expect(at('git status')).toBeNull()
    expect(at('npm run zzz')).toBeNull()
    expect(matchScripts({ line: 'npm run ', known: false }, SCRIPTS)).toBeNull()
    // A name already typed in full is not offered again.
    expect(at('npm run lint')).toBeNull()
  })
})

describe('completionInput', () => {
  it('types the rest, or erases a partial that is not a prefix', () => {
    expect(completionInput('te', 'test:watch')).toBe('st:watch')
    expect(completionInput('local', 'LOCAL_SERVER')).toBe('\x7f\x7f\x7f\x7f\x7fLOCAL_SERVER')
  })
})
