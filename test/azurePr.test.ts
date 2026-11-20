import { describe, it, expect } from 'vitest'
import { azureChangeStatus, azureVoteState, mapAzurePr } from '../src/main/azurePr'
import { isReviewableRemote } from '../src/renderer/src/lib/hosting'

const R = { org: 'example-org', project: 'My Project', repo: 'app' }

describe('Azure DevOps PR mapping', () => {
  it('maps votes to review states, and no vote to nothing', () => {
    expect([10, 5, 0, -5, -10, undefined].map(azureVoteState)).toEqual([
      'APPROVED',
      'APPROVED',
      null,
      'CHANGES_REQUESTED',
      'CHANGES_REQUESTED',
      null
    ])
  })

  it('splits threads into conversation and line threads, and drops system notes', () => {
    const pr = mapAzurePr(
      R,
      {
        pullRequestId: 7,
        title: 'Add x',
        status: 'active',
        sourceRefName: 'refs/heads/feat/x',
        targetRefName: 'refs/heads/main',
        createdBy: { displayName: 'Ana' },
        mergeStatus: 'conflicts',
        reviewers: [{ displayName: 'Bob', vote: 10 }, { displayName: 'Core', vote: 0, isContainer: true }]
      },
      [
        { id: 1, comments: [{ id: 1, content: 'Looks good', author: { displayName: 'Bob' }, commentType: 'text', publishedDate: '2026-01-02' }] },
        { id: 2, comments: [{ id: 1, content: 'Bob voted 10', commentType: 'system' }] },
        {
          id: 3,
          threadContext: { filePath: '/src/a.ts', rightFileStart: { line: 12 } },
          comments: [{ id: 1, content: 'rename this', author: { displayName: 'Bob' }, commentType: 'text', publishedDate: '2026-01-03' }]
        }
      ]
    )
    expect(pr).toMatchObject({
      number: 7,
      source: 'feat/x',
      target: 'main',
      author: 'Ana',
      state: 'open',
      merged: false,
      mergeable: false,
      url: 'https://dev.azure.com/example-org/My%20Project/_git/app/pullrequest/7',
      reviews: [{ author: 'Bob', state: 'APPROVED' }],
      requestedReviewers: [{ login: 'Core', team: true }]
    })
    expect(pr.comments.map((c) => c.body)).toEqual(['Looks good'])
    expect(pr.reviewThreads).toEqual([
      { path: 'src/a.ts', line: 12, diffHunk: '', rootId: 3, comments: [{ id: 1, author: 'Bob', body: 'rename this', createdAt: '2026-01-03' }] }
    ])
  })

  it('reads a completed PR as merged', () => {
    const pr = mapAzurePr(R, { pullRequestId: 1, title: 't', status: 'completed', closedDate: '2026-02-01', closedBy: { displayName: 'Ana' } }, [])
    expect(pr).toMatchObject({ state: 'closed', merged: true, mergedAt: '2026-02-01', mergedBy: 'Ana' })
  })

  it('names change types', () => {
    expect(['add', 'edit', 'delete', 'rename', 'edit, rename'].map(azureChangeStatus)).toEqual([
      'added',
      'modified',
      'removed',
      'renamed',
      'renamed'
    ])
  })

  it('opens Azure remotes in the PR page', () => {
    expect(isReviewableRemote('https://dev.azure.com/org/proj/_git/repo')).toBe(true)
    expect(isReviewableRemote('git@ssh.dev.azure.com:v3/org/proj/repo')).toBe(true)
    expect(isReviewableRemote('https://org.visualstudio.com/proj/_git/repo')).toBe(true)
    expect(isReviewableRemote('https://notdev.azure.com/x')).toBe(false)
  })
})
