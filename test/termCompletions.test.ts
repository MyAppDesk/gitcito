import { afterAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  branchNames,
  parseComposerScripts,
  parseMakeTargets,
  readBranches,
  readCompletions,
  readMakeTargets
} from '../src/main/termCompletions'
import { cloneFixture, cleanupFixtures } from './fixtures'

const temp: string[] = []
afterAll(() => {
  cleanupFixtures()
  for (const d of temp) rmSync(d, { recursive: true, force: true })
})

describe('parseMakeTargets', () => {
  it('reads targets with their ## description, else their first recipe line', () => {
    const mk = [
      '.PHONY: build test',
      'CC := gcc',
      'OUT ?= dist',
      '',
      'build: deps ## Compile everything',
      '\t@$(CC) -o app main.c',
      'test:',
      '\t-go test ./...',
      'lint fmt: ## Style checks',
      '%.o: %.c',
      '\t$(CC) -c $<',
      '$(OUT)/app: build',
      'deps:',
      '# build: a comment, not a target'
    ].join('\n')
    expect(parseMakeTargets(mk)).toEqual({
      build: 'Compile everything',
      test: 'go test ./...',
      lint: 'Style checks',
      fmt: 'Style checks',
      deps: ''
    })
  })

  it('keeps the first definition of a target named twice', () => {
    expect(parseMakeTargets('a: ## first\na: more-deps\n')).toEqual({ a: 'first' })
  })
})

describe('parseComposerScripts', () => {
  it('reads string and list scripts, and survives broken JSON', () => {
    const json = JSON.stringify({ scripts: { test: 'phpunit', check: ['@lint', 'phpstan'], bad: 3 } })
    expect(parseComposerScripts(json)).toEqual({ test: 'phpunit', check: '@lint && phpstan' })
    expect(parseComposerScripts('{ nope')).toEqual({})
  })
})

describe('branchNames', () => {
  it('lists local branches, then remote ones by short name, each once', () => {
    const refs = [
      'refs/heads/main',
      'refs/heads/feat/x',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main',
      'refs/remotes/origin/release/1.0',
      'refs/remotes/upstream/fix-y',
      'refs/tags/v1'
    ].join('\n')
    expect(branchNames(refs)).toEqual(['main', 'feat/x', 'release/1.0', 'fix-y'])
  })
})

describe('reading from the shell directory', () => {
  it('lists the branches of a real repository, and nothing outside one', async () => {
    const R = cloneFixture('absorb')
    execFileSync('git', ['-C', R, 'branch', 'topic/one'])
    const got = await readBranches(R)
    expect(Object.keys(got?.items ?? {})).toContain('topic/one')
    const outside = mkdtempSync(join(tmpdir(), 'gitcito-nogit-'))
    temp.push(outside)
    // An env var could point git elsewhere; a ceiling keeps it from walking up into a repo.
    process.env.GIT_CEILING_DIRECTORIES = tmpdir()
    try {
      expect(await readBranches(outside)).toBeNull()
    } finally {
      delete process.env.GIT_CEILING_DIRECTORIES
    }
  })

  it('reads the Makefile of the current directory only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitcito-make-'))
    temp.push(dir)
    expect(await readMakeTargets(dir)).toBeNull()
    writeFileSync(join(dir, 'Makefile'), 'run: ## Start it\n')
    expect(await readCompletions('make', dir)).toEqual({ items: { run: 'Start it' } })
  })
})
