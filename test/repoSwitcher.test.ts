import { describe, it, expect } from 'vitest'
import { filterSwitcher, switcherEntries, touchMru } from '../src/renderer/src/lib/repoSwitcher'
import type { TabState } from '../src/shared/types'

const repoTab = (id: string, path: string): TabState => ({
  id,
  kind: 'repo',
  name: path,
  repos: [{ path: `/r/${path}`, name: path }],
  activeRepoPath: `/r/${path}`
})

const tabs: TabState[] = [
  repoTab('a', 'gitcito'),
  repoTab('b', 'indicators'),
  {
    id: 'g',
    kind: 'group',
    name: 'Work',
    repos: [
      { path: '/r/api', name: 'api' },
      { path: '/r/auth', name: 'auth' }
    ],
    activeRepoPath: '/r/api'
  },
  repoTab('c', 'dotfiles')
]
const names = (es: { name: string }[]): string[] => es.map((e) => e.name)
const id = (_: string, name: string): string => name

describe('repository switcher', () => {
  it('lists recently used first, then tab order, with the current one last', () => {
    const es = switcherEntries(tabs, 'b', ['/r/indicators', '/r/dotfiles', '/r/gitcito'], id)
    expect(names(es)).toEqual(['dotfiles', 'gitcito', 'api', 'auth', 'indicators'])
    expect(es.at(-1)?.current).toBe(true)
  })

  it('names the group and hints ⌘N only for single-repository tabs', () => {
    const es = switcherEntries(tabs, 'a', [], id)
    const auth = es.find((e) => e.name === 'auth')
    expect(auth?.groupName).toBe('Work')
    expect(auth?.tabIndex).toBeNull()
    expect(es.find((e) => e.name === 'dotfiles')?.tabIndex).toBe(3)
  })

  it('counts only the shown member of a group as current', () => {
    const es = switcherEntries(tabs, 'g', [], id)
    expect(es.filter((e) => e.current).map((e) => e.name)).toEqual(['api'])
  })

  it('filters by name first, then path or branch, and drops the current repository', () => {
    const es = switcherEntries(tabs, 'a', [], id)
    expect(names(filterSwitcher(es, 'ind', () => undefined))).toEqual(['indicators'])
    expect(names(filterSwitcher(es, 'gem', () => undefined))).toEqual([])
    const byBranch = filterSwitcher(es, 'rate-limits', (p) => (p === '/r/api' ? 'feat/rate-limits' : 'main'))
    expect(names(byBranch)).toEqual(['api'])
    expect(filterSwitcher(es, 'ind', () => undefined)[0].hits).toEqual([0, 1, 2])
  })

  it('moves a repository to the front of the recent list once', () => {
    expect(touchMru(['/a', '/b', '/c'], '/c')).toEqual(['/c', '/a', '/b'])
    const same = ['/a', '/b']
    expect(touchMru(same, '/a')).toBe(same)
  })
})
