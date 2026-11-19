import { beforeEach, describe, expect, it, vi } from 'vitest'

const gitApi = vi.hoisted(() => ({
  worktreeAdd: vi.fn(async () => undefined),
  worktreeRemove: vi.fn(async () => undefined)
}))
const ui = vi.hoisted(() => ({
  setBusy: vi.fn(), toast: vi.fn(), beginInflight: vi.fn(), endInflight: vi.fn(), tabs: []
}))
vi.mock('../src/renderer/src/infrastructure/api', () => ({ gitApi, hostingApi: {} }))
vi.mock('../src/renderer/src/stores/ui', () => ({ useUIStore: { getState: () => ui } }))
vi.mock('../src/renderer/src/stores/settings', () => ({
  useSettingsStore: {
    getState: () => ({ settings: { initialCommitCount: 400, tabs: [] } }),
    subscribe: vi.fn()
  }
}))
vi.mock('../src/renderer/src/i18n', () => ({ t: (key: string) => key, interp: (value: string) => value }))

import { repoActions, useRepoStore } from '../src/renderer/src/stores/repo'
import type { WorktreeInfo } from '../src/shared/types'

const refresh = vi.fn(async () => undefined)
describe('worktree refresh scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRepoStore.setState({ repos: {}, refresh })
  })

  it('refreshes decorated log refs when creating a branch', async () => {
    await repoActions.worktreeAdd('/repo', '/wt', 'new-branch', true)
    expect(refresh).toHaveBeenCalledWith('/repo', { only: ['worktrees', 'branches', 'log'] })
  })

  it('avoids rereading history for an existing branch', async () => {
    await repoActions.worktreeAdd('/repo', '/wt', 'existing', false)
    expect(refresh).toHaveBeenCalledWith('/repo', { only: ['worktrees', 'branches'] })
  })

  it('avoids rereading history when removing a worktree', async () => {
    const worktree: WorktreeInfo = {
      path: '/wt', branch: 'feature', head: 'abc1234', isMain: false, isCurrent: false,
      locked: false, lockReason: null, detached: false, prunable: false
    }
    await repoActions.worktreeRemove('/repo', worktree)
    expect(gitApi.worktreeRemove).toHaveBeenCalledWith('/repo', '/wt', false)
    expect(refresh).toHaveBeenCalledWith('/repo', { only: ['worktrees', 'branches'] })
  })
})
