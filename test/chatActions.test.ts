import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askActionDetail,
  askActionSafety,
  askActionsAutoRun,
  destructiveAskFiles
} from '../src/renderer/src/lib/askActions'
import { actionOutcomeNote, createRepoChatStore } from '../src/renderer/src/lib/repoChatStore'
import { repoChatActionMeta } from '../src/renderer/src/lib/askActionMeta'
import { chatAnswerSchema, validateChatAnswer } from '../src/main/repoChat'
import { REPO_CHAT_ACTIONS_SCHEMA } from '../src/main/aiSchemas'
import { validateRepoChatActions } from '../src/main/grounding'
import {
  defaultProfile,
  type AskAction,
  type RepoChatAction,
  type RepoChatFileAction,
  type RepoChatExecutionResult,
  type RepoChatReply,
  type RepoStatus
} from '../src/shared/types'

const cfg = defaultProfile().ai

const stage: AskAction = { type: 'stage', files: ['a.ts'], description: 'Stage a.ts' }
const commit: AskAction = { type: 'commit', message: 'feat: x', description: 'Commit' }
const discard: AskAction = { type: 'discard', files: ['a.ts', 'b.ts'], description: 'Discard' }
const editFile: RepoChatFileAction = {
  type: 'edit_file',
  path: 'LICENSE',
  oldText: 'MIT License',
  newText: 'Apache License',
  description: 'Replace the license heading'
}
const preparedEdit: RepoChatAction = {
  ...editFile,
  expectedHash: 'a'.repeat(64),
  expectedOccurrences: 1,
  preview: '-MIT License\n+Apache License'
}
const actionContext = {
  workingTreePaths: new Set(['dirty.ts']),
  evidencePaths: new Set(['LICENSE']),
  completePaths: new Set(['LICENSE'])
}

describe('repository chat file action contract', () => {
  it('validates grounded file actions followed by Git actions', () => {
    const actions = [editFile, { type: 'stage', files: ['LICENSE'], description: 'Stage LICENSE' }]
    expect(validateRepoChatActions(actions, actionContext)).toEqual([])
    expect(REPO_CHAT_ACTIONS_SCHEMA).toMatchObject({ type: 'array', maxItems: 64 })
  })

  it('keeps replacement grounded and file actions before Git actions', () => {
    const ungrounded = [{ type: 'delete_file', path: 'ghost.ts', description: 'Delete it' }]
    expect(validateRepoChatActions(ungrounded, actionContext).join(' ')).toContain('evidence')

    const late = [{ type: 'stage', files: ['dirty.ts'], description: 'Stage' }, editFile]
    expect(validateRepoChatActions(late, actionContext).join(' ')).toContain('before Git actions')

    const incomplete = [
      { type: 'write_file', path: 'LICENSE', content: 'Apache', mode: 'replace', description: 'Replace' }
    ]
    expect(
      validateRepoChatActions(incomplete, { ...actionContext, completePaths: new Set() }).join(' ')
    ).toContain('complete evidence')
  })

  it('rejects plans over the file, Git, and total action limits', () => {
    const files = Array.from({ length: 49 }, (_, i) => ({
      type: 'write_file' as const,
      path: `new-${i}.txt`,
      content: 'x',
      mode: 'create' as const,
      description: 'Create file'
    }))
    expect(validateRepoChatActions(files, actionContext).join(' ')).toContain('48 file actions')
  })
})

describe('chat action safety ladder', () => {
  it('classifies each action type', () => {
    expect(askActionSafety(stage)).toBe('safe')
    expect(askActionSafety({ type: 'gitignore', patterns: ['*.log'], description: '' })).toBe('safe')
    expect(askActionSafety({ type: 'branch', name: 'f/x', description: '' })).toBe('safe')
    expect(askActionSafety({ type: 'tag', name: 'v1', description: '' })).toBe('safe')
    expect(askActionSafety(commit)).toBe('normal')
    expect(askActionSafety({ type: 'stash', description: '' })).toBe('normal')
    expect(askActionSafety({ type: 'checkout', ref: 'main', description: '' })).toBe('normal')
    expect(askActionSafety(discard)).toBe('destructive')
    expect(askActionSafety(preparedEdit)).toBe('normal')
  })

  it('auto-runs only what the approval mode covers, never destructive work', () => {
    expect(askActionsAutoRun([stage], 'ask')).toBe(false)
    expect(askActionsAutoRun([stage], 'auto-safe')).toBe(true)
    expect(askActionsAutoRun([stage, commit], 'auto-safe')).toBe(false)
    expect(askActionsAutoRun([stage, commit], 'auto-all')).toBe(true)
    expect(askActionsAutoRun([stage, discard], 'auto-all')).toBe(false)
    expect(askActionsAutoRun([preparedEdit], 'auto-all')).toBe(true)
    expect(askActionsAutoRun([preparedEdit], 'auto-safe')).toBe(false)
    expect(askActionsAutoRun([], 'auto-all')).toBe(false)
    expect(askActionsAutoRun([stage], undefined)).toBe(false)
  })

  it('names every file a plan would discard, once', () => {
    expect(destructiveAskFiles([stage, discard, { ...discard, files: ['b.ts'] }])).toEqual(['a.ts', 'b.ts'])
    expect(destructiveAskFiles([stage, commit])).toEqual([])
  })

  it('summarises action parameters for the card row', () => {
    expect(askActionDetail(commit, 'all')).toBe('“feat: x”')
    expect(askActionDetail({ ...commit, files: ['a.ts'] }, 'all')).toBe('“feat: x” · a.ts')
    expect(askActionDetail({ type: 'stash', description: '' }, 'all changes')).toBe('all changes')
    expect(askActionDetail({ type: 'branch', name: 'f/x', at: 'main', description: '' }, '')).toBe('f/x (from main)')
    expect(askActionDetail(stage, '')).toBe('a.ts')
    expect(askActionDetail(preparedEdit, '')).toBe('LICENSE')
  })

  it('provides metadata for every file action', () => {
    expect(repoChatActionMeta('edit_file').labelKey).toBe('askAction.editFile')
    expect(repoChatActionMeta('write_file', 'create').labelKey).toBe('askAction.createFile')
    expect(repoChatActionMeta('write_file', 'replace').labelKey).toBe('askAction.replaceFile')
    expect(repoChatActionMeta('delete_file').labelKey).toBe('askAction.deleteFile')
  })
})

describe('chat action executor', () => {
  const git = vi.fn()
  // The api adapter reads window at module scope, so the executor is imported
  // only after the stub exists.
  let executeAskActions: typeof import('../src/renderer/src/lib/askActionRun')['executeAskActions']
  let executeRepoChatActions: typeof import('../src/renderer/src/lib/askActionRun')['executeRepoChatActions']
  beforeAll(async () => {
    vi.stubGlobal('window', { api: { git, platform: 'darwin' } })
    const executor = await import('../src/renderer/src/lib/askActionRun')
    executeAskActions = executor.executeAskActions
    executeRepoChatActions = executor.executeRepoChatActions
  })
  const status: RepoStatus = {
    current: 'main',
    tracking: null,
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [
      { path: 'tracked.ts', status: 'M' },
      { path: 'new.ts', status: '?', untracked: true }
    ],
    conflicted: []
  }
  beforeEach(() => {
    git.mockReset()
    git.mockImplementation((method: string) => Promise.resolve(method === 'status' ? status : undefined))
  })

  it('maps every action to its git call, in order', async () => {
    const result = await executeAskActions('/repo', [
      stage,
      { type: 'commit', message: 'feat: x', files: ['a.ts'], description: '' },
      { type: 'unknown' } as unknown as AskAction
    ])
    expect(result).toEqual({ applied: 2, skipped: ['unknown'] })
    const calls = git.mock.calls.map((call) => call[0])
    expect(calls).toEqual(['status', 'stage', 'stage', 'commit'])
  })

  it('routes discard through clean for untracked files and checkout for tracked ones', async () => {
    await executeAskActions('/repo', [{ type: 'discard', files: ['tracked.ts', 'new.ts'], description: '' }])
    expect(git).toHaveBeenCalledWith('discard', '/repo', ['tracked.ts'], false)
    expect(git).toHaveBeenCalledWith('discard', '/repo', ['new.ts'], true)
  })

  it('stops at the first failing call and reports nothing as applied silently', async () => {
    git.mockImplementation((method: string) =>
      method === 'status'
        ? Promise.resolve(status)
        : method === 'stage'
          ? Promise.reject(new Error('index locked'))
          : Promise.resolve(undefined)
    )
    await expect(executeAskActions('/repo', [stage, commit])).rejects.toThrow('index locked')
    expect(git.mock.calls.map((call) => call[0])).toEqual(['status', 'stage'])
  })

  it('applies the file prefix once before staging and committing', async () => {
    const actions: RepoChatAction[] = [
      preparedEdit,
      { type: 'stage', files: ['LICENSE'], description: 'Stage' },
      { type: 'commit', message: 'docs: change license', description: 'Commit' }
    ]
    git.mockImplementation((method: string) =>
      Promise.resolve(
        method === 'status'
          ? { ...status, staged: [{ path: 'LICENSE', status: 'M' }] }
          : method === 'applyRepoFileActions'
            ? { ok: true, applied: 1 }
            : undefined
      )
    )
    const result = await executeRepoChatActions('/repo', actions)
    expect(result.error).toBeUndefined()
    expect(result.applied).toBe(3)
    expect(git.mock.calls.map((call) => call[0])).toEqual([
      'applyRepoFileActions',
      'stage',
      'status',
      'commit'
    ])
  })

  it('blocks an empty commit before invoking commit', async () => {
    const result = await executeRepoChatActions('/repo', [commit])
    expect(result.error?.code).toBe('no_staged_changes')
    expect(git.mock.calls.map((call) => call[0])).toEqual(['status'])
  })

  it('reports applied and remaining actions after a hook failure', async () => {
    git.mockImplementation((method: string) => {
      if (method === 'status') {
        return Promise.resolve({ ...status, staged: [{ path: 'a.ts', status: 'M' }] })
      }
      if (method === 'commit') return Promise.reject(new Error('pre-commit hook exited with code 1'))
      return Promise.resolve(undefined)
    })
    const result = await executeRepoChatActions('/repo', [
      stage,
      commit,
      { type: 'tag', name: 'v1', description: 'Tag' }
    ])
    expect(result).toMatchObject({ applied: 1, failedIndex: 1, failedType: 'commit', remaining: 1 })
    expect(result.error?.code).toBe('hook_failed')
    expect(result.actionResults.map((item) => item.status)).toEqual(['done', 'failed', 'skipped'])
  })

  it('uses the discriminated file result for a failed batch', async () => {
    git.mockResolvedValueOnce({ ok: false, error: { code: 'stale_file', paths: ['LICENSE'] } })
    const result = await executeRepoChatActions('/repo', [preparedEdit, stage])
    expect(result).toMatchObject({ applied: 0, failedIndex: 0, failedType: 'edit_file', remaining: 1 })
    expect(result.error?.code).toBe('stale_file')
    expect(result.actionResults.map((item) => item.status)).toEqual(['failed', 'skipped'])
  })
})

describe('chat proposals in the session store', () => {
  const reply = (extra: Partial<RepoChatReply>): RepoChatReply => ({
    content: 'plan',
    sources: [],
    skipped: [],
    ...extra
  })

  it('attaches proposed actions to the reply as a pending card', async () => {
    const store = createRepoChatStore(vi.fn(async () => reply({ actions: [stage] })))
    await store.getState().send('/repo', 'stage it', cfg)
    const assistant = store.getState().threads['/repo'].messages.at(-1)
    expect(assistant?.actions).toEqual([stage])
    expect(assistant?.actionsState).toBe('pending')
  })

  it('advances one card through run and failure states', async () => {
    const store = createRepoChatStore(vi.fn(async () => reply({ actions: [stage] })))
    await store.getState().send('/repo', 'stage it', cfg)
    const id = store.getState().threads['/repo'].messages.at(-1)?.id as number

    store.getState().setActions('/repo', id, { actionsState: 'running', actionsAuto: true })
    expect(store.getState().threads['/repo'].messages.at(-1)?.actionsState).toBe('running')

    store.getState().setActions('/repo', id, { actionsState: 'done', actionsApplied: 1 })
    const done = store.getState().threads['/repo'].messages.at(-1)
    expect(done).toMatchObject({ actionsState: 'done', actionsApplied: 1, actionsAuto: true })
    // A user turn (no actions) is never patched.
    store.getState().setActions('/repo', store.getState().threads['/repo'].messages[0].id, { actionsState: 'done' })
    expect(store.getState().threads['/repo'].messages[0].actionsState).toBeUndefined()
  })

  it('tells the model what happened to an earlier proposal', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(reply({ actions: [stage] }))
      .mockResolvedValueOnce(reply({}))
    const store = createRepoChatStore(request)
    await store.getState().send('/repo', 'stage it', cfg)
    const id = store.getState().threads['/repo'].messages.at(-1)?.id as number
    store.getState().setActions('/repo', id, { actionsState: 'done', actionsApplied: 1 })

    await store.getState().send('/repo', 'what now?', cfg)
    const transcript = request.mock.calls[1][1] as { role: string; content: string }[]
    expect(transcript[1].content).toContain('the app executed 1')

    expect(actionOutcomeNote({ id: 1, role: 'assistant', content: '', actions: [stage] })).toContain('not been run')
    expect(
      actionOutcomeNote({ id: 1, role: 'assistant', content: '', actions: [stage], actionsState: 'dismissed' })
    ).toContain('dismissed')
    expect(actionOutcomeNote({ id: 1, role: 'user', content: 'hi' })).toBe('')
  })

  const partialResult: RepoChatExecutionResult = {
    applied: 1,
    failedIndex: 1,
    failedType: 'commit',
    remaining: 0,
    error: { code: 'hook_failed', detail: 'hook exited 1' },
    actionResults: [
      { index: 0, type: 'stage', status: 'done' },
      { index: 1, type: 'commit', status: 'failed' }
    ]
  }

  it('stores a partial result and appends a final response without actions', async () => {
    const request = vi.fn(async () => reply({ actions: [stage, commit] }))
    const finalize = vi.fn(async () => reply({ content: 'Stage succeeded; commit failed.', actions: [stage] }))
    const store = createRepoChatStore(request, finalize)
    await store.getState().send('/repo', 'stage and commit', cfg)
    const proposal = store.getState().threads['/repo'].messages.at(-1)!

    await store.getState().finalizeActions('/repo', proposal.id, partialResult, cfg)
    expect(finalize).toHaveBeenCalledOnce()
    expect(store.getState().threads['/repo'].messages.at(-1)?.content).toContain('commit failed')
    expect(store.getState().threads['/repo'].messages.at(-1)?.actions).toBeUndefined()
    const stored = store.getState().threads['/repo'].messages.find((message) => message.id === proposal.id)
    expect(stored?.execution).toEqual(partialResult)
    expect(actionOutcomeNote({ ...proposal, execution: partialResult })).toContain('hook_failed')
  })

  it('does not finalize dismissed actions', async () => {
    const finalize = vi.fn(async () => reply({ content: 'final' }))
    const store = createRepoChatStore(vi.fn(async () => reply({ actions: [stage] })), finalize)
    await store.getState().send('/repo', 'stage', cfg)
    const proposal = store.getState().threads['/repo'].messages.at(-1)!
    store.getState().setActions('/repo', proposal.id, { actionsState: 'dismissed' })
    await store.getState().finalizeActions('/repo', proposal.id, partialResult, cfg)
    expect(finalize).not.toHaveBeenCalled()
  })

  it('ignores a late final response after the thread is cleared', async () => {
    let resolveFinalize: ((value: RepoChatReply) => void) | undefined
    const finalize = vi.fn(
      () => new Promise<RepoChatReply>((resolve) => {
        resolveFinalize = resolve
      })
    )
    const store = createRepoChatStore(vi.fn(async () => reply({ actions: [stage, commit] })), finalize)
    await store.getState().send('/repo', 'stage and commit', cfg)
    const proposal = store.getState().threads['/repo'].messages.at(-1)!
    const pending = store.getState().finalizeActions('/repo', proposal.id, partialResult, cfg)
    store.getState().clear('/repo')
    resolveFinalize?.(reply({ content: 'late final' }))
    await pending
    expect(store.getState().threads['/repo']).toBeUndefined()
  })

  it('keeps execution authoritative when finalization fails', async () => {
    const finalize = vi.fn(async () => {
      throw new Error('provider unavailable')
    })
    const store = createRepoChatStore(vi.fn(async () => reply({ actions: [stage, commit] })), finalize)
    await store.getState().send('/repo', 'stage and commit', cfg)
    const proposal = store.getState().threads['/repo'].messages.at(-1)!
    await store.getState().finalizeActions('/repo', proposal.id, partialResult, cfg)
    const thread = store.getState().threads['/repo']
    const stored = thread.messages.find((message) => message.id === proposal.id)
    expect(stored).toMatchObject({ execution: partialResult, finalizationFailed: true })
    expect(thread.error).toBeNull()
  })
})

describe('chat answer contract with actions', () => {
  const evidence = new Set(['E1'])
  const paths = {
    workingTreePaths: new Set(['a.ts']),
    evidencePaths: new Set<string>(),
    completePaths: new Set<string>()
  }

  it('only offers the actions field when the setting allows it', () => {
    const on = chatAnswerSchema(true) as { properties: Record<string, unknown> }
    const off = chatAnswerSchema(false) as { properties: Record<string, unknown> }
    expect(on.properties.actions).toBeDefined()
    expect(off.properties.actions).toBeUndefined()
  })

  it('accepts a grounded proposal and rejects invented paths', () => {
    const value = { content: 'plan', sourceIds: [], actions: [stage] }
    expect(validateChatAnswer(value, evidence, paths)).toEqual([])
    const invented = { content: 'plan', sourceIds: [], actions: [{ ...stage, files: ['ghost.ts'] }] }
    expect(validateChatAnswer(invented, evidence, paths).join(' ')).toContain('ghost.ts')
  })

  it('tolerates a blank content only when a proposal can stand in for it', () => {
    // Small models sometimes answer with actions only — that reply is
    // salvageable, so it must not be rejected and retried into a hard error.
    expect(validateChatAnswer({ content: '', sourceIds: [], actions: [stage] }, evidence, paths)).toEqual([])
    expect(validateChatAnswer({ content: '', sourceIds: [] }, evidence, paths).join(' ')).toContain('non-empty')
    expect(validateChatAnswer({ content: '', sourceIds: [], actions: [] }, evidence, paths).join(' ')).toContain(
      'non-empty'
    )
    // Proposals disabled: an empty answer stays an error even with actions.
    expect(validateChatAnswer({ content: '', sourceIds: [], actions: [stage] }, evidence, null).join(' ')).toContain(
      'non-empty'
    )
  })

  it('rejects any actions at all when proposals are disabled', () => {
    const value = { content: 'plan', sourceIds: [], actions: [stage] }
    expect(validateChatAnswer(value, evidence, null).join(' ')).toContain('disabled')
    expect(validateChatAnswer({ content: 'answer', sourceIds: [] }, evidence, null)).toEqual([])
  })

  it('rejects action payloads hidden in content instead of the actions field', () => {
    const value = {
      content: '```json\n[{"type":"stage","files":["a.ts"],"description":"Stage"}]\n```',
      sourceIds: []
    }
    expect(validateChatAnswer(value, evidence, paths).join(' ')).toContain('actions field')
  })
})
