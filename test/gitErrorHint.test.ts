import { describe, it, expect } from 'vitest'
import { explainGitError, readableError, withoutIpcPrefix } from '../src/renderer/src/lib/gitErrorHint'

const IPC = "Error invoking remote method 'git': Error: "

describe('explainGitError', () => {
  it('names the workflow file and tells an OAuth login apart from a personal access token', () => {
    const oauth =
      IPC +
      'To https://github.com/o/r.git\n ! [remote rejected] main -> main (refusing to allow an OAuth App to ' +
      'create or update workflow `.github/workflows/build.yml` without `workflow` scope)'
    expect(explainGitError(oauth)).toEqual({
      key: 'gitError.workflowScopeOAuth',
      vars: { file: '.github/workflows/build.yml' }
    })
    const pat = oauth.replace('an OAuth App', 'a Personal Access Token')
    expect(explainGitError(pat)?.key).toBe('gitError.workflowScopeToken')
  })

  it('names the oversized file when GitHub reports it, and falls back when it does not', () => {
    const named =
      'remote: error: File assets/video.mp4 is 142.31 MB; this exceeds GitHub\'s file size limit of 100.00 MB\n' +
      'remote: error: GH001: Large files detected.'
    expect(explainGitError(named)).toEqual({ key: 'gitError.fileTooLarge', vars: { file: 'assets/video.mp4' } })
    expect(explainGitError('remote: error: GH001: Large files detected.')).toEqual({ key: 'gitError.fileTooLargeAny' })
  })

  it('recognises a protected-branch rejection', () => {
    expect(explainGitError('remote: error: GH006: Protected branch update failed for refs/heads/main.')?.key).toBe(
      'gitError.protectedBranch'
    )
  })

  it('reports the host, not the full URL, when git has no credential', () => {
    const msg = "fatal: could not read Username for 'https://dev.example.com/org/repo': terminal prompts disabled"
    expect(explainGitError(msg)).toEqual({ key: 'gitError.noCredential', vars: { host: 'dev.example.com' } })
    expect(explainGitError("fatal: Authentication failed for 'https://git.example.org/x.git/'")?.vars).toEqual({
      host: 'git.example.org'
    })
  })

  it('recognises permission, missing-repository and SSH key errors', () => {
    expect(explainGitError('remote: Permission to o/r.git denied to someone.')?.key).toBe('gitError.permissionDenied')
    expect(explainGitError('remote: Repository not found.')?.key).toBe('gitError.repoNotFound')
    expect(explainGitError('git@github.com: Permission denied (publickey).')?.key).toBe('gitError.sshKey')
  })

  it('returns null for errors it does not know, including those a dialog already handles', () => {
    expect(explainGitError('fatal: something unexpected')).toBeNull()
    expect(explainGitError(' ! [rejected] main -> main (non-fast-forward)')).toBeNull()
    expect(explainGitError("fatal: Unable to create '/r/.git/index.lock': File exists.")).toBeNull()
  })
})

describe('withoutIpcPrefix', () => {
  it("strips Electron's IPC wrapper and leaves other text alone", () => {
    expect(withoutIpcPrefix(IPC + 'fatal: boom')).toBe('fatal: boom')
    expect(withoutIpcPrefix("Error invoking remote method 'git': fatal: boom")).toBe('fatal: boom')
    expect(withoutIpcPrefix('fatal: boom')).toBe('fatal: boom')
  })
})

describe('token scope errors', () => {
  it('names the scope a Forgejo/Gitea token lacks', () => {
    const msg =
      "Error invoking remote method 'hosting:whoAmI': Error: Forgejo: token does not have at least one of required scope(s): [read:user]"
    expect(explainGitError(msg)).toEqual({ key: 'gitError.tokenScope', vars: { scopes: 'read:user' } })
  })

  it("recognises GitLab's insufficient_scope", () => {
    expect(explainGitError('GitLab: insufficient_scope')?.key).toBe('gitError.tokenScopeAny')
  })
})

describe('readableError', () => {
  const t = (k: string): string => `<${k}>`
  const interp = (s: string, v: Record<string, string>): string => `${s}${JSON.stringify(v)}`
  it('explains what it recognises and unwraps the rest', () => {
    expect(readableError('remote: Repository not found.', t, interp)).toBe('<gitError.repoNotFound>{}')
    expect(readableError("Error invoking remote method 'git': Error: fatal: boom", t, interp)).toBe('fatal: boom')
  })
})
