import { describe, it, expect } from 'vitest'
import { mapForgejoReviewState, splitUnifiedDiff } from '../src/main/forgejo'
import { isReviewableRemote } from '../src/renderer/src/lib/hosting'

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,3 +1,3 @@',
  ' keep',
  '-old',
  '+new',
  'diff --git a/docs/new.md b/docs/new.md',
  'new file mode 100644',
  'index 0000000..3333333',
  '--- /dev/null',
  '+++ b/docs/new.md',
  '@@ -0,0 +1,2 @@',
  '+# Title',
  '+body',
  'diff --git a/old.txt b/old.txt',
  'deleted file mode 100644',
  '--- a/old.txt',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-gone',
  'diff --git a/from.ts b/to.ts',
  'similarity index 100%',
  'rename from from.ts',
  'rename to to.ts',
  'diff --git a/logo.png b/logo.png',
  'index 4444444..5555555 100644',
  'Binary files a/logo.png and b/logo.png differ',
  ''
].join('\n')

describe('splitUnifiedDiff', () => {
  const files = splitUnifiedDiff(DIFF)

  it('gives one entry per file with its status and line counts', () => {
    expect(files.map((f) => [f.filename, f.status, f.additions, f.deletions])).toEqual([
      ['src/a.ts', 'modified', 1, 1],
      ['docs/new.md', 'added', 2, 0],
      ['old.txt', 'removed', 0, 1],
      ['to.ts', 'renamed', 0, 0],
      ['logo.png', 'modified', 0, 0]
    ])
  })

  it('keeps each file’s hunks as its patch, and nothing for binaries or pure renames', () => {
    expect(files[0].patch).toBe('@@ -1,3 +1,3 @@\n keep\n-old\n+new')
    expect(files[3]).toMatchObject({ previousFilename: 'from.ts' })
    expect(files[3].patch).toBeUndefined()
    expect(files[4].patch).toBeUndefined()
  })

  it('does not count the --- / +++ headers as changed lines', () => {
    expect(files[1].deletions).toBe(0)
  })
})

describe('mapForgejoReviewState', () => {
  it('maps decisions and leaves pending reviews and requests out', () => {
    expect(mapForgejoReviewState({ state: 'APPROVED' })).toBe('APPROVED')
    expect(mapForgejoReviewState({ state: 'REQUEST_CHANGES' })).toBe('CHANGES_REQUESTED')
    expect(mapForgejoReviewState({ state: 'COMMENT' })).toBe('COMMENTED')
    expect(mapForgejoReviewState({ state: 'APPROVED', dismissed: true })).toBe('DISMISSED')
    expect(mapForgejoReviewState({ state: 'PENDING' })).toBeNull()
    expect(mapForgejoReviewState({ state: 'REQUEST_REVIEW' })).toBeNull()
  })
})

describe('isReviewableRemote — Forgejo', () => {
  it('opens a configured Forgejo server’s PRs in the page', () => {
    expect(isReviewableRemote('https://git.example.org/me/app.git')).toBe(false)
    expect(isReviewableRemote('https://git.example.org/me/app.git', [], ['git.example.org'])).toBe(true)
    expect(isReviewableRemote('git@git.example.org:me/app.git', [], ['https://git.example.org'])).toBe(true)
  })
})
