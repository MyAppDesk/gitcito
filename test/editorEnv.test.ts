import { describe, it, expect } from 'vitest'
import { stripEditorGitAskpass } from '../src/main/editorEnv'

const EDITOR = {
  GIT_ASKPASS: '/opt/editor/extensions/git/dist/askpass.sh',
  VSCODE_GIT_IPC_HANDLE: '/run/user/1000/vscode-git-1.sock',
  VSCODE_GIT_ASKPASS_MAIN: '/opt/editor/extensions/git/dist/askpass-main.js',
  VSCODE_GIT_ASKPASS_NODE: '/usr/lib/electron/electron',
  VSCODE_GIT_ASKPASS_EXTRA_ARGS: ''
}

describe('stripEditorGitAskpass', () => {
  it('removes the editor askpass hand-off, so git never raises the editor login prompt', () => {
    const env: NodeJS.ProcessEnv = { ...EDITOR, PATH: '/usr/bin', TERM_PROGRAM: 'vscode' }
    stripEditorGitAskpass(env)
    expect(env).toEqual({ PATH: '/usr/bin', TERM_PROGRAM: 'vscode' })
  })

  it('removes an SSH_ASKPASS only when it is the same editor script', () => {
    const same: NodeJS.ProcessEnv = { ...EDITOR, SSH_ASKPASS: EDITOR.GIT_ASKPASS }
    stripEditorGitAskpass(same)
    expect(same.SSH_ASKPASS).toBeUndefined()

    const own: NodeJS.ProcessEnv = { ...EDITOR, SSH_ASKPASS: '/usr/bin/ksshaskpass' }
    stripEditorGitAskpass(own)
    expect(own.SSH_ASKPASS).toBe('/usr/bin/ksshaskpass')
  })

  it('keeps a GIT_ASKPASS the user set outside an editor', () => {
    const env: NodeJS.ProcessEnv = { GIT_ASKPASS: '/usr/bin/ksshaskpass' }
    expect(stripEditorGitAskpass(env)).toEqual([])
    expect(env.GIT_ASKPASS).toBe('/usr/bin/ksshaskpass')
  })
})
