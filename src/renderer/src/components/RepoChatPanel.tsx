import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, FileCode2, Loader2, RotateCcw, Send, Settings, Trash2 } from 'lucide-react'
import { AI_PROVIDERS } from '../../../shared/types'
import { useT, interp } from '../i18n'
import { renderMarkdown } from '../preview/markdown'
import { canSubmitRepoChat, repoChatSourceView } from '../lib/repoChatUI'
import { useRepoChatStore, type RepoChatEntry } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'

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
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  className="repo-chat-source"
                  title={source.path}
                  onClick={() => setFileView(repoChatSourceView(repoPath, source))}
                >
                  <FileCode2 size={12} />
                  <span>
                    {source.path}:{source.startLine}
                    {source.endLine > source.startLine ? `-${source.endLine}` : ''}
                  </span>
                </button>
              ))}
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
  const thread = useRepoChatStore((state) => state.threads[repoPath])
  const send = useRepoChatStore((state) => state.send)
  const retry = useRepoChatStore((state) => state.retry)
  const clear = useRepoChatStore((state) => state.clear)
  const openModal = useUIStore((state) => state.openModal)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const messages = thread?.messages ?? []
  const pending = thread?.pending ?? false
  const provider = AI_PROVIDERS.find((item) => item.id === profile.ai.provider)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending])

  const submit = (): void => {
    const content = draft.trim()
    if (!canSubmitRepoChat(profile.ai.enabled !== false, pending, content)) return
    setDraft('')
    void send(repoPath, content, profile.ai)
  }

  return (
    <section className="repo-chat" aria-label={t('chat.tabChat')}>
      <header className="repo-chat-header">
        <div>
          <strong>{t('chat.title')}</strong>
          <span>{provider?.label ?? profile.ai.provider} · {profile.ai.model}</span>
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
                  <div className="repo-chat-bubble">{message.content}</div>
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
