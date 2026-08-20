import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { packSections, unpackSections, readBundleHeader, type BundleSection } from '../src/main/secureBundle'
import { readRepoNotes, previewNotesSectionV2, applyV2 } from '../src/main/secureShare'

const PW = 'correct horse battery'
const tmp: string[] = []

afterAll(() => {
  for (const d of tmp) rmSync(d, { recursive: true, force: true })
})

const gitC = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf-8' })

/** A tiny repo with two commits, and a clone of it (shared history). */
function makeRepoPair(): { src: string; dst: string; shas: string[] } {
  const base = mkdtempSync(join(tmpdir(), 'gitcito-team-'))
  tmp.push(base)
  const src = join(base, 'src')
  execFileSync('git', ['init', '-q', src])
  gitC(src, 'config', 'user.email', 't@t')
  gitC(src, 'config', 'user.name', 'T')
  writeFileSync(join(src, 'a.txt'), 'one\n')
  gitC(src, 'add', '.')
  gitC(src, 'commit', '-qm', 'one')
  writeFileSync(join(src, 'a.txt'), 'two\n')
  gitC(src, 'commit', '-qam', 'two')
  const shas = gitC(src, 'rev-list', 'HEAD').trim().split('\n').reverse()
  const dst = join(base, 'dst')
  execFileSync('git', ['clone', '-q', src, dst])
  gitC(dst, 'config', 'user.email', 't@t')
  gitC(dst, 'config', 'user.name', 'T')
  return { src, dst, shas }
}

describe('v3 bundle sections (workspace + notes)', () => {
  it('round-trips workspace and notes sections, and stamps v3 only when needed', () => {
    const sections: BundleSection[] = [
      {
        kind: 'workspace',
        name: 'Team',
        tabs: [
          { kind: 'repo', repo: { name: 'api', folder: 'api', remote: 'git@x.test:acme/api.git' } },
          { kind: 'group', name: 'Front', color: '#f00', repos: [{ name: 'web', folder: 'web' }] }
        ]
      },
      { kind: 'notes', folder: 'api', ref: 'refs/notes/commits', notes: [{ sha: 'a'.repeat(40), body: 'ship it' }] }
    ]
    const text = packSections('Team', sections, PW)
    const header = readBundleHeader(text)!
    expect(header.version).toBe(3)
    expect(header.sections).toEqual([
      { kind: 'workspace', name: 'Team', tabCount: 2, repoCount: 2 },
      { kind: 'notes', folder: 'api', ref: 'refs/notes/commits', noteCount: 1 }
    ])
    const back = unpackSections(text, PW)
    expect(back).toEqual(sections)
  })

  it('keeps stamping v2 for repo/vault-only bundles', () => {
    const text = packSections('p', [{ kind: 'vault', entries: [{ key: 'K', value: 'v' }] }], PW)
    expect(readBundleHeader(text)!.version).toBe(2)
  })

})

describe('notes as a file: read, preview, apply', () => {
  it('reads a repo\'s commit notes with bodies', async () => {
    const { src, shas } = makeRepoPair()
    gitC(src, 'notes', 'add', '-m', 'first note', shas[0])
    gitC(src, 'notes', 'add', '-m', 'second note', shas[1])
    const notes = await readRepoNotes(src)
    expect(notes).toHaveLength(2)
    expect(notes.find((n) => n.sha === shas[0])?.body).toBe('first note')
  })

  it('previews new/same/different/missing against a target repo', async () => {
    const { src, dst, shas } = makeRepoPair()
    gitC(src, 'notes', 'add', '-m', 'shared', shas[0])
    gitC(src, 'notes', 'add', '-m', 'fresh', shas[1])
    // Target already has one identical note and no second note.
    gitC(dst, 'notes', 'add', '-m', 'shared', shas[0])
    const notes = await readRepoNotes(src)
    const section: BundleSection = { kind: 'notes', folder: 'src', ref: 'refs/notes/commits', notes }
    const bundleFile = join(mkdtempSync(join(tmpdir(), 'gitcito-team-b-')), 'x.gitcito')
    tmp.push(join(bundleFile, '..'))
    writeFileSync(bundleFile, packSections('src', [section], PW))

    const res = await previewNotesSectionV2(bundleFile, PW, 0, dst)
    if ('error' in res) throw new Error(res.error)
    const bySha = new Map(res.notes.map((n) => [n.sha, n]))
    expect(bySha.get(shas[0])?.state).toBe('same')
    expect(bySha.get(shas[1])?.state).toBe('new')
  })

  it('applies notes, honouring the overwrite policy, and skips unknown commits', async () => {
    const { src, dst, shas } = makeRepoPair()
    gitC(src, 'notes', 'add', '-m', 'theirs', shas[0])
    gitC(src, 'notes', 'add', '-m', 'brand new', shas[1])
    gitC(dst, 'notes', 'add', '-m', 'mine, different', shas[0])
    const notes = await readRepoNotes(src)
    notes.push({ sha: 'f'.repeat(40), body: 'no such commit' })
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-team-c-'))
    tmp.push(dir)
    const bundleFile = join(dir, 'x.gitcito')
    writeFileSync(bundleFile, packSections('src', [{ kind: 'notes', folder: 'src', ref: 'refs/notes/commits', notes }], PW))

    // Without overwrite: the differing note survives untouched.
    const r1 = await applyV2(bundleFile, PW, [{ kind: 'notes', sectionIndex: 0, targetRepoPath: dst, overwrite: false }])
    if ('error' in r1) throw new Error(r1.error)
    expect(r1.notesWritten).toBe(1) // only the brand-new one
    expect(r1.notesSkipped).toBe(2) // differing + missing commit
    expect(gitC(dst, 'notes', 'show', shas[0]).trim()).toBe('mine, different')
    expect(gitC(dst, 'notes', 'show', shas[1]).trim()).toBe('brand new')

    // With overwrite: the differing note is replaced.
    const r2 = await applyV2(bundleFile, PW, [{ kind: 'notes', sectionIndex: 0, targetRepoPath: dst, overwrite: true }])
    if ('error' in r2) throw new Error(r2.error)
    expect(gitC(dst, 'notes', 'show', shas[0]).trim()).toBe('theirs')
  })
})
