import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  FileCode2,
  FolderOpen,
  GitCommitHorizontal,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { AI_PROVIDERS, type RepoChatAttachment } from '../../../shared/types'
import { useT, interp, type TranslationKey } from '../i18n'
import { renderMarkdown } from '../preview/markdown'
import { canSubmitRepoChat, repoChatSourceView } from '../lib/repoChatUI'
import {
  CHAT_COMMIT_MIME,
  CHAT_PATH_MIME,
  attachmentKey,
  attachmentLabel,
  attachmentTitle,
  chatModelOptions,
  parseChatDrop,
  suggestedAttachments
} from '../lib/repoChatContext'
import { useRepoChatStore, type RepoChatEntry } from '../stores/chat'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'

/** Why a pinned item never reached the provider — one key per refusal reason. */
const SKIP_REASON_KEYS: Record<string, TranslationKey> = {
  secret: 'chat.skipSecret',
  binary: 'chat.skipBinary',
  tooLarge: 'chat.skipTooLarge',
  unreadable: 'chat.skipUnreadable'
}

function AttachmentChip({
  item,
  onRemove,
  onAdd
}: {
  item: RepoChatAttachment
  onRemove?: () => void
  onAdd?: () => void
}): React.JSX.Element {
  const t = useT()
  const Icon =
    item.kind === 'commit' ? GitCommitHorizontal : item.kind === 'external' ? Paperclip : FileCode2
  const label = attachmentLabel(item)
  const title = attachmentTitle(item)
  if (onAdd) {
    return (
      <button type="button" className="repo-chat-chip suggestion" title={title} onClick={onAdd}>
        <Plus size={11} />
        <Icon size={11} />
        <span>{label}</span>
      </button>
    )
  }
  return (
    <span className={`repo-chat-chip ${item.kind === 'external' ? 'external' : ''}`} title={title}>
      <Icon size={11} />
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          className="repo-chat-chip-remove"
          onClick={onRemove}
          aria-label={interp(t('chat.removeContext'), { name: label })}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

function AssistantMessage({ message, repoPath }: { message: RepoChatEntry; repoPath: string }): React.JSX.Element {
  const t = useT()
  const setFileView = useUIStore((state) => state.setFileView)
  const html = useMemo(() => renderMarkdown(message.content), [message.content])
  const sources = message.sources ?? []

  return (
    <div className="repo-chat-message assistant">
      <div className="repo-chat-avatar" aria-hidden="true">
        <Bot size={14} />
      </div>
      <div className="repo-chat-bubble">
        <div className="repo-chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />
        {sources.length > 0 && (
          <div className="repo-chat-sources">
            <span>{t('chat.sources')}</span>
            <div className="repo-chat-source-list">
              {sources.map((source) => {
                const range = `${source.path}:${source.startLine}${source.endLine > source.startLine ? `-${source.endLine}` : ''}`
                // A file pinned from outside the repository has no repo path to
                // open — it is shown as evidence, not as a link.
                return source.external ? (
                  <span key={source.id} className="repo-chat-source external" title={source.path}>
                    <Paperclip size={12} />
                    <span>{range}</span>
                  </span>
                ) : (
                  <button
                    key={source.id}
                    type="button"
                    className="repo-chat-source"
                    title={source.path}
                    onClick={() => setFileView(repoChatSourceView(repoPath, source))}
                  >
                    <FileCode2 size={12} />
                    <span>{range}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function RepoChatPanel({ repoPath, repoName }: { repoPath: string; repoName: string }): React.JSX.Element {
  const t = useT()
  const profile = useSettingsStore((state) => state.activeProfile())
  const saveProfile = useSettingsStore((state) => state.saveProfile)
  const thread = useRepoChatStore((state) => state.threads[repoPath])
  const send = useRepoChatStore((state) => state.send)
  const retry = useRepoChatStore((state) => state.retry)
  const clear = useRepoChatStore((state) => state.clear)
  const attach = useRepoChatStore((state) => state.attach)
  const detach = useRepoChatStore((state) => state.detach)
  const openModal = useUIStore((state) => state.openModal)
  const openContextMenu = useUIStore((state) => state.openContextMenu)
  const openFile = useUIStore((state) => (state.fileView?.repoPath === repoPath ? state.fileView.file : null))
  const selected = useRepoStore((state) => state.repos[repoPath]?.selected ?? null)
  const [draft, setDraft] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const messages = thread?.messages ?? []
  const pending = thread?.pending ?? false
  const attachments = thread?.attachments ?? []
  const skipped = thread?.skipped ?? []
  const provider = AI_PROVIDERS.find((item) => item.id === profile.ai.provider)
  const suggestions = useMemo(
    () =>
      suggestedAttachments({
        openFile,
        selectedCommit: selected?.type === 'commit' ? selected.hash : null,
        attached: attachments
      }),
    [openFile, selected, attachments]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending])

  const submit = (): void => {
    const content = draft.trim()
    if (!canSubmitRepoChat(profile.ai.enabled !== false, pending, content)) return
    setDraft('')
    void send(repoPath, content, profile.ai)
  }

  const onDrop = (event: React.DragEvent): void => {
    event.preventDefault()
    setDropActive(false)
    const items = parseChatDrop({
      commit: event.dataTransfer.getData(CHAT_COMMIT_MIME),
      path: event.dataTransfer.getData(CHAT_PATH_MIME),
      files: Array.from(event.dataTransfer.files)
        .map((file) => window.api.getPathForFile(file))
        .filter(Boolean)
    })
    if (items.length) attach(repoPath, items)
  }

  // The "+" menu: what is on screen, plus anything on disk.
  const openPicker = (event: React.MouseEvent): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 4, [
      ...suggestions.map((item) => ({
        label: interp(
          t(item.kind === 'commit' ? 'chat.addCommit' : 'chat.addFile'),
          { name: attachmentLabel(item) }
        ),
        icon: item.kind === 'commit' ? <GitCommitHorizontal size={13} /> : <FileCode2 size={13} />,
        onClick: () => attach(repoPath, [item])
      })),
      ...(suggestions.length ? [{ separator: true }] : []),
      {
        label: t('chat.browse'),
        icon: <FolderOpen size={13} />,
        onClick: () => {
          void window.api.openFilePath(t('chat.browseTitle')).then((picked) => {
            if (picked) attach(repoPath, [{ kind: 'external', path: picked }])
          })
        }
      }
    ])
  }

  return (
    <section
      className={`repo-chat ${dropActive ? 'drop-active' : ''}`}
      aria-label={t('chat.tabChat')}
      onDragOver={(event) => {
        if (pending) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDropActive(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setDropActive(false)
      }}
      onDrop={onDrop}
    >
      <header className="repo-chat-header">
        <div>
          <strong>{t('chat.title')}</strong>
          <span className="repo-chat-model">
            {provider?.label ?? profile.ai.provider} ·
            <select
              value={profile.ai.repoChatModel ?? ''}
              aria-label={t('chat.modelLabel')}
              title={t('chat.modelLabel')}
              onChange={(event) =>
                saveProfile({ ...profile, ai: { ...profile.ai, repoChatModel: event.target.value } })
              }
            >
              <option value="">{interp(t('chat.modelDefault'), { model: profile.ai.model })}</option>
              {chatModelOptions(profile.ai, provider?.models ?? []).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          title={t('chat.clearTitle')}
          aria-label={t('chat.clearTitle')}
          disabled={messages.length === 0 && !thread?.error}
          onClick={() => clear(repoPath)}
        >
          <Trash2 size={14} />
        </button>
      </header>

      {profile.ai.enabled === false ? (
        <div className="repo-chat-empty">
          <Bot size={28} />
          <strong>{t('chat.aiDisabled')}</strong>
          <p>{t('chat.aiDisabledHint')}</p>
          <button
            type="button"
            className="btn primary small"
            onClick={() => openModal({ kind: 'settings', page: 'ai' })}
          >
            <Settings size={13} /> {t('chat.openSettings')}
          </button>
        </div>
      ) : (
        <>
          <div className="repo-chat-messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="repo-chat-empty">
                <Bot size={28} />
                <strong>{interp(t('chat.emptyTitle'), { repo: repoName })}</strong>
                <p>{t('chat.emptyHint')}</p>
                <small>{t('chat.privacyHint')}</small>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'assistant' ? (
                <AssistantMessage key={message.id} message={message} repoPath={repoPath} />
              ) : (
                <div key={message.id} className="repo-chat-message user">
                  <div className="repo-chat-bubble">
                    {message.content}
                    {!!message.attachments?.length && (
                      <div className="repo-chat-chips sent">
                        {message.attachments.map((item) => (
                          <AttachmentChip key={attachmentKey(item)} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {pending && (
              <div className="repo-chat-message assistant">
                <div className="repo-chat-avatar" aria-hidden="true">
                  <Bot size={14} />
                </div>
                <div className="repo-chat-bubble repo-chat-thinking">
                  <Loader2 size={14} className="spin" /> {t('chat.thinking')}
                </div>
              </div>
            )}

            {skipped.length > 0 && !pending && (
              <div className="repo-chat-skipped" role="status">
                {skipped.map((item) => (
                  <span key={`${item.reason}:${item.label}`} title={item.label}>
                    {interp(t(SKIP_REASON_KEYS[item.reason] ?? 'chat.skipUnreadable'), {
                      name: item.label.split(/[\\/]/).pop() || item.label
                    })}
                  </span>
                ))}
              </div>
            )}

            {thread?.error && !pending && (
              <div className="repo-chat-error" role="alert">
                <span>{thread.error}</span>
                <button type="button" className="btn ghost small" onClick={() => void retry(repoPath, profile.ai)}>
                  <RotateCcw size={12} /> {t('chat.retry')}
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="repo-chat-composer">
            <div className="repo-chat-context">
              <button
                type="button"
                className="repo-chat-add"
                title={t('chat.addContextTitle')}
                aria-label={t('chat.addContextTitle')}
                disabled={pending}
                onClick={openPicker}
              >
                <Plus size={13} />
              </button>
              {attachments.map((item) => (
                <AttachmentChip
                  key={attachmentKey(item)}
                  item={item}
                  onRemove={() => detach(repoPath, attachmentKey(item))}
                />
              ))}
              {suggestions.map((item) => (
                <AttachmentChip
                  key={`s:${attachmentKey(item)}`}
                  item={item}
                  onAdd={() => attach(repoPath, [item])}
                />
              ))}
              {attachments.length === 0 && suggestions.length === 0 && (
                <span className="repo-chat-context-hint">{t('chat.contextHint')}</span>
              )}
            </div>
            <textarea
              value={draft}
              rows={3}
              maxLength={8000}
              placeholder={t('chat.placeholder')}
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  (event.metaKey || event.ctrlKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  submit()
                }
              }}
            />
            <div className="repo-chat-composer-actions">
              <span>{t('chat.sendHint')}</span>
              <button
                type="button"
                className="btn primary small"
                disabled={!canSubmitRepoChat(true, pending, draft)}
                onClick={submit}
              >
                {pending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                {t('chat.send')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
