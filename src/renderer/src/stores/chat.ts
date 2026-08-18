import { aiApi } from '../infrastructure/api'
import { createRepoChatStore } from '../lib/repoChatStore'

export type { ChatActionsState, RepoChatEntry, RepoChatState, RepoChatThread } from '../lib/repoChatStore'
export { REPO_CHAT_SENT_MESSAGES, REPO_CHAT_STORED_MESSAGES } from '../lib/repoChatStore'

export const useRepoChatStore = createRepoChatStore(aiApi.repoChat)
