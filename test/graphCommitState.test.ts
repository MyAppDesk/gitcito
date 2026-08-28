import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { GraphCommit } from '../src/shared/types'
import { fetchedOnlyHashes } from '../src/renderer/src/lib/graphCommitState'

const commit = (hash: string, parents: string[], refs: string[] = []): GraphCommit => ({
  hash,
  parents,
  refs,
  author: 'A',
  email: 'a@example.com',
  date: 1,
  subject: hash
})

describe('fetched-only graph commits', () => {
  it('finds new remote commits that are not in the checked-out branch', () => {
    const commits = [
      commit('remote-2', ['remote-1'], ['origin/main']),
      commit('remote-1', ['local'], []),
      commit('local', ['base'], ['HEAD -> main']),
      commit('base', [], [])
    ]

    expect([...fetchedOnlyHashes(commits, ['remote-2', 'remote-1'])]).toEqual(['remote-2', 'remote-1'])
  })

  it('keeps pulled commits fully opaque once HEAD contains them', () => {
    const commits = [
      commit('remote-2', ['remote-1'], ['HEAD -> main', 'origin/main']),
      commit('remote-1', ['local'], []),
      commit('local', ['base'], []),
      commit('base', [], [])
    ]

    expect(fetchedOnlyHashes(commits, ['remote-2', 'remote-1'])).toEqual(new Set())
  })

  it('treats commits merged through a non-first parent as integrated', () => {
    const commits = [
      commit('merge', ['local', 'remote'], ['HEAD -> main']),
      commit('remote', ['base'], ['origin/feature']),
      commit('local', ['base'], []),
      commit('base', [], [])
    ]

    expect(fetchedOnlyHashes(commits, ['remote'])).toEqual(new Set())
  })

  it('does not fade commits when the graph cannot identify HEAD', () => {
    expect(fetchedOnlyHashes([commit('remote', [], ['origin/main'])], ['remote'])).toEqual(new Set())
  })

  it('lets the stronger dim and branch-preview states override fetched-only opacity', () => {
    const css = readFileSync(new URL('../src/renderer/src/styles.css', import.meta.url), 'utf8')
    const fetchedOnly = css.indexOf(
      '.graph-row.row-fetched-only:where(:not(.selected):not(.multi-selected))'
    )
    expect(fetchedOnly).toBeGreaterThan(-1)
    expect(css.indexOf('.graph-row.dimmed')).toBeGreaterThan(fetchedOnly)
    expect(css.indexOf('.graph-row.ghosted')).toBeGreaterThan(fetchedOnly)
  })
})
