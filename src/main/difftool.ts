import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { parseToolHelp, sortTools, type DiffToolConfig } from '../shared/diffTools'

const pexecFile = promisify(execFile)

/**
 * Handing a file to an external diff or merge tool.
 *
 * These get their own IPC channel rather than riding the `git` dispatcher on
 * purpose: that dispatcher serialises calls per repository, and a merge tool
 * stays open for as long as the user needs it. Holding the repo's write lock for
 * ten minutes would freeze every other action in that tab.
 */

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await pexecFile('git', ['-C', repoPath, ...args], {
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    maxBuffer: 10 * 1024 * 1024
  })
  return stdout
}

async function config(repoPath: string, key: string): Promise<string> {
  return (await git(repoPath, ['config', '--get', key]).catch(() => '')).trim()
}

export async function diffToolConfig(repoPath: string): Promise<DiffToolConfig> {
  // `--tool-help` exits non-zero on some builds even when it printed the list.
  const help = async (cmd: string): Promise<string> =>
    git(repoPath, [cmd, '--tool-help']).catch((e: { stdout?: string }) => e.stdout ?? '')

  const [diffHelp, mergeHelp, diffTool, mergeTool, keepBackup] = await Promise.all([
    help('difftool'),
    help('mergetool'),
    config(repoPath, 'diff.tool'),
    config(repoPath, 'merge.tool'),
    config(repoPath, 'mergetool.keepBackup')
  ])

  return {
    diffTool,
    mergeTool,
    diffTools: sortTools(parseToolHelp(diffHelp)),
    mergeTools: sortTools(parseToolHelp(mergeHelp)),
    // Unset means git's default, which is to keep the .orig file.
    keepBackup: keepBackup !== 'false'
  }
}

/**
 * Record the chosen tools. Written globally by default: which comparison app
 * someone likes is a property of the person, not of one repository — and it is
 * the same `diff.tool` their command line already reads.
 */
export async function setDiffToolConfig(
  repoPath: string,
  values: { diffTool?: string; mergeTool?: string; keepBackup?: boolean },
  scope: 'global' | 'repo' = 'global'
): Promise<void> {
  const where = scope === 'global' ? ['--global'] : []
  const write = async (key: string, value: string): Promise<void> => {
    if (value) await git(repoPath, ['config', ...where, key, value])
    // An empty choice means "no tool", which is an unset key, not an empty one.
    else await git(repoPath, ['config', ...where, '--unset', key]).catch(() => undefined)
  }
  if (values.diffTool !== undefined) await write('diff.tool', values.diffTool)
  if (values.mergeTool !== undefined) await write('merge.tool', values.mergeTool)
  if (values.keepBackup !== undefined) await write('mergetool.keepBackup', String(values.keepBackup))
}

/**
 * `git difftool` on one file. `rev` compares the working tree against that
 * commit; without it, against the index/HEAD as git normally would.
 *
 * Resolves when the tool exits. That can be minutes — the renderer keeps its
 * button disabled meanwhile rather than the app blocking.
 */
export async function openDiffTool(repoPath: string, file: string, rev?: string, tool?: string): Promise<string> {
  const args = ['difftool', '--no-prompt']
  if (tool) args.push(`--tool=${tool}`)
  if (rev) args.push(rev)
  args.push('--', file)
  try {
    await git(repoPath, args)
    return ''
  } catch (err) {
    const e = err as { stderr?: string; message?: string }
    return (e.stderr || e.message || 'git difftool failed').trim()
  }
}

/**
 * `git mergetool` on one conflicted file. On a clean exit git stages the result
 * itself, so the conflict is resolved by the time this returns.
 */
export async function openMergeTool(repoPath: string, file: string, tool?: string): Promise<string> {
  const args = ['mergetool', '--no-prompt']
  if (tool) args.push(`--tool=${tool}`)
  args.push('--', file)
  try {
    await git(repoPath, args)
    return ''
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string }
    // mergetool reports "file was not modified" on stdout and still exits 1 when
    // the user closed the tool without saving — worth showing verbatim.
    return (e.stderr || e.stdout || e.message || 'git mergetool failed').trim()
  }
}

export function registerDiffToolHandlers(): void {
  ipcMain.handle('difftool:config', (_e, repoPath: string) => diffToolConfig(repoPath))
  ipcMain.handle(
    'difftool:set',
    (_e, repoPath: string, values: { diffTool?: string; mergeTool?: string; keepBackup?: boolean }, scope: 'global' | 'repo') =>
      setDiffToolConfig(repoPath, values, scope)
  )
  ipcMain.handle('difftool:diff', (_e, repoPath: string, file: string, rev?: string, tool?: string) =>
    openDiffTool(repoPath, file, rev, tool)
  )
  ipcMain.handle('difftool:merge', (_e, repoPath: string, file: string, tool?: string) =>
    openMergeTool(repoPath, file, tool)
  )
}
