import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { noPromptEnv } from '../src/main/git'

describe('git messages stay in English', () => {
  it('pins messages to English without touching the rest of the locale', () => {
    const env = noPromptEnv()
    expect(env.LANGUAGE).toBe('en')
    expect(env.GIT_TERMINAL_PROMPT).toBe('0')
    expect(env.LC_ALL).toBe(process.env.LC_ALL)
  })

  it('a git error under a translated locale still reads in English', () => {
    // Where pt_BR is installed git would answer "não é um repositório git";
    // where it is not, the message is English either way.
    let stderr = ''
    try {
      execFileSync('git', ['-C', '/', 'rev-parse', '--git-dir'], {
        env: { ...noPromptEnv(), LC_ALL: 'pt_BR.UTF-8', LANG: 'pt_BR.UTF-8', GIT_CEILING_DIRECTORIES: '/' },
        stdio: ['ignore', 'pipe', 'pipe']
      })
    } catch (e) {
      stderr = String((e as { stderr?: Buffer }).stderr ?? '')
    }
    expect(stderr).toMatch(/not a git repository/)
  })
})
