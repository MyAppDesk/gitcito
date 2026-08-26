import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type {
  AIConfig,
  RepoChatAttachment,
  RepoChatAction,
  RepoChatExecutionResult,
  RepoChatMessage,
  RepoChatReply,
  RepoChatSkipped,
  RepoChatSource
} from '../../../shared/types'
import { addAttachments, removeAttachment } from './repoChatContext'

export const REPO_CHAT_STORED_MESSAGES = 40
export const REPO_CHAT_SENT_MESSAGES = 12
const MAX_USER_CHARS = 8_000

/** Lifecycle of one proposal card. 'pending' waits for the user (or the
 *  approval mode); everything after is terminal except a retry from 'failed'. */
export type ChatActionsState = 'pending' | 'running' | 'finalizing' | 'done' | 'failed' | 'dismissed'

export interface RepoChatEntry {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: RepoChatSource[]
  /** What was pinned when this turn was sent — shown under the bubble. */
  attachments?: RepoChatAttachment[]
  /** Validated actions the assistant proposed with this reply. */
  actions?: RepoChatAction[]
  actionsState?: ChatActionsState
  /** Authoritative result of the one execution attempt for this proposal. */
  execution?: RepoChatExecutionResult
  /** The mutations remain authoritative even when the narrative call fails. */
  finalizationFailed?: boolean
  /** Actions actually applied once state reaches 'done'. */
  actionsApplied?: number
  actionsError?: string
  /** The approval mode ran the proposal without a click. */
  actionsAuto?: boolean
  /** The guard snapshot has been restored — the plan is no longer in effect. */
  actionsUndone?: boolean
}

export interface RepoChatThread {
  messages: RepoChatEntry[]
  pending: boolean
  error: string | null
  requestId?: number
  /** Pinned context. Survives the turn, so follow-ups keep the same footing. */
  attachments: RepoChatAttachment[]
  /** Pinned items the main process refused, from the last reply. */
  skipped: RepoChatSkipped[]
}

export type RepoChatRequest = (
  repoPath: string,
  messages: RepoChatMessage[],
  cfg: AIConfig,
  attachments: RepoChatAttachment[]
) => Promise<RepoChatReply>

export type RepoChatFinalizeRequest = (
  repoPath: string,
  messages: RepoChatMessage[],
  result: RepoChatExecutionResult,
  cfg: AIConfig
) => Promise<RepoChatReply>

export interface RepoChatState {
  threads: Record<string, RepoChatThread>
  send(repoPath: string, content: string, cfg: AIConfig): Promise<void>
  retry(repoPath: string, cfg: AIConfig): Promise<void>
  finalizeActions(
    repoPath: string,
    messageId: number,
    result: RepoChatExecutionResult,
    cfg: AIConfig
  ): Promise<void>
  clear(repoPath: string): void
  attach(repoPath: string, items: RepoChatAttachment[]): void
  detach(repoPath: string, key: string): void
  /** Advance one proposal card's lifecycle (run/dismiss/finish/fail). */
  setActions(
    repoPath: string,
    messageId: number,
    patch: Partial<Pick<RepoChatEntry, 'actionsState' | 'actionsApplied' | 'actionsError' | 'actionsAuto' | 'actionsUndone'>>
  ): void
}

const EMPTY: RepoChatThread = { messages: [], pending: false, error: null, attachments: [], skipped: [] }

function trimMessages(messages: RepoChatEntry[]): RepoChatEntry[] {
  return messages.slice(-REPO_CHAT_STORED_MESSAGES)
}

/** Model-facing outcome trailer, so a follow-up turn knows whether an earlier
 *  proposal actually ran. English on purpose — this is model input, not UI. */
export function actionOutcomeNote(entry: RepoChatEntry): string {
  if (entry.role !== 'assistant' || !entry.actions?.length) return ''
  const list = entry.actions.map((action) => action.type).join(', ')
  const outcome =
    entry.execution?.error
      ? `the app executed ${entry.execution.applied}; ${entry.execution.failedType ?? 'an action'} failed with ${entry.execution.error.code}; ${entry.execution.remaining} remained`
      : entry.execution
        ? `the user approved and the app executed ${entry.execution.applied} of them; ${entry.execution.remaining} remained`
        : entry.actionsState === 'done'
          ? `the user approved and the app executed ${entry.actionsApplied ?? entry.actions.length} of them`
          : entry.actionsState === 'failed'
            ? `execution failed: ${entry.actionsError ?? 'unknown error'}`
            : entry.actionsState === 'dismissed'
              ? 'the user dismissed them without running anything'
              : 'they have not been run'
  return `\n\n[App note: this reply proposed actions (${list}); ${outcome}.]`
}

function wireMessages(messages: RepoChatEntry[]): RepoChatMessage[] {
  return messages
    .slice(-REPO_CHAT_SENT_MESSAGES)
    .map((entry) => ({ role: entry.role, content: `${entry.content}${actionOutcomeNote(entry)}` }))
}

export function createRepoChatStore(
  request: RepoChatRequest,
  finalize: RepoChatFinalizeRequest = async () => {
    throw new Error('Repository chat finalization is unavailable.')
  }
): UseBoundStore<StoreApi<RepoChatState>> {
  let nextMessageId = 0
  let nextRequestId = 0

  return create<RepoChatState>((set, get) => {
    const patch = (repoPath: string, next: Partial<RepoChatThread>): void =>
      set((state) => ({
        threads: {
          ...state.threads,
          [repoPath]: { ...EMPTY, ...state.threads[repoPath], ...next }
        }
      }))

    const run = async (repoPath: string, messages: RepoChatEntry[], cfg: AIConfig): Promise<void> => {
      const requestId = ++nextRequestId
      const attachments = get().threads[repoPath]?.attachments ?? []
      patch(repoPath, { messages, pending: true, error: null, requestId, skipped: [] })

      try {
        const reply = await request(repoPath, wireMessages(messages), cfg, attachments)
        const current = get().threads[repoPath]
        if (!current || current.requestId !== requestId) return
        const assistant: RepoChatEntry = {
          id: ++nextMessageId,
          role: 'assistant',
          content: reply.content,
          sources: reply.sources,
          ...(reply.actions?.length ? { actions: reply.actions, actionsState: 'pending' as const } : {})
        }
        patch(repoPath, {
          messages: trimMessages([...current.messages, assistant]),
          pending: false,
          error: null,
          skipped: reply.skipped ?? []
        })
      } catch (error) {
        const current = get().threads[repoPath]
        if (!current || current.requestId !== requestId) return
        patch(repoPath, {
          messages: current.messages,
          pending: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return {
      threads: {},
      send: async (repoPath, raw, cfg) => {
        const current = get().threads[repoPath]
        if (current?.pending) return
        const content = raw.trim().slice(0, MAX_USER_CHARS)
        if (!content) return
        const pinned = current?.attachments ?? []
        const user: RepoChatEntry = {
          id: ++nextMessageId,
          role: 'user',
          content,
          ...(pinned.length ? { attachments: pinned } : {})
        }
        await run(repoPath, trimMessages([...(current?.messages ?? []), user]), cfg)
      },
      retry: async (repoPath, cfg) => {
        const current = get().threads[repoPath]
        if (!current || current.pending || !current.error || current.messages.at(-1)?.role !== 'user') return
        await run(repoPath, current.messages, cfg)
      },
      finalizeActions: async (repoPath, messageId, result, cfg) => {
        const current = get().threads[repoPath]
        const proposal = current?.messages.find((entry) => entry.id === messageId)
        if (!current || !proposal?.actions?.length || proposal.actionsState === 'dismissed' || proposal.execution) return

        const requestId = ++nextRequestId
        const actionState: ChatActionsState = result.error ? 'failed' : 'done'
        const messages = current.messages.map((entry) =>
          entry.id === messageId
            ? {
                ...entry,
                execution: result,
                finalizationFailed: false,
                actionsState: 'finalizing' as const,
                actionsApplied: result.applied,
                actionsError: result.error?.detail ?? result.error?.code
              }
            : entry
        )
        patch(repoPath, { messages, requestId })

        try {
          const reply = await finalize(repoPath, wireMessages(messages), result, cfg)
          const latest = get().threads[repoPath]
          if (!latest || latest.requestId !== requestId) return
          const assistant: RepoChatEntry = {
            id: ++nextMessageId,
            role: 'assistant',
            content: reply.content,
            sources: reply.sources
          }
          patch(repoPath, {
            messages: trimMessages([
              ...latest.messages.map((entry) =>
                entry.id === messageId ? { ...entry, actionsState: actionState } : entry
              ),
              assistant
            ]),
            error: null,
            skipped: reply.skipped ?? latest.skipped
          })
        } catch {
          const latest = get().threads[repoPath]
          if (!latest || latest.requestId !== requestId) return
          patch(repoPath, {
            messages: latest.messages.map((entry) =>
              entry.id === messageId
                ? { ...entry, actionsState: actionState, finalizationFailed: true }
                : entry
            )
          })
        }
      },
      clear: (repoPath) =>
        set((state) => {
          const threads = { ...state.threads }
          delete threads[repoPath]
          return { threads }
        }),
      attach: (repoPath, items) => {
        const current = get().threads[repoPath] ?? EMPTY
        if (current.pending) return
        patch(repoPath, { attachments: addAttachments(current.attachments, items) })
      },
      detach: (repoPath, key) => {
        const current = get().threads[repoPath] ?? EMPTY
        patch(repoPath, { attachments: removeAttachment(current.attachments, key) })
      },
      setActions: (repoPath, messageId, actionPatch) => {
        const current = get().threads[repoPath]
        if (!current) return
        patch(repoPath, {
          messages: current.messages.map((entry) =>
            entry.id === messageId && entry.actions ? { ...entry, ...actionPatch } : entry
          )
        })
      }
    }
  })
}
