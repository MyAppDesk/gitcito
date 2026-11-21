import { describe, expect, it } from 'vitest'
import {
  FORGEJO_NOTIFICATION,
  mapForgejoIssue,
  mapForgejoMilestone,
  mapForgejoNotification,
  mapForgejoRelease
} from '../src/main/forgejo'
import { repoHasIssueTracker } from '../src/renderer/src/lib/hosting'

const BASE = 'https://forge.example.org'

describe('Forgejo issues, milestones, releases', () => {
  it('maps an issue the way the sidebar lists GitHub ones', () => {
    expect(
      mapForgejoIssue({ number: 4, title: 'Crash', user: { login: 'sam' }, state: 'open', html_url: `${BASE}/studio/catalog/issues/4`, comments: 2 })
    ).toEqual({ number: 4, title: 'Crash', author: 'sam', state: 'open', url: `${BASE}/studio/catalog/issues/4`, comments: 2 })
    expect(mapForgejoIssue({ number: 5, title: 'x', state: 'closed', html_url: 'u' })).toMatchObject({ author: 'unknown', state: 'closed', comments: 0 })
  })

  it('gives a milestone its web page, which the API does not send', () => {
    const m = mapForgejoMilestone(BASE, 'studio', 'catalog', { id: 9, title: 'v2', state: 'open', open_issues: 3, closed_issues: 1 })
    expect(m).toEqual({
      number: 9,
      title: 'v2',
      description: '',
      state: 'open',
      dueOn: null,
      openIssues: 3,
      closedIssues: 1,
      url: `${BASE}/studio/catalog/milestone/9`
    })
  })

  it('treats a draft release as unpublished whatever date it carries', () => {
    const r = { id: 1, tag_name: 'v1.0', name: 'One', body: 'notes', published_at: '2026-01-01T00:00:00Z', html_url: 'u' }
    expect(mapForgejoRelease({ ...r, draft: true })).toMatchObject({ draft: true, publishedAt: null })
    expect(mapForgejoRelease({ ...r, prerelease: true })).toMatchObject({ draft: false, prerelease: true, publishedAt: r.published_at })
    expect(mapForgejoRelease({ ...r, tag_name: '', name: '' })).toMatchObject({ tag: null, name: null })
  })
})

describe('Forgejo notifications', () => {
  it('maps into the notifications page shape, routed back to Forgejo by its id', () => {
    const n = mapForgejoNotification({
      id: 42,
      unread: true,
      updated_at: '2026-01-02T03:04:05Z',
      subject: { title: 'Fix login', type: 'Pull', html_url: `${BASE}/studio/catalog/pulls/7` },
      repository: { full_name: 'studio/catalog', html_url: `${BASE}/studio/catalog` }
    })
    expect(n).toEqual({
      id: `${FORGEJO_NOTIFICATION}42`,
      reason: '',
      title: 'Fix login',
      type: 'PullRequest',
      repoFullName: 'studio/catalog',
      repoUrl: `${BASE}/studio/catalog`,
      number: 7,
      unread: true,
      updatedAt: Date.parse('2026-01-02T03:04:05Z') / 1000,
      url: `${BASE}/studio/catalog/pulls/7`
    })
  })

  it('falls back to the repository page when the subject has none', () => {
    const n = mapForgejoNotification({
      id: 1,
      unread: false,
      updated_at: '2026-01-01T00:00:00Z',
      subject: { title: 'Pushed', type: 'Repository' },
      repository: { full_name: 'a/b', html_url: `${BASE}/a/b` }
    })
    expect(n).toMatchObject({ url: `${BASE}/a/b`, number: null, type: 'Repository' })
  })
})

describe('repoHasIssueTracker', () => {
  const remote = (url: string) => [{ name: 'origin', url } as never]
  it('is true on GitHub and on a Forgejo server a profile names, false elsewhere', () => {
    expect(repoHasIssueTracker(remote('git@github.com:example/app.git'), [])).toBe(true)
    expect(repoHasIssueTracker(remote(`${BASE}/studio/catalog.git`), [undefined, BASE])).toBe(true)
    expect(repoHasIssueTracker(remote(`${BASE}/studio/catalog.git`), [])).toBe(false)
    expect(repoHasIssueTracker(remote('https://gitlab.com/group/app.git'), [BASE])).toBe(false)
    expect(repoHasIssueTracker([], [BASE])).toBe(false)
  })
})
