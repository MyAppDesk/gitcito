/**
 * Strip the credential hand-off a VS Code-family editor injects into its
 * integrated terminal.
 *
 * The editor's git extension sets `GIT_ASKPASS` to its own script, which talks
 * back to the editor over `VSCODE_GIT_IPC_HANDLE`. Gitcito started from that
 * terminal (`npm run dev`, `gitcito .`) passes the env on to every git it
 * spawns, so a fetch against an HTTPS remote with no credential helper raises
 * the *editor's* "sign in to GitHub" prompt, and `GIT_TERMINAL_PROMPT=0` does
 * not stop askpass. That fetch then holds the repo's write lock while the
 * prompt waits in another window, so every read queued behind it (branches,
 * status) appears to hang.
 *
 * Only the editor's variables go. A `GIT_ASKPASS` the user set themselves,
 * without the editor's IPC handle beside it, is kept.
 */
export function stripEditorGitAskpass(env: NodeJS.ProcessEnv): string[] {
  if (!env.VSCODE_GIT_IPC_HANDLE) return []
  const askpass = env.GIT_ASKPASS
  const removed: string[] = []
  for (const key of Object.keys(env)) {
    // An SSH_ASKPASS pointing at the same script is the editor's too.
    const editorOwned =
      key.startsWith('VSCODE_GIT_') || key === 'GIT_ASKPASS' || (key === 'SSH_ASKPASS' && !!askpass && env[key] === askpass)
    if (editorOwned) {
      delete env[key]
      removed.push(key)
    }
  }
  return removed
}
