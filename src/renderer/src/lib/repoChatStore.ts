import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { AIConfig, RepoChatMessage, RepoChatReply, RepoChatSource } from '../../../shared/types'

export const REPO_CHAT_STORED_MESSAGES = 40
export const REPO_CHAT_SENT_MESSAGES = 12
const MAX_USER_CHARS = 8_000

export interface RepoChatEntry {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: RepoChatSource[]
}

export interface RepoChatThread {
  messages: RepoChatEntry[]
  pending: boolean
  error: string | null
  requestId?: number
}

export type RepoChatRequest = (
  repoPath: string,
  messages: RepoChatMessage[],
  cfg: AIConfig
) => Promise<RepoChatReply>

export interface RepoChatState {
  threads: Record<string, RepoChatThread>
  send(repoPath: string, content: string, cfg: AIConfig): Promise<void>
  retry(repoPath: string, cfg: AIConfig): Promise<void>
  clear(repoPath: string): void
}

function trimMessages(messages: RepoChatEntry[]): RepoChatEntry[] {
  return messages.slice(-REPO_CHAT_STORED_MESSAGES)
}

function wireMessages(messages: RepoChatEntry[]): RepoChatMessage[] {
  return messages
    .slice(-REPO_CHAT_SENT_MESSAGES)
    .map(({ role, content }) => ({ role, content }))
}

export function createRepoChatStore(request: RepoChatRequest): UseBoundStore<StoreApi<RepoChatState>> {
  let nextMessageId = 0
  let nextRequestId = 0

  return create<RepoChatState>((set, get) => {
    const run = async (repoPath: string, messages: RepoChatEntry[], cfg: AIConfig): Promise<void> => {
      const requestId = ++nextRequestId
      set((state) => ({
        threads: {
          ...state.threads,
          [repoPath]: { messages, pending: true, error: null, requestId }
        }
      }))

      try {
        const reply = await request(repoPath, wireMessages(messages), cfg)
        const current = get().threads[repoPath]
        if (!current || current.requestId !== requestId) return
        const assistant: RepoChatEntry = {
          id: ++nextMessageId,
          role: 'assistant',
          content: reply.content,
          sources: reply.sources
        }
        set((state) => ({
          threads: {
            ...state.threads,
            [repoPath]: {
              messages: trimMessages([...current.messages, assistant]),
              pending: false,
              error: null
            }
          }
        }))
      } catch (error) {
        const current = get().threads[repoPath]
        if (!current || current.requestId !== requestId) return
        set((state) => ({
          threads: {
            ...state.threads,
            [repoPath]: {
              messages: current.messages,
              pending: false,
              error: error instanceof Error ? error.message : String(error)
            }
          }
        }))
      }
    }

    return {
      threads: {},
      send: async (repoPath, raw, cfg) => {
        const current = get().threads[repoPath]
        if (current?.pending) return
        const content = raw.trim().slice(0, MAX_USER_CHARS)
        if (!content) return
        const user: RepoChatEntry = { id: ++nextMessageId, role: 'user', content }
        await run(repoPath, trimMessages([...(current?.messages ?? []), user]), cfg)
      },
      retry: async (repoPath, cfg) => {
        const current = get().threads[repoPath]
        if (!current || current.pending || !current.error || current.messages.at(-1)?.role !== 'user') return
        await run(repoPath, current.messages, cfg)
      },
      clear: (repoPath) =>
        set((state) => {
          const threads = { ...state.threads }
          delete threads[repoPath]
          return { threads }
        })
    }
  })
}
