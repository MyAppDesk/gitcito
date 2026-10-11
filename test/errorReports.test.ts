import { describe, it, expect } from 'vitest'
import { githubRepoError } from '../src/main/hosting'
import { issueTitle, reportIssueUrl } from '../src/renderer/src/lib/issueReport'

const IPC_ERROR =
  "Error invoking remote method 'ai:commitMessage': Error: AI request failed (500): litellm.InternalServerError: " +
  "Custom_openaiException - AsyncCompletions.create() got an unexpected keyword argument 'chat_template_kwargs'."

describe('reporting an error as a GitHub issue', () => {
  it('titles the issue with the problem, not the IPC wrapper', () => {
    const title = issueTitle(IPC_ERROR)
    expect(title.startsWith('AI request failed (500)')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(120)
  })

  it('keeps a plain message as it is', () => {
    expect(issueTitle('Push rejected\nmore detail')).toBe('Push rejected')
  })

  it('puts the whole message, wrapper included, in the body', () => {
    const url = new URL(reportIssueUrl(IPC_ERROR))
    expect(url.searchParams.get('body')).toContain(IPC_ERROR)
  })
})

describe('GitHub repository read errors', () => {
  it('explains a 404 seen with a credential instead of quoting the bare status', async () => {
    const err = await githubRepoError(404, 'acme/secret', true, 'https://github.com/acme/secret.git')
    expect(err.message).toContain('acme/secret')
    expect(err.message).toMatch(/private/)
    expect(err.message).toMatch(/remote URL/)
  })

  it('leaves other statuses as they were', async () => {
    const err = await githubRepoError(500, 'acme/repo', true, 'https://github.com/acme/repo.git')
    expect(err.message).toBe('GitHub API error (500)')
  })
})
