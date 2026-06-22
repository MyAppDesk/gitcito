import { describe, it, expect } from 'vitest'
import { parseRemoteUrl } from '../src/main/hosting'
import { lintCommit, subjectCounterLevel, parseCcPrefix, applyCcType, parseGitmojiPrefix, applyGitmoji, parseTicketPrefix, applyTicket, ticketFromBranch } from '../src/renderer/src/lib/commitLint'
import { isSecretFile, maskSecretLine } from '../src/renderer/src/lib/secrets'
import { comboFromEvent, formatCombo, effectiveBindings, matchShortcut } from '../src/renderer/src/lib/shortcuts'
import { autolink, remoteWebUrl } from '../src/renderer/src/lib/autolink'
import { frecencyScore } from '../src/renderer/src/lib/frecency'

// Minimal KeyboardEvent stand-in for the pure shortcut helpers.
const ev = (key: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): KeyboardEvent =>
  ({ key, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt }) as KeyboardEvent

// Pure-function unit tests — no git, no DOM.

describe('parseRemoteUrl', () => {
  it('parses GitHub https + ssh', () => {
    expect(parseRemoteUrl('https://github.com/o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
    expect(parseRemoteUrl('git@github.com:o/r.git')).toMatchObject({ provider: 'github', owner: 'o', repo: 'r' })
  })

  it('parses GitLab, including multi-level subgroups (https + ssh)', () => {
    expect(parseRemoteUrl('https://gitlab.com/group/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group', repo: 'repo' })
    expect(parseRemoteUrl('git@gitlab.com:group/sub/repo.git')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
    expect(parseRemoteUrl('https://gitlab.com/group/sub/repo')).toMatchObject({ provider: 'gitlab', owner: 'group/sub', repo: 'repo' })
  })

  it('parses Bitbucket https + ssh', () => {
    expect(parseRemoteUrl('https://bitbucket.org/team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
    expect(parseRemoteUrl('git@bitbucket.org:team/repo.git')).toMatchObject({ provider: 'bitbucket', owner: 'team', repo: 'repo' })
  })

  it('parses Azure DevOps', () => {
    expect(parseRemoteUrl('https://dev.azure.com/org/proj/_git/repo')).toMatchObject({ provider: 'azure', owner: 'org', project: 'proj', repo: 'repo' })
  })

  it('returns null for unknown hosts', () => {
    expect(parseRemoteUrl('https://example.com/x/y.git')).toBeNull()
  })
})

describe('commit lint', () => {
  it('clean conventional subject yields no hints', () => {
    expect(lintCommit('feat(api): add endpoint', '')).toEqual([])
  })

  it('flags trailing period and non-imperative mood', () => {
    const h = lintCommit('Fixed the bug.', '')
    expect(h.some((x) => /period/i.test(x.text))).toBe(true)
    expect(h.some((x) => /imperative/i.test(x.text))).toBe(true)
  })

  it('flags an over-long subject as an error', () => {
    const long = 'x'.repeat(80)
    const h = lintCommit(long, '')
    expect(h.some((x) => x.level === 'error')).toBe(true)
  })

  it('nudges to capitalize a lowercase non-conventional subject', () => {
    expect(lintCommit('add stuff', '').some((x) => /capitalize/i.test(x.text))).toBe(true)
  })

  it('flags over-wide body lines', () => {
    expect(lintCommit('Add caching', 'x'.repeat(90)).some((x) => /wrap/i.test(x.text))).toBe(true)
  })

  it('subject counter level bands', () => {
    expect(subjectCounterLevel(10)).toBe('')
    expect(subjectCounterLevel(60)).toBe('warn')
    expect(subjectCounterLevel(80)).toBe('error')
  })
})

describe('conventional-commit type prefix', () => {
  it('parses an existing type, scope and breaking marker', () => {
    expect(parseCcPrefix('feat(api)!: add x')).toEqual({ type: 'feat', scope: '(api)', bang: '!', rest: 'add x' })
  })

  it('treats a non-conventional subject as having no type', () => {
    expect(parseCcPrefix('add x').type).toBe('')
  })

  it('adds a type to a bare subject', () => {
    expect(applyCcType('add endpoint', 'feat')).toBe('feat: add endpoint')
  })

  it('swaps the type while preserving scope, marker and subject', () => {
    expect(applyCcType('feat(api)!: add x', 'fix')).toBe('fix(api)!: add x')
  })

  it('strips the type when cleared', () => {
    expect(applyCcType('fix: bug', '')).toBe('bug')
  })
})

describe('gitmoji prefix', () => {
  it('detects a leading gitmoji', () => {
    expect(parseGitmojiPrefix('✨ add thing')).toEqual({ emoji: '✨', rest: 'add thing' })
  })

  it('treats a plain subject as having no gitmoji', () => {
    expect(parseGitmojiPrefix('add thing').emoji).toBe('')
  })

  it('adds, swaps and strips the leading gitmoji', () => {
    expect(applyGitmoji('add thing', '✨')).toBe('✨ add thing')
    expect(applyGitmoji('✨ add thing', '🐛')).toBe('🐛 add thing')
    expect(applyGitmoji('✨ add thing', '')).toBe('add thing')
  })
})

describe('ticket prefix', () => {
  it('parses a KEY-123 prefix and ignores plain subjects', () => {
    expect(parseTicketPrefix('ABC-12: do x')).toEqual({ ticket: 'ABC-12', rest: 'do x' })
    expect(parseTicketPrefix('do x').ticket).toBe('')
  })

  it('adds, swaps (uppercased) and strips the ticket prefix', () => {
    expect(applyTicket('do x', 'abc-12')).toBe('ABC-12: do x')
    expect(applyTicket('ABC-12: do x', 'DEF-9')).toBe('DEF-9: do x')
    expect(applyTicket('ABC-12: do x', '')).toBe('do x')
  })

  it('extracts a ticket key from a branch name', () => {
    expect(ticketFromBranch('feature/ABC-123-login')).toBe('ABC-123')
    expect(ticketFromBranch('main')).toBe('')
  })
})

describe('secret masking', () => {
  it('recognizes secret-bearing files', () => {
    for (const f of ['.env', 'config/.env.production', 'key.pem', 'id_rsa', 'deploy/credentials.json']) {
      expect(isSecretFile(f)).toBe(true)
    }
    for (const f of ['src/app.ts', 'README.md', 'environment.ts', '.env.example', '.env.sample', 'config/.env.template']) {
      expect(isSecretFile(f)).toBe(false)
    }
  })

  it('masks assignment values but keeps keys, comments and plain lines', () => {
    expect(maskSecretLine('API_KEY=sk-12345')).toBe('API_KEY=••••••')
    expect(maskSecretLine('export DB_URL="postgres://u:p@h/db"')).toBe('export DB_URL=••••••')
    expect(maskSecretLine('TOKEN: abc123')).toBe('TOKEN: ••••••')
    expect(maskSecretLine('# a comment')).toBe('# a comment')
    expect(maskSecretLine('not an assignment')).toBe('not an assignment')
  })
})

describe('keyboard shortcuts', () => {
  it('normalizes events to combos (mod for meta/ctrl), ignoring modifier-only', () => {
    expect(comboFromEvent(ev('k', { meta: true }))).toBe('mod+k')
    expect(comboFromEvent(ev('F', { ctrl: true, shift: true }))).toBe('mod+shift+f')
    expect(comboFromEvent(ev('Shift'))).toBeNull()
  })

  it('formats combos for display (platform-aware)', () => {
    expect(formatCombo('mod+shift+f')).toMatch(/(⌘⇧F|Ctrl\+Shift\+F)/)
    expect(formatCombo('mod+k')).toMatch(/(⌘K|Ctrl\+K)/)
  })

  it('effective bindings apply overrides over defaults', () => {
    const b = effectiveBindings({ 'command-palette': 'mod+p' })
    expect(b['command-palette']).toBe('mod+p')
    expect(b['code-search']).toBe('mod+shift+f') // untouched default
  })

  it('matchShortcut resolves the bound id', () => {
    const b = effectiveBindings(undefined)
    expect(matchShortcut(ev('k', { meta: true }), b)).toBe('command-palette')
    expect(matchShortcut(ev('v', { ctrl: true, shift: true }), b)).toBe('vault')
    expect(matchShortcut(ev('x', { meta: true }), b)).toBeNull()
  })
})

describe('autolink', () => {
  it('derives the web URL from ssh + https remotes', () => {
    expect(remoteWebUrl('git@github.com:o/r.git')).toBe('https://github.com/o/r')
    expect(remoteWebUrl('https://gitlab.com/g/s/r.git')).toBe('https://gitlab.com/g/s/r')
    expect(remoteWebUrl(undefined)).toBeUndefined()
  })

  it('returns plain text when no repo URL, and nodes when refs present', () => {
    expect(autolink('fix #12 by @ana', undefined)).toBe('fix #12 by @ana')
    const out = autolink('fix #12 by @ana', 'https://github.com/o/r')
    expect(Array.isArray(out)).toBe(true) // split into text + anchor nodes
    expect((out as unknown[]).length).toBeGreaterThan(1)
  })
})

describe('frecency score', () => {
  const now = 1_000 * 86_400_000 // a fixed "now"
  it('is 0 for unknown entries', () => {
    expect(frecencyScore(undefined, now)).toBe(0)
  })
  it('rewards recent + frequent over old + rare', () => {
    const recentFreq = frecencyScore({ n: 8, t: now }, now)
    const oldRare = frecencyScore({ n: 1, t: now - 60 * 86_400_000 }, now)
    expect(recentFreq).toBeGreaterThan(oldRare)
  })
  it('caps the count contribution', () => {
    expect(frecencyScore({ n: 999, t: now }, now)).toBe(frecencyScore({ n: 10, t: now }, now))
  })
})
