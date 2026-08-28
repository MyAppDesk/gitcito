import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphCommit } from '../src/shared/types'

const gitApi = vi.hoisted(() => ({
  fetchAll: vi.fn(async () => []),
  pull: vi.fn(async () => undefined)
}))
const ui = vi.hoisted(() => ({
  setBusy: vi.fn(),
  toast: vi.fn(),
  tabs: []
}))

vi.mock('../src/renderer/src/infrastructure/api', () => ({ gitApi, hostingApi: {} }))
vi.mock('../src/renderer/src/stores/ui', () => ({ useUIStore: { getState: () => ui } }))
vi.mock('../src/renderer/src/stores/settings', () => ({
  useSettingsStore: {
    getState: () => ({ settings: { initialCommitCount: 400, loadMoreCount: 200, mergeCommit: false, tabs: [] } }),
    subscribe: vi.fn()
  }
}))
vi.mock('../src/renderer/src/i18n', () => ({
  t: (key: string) => key,
  interp: (value: string) => value
}))

import { repoActions, useRepoStore, type RepoData } from '../src/renderer/src/stores/repo'

const commit = (hash: string, parents: string[], refs: string[] = []): GraphCommit => ({
  hash,
  parents,
  refs,
  author: 'A',
  email: 'a@example.com',
  date: 1,
  subject: hash
})

const PATH = '/repo'
const local = commit('local', ['base'], ['HEAD -> main'])
const base = commit('base', [])
const remote = commit('remote', ['local'], ['origin/main'])

function installRepo(commits: GraphCommit[], newCommits: string[], refreshed: GraphCommit[]): void {
  useRepoStore.setState({
    repos: { [PATH]: { path: PATH, commits, newCommits } as RepoData },
    refresh: async (path: string) => useRepoStore.getState().patch(path, { commits: refreshed })
  })
}

describe('batch repository sync markers', () => {
  beforeEach(() => {
    gitApi.fetchAll.mockClear()
    gitApi.pull.mockClear()
    ui.setBusy.mockClear()
    ui.toast.mockClear()
    useRepoStore.setState({ repos: {} })
  })

  it('records commits introduced by a batch fetch', async () => {
    installRepo([local, base], [], [remote, local, base])

    await repoActions.batch([PATH], 'fetch')

    expect(gitApi.fetchAll).toHaveBeenCalledWith(PATH)
    expect(useRepoStore.getState().repos[PATH].newCommits).toEqual(['remote'])
  })

  it('recomputes stale fetch markers after a batch pull', async () => {
    const pulled = commit('remote', ['local'], ['HEAD -> main', 'origin/main'])
    installRepo([remote, local, base], ['remote'], [pulled, local, base])

    await repoActions.batch([PATH], 'pull')

    expect(gitApi.pull).toHaveBeenCalledWith(PATH, 'default')
    expect(useRepoStore.getState().repos[PATH].newCommits).toEqual([])
  })
})
