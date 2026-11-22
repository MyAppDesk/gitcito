import { describe, it, expect } from 'vitest'
import { githubRepoError } from '../src/main/hosting'
import { issueTitle, redactForReport, reportIssueUrl } from '../src/renderer/src/lib/issueReport'

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

describe('what a reported error leaves out', () => {
  // Opening the pre-filled issue sends the text to GitHub in the URL, before the
  // user decides to post: nothing private may be in it.
  const sent = (message: string): string => {
    const url = new URL(reportIssueUrl(message))
    return `${url.searchParams.get('title')}\n${url.searchParams.get('body')}`
  }

  it('drops a credential written into a remote URL, and the private server it names', () => {
    const out = sent(
      "fatal: unable to access 'https://ana:ghp_abcdefghijklmnopqrstuvwxyz0123456789@git.acme.internal/team/app.git/': 403"
    )
    expect(out).not.toMatch(/ghp_|ana:|acme|team\/app/)
    expect(out).toContain('https://<host>/…')
  })

  it('removes the token shapes hosts and AI providers issue', () => {
    for (const secret of [
      'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz',
      'glpat-abcdefghijklmnopqrst',
      'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
      'AIzaSyA-abcdefghijklmnopqrstuvwxyz012345'
    ]) {
      expect(sent(`request failed with key ${secret}`), secret).not.toContain(secret)
    }
    expect(sent('Authorization: Bearer abcdef0123456789abcdef')).not.toContain('abcdef0123456789')
  })

  it('keeps a public host for the diagnosis, but never the repository path', () => {
    const out = redactForReport('GitHub API error (404) for https://api.github.com/repos/acme/secret-project')
    expect(out).toBe('GitHub API error (404) for https://api.github.com/…')
  })

  it('hides scp-style remotes, the home folder, e-mails and LAN addresses', () => {
    expect(redactForReport('git@git.acme.internal:team/app.git: denied')).toBe('git@<host>:…: denied')
    expect(redactForReport('git@github.com:acme/secret.git: denied')).toBe('git@github.com:…: denied')
    expect(redactForReport("ENOENT '/home/ana/work/app/.git/index'")).toBe("ENOENT '~/work/app/.git/index'")
    expect(redactForReport('open /Users/ana/repo')).toBe('open ~/repo')
    expect(redactForReport('C:\\Users\\Ana\\repo failed')).toBe('~\\repo failed')
    expect(redactForReport('author ana@acme.example rejected')).toBe('author <email> rejected')
    expect(redactForReport('connect ECONNREFUSED 192.168.1.20:11434')).toBe('connect ECONNREFUSED <lan-ip>:11434')
  })

  it('hides a private host that git, ssh or the AI key guard name outside a URL', () => {
    expect(redactForReport("fatal: unable to access 'https://git.acme.internal/team/app.git/': Could not resolve host: git.acme.internal")).toBe(
      "fatal: unable to access 'https://<host>/…': Could not resolve host: <host>"
    )
    expect(redactForReport('ssh: Could not resolve hostname git.acme.internal: Name or service not known')).toBe(
      'ssh: Could not resolve hostname <host>: Name or service not known'
    )
    expect(redactForReport('ssh: connect to host git.acme.internal port 22: Connection refused')).toBe(
      'ssh: connect to host <host> port 22: Connection refused'
    )
    expect(redactForReport('Failed to connect to github.com port 443')).toBe('Failed to connect to github.com port 443')
    expect(
      redactForReport('Refusing to send the API key to ai.intranet:8080 over unencrypted http://. Use an https:// endpoint.')
    ).toBe('Refusing to send the API key to <host> over unencrypted http://. Use an https:// endpoint.')
  })

  it('keeps prose after a scheme word, but not a credential', () => {
    const hint = 'remote: Support for password authentication was removed. Please use a token authentication instead.'
    expect(redactForReport(hint)).toBe(hint)
    expect(redactForReport('header token abcdefghijk1mnop')).toBe('header <redacted>')
  })

  it('leaves the failing call and the git message readable', () => {
    const msg = "Error invoking remote method 'git': Error: CONFLICT (content): Merge conflict in src/app.ts"
    expect(redactForReport(msg)).toBe(msg)
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

  it("passes GitHub's own reason through, so a 403 says which permission is missing", async () => {
    const message = 'Resource not accessible by personal access token'
    const err = await githubRepoError(403, 'acme/repo', true, 'https://github.com/acme/repo.git', { message })
    expect(err.message).toBe(`GitHub API error (403): ${message}`)
  })

  it('names an exhausted rate limit instead of quoting a bare 403', async () => {
    const url = 'https://github.com/acme/repo.git'
    const anon = await githubRepoError(403, 'acme/repo', false, url, { rateLimited: true })
    expect(anon.message).toMatch(/rate limit/)
    expect(anon.message).toMatch(/60 an hour/)
    const authed = await githubRepoError(403, 'acme/repo', true, url, { rateLimited: true })
    expect(authed.message).toMatch(/rate limit/)
    expect(authed.message).not.toMatch(/60 an hour/)
  })
})
