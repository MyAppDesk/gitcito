import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askActionDetail,
  askActionSafety,
  askActionsAutoRun,
  destructiveAskFiles
} from '../src/renderer/src/lib/askActions'
import { actionOutcomeNote, createRepoChatStore } from '../src/renderer/src/lib/repoChatStore'
import { chatAnswerSchema, validateChatAnswer } from '../src/main/repoChat'
import { defaultProfile, type AskAction, type RepoChatReply, type RepoStatus } from '../src/shared/types'

const cfg = defaultProfile().ai

const stage: AskAction = { type: 'stage', files: ['a.ts'], description: 'Stage a.ts' }
const commit: AskAction = { type: 'commit', message: 'feat: x', description: 'Commit' }
const discard: AskAction = { type: 'discard', files: ['a.ts', 'b.ts'], description: 'Discard' }

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
  })

  it('auto-runs only what the approval mode covers, never destructive work', () => {
    expect(askActionsAutoRun([stage], 'ask')).toBe(false)
    expect(askActionsAutoRun([stage], 'auto-safe')).toBe(true)
    expect(askActionsAutoRun([stage, commit], 'auto-safe')).toBe(false)
    expect(askActionsAutoRun([stage, commit], 'auto-all')).toBe(true)
    expect(askActionsAutoRun([stage, discard], 'auto-all')).toBe(false)
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
  })
})

describe('chat action executor', () => {
  const git = vi.fn()
  // The api adapter reads window at module scope, so the executor is imported
  // only after the stub exists.
  let executeAskActions: typeof import('../src/renderer/src/lib/askActionRun')['executeAskActions']
  beforeAll(async () => {
    vi.stubGlobal('window', { api: { git, platform: 'darwin' } })
    executeAskActions = (await import('../src/renderer/src/lib/askActionRun')).executeAskActions
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
})

describe('chat answer contract with actions', () => {
  const evidence = new Set(['E1'])
  const paths = new Set(['a.ts'])

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
})
