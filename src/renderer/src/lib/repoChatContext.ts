import type { RepoChatAttachment } from '../../../shared/types'

/**
 * Pinned chat context — the chips above the composer.
 *
 * The panel answers about whatever the model decides to read; pinning is how
 * the user overrides that. Everything here is pure so the drop rules and the
 * suggestion rules can be tested without an Electron window.
 */

/** Internal drags carry a repo-relative path (the file tree already sets it). */
export const CHAT_PATH_MIME = 'application/x-gitcito-path'
/** Commit rows carry their hash on their own type, never the path one. */
export const CHAT_COMMIT_MIME = 'application/x-gitcito-commit'

export const MAX_CHAT_ATTACHMENTS = 8

export function attachmentKey(item: RepoChatAttachment): string {
  return item.kind === 'commit' ? `commit:${item.hash}` : `${item.kind}:${item.path}`
}

/** Chip text: the file's own name, or a short hash. Full value goes in `title`. */
export function attachmentLabel(item: RepoChatAttachment): string {
  if (item.kind === 'commit') return item.hash.slice(0, 7)
  return item.path.split(/[\\/]/).pop() || item.path
}

export function attachmentTitle(item: RepoChatAttachment): string {
  return item.kind === 'commit' ? item.hash : item.path
}

/** Append, ignoring duplicates, and stop at the cap rather than silently trimming. */
export function addAttachments(
  current: RepoChatAttachment[],
  incoming: RepoChatAttachment[]
): RepoChatAttachment[] {
  const seen = new Set(current.map(attachmentKey))
  const out = [...current]
  for (const item of incoming) {
    const key = attachmentKey(item)
    if (seen.has(key) || out.length >= MAX_CHAT_ATTACHMENTS) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function removeAttachment(
  current: RepoChatAttachment[],
  key: string
): RepoChatAttachment[] {
  return current.filter((item) => attachmentKey(item) !== key)
}

export interface ChatDropData {
  /** Value of the commit MIME type, if the drag carried one. */
  commit?: string | null
  /** Value of the path MIME type — a repo-relative file from the tree. */
  path?: string | null
  /** Absolute paths of files dragged in from Finder/Explorer. */
  files?: string[]
}

/**
 * Turn a drop into attachments. A drag from inside the app always wins over the
 * `Files` list, because Electron reports both for some internal drags.
 */
export function parseChatDrop(data: ChatDropData): RepoChatAttachment[] {
  const commit = data.commit?.trim()
  if (commit && /^[0-9a-fA-F]{4,40}$/.test(commit)) return [{ kind: 'commit', hash: commit.toLowerCase() }]
  const path = data.path?.trim()
  if (path) return [{ kind: 'file', path }]
  return (data.files ?? [])
    .filter(Boolean)
    .slice(0, MAX_CHAT_ATTACHMENTS)
    .map((file) => ({ kind: 'external' as const, path: file }))
}

export interface ChatSuggestionInput {
  /** The graph row the user has selected, if it is a commit. */
  selectedCommit?: string | null
  /** The file open in the centre viewer, repo-relative. */
  openFile?: string | null
  attached: RepoChatAttachment[]
}

/**
 * What the panel offers as one-click chips: what the user is already looking
 * at, minus anything already pinned.
 */
export function suggestedAttachments(input: ChatSuggestionInput): RepoChatAttachment[] {
  const pinned = new Set(input.attached.map(attachmentKey))
  const out: RepoChatAttachment[] = []
  if (input.openFile) out.push({ kind: 'file', path: input.openFile })
  if (input.selectedCommit) out.push({ kind: 'commit', hash: input.selectedCommit })
  return out.filter((item) => !pinned.has(attachmentKey(item)))
}
