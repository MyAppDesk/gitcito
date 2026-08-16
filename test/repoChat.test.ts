import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  collectAttachmentEvidence,
  filterRepoChatPaths,
  normalizeRepoChatAttachments,
  normalizeRepoChatMessages,
  packRepoChatEvidence,
  validateChatAnswer,
  validateChatSelection
} from '../src/main/repoChat'
import { gitService } from '../src/main/git'
import { createRepoChatStore } from '../src/renderer/src/lib/repoChatStore'
import {
  addAttachments,
  chatModelGroups,
  parseChatDrop,
  suggestedAttachments
} from '../src/renderer/src/lib/repoChatContext'
import { migrateAIConfig } from '../src/shared/aiAccounts'
import { cloneFixture, cleanupFixtures } from './fixtures'
import {
  canSubmitRepoChat,
  repoChatAvailable,
  repoChatSourceView,
  rightPanelDetailsState,
  rightPanelToggleAction
} from '../src/renderer/src/lib/repoChatUI'
import { useUIStore } from '../src/renderer/src/stores/ui'
import { defaultProfile, type RepoChatReply, type RepoStatus } from '../src/shared/types'

const cfg = defaultProfile().ai

describe('repository chat grounding', () => {
  it('allows only readable tracked paths outside privacy filters', () => {
    const paths = filterRepoChatPaths(
      [
        'README.md',
        'src/app.ts',
        '.env',
        'config/secrets.json',
        'assets/logo.png',
        'node_modules/pkg/index.js',
        'src/generated/client.ts',
        'package-lock.json',
        '../outside.ts'
      ],
      new Set(['src/app.ts'])
    )
    expect(paths).toEqual(['README.md'])
  })

  it('honours ignore rules even for paths checked as tracked context', async () => {
    const ignored = await gitService.ignoredTrackedFiles(process.cwd(), [
      'node_modules/example.js',
      'src/main/index.ts'
    ])
    expect(ignored).toEqual(['node_modules/example.js'])
  })

  it('bounds and validates the untrusted IPC transcript', () => {
    const raw = Array.from({ length: 14 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      content: `message ${i}`,
      sources: [{ id: 'forged', path: '/tmp/private', startLine: 1, endLine: 1 }]
    }))
    raw[13] = { role: 'user', content: ' latest question ', sources: [] }
    const normalized = normalizeRepoChatMessages(raw)
    expect(normalized).toHaveLength(12)
    expect(normalized[0].content).toBe('message 2')
    expect(normalized.at(-1)).toEqual({ role: 'user', content: 'latest question' })
    expect(() => normalizeRepoChatMessages([{ role: 'assistant', content: 'answer' }])).toThrow()
  })

  it('rejects model-invented paths and evidence ids', () => {
    const allowedPaths = new Set(['README.md', 'src/app.ts'])
    expect(validateChatSelection({ paths: ['src/app.ts'], searches: ['createApp'] }, allowedPaths)).toEqual([])
    expect(validateChatSelection({ paths: ['../../secret'], searches: [] }, allowedPaths).join(' ')).toContain(
      'not in the tracked-file list'
    )

    const allowedEvidence = new Set(['E1'])
    expect(validateChatAnswer({ content: 'Grounded answer', sourceIds: ['E1'] }, allowedEvidence)).toEqual([])
    expect(validateChatAnswer({ content: 'Invented', sourceIds: ['E2'] }, allowedEvidence).join(' ')).toContain(
      'was not provided'
    )
  })

  it('packs numbered evidence under the shared context budget', () => {
    const packed = packRepoChatEvidence(
      [
        { path: 'a.ts', startLine: 10, endLine: 20, text: 'one\ntwo\nthree' },
        { path: 'b.ts', startLine: 1, endLine: 10, text: 'abcdefghij' }
      ],
      7
    )
    expect(packed).toEqual([
      { id: 'E1', path: 'a.ts', startLine: 10, endLine: 11, text: 'one\ntwo' }
    ])
  })
})

describe('repository chat session store', () => {
  it('isolates repositories and blocks a duplicate send while one is pending', async () => {
    let resolveA: ((reply: RepoChatReply) => void) | undefined
    const request = vi.fn((repoPath: string) => {
      if (repoPath === '/repo/a') {
        return new Promise<RepoChatReply>((resolve) => {
          resolveA = resolve
        })
      }
      return Promise.resolve({ content: 'answer B', sources: [], skipped: [] })
    })
    const store = createRepoChatStore(request)

    const pendingA = store.getState().send('/repo/a', 'question A', cfg)
    await store.getState().send('/repo/a', 'duplicate', cfg)
    await store.getState().send('/repo/b', 'question B', cfg)
    expect(request).toHaveBeenCalledTimes(2)
    expect(store.getState().threads['/repo/a'].pending).toBe(true)
    expect(store.getState().threads['/repo/b'].messages.map((message) => message.content)).toEqual([
      'question B',
      'answer B'
    ])

    resolveA?.({ content: 'answer A', sources: [], skipped: [] })
    await pendingA
    expect(store.getState().threads['/repo/a'].messages.map((message) => message.content)).toEqual([
      'question A',
      'answer A'
    ])
  })

  it('retries the same final user turn without duplicating it', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce({ content: 'recovered', sources: [], skipped: [] })
    const store = createRepoChatStore(request)

    await store.getState().send('/repo/a', 'where is auth?', cfg)
    expect(store.getState().threads['/repo/a'].error).toBe('provider unavailable')
    await store.getState().retry('/repo/a', cfg)
    expect(store.getState().threads['/repo/a'].messages.map((message) => message.content)).toEqual([
      'where is auth?',
      'recovered'
    ])
  })

  it('stores forty messages but sends only the latest twelve turns', async () => {
    const request = vi.fn(async (_repoPath, messages) => ({
      content: `answer ${messages.at(-1)?.content}`,
      sources: [],
      skipped: []
    }))
    const store = createRepoChatStore(request)
    for (let i = 0; i < 25; i++) await store.getState().send('/repo/a', `question ${i}`, cfg)

    expect(store.getState().threads['/repo/a'].messages).toHaveLength(40)
    const lastTranscript = request.mock.calls.at(-1)?.[1]
    expect(lastTranscript).toHaveLength(12)
    expect(lastTranscript?.at(-1)).toEqual({ role: 'user', content: 'question 24' })
  })

  it('does not resurrect a cleared conversation when an old request finishes', async () => {
    let finish: ((reply: RepoChatReply) => void) | undefined
    const store = createRepoChatStore(
      () =>
        new Promise<RepoChatReply>((resolve) => {
          finish = resolve
        })
    )
    const pending = store.getState().send('/repo/a', 'question', cfg)
    store.getState().clear('/repo/a')
    finish?.({ content: 'late answer', sources: [], skipped: [] })
    await pending
    expect(store.getState().threads['/repo/a']).toBeUndefined()
  })
})

describe('repository chat panel behavior', () => {
  it('toggles the right column while preserving required conflict details', () => {
    expect(rightPanelToggleAction(false, false, false)).toBe('open-chat')
    expect(rightPanelToggleAction(false, false, true)).toBe('close-all')
    expect(rightPanelToggleAction(true, false, false)).toBe('close-all')
    expect(rightPanelToggleAction(true, true, true)).toBe('show-required-details')
  })

  it('offers WIP Details before the graph row has been explicitly selected', () => {
    const clean = { staged: [], unstaged: [], conflicted: [] }
    const dirty = { staged: [], unstaged: [{ path: 'src/app.ts', status: 'M' as const }], conflicted: [] }

    expect(rightPanelDetailsState(false, false, clean)).toEqual({
      available: false,
      selectWip: false
    })
    expect(rightPanelDetailsState(false, false, dirty)).toEqual({
      available: true,
      selectWip: true
    })
    expect(rightPanelDetailsState(true, false, dirty)).toEqual({
      available: true,
      selectWip: false
    })
    expect(rightPanelDetailsState(false, true, dirty)).toEqual({
      available: true,
      selectWip: false
    })
  })

  it('opens, switches to Details without losing Chat, and retracts back to Details', () => {
    useUIStore.setState({ chatPanelOpen: false, rightPanelTab: 'details' })

    useUIStore.getState().openChatPanel()
    expect(useUIStore.getState()).toMatchObject({ chatPanelOpen: true, rightPanelTab: 'chat' })

    useUIStore.getState().showDetailsPanel()
    expect(useUIStore.getState()).toMatchObject({ chatPanelOpen: true, rightPanelTab: 'details' })

    useUIStore.getState().openChatPanel()
    useUIStore.getState().closeChatPanel()
    expect(useUIStore.getState()).toMatchObject({ chatPanelOpen: false, rightPanelTab: 'details' })
  })

  it('opens a cited file at its grounded start line', () => {
    expect(
      repoChatSourceView('/repo/a', {
        id: 'E1',
        path: 'src/main/app.ts',
        startLine: 42,
        endLine: 48
      })
    ).toEqual({
      repoPath: '/repo/a',
      file: 'src/main/app.ts',
      source: { type: 'tree' },
      mode: 'file',
      line: 42
    })
  })

  it('groups the switcher by account, live models first, without duplicates', () => {
    const ai = migrateAIConfig({
      accounts: [
        { id: 'work', label: 'Work', provider: 'openai', endpoint: '', apiKey: '', model: 'gpt-4o-mini' },
        { id: 'home', label: '', provider: 'anthropic', endpoint: '', apiKey: '', model: 'claude-sonnet-5' }
      ],
      defaultAccountId: 'work',
      assignments: { chat: { accountId: 'work', model: 'a-private-deployment' } }
    })

    const groups = chatModelGroups(ai, { work: ['gpt-4o-mini', 'gpt-4o'] })
    expect(groups).toEqual([
      // The account's own model and the pinned chat model survive even when the
      // provider never listed them.
      { accountId: 'work', label: 'Work', models: ['gpt-4o-mini', 'gpt-4o', 'a-private-deployment'] },
      // No catalogue yet for this one, so it falls back to the preset list; an
      // empty label falls back to the provider's.
      { accountId: 'home', label: 'Anthropic', models: expect.arrayContaining(['claude-sonnet-5']) }
    ])
  })

  it('hides chat entirely when AI or chat itself is switched off', () => {
    expect(repoChatAvailable({ enabled: true, repoChat: true })).toBe(true)
    expect(repoChatAvailable({ enabled: true })).toBe(true)
    expect(repoChatAvailable({ enabled: false, repoChat: true })).toBe(false)
    expect(repoChatAvailable({ enabled: true, repoChat: false })).toBe(false)
    expect(repoChatAvailable(null)).toBe(false)
    // With no chat to open, the panel toggle stops offering it.
    expect(rightPanelToggleAction(false, false, false, false)).toBe('close-all')
    expect(rightPanelToggleAction(false, false, false, true)).toBe('open-chat')
  })

  it('blocks the composer while AI is disabled or a request is pending', () => {
    expect(canSubmitRepoChat(false, false, 'question')).toBe(false)
    expect(canSubmitRepoChat(true, true, 'question')).toBe(false)
    expect(canSubmitRepoChat(true, false, '   ')).toBe(false)
    expect(canSubmitRepoChat(true, false, 'question')).toBe(true)
  })
})

const emptyStatus: RepoStatus = {
  current: 'main',
  tracking: null,
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  conflicted: []
}

describe('repository chat pinned context', () => {
  afterAll(() => cleanupFixtures())

  it('accepts only well-formed items and folds an in-repo path back to a repo file', () => {
    expect(
      normalizeRepoChatAttachments(
        [
          { kind: 'file', path: 'src/main/git.ts' },
          { kind: 'commit', hash: 'AbC1234' },
          { kind: 'external', path: '/tmp/notes.md' },
          { kind: 'external', path: '/repo/src/app.ts' },
          { kind: 'file', path: 'src/main/git.ts' }
        ],
        '/repo'
      )
    ).toEqual([
      { kind: 'file', path: 'src/main/git.ts' },
      { kind: 'commit', hash: 'abc1234' },
      { kind: 'external', path: '/tmp/notes.md' },
      { kind: 'file', path: 'src/app.ts' }
    ])
    expect(normalizeRepoChatAttachments(undefined)).toEqual([])
    expect(() => normalizeRepoChatAttachments([{ kind: 'file', path: '../escape.ts' }])).toThrow()
    expect(() => normalizeRepoChatAttachments([{ kind: 'commit', hash: 'not-a-hash' }])).toThrow()
    expect(() => normalizeRepoChatAttachments([{ kind: 'external', path: 'relative.md' }])).toThrow()
  })

  it('caps the pinned list and ignores duplicates', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ kind: 'file' as const, path: `f${i}.ts` }))
    expect(addAttachments([], many)).toHaveLength(8)
    expect(addAttachments([{ kind: 'file', path: 'a.ts' }], [{ kind: 'file', path: 'a.ts' }])).toHaveLength(1)
  })

  it('prefers an in-app drag over the operating system file list', () => {
    expect(parseChatDrop({ commit: 'DEADBEEF', path: 'src/a.ts', files: ['/tmp/x.md'] })).toEqual([
      { kind: 'commit', hash: 'deadbeef' }
    ])
    expect(parseChatDrop({ path: 'src/a.ts', files: ['/tmp/x.md'] })).toEqual([
      { kind: 'file', path: 'src/a.ts' }
    ])
    expect(parseChatDrop({ files: ['/tmp/x.md', '/tmp/y.md'] })).toEqual([
      { kind: 'external', path: '/tmp/x.md' },
      { kind: 'external', path: '/tmp/y.md' }
    ])
    expect(parseChatDrop({ commit: 'nope', files: [] })).toEqual([])
  })

  it('suggests what is on screen, minus what is already pinned', () => {
    expect(
      suggestedAttachments({
        openFile: 'src/a.ts',
        selectedCommit: 'abc1234',
        attached: [{ kind: 'file', path: 'src/a.ts' }]
      })
    ).toEqual([{ kind: 'commit', hash: 'abc1234' }])
    expect(suggestedAttachments({ openFile: null, selectedCommit: null, attached: [] })).toEqual([])
  })

  it('refuses a secret-looking pinned file and says why instead of reading it', async () => {
    const skipped: { label: string; reason: string }[] = []
    const result = await collectAttachmentEvidence(
      process.cwd(),
      [{ kind: 'file', path: '.env' }],
      new Set(),
      emptyStatus,
      skipped
    )
    expect(result.evidence).toEqual([])
    expect(skipped).toEqual([{ label: '.env', reason: 'secret' }])
  })

  it('refuses a pinned file outside the repository when it is a secret or missing', async () => {
    const skipped: { label: string; reason: string }[] = []
    await collectAttachmentEvidence(
      process.cwd(),
      [
        { kind: 'external', path: '/definitely/not/here.md' },
        { kind: 'external', path: '/tmp/id_rsa' }
      ],
      new Set(),
      emptyStatus,
      skipped
    )
    expect(skipped.map((item) => item.reason)).toEqual(['unreadable', 'secret'])
  })

  it('reads a pinned commit as diff hunks plus its message', async () => {
    const dir = cloneFixture('cherry-pick')
    const head = (await gitService.log(dir, 5))[0]
    const skipped: { label: string; reason: string }[] = []
    const { evidence, notes } = await collectAttachmentEvidence(
      dir,
      [{ kind: 'commit', hash: head.hash }],
      new Set(),
      emptyStatus,
      skipped
    )
    expect(skipped).toEqual([])
    expect(notes[0]).toContain(head.subject)
    expect(evidence.length).toBeGreaterThan(0)
    expect(evidence.every((item) => item.pinned)).toBe(true)
  })

  it('sends pinned context with the turn and keeps it for follow-ups', async () => {
    const request = vi.fn(async () => ({ content: 'answer', sources: [], skipped: [] }))
    const store = createRepoChatStore(request)
    store.getState().attach('/repo/a', [{ kind: 'file', path: 'src/a.ts' }])
    store.getState().attach('/repo/a', [{ kind: 'commit', hash: 'abc1234' }])
    await store.getState().send('/repo/a', 'what changed?', cfg)

    expect(request.mock.calls[0][3]).toEqual([
      { kind: 'file', path: 'src/a.ts' },
      { kind: 'commit', hash: 'abc1234' }
    ])
    expect(store.getState().threads['/repo/a'].messages[0].attachments).toHaveLength(2)
    expect(store.getState().threads['/repo/a'].attachments).toHaveLength(2)

    store.getState().detach('/repo/a', 'commit:abc1234')
    await store.getState().send('/repo/a', 'and now?', cfg)
    expect(request.mock.calls[1][3]).toEqual([{ kind: 'file', path: 'src/a.ts' }])
  })
})
