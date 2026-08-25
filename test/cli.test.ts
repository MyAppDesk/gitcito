import { describe, it, expect } from 'vitest'
import { parseCliOpenArgs, isCliView, CLI_VIEWS } from '../src/shared/cli'
import { knownRepos, resolveRepo, matchesRepo } from '../src/shared/cliRepos'
import { checkCommitMessage, stripCommitComments } from '../src/shared/commitCheck'
import { cliViewAction } from '../src/renderer/src/lib/cliView'
import { editKindFor, splitMessage } from '../src/renderer/src/lib/cliEdit'
import type { RepoConfig } from '../src/shared/types'

describe('parseCliOpenArgs', () => {
  it('returns null without --open', () => {
    expect(parseCliOpenArgs(['/Applications/Gitcito.app', '--name=x'])).toBeNull()
  })

  it('reads every flag the shim can pass', () => {
    const payload = parseCliOpenArgs([
      '--open=/repo',
      '--name=API',
      '--group=Work',
      '--view=blame',
      '--arg=src/x.ts',
      '--line=42'
    ])
    expect(payload).toEqual({
      path: '/repo',
      name: 'API',
      group: 'Work',
      view: 'blame',
      arg: 'src/x.ts',
      line: 42,
      edit: undefined,
      wait: undefined
    })
  })

  // Chromium hoists switches ahead of positionals, so order must not matter.
  it('is order-independent', () => {
    const payload = parseCliOpenArgs(['--view=graph', '--open=/repo', '/some/positional'])
    expect(payload?.path).toBe('/repo')
    expect(payload?.view).toBe('graph')
  })

  it('drops a view this build does not know instead of failing the open', () => {
    const payload = parseCliOpenArgs(['--open=/repo', '--view=teleport'])
    expect(payload?.path).toBe('/repo')
    expect(payload?.view).toBeUndefined()
  })

  it('ignores a line number that is not one', () => {
    expect(parseCliOpenArgs(['--open=/r', '--line=abc'])?.line).toBeUndefined()
    expect(parseCliOpenArgs(['--open=/r', '--line=-3'])?.line).toBeUndefined()
  })

  it('carries an edit request and its sentinel', () => {
    const payload = parseCliOpenArgs(['--open=/repo', '--edit=/repo/.git/COMMIT_EDITMSG', '--wait=/tmp/gitcito-wait.aB'])
    expect(payload?.edit).toBe('/repo/.git/COMMIT_EDITMSG')
    expect(payload?.wait).toBe('/tmp/gitcito-wait.aB')
  })
})

describe('cliViewAction', () => {
  it('maps every declared view to something, or to null only when an argument is missing', () => {
    const needsArg = ['blame', 'file', 'history', 'show']
    for (const view of CLI_VIEWS) {
      const withArg = cliViewAction(view, 'subject')
      expect(withArg, `${view} with an argument`).not.toBeNull()
      if (needsArg.includes(view)) expect(cliViewAction(view), `${view} without one`).toBeNull()
    }
  })

  it('routes file-backed verbs with their line', () => {
    expect(cliViewAction('blame', 'src/a.ts', 12)).toEqual({
      kind: 'file',
      mode: 'blame',
      file: 'src/a.ts',
      line: 12
    })
    expect(cliViewAction('file', 'src/a.ts')).toEqual({ kind: 'file', mode: 'file', file: 'src/a.ts' })
  })

  it('carries a search query into the modal but drops arguments a modal cannot use', () => {
    expect(cliViewAction('search', 'TODO')).toEqual({ kind: 'modal', modal: 'code-search', arg: 'TODO' })
    expect(cliViewAction('stash', 'ignored')).toEqual({ kind: 'modal', modal: 'stash-partial' })
  })

  it('agrees with isCliView on the vocabulary', () => {
    expect(isCliView('graph')).toBe(true)
    expect(isCliView('nope')).toBe(false)
  })
})

describe('knownRepos', () => {
  const settings = {
    tabs: [
      { kind: 'repo', repos: [{ path: '/a/api', name: 'API' }] },
      { kind: 'group', name: 'Work', repos: [{ path: '/a/web', name: 'Web' }, { path: '/a/api', name: 'API' }] },
      { kind: 'page' }
    ],
    recentRepos: [{ path: '/a/old', name: 'Old' }, { path: '/a/api' }]
  }

  it('collects tabs then recents, without duplicates', () => {
    expect(knownRepos(settings).map((r) => r.path)).toEqual(['/a/api', '/a/web', '/a/old'])
  })

  it('labels only the ones inside a group', () => {
    const byPath = Object.fromEntries(knownRepos(settings).map((r) => [r.path, r]))
    expect(byPath['/a/web'].group).toBe('Work')
    // First writer wins, so the standalone tab keeps this one ungrouped.
    expect(byPath['/a/api'].group).toBeUndefined()
  })

  it('survives a settings file it does not recognise', () => {
    expect(knownRepos(null)).toEqual([])
    expect(knownRepos({ tabs: 'nope', recentRepos: 7 })).toEqual([])
    expect(knownRepos({ tabs: [{ repos: [{ path: '/x' }] }] })).toEqual([{ path: '/x', name: 'x' }])
  })

  it('prefers an exact name over a substring', () => {
    const repos = knownRepos(settings)
    expect(resolveRepo(repos, 'API')?.path).toBe('/a/api')
    expect(resolveRepo(repos, 'we')?.path).toBe('/a/web')
    expect(resolveRepo(repos, 'nothing')).toBeNull()
    expect(matchesRepo({ path: '/a/api', name: 'API' }, '/a/')).toBe(true)
  })
})

describe('checkCommitMessage', () => {
  const codes = (raw: string, opts?: Parameters<typeof checkCommitMessage>[1]): string[] =>
    checkCommitMessage(raw, opts).map((i) => i.code)

  it('strips what git strips', () => {
    expect(stripCommitComments('feat: x\n# a comment\n\nbody')).toBe('feat: x\n\nbody')
    expect(stripCommitComments('subject\n# ------------------------ >8 ------------------------\ndiff')).toBe(
      'subject'
    )
  })

  it('fails an empty message', () => {
    expect(codes('# only comments\n')).toEqual(['empty'])
  })

  it('accepts a well-formed message', () => {
    expect(codes('feat: add range-diff\n\nA body that is comfortably short.')).toEqual([])
  })

  it('requires a blank line under the subject', () => {
    expect(codes('feat: x\nbody right away')).toContain('no-blank-line')
  })

  it('warns on style and errors on length', () => {
    expect(codes(`feat: ${'x'.repeat(60)}.`)).toEqual(['subject-long', 'trailing-period'])
    expect(codes(`feat: ${'x'.repeat(80)}`)).toEqual(['subject-too-long'])
  })

  it('leaves a long URL in the body alone', () => {
    expect(codes(`feat: x\n\nhttps://example.com/${'y'.repeat(80)}`)).toEqual([])
  })

  const scoped: RepoConfig = { version: 1, commit: { scopes: ['api', 'ui'], trailers: ['Refs: {ticket}'] } }

  it('turns conventional commits into a rule once the repo declares scopes', () => {
    expect(codes('just some text', { config: scoped })).toContain('not-conventional')
    expect(codes('feat(db): x', { config: scoped })).toContain('unknown-scope')
    expect(codes('feat(api): x', { config: scoped })).not.toContain('unknown-scope')
  })

  it('notices a declared trailer that is missing', () => {
    expect(codes('feat(api): x', { config: scoped })).toContain('missing-trailer')
    expect(codes('feat(api): x\n\nRefs: ABC-1', { config: scoped })).not.toContain('missing-trailer')
  })

  it('only mentions a ticket when the branch has one and the repo asked', () => {
    const config: RepoConfig = { version: 1, commit: { ticketFromBranch: true } }
    expect(codes('fix: thing', { config, branch: 'feature/ABC-12-thing' })).toContain('missing-ticket')
    expect(codes('fix: ABC-12 thing', { config, branch: 'feature/ABC-12-thing' })).not.toContain('missing-ticket')
    expect(codes('fix: thing', { config, branch: 'feature/no-ticket' })).not.toContain('missing-ticket')
  })
})

describe('cliEdit', () => {
  it('recognises the files git hands to an editor', () => {
    expect(editKindFor('/r/.git/COMMIT_EDITMSG')).toBe('message')
    expect(editKindFor('/r/.git/MERGE_MSG')).toBe('message')
    expect(editKindFor('/r/.git/rebase-merge/git-rebase-todo')).toBe('todo')
    expect(editKindFor('/r/notes.txt')).toBe('file')
  })

  it('splits a message the way git will', () => {
    const { subject, body, comments } = splitMessage(
      'feat: x\n\nFirst para.\n\nSecond para.\n# Please enter the commit message\n# with '
    )
    expect(subject).toBe('feat: x')
    expect(body).toBe('First para.\n\nSecond para.')
    expect(comments).toBe(2)
  })

  it('treats a message with no body as having none', () => {
    expect(splitMessage('feat: x\n').body).toBe('')
  })
})
