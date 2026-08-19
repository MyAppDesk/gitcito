import { afterEach, describe, expect, it } from 'vitest'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  REPO_FILE_BATCH_MAX_BYTES,
  REPO_FILE_MAX_BYTES,
  RepoFileActionError,
  applyPreparedRepoFileActions,
  nodeRepoFileActionFs,
  prepareRepoFileActions
} from '../src/main/repoFileActions'

const roots: string[] = []
const root = (): string => {
  const value = mkdtempSync(join(tmpdir(), 'gitcito-file-actions-'))
  roots.push(value)
  return value
}

afterEach(() => roots.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })))

const context = (paths: string[] = []) => ({
  evidencePaths: new Set(paths),
  completePaths: new Set(paths),
  ignoredPaths: new Set<string>()
})

describe('repository file action preparation', () => {
  it('prepares an exact edit with a local preview and hash', async () => {
    const repo = root()
    writeFileSync(join(repo, 'LICENSE'), 'MIT License\nCopyright MyAppDesk\n')
    const [action] = await prepareRepoFileActions(
      repo,
      [
        {
          type: 'edit_file',
          path: 'LICENSE',
          oldText: 'MIT License',
          newText: 'Apache License, Version 2.0',
          description: 'Replace the license heading'
        }
      ],
      context(['LICENSE'])
    )
    expect(action.expectedHash).toMatch(/^[0-9a-f]{64}$/)
    expect(action.expectedOccurrences).toBe(1)
    expect(action.preview).toContain('--- a/LICENSE')
    expect(action.preview).toContain('+++ b/LICENSE')
    expect(action.preview).toContain('-MIT License')
    expect(action.preview).toContain('+Apache License, Version 2.0')
  })

  it('rejects ambiguous edits and incomplete whole-file replacement', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'same\nsame\n')
    const incomplete = {
      evidencePaths: new Set(['a.txt']),
      completePaths: new Set<string>(),
      ignoredPaths: new Set<string>()
    }
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'edit_file', path: 'a.txt', oldText: 'same', newText: 'next', description: 'Edit' }],
        incomplete
      )
    ).rejects.toMatchObject({ code: 'ambiguous_edit' })
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path: 'a.txt', content: 'next', mode: 'replace', description: 'Replace' }],
        incomplete
      )
    ).rejects.toMatchObject({ code: 'incomplete_evidence' })
  })

  it('prepares create, replace-all, delete, and sequential edits in memory', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'same same\n')
    writeFileSync(join(repo, 'gone.txt'), 'gone\n')
    const prepared = await prepareRepoFileActions(
      repo,
      [
        { type: 'write_file', path: 'new.txt', content: 'created\n', mode: 'create', description: 'Create' },
        {
          type: 'edit_file',
          path: 'a.txt',
          oldText: 'same',
          newText: 'next',
          replaceAll: true,
          description: 'Replace all'
        },
        { type: 'edit_file', path: 'a.txt', oldText: 'next next', newText: 'done', description: 'Edit again' },
        { type: 'delete_file', path: 'gone.txt', description: 'Delete' }
      ],
      context(['a.txt', 'gone.txt'])
    )
    expect(prepared.map((action) => action.expectedHash === null)).toEqual([true, false, false, false])
    expect(prepared[1].expectedOccurrences).toBe(2)
    expect(prepared[2].preview).toContain('+done')
    expect(prepared[0].preview).toContain('--- /dev/null')
    expect(prepared[3].preview).toContain('+++ /dev/null')
  })

  it.each([
    ['.git/config', 'git_internal_path'],
    ['nested/.git/config', 'git_internal_path'],
    ['.env', 'secret_file'],
    ['src/generated/client.ts', 'generated_path'],
    ['../outside.txt', 'unsafe_path']
  ])('rejects protected target %s', async (path, code) => {
    const repo = root()
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path, content: 'x', mode: 'create', description: 'Create' }],
        context()
      )
    ).rejects.toMatchObject({ code })
  })

  it('rejects ignored targets and binary content', async () => {
    const repo = root()
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path: 'dist/app.js', content: 'x', mode: 'create', description: 'Create' }],
        { ...context(), ignoredPaths: new Set(['dist/app.js']) }
      )
    ).rejects.toMatchObject({ code: 'ignored_path' })
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path: 'data.txt', content: 'a\0b', mode: 'create', description: 'Create' }],
        context()
      )
    ).rejects.toMatchObject({ code: 'binary_file' })
  })

  it('enforces per-file and batch UTF-8 limits', async () => {
    const repo = root()
    const oversized = 'é'.repeat(Math.floor(REPO_FILE_MAX_BYTES / 2) + 1)
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path: 'large.txt', content: oversized, mode: 'create', description: 'Create' }],
        context()
      )
    ).rejects.toMatchObject({ code: 'file_too_large' })

    const content = 'x'.repeat(REPO_FILE_MAX_BYTES)
    const actions = Array.from({ length: REPO_FILE_BATCH_MAX_BYTES / REPO_FILE_MAX_BYTES + 1 }, (_, i) => ({
      type: 'write_file' as const,
      path: `file-${i}.txt`,
      content,
      mode: 'create' as const,
      description: 'Create'
    }))
    await expect(prepareRepoFileActions(repo, actions, context())).rejects.toMatchObject({ code: 'batch_too_large' })
  })

  it('rejects a symlink target and a symlinked parent', async () => {
    const repo = root()
    const outside = root()
    writeFileSync(join(outside, 'target.txt'), 'outside\n')
    symlinkSync(join(outside, 'target.txt'), join(repo, 'link.txt'))
    symlinkSync(outside, join(repo, 'linked-dir'))

    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'delete_file', path: 'link.txt', description: 'Delete' }],
        context(['link.txt'])
      )
    ).rejects.toMatchObject({ code: 'symlink_path' })
    await expect(
      prepareRepoFileActions(
        repo,
        [{ type: 'write_file', path: 'linked-dir/new.txt', content: 'x', mode: 'create', description: 'Create' }],
        context()
      )
    ).rejects.toMatchObject({ code: 'symlink_path' })
  })

  it('exposes stable preparation errors', () => {
    const error = new RepoFileActionError('not_found', 'missing', ['a.txt'])
    expect(error).toMatchObject({ code: 'not_found', message: 'missing', paths: ['a.txt'] })
  })
})

describe('repository file action application', () => {
  const mixedBatch = async (repo: string) =>
    prepareRepoFileActions(
      repo,
      [
        { type: 'edit_file', path: 'a.txt', oldText: 'old', newText: 'new', description: 'Edit' },
        { type: 'write_file', path: 'new.txt', content: 'created\n', mode: 'create', description: 'Create' },
        { type: 'delete_file', path: 'gone.txt', description: 'Delete' }
      ],
      context(['a.txt', 'gone.txt'])
    )

  it('applies a prepared create, edit, and delete batch', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'old\n')
    writeFileSync(join(repo, 'gone.txt'), 'remove\n')
    const prepared = await mixedBatch(repo)
    const result = await applyPreparedRepoFileActions(repo, prepared, new Set())
    expect(result).toEqual({ applied: 3 })
    expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('new\n')
    expect(readFileSync(join(repo, 'new.txt'), 'utf8')).toBe('created\n')
    expect(existsSync(join(repo, 'gone.txt'))).toBe(false)
  })

  it('refuses a stale file before the first write', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'old\n')
    const prepared = await prepareRepoFileActions(
      repo,
      [{ type: 'edit_file', path: 'a.txt', oldText: 'old', newText: 'new', description: 'Edit' }],
      context(['a.txt'])
    )
    writeFileSync(join(repo, 'a.txt'), 'user changed it\n')
    await expect(applyPreparedRepoFileActions(repo, prepared, new Set())).rejects.toMatchObject({
      code: 'stale_file'
    })
    expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('user changed it\n')
  })

  it('rolls back edits, creations, and deletions when an install rename fails', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'old\n')
    writeFileSync(join(repo, 'gone.txt'), 'remove\n')
    const prepared = await mixedBatch(repo)
    const io = {
      ...nodeRepoFileActionFs,
      rename: async (from: string, to: string) => {
        if (to === join(repo, 'new.txt') && from.includes('.tmp-')) throw new Error('injected rename failure')
        await rename(from, to)
      }
    }

    await expect(applyPreparedRepoFileActions(repo, prepared, new Set(), io)).rejects.toMatchObject({
      code: 'unknown'
    })
    expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('old\n')
    expect(existsSync(join(repo, 'new.txt'))).toBe(false)
    expect(readFileSync(join(repo, 'gone.txt'), 'utf8')).toBe('remove\n')
    expect(readdirSync(repo).some((name) => name.includes('.gitcito-'))).toBe(false)
  })

  it('reports every path whose rollback restoration fails', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'old\n')
    writeFileSync(join(repo, 'gone.txt'), 'remove\n')
    const prepared = await mixedBatch(repo)
    const io = {
      ...nodeRepoFileActionFs,
      rename: async (from: string, to: string) => {
        if (to === join(repo, 'new.txt') && from.includes('.tmp-')) throw new Error('primary failure')
        if (to === join(repo, 'gone.txt') && from.includes('.bak-')) throw new Error('restore failure')
        await rename(from, to)
      }
    }

    await expect(applyPreparedRepoFileActions(repo, prepared, new Set(), io)).rejects.toMatchObject({
      code: 'rollback_failed',
      paths: ['gone.txt']
    })
  })

  it('rejects an unknown IPC action type without treating it as delete', async () => {
    const repo = root()
    writeFileSync(join(repo, 'a.txt'), 'old\n')
    const [prepared] = await prepareRepoFileActions(
      repo,
      [{ type: 'delete_file', path: 'a.txt', description: 'Delete' }],
      context(['a.txt'])
    )
    const tampered = { ...prepared, type: 'unknown_action' } as unknown as typeof prepared
    await expect(applyPreparedRepoFileActions(repo, [tampered], new Set())).rejects.toMatchObject({
      code: 'unknown'
    })
    expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('old\n')
  })
})
