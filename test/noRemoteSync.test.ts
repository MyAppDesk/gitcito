import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RepoData } from '../src/renderer/src/stores/repo'

const gitApi = vi.hoisted(() => ({
  fetchAll: vi.fn(async () => []),
  pull: vi.fn(async () => undefined),
  push: vi.fn(async () => undefined),
  filesToPush: vi.fn(async () => [] as string[])
}))
const ui = vi.hoisted(() => ({
  setBusy: vi.fn(),
  toast: vi.fn(),
  openModal: vi.fn(),
  beginInflight: vi.fn(),
  endInflight: vi.fn(),
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

import { repoActions, useRepoStore } from '../src/renderer/src/stores/repo'

const PATH = '/local-only'

function install(partial: Partial<RepoData> = {}): void {
  useRepoStore.setState({
    repos: {
      [PATH]: {
        path: PATH,
        loading: false,
        remotes: [],
        branches: { current: 'main', locals: [], remotes: [], tags: [] },
        ...partial
      } as RepoData
    },
    refresh: async () => undefined
  })
}

describe('sync with no remotes', () => {
  beforeEach(() => {
    gitApi.fetchAll.mockClear()
    gitApi.pull.mockClear()
    gitApi.push.mockClear()
    gitApi.filesToPush.mockClear()
    ui.openModal.mockClear()
    ui.toast.mockClear()
    useRepoStore.setState({ repos: {} })
  })

  it('push opens Add remote instead of calling git', async () => {
    install()

    const ok = await repoActions.push(PATH)

    expect(ok).toBe(false)
    expect(gitApi.push).not.toHaveBeenCalled()
    expect(gitApi.filesToPush).not.toHaveBeenCalled()
    expect(ui.openModal).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'addRemote', path: PATH, resume: 'push', defaultName: 'origin' })
    )
  })

  it('pull opens Add remote instead of calling git', async () => {
    install()

    const ok = await repoActions.pull(PATH, 'default')

    expect(ok).toBe(false)
    expect(gitApi.pull).not.toHaveBeenCalled()
    expect(ui.openModal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'addRemote', resume: 'pull' }))
  })

  it('fetch opens Add remote instead of succeeding at nothing', async () => {
    install()

    const ok = await repoActions.fetchAll(PATH)

    expect(ok).toBe(false)
    expect(gitApi.fetchAll).not.toHaveBeenCalled()
    expect(ui.openModal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'addRemote', resume: 'fetch' }))
  })

  it('background fetch stays quiet when there is nothing to fetch', async () => {
    install()

    const ok = await repoActions.fetchAll(PATH, { skipEmpty: true })

    expect(ok).toBe(false)
    expect(gitApi.fetchAll).not.toHaveBeenCalled()
    expect(ui.openModal).not.toHaveBeenCalled()
  })

  it('does not prompt while the repository is still loading', async () => {
    install({ loading: true })

    const ok = await repoActions.push(PATH)

    expect(ok).toBe(false)
    expect(ui.openModal).not.toHaveBeenCalled()
    expect(gitApi.push).not.toHaveBeenCalled()
  })

  it('push with a remote still runs git', async () => {
    install({ remotes: [{ name: 'origin', url: 'https://example.com/repo.git' }] })

    const ok = await repoActions.push(PATH)

    expect(ok).toBe(true)
    expect(ui.openModal).not.toHaveBeenCalled()
    expect(gitApi.push).toHaveBeenCalledWith(PATH, 'main', { force: false })
  })
})
