import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  FileCode2,
  FolderOpen,
  GitCommitHorizontal,
  Link2,
  Loader2,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Wand2,
  X
} from 'lucide-react'
import type {
  ChatActionApproval,
  PreparedRepoChatFileAction,
  RepoChatAction,
  RepoChatActionErrorCode,
  RepoChatAttachment,
  RepoChatExecutionResult
} from '../../../shared/types'
import { modelFor, resolveAI } from '../../../shared/aiAccounts'
import { useModelCatalogs } from './useModelCatalogs'
import { useT, interp, type TranslationKey } from '../i18n'
import { renderMarkdown } from '../preview/markdown'
import { canSubmitRepoChat, repoChatSourceView } from '../lib/repoChatUI'
import {
  CHAT_COMMIT_MIME,
  CHAT_PATH_MIME,
  attachmentKey,
  attachmentLabel,
  attachmentTitle,
  chatModelGroups,
  parseChatDrop,
  suggestedAttachments
} from '../lib/repoChatContext'
import { annotateChatHtml, tokenizeChatText } from '../lib/chatText'
import { askActionDetail, askActionsAutoRun, destructiveAskFiles } from '../lib/askActions'
import { executeRepoChatActions } from '../lib/askActionRun'
import { repoChatActionMeta } from '../lib/askActionMeta'
import { gitApi } from '../infrastructure/api'
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

const ACTION_ERROR_KEYS: Partial<Record<RepoChatActionErrorCode, TranslationKey>> = {
  stale_file: 'chat.actionStale',
  no_staged_changes: 'chat.actionNoStaged',
  hook_failed: 'chat.actionHookFailed',
  rollback_failed: 'chat.actionRollbackFailed'
}

function isFileAction(action: RepoChatAction): action is PreparedRepoChatFileAction {
  return action.type === 'edit_file' || action.type === 'write_file' || action.type === 'delete_file'
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

/** Right-click menu on a message bubble: copy the selection, the whole
 *  message, or — when the click landed on a link — its address. */
function useCopyMenu(content: string): (event: React.MouseEvent) => void {
  const t = useT()
  const openContextMenu = useUIStore((state) => state.openContextMenu)
  return (event) => {
    event.preventDefault()
    const selection = window.getSelection()?.toString() ?? ''
    const href = (event.target as HTMLElement).closest('a')?.getAttribute('href')
    openContextMenu(event.clientX, event.clientY, [
      ...(selection.trim()
        ? [
            {
              label: t('chat.copySelection'),
              icon: <Copy size={13} />,
              onClick: () => void navigator.clipboard.writeText(selection)
            }
          ]
        : []),
      {
        label: t('chat.copyMessage'),
        icon: <Copy size={13} />,
        onClick: () => void navigator.clipboard.writeText(content)
      },
      ...(href && /^https?:/i.test(href)
        ? [
            {
              label: t('chat.copyLink'),
              icon: <Link2 size={13} />,
              onClick: () => void navigator.clipboard.writeText(href)
            }
          ]
        : [])
    ])
  }
}

/** Plain user text with URLs turned into links and image mentions marked for
 *  the hover preview. */
function UserText({ content }: { content: string }): React.JSX.Element {
  const tokens = useMemo(() => tokenizeChatText(content), [content])
  return (
    <>
      {tokens.map((tok, i) =>
        tok.kind === 'text' ? (
          tok.value
        ) : tok.kind === 'link' ? (
          <a
            key={i}
            href={tok.value}
            className={tok.image ? 'repo-chat-img-ref' : undefined}
            data-img={tok.image ? tok.value : undefined}
          >
            {tok.value}
          </a>
        ) : (
          <span key={i} className="repo-chat-img-ref" data-img={tok.value}>
            {tok.value}
          </span>
        )
      )}
    </>
  )
}

/** The proposal widget under an assistant reply: what would run, and the
 *  approve / dismiss controls for it. Execution stays in the panel — this
 *  card only renders the entry's action state. */
function ChatActionCard({
  message,
  onRun,
  onDismiss
}: {
  message: RepoChatEntry
  onRun: () => void
  onDismiss: () => void
}): React.JSX.Element {
  const t = useT()
  const actions = message.actions ?? []
  const state = message.actionsState ?? 'pending'
  const execution = message.execution
  return (
    <div className={`repo-chat-actions ${state}`}>
      <div className="repo-chat-actions-list">
        {actions.map((action, i) => {
          const meta = repoChatActionMeta(
            action.type,
            action.type === 'write_file' ? action.mode : undefined
          )
          const Icon = meta.Icon
          const detail = askActionDetail(action, t('aiWizard.allChanges'))
          const result = execution?.actionResults.find((item) => item.index === i)
          return (
            <div key={i} className={`repo-chat-action ${result?.status ?? ''}`}>
              <div className="repo-chat-action-main">
                <span className="repo-chat-action-badge">
                  <Icon size={12} /> {t(meta.labelKey)}
                </span>
                <span className="repo-chat-action-desc" title={detail}>
                  {action.description || detail}
                </span>
              </div>
              {isFileAction(action) && (
                <details className="repo-chat-action-preview">
                  <summary>{action.path}</summary>
                  <pre><code>{action.preview}</code></pre>
                </details>
              )}
            </div>
          )
        })}
      </div>
      <div className="repo-chat-actions-footer">
        {state === 'pending' && (
          <>
            <button type="button" className="btn ghost small" onClick={onDismiss}>
              {t('chat.actionsDismiss')}
            </button>
            <button type="button" className="btn primary small" onClick={onRun}>
              <Play size={12} /> {interp(t('chat.actionsRunN'), { n: actions.length })}
            </button>
          </>
        )}
        {state === 'running' && (
          <span className="repo-chat-actions-status">
            <Loader2 size={12} className="spin" /> {t('chat.actionsRunning')}
          </span>
        )}
        {state === 'finalizing' && (
          <span className="repo-chat-actions-status">
            <Loader2 size={12} className="spin" /> {t('chat.actionsFinalizing')}
          </span>
        )}
        {state === 'done' && (
          <span className="repo-chat-actions-status done">
            <Check size={12} />{' '}
            {interp(t(message.actionsAuto ? 'chat.actionsAutoRan' : 'chat.actionsRan'), {
              n: execution?.applied ?? message.actionsApplied ?? actions.length
            })}
          </span>
        )}
        {state === 'failed' && (
          <>
            <span className="repo-chat-actions-status failed" title={execution?.error?.detail ?? message.actionsError}>
              <AlertTriangle size={12} />{' '}
              {t(execution?.error ? ACTION_ERROR_KEYS[execution.error.code] ?? 'chat.actionsFailed' : 'chat.actionsFailed')}
            </span>
            {execution && (execution.applied > 0 || execution.remaining > 0) && (
              <span className="repo-chat-actions-status">
                {interp(t('chat.actionsPartial'), {
                  applied: execution.applied,
                  remaining: execution.remaining
                })}
              </span>
            )}
            {!execution && (
              <button type="button" className="btn ghost small" onClick={onRun}>
                <RotateCcw size={12} /> {t('chat.retry')}
              </button>
            )}
          </>
        )}
        {state === 'dismissed' && (
          <span className="repo-chat-actions-status">{t('chat.actionsDismissed')}</span>
        )}
      </div>
      {message.finalizationFailed && (
        <div className="repo-chat-actions-finalization-failed">
          {t('chat.actionsFinalizationFailed')}
        </div>
      )}
    </div>
  )
}

function AssistantMessage({
  message,
  repoPath,
  onRunActions,
  onDismissActions
}: {
  message: RepoChatEntry
  repoPath: string
  onRunActions: (message: RepoChatEntry) => void
  onDismissActions: (message: RepoChatEntry) => void
}): React.JSX.Element {
  const t = useT()
  const setFileView = useUIStore((state) => state.setFileView)
  const html = useMemo(() => annotateChatHtml(renderMarkdown(message.content)), [message.content])
  const sources = message.sources ?? []
  const copyMenu = useCopyMenu(message.content)

  return (
    <div className="repo-chat-message assistant">
      <div className="repo-chat-avatar" aria-hidden="true">
        <Bot size={14} />
      </div>
      <div className="repo-chat-bubble" onContextMenu={copyMenu}>
        <div className="repo-chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />
        {!!message.actions?.length && (
          <ChatActionCard
            message={message}
            onRun={() => onRunActions(message)}
            onDismiss={() => onDismissActions(message)}
          />
        )}
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

function UserMessage({ message }: { message: RepoChatEntry }): React.JSX.Element {
  const copyMenu = useCopyMenu(message.content)
  return (
    <div className="repo-chat-message user">
      <div className="repo-chat-bubble" onContextMenu={copyMenu}>
        <UserText content={message.content} />
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
  const setActions = useRepoChatStore((state) => state.setActions)
  const finalizeActions = useRepoChatStore((state) => state.finalizeActions)
  const openModal = useUIStore((state) => state.openModal)
  const openContextMenu = useUIStore((state) => state.openContextMenu)
  const chatPrompt = useUIStore((state) => state.chatPrompt)
  const consumeChatPrompt = useUIStore((state) => state.consumeChatPrompt)
  const openFile = useUIStore((state) => (state.fileView?.repoPath === repoPath ? state.fileView.file : null))
  const selected = useRepoStore((state) => state.repos[repoPath]?.selected ?? null)
  const [draft, setDraft] = useState('')
  const [dropActive, setDropActive] = useState(false)
  const [imgPreview, setImgPreview] = useState<{ ref: string; url: string; x: number; y: number } | null>(null)
  const hoveredImg = useRef<string | null>(null)
  // Resolved once per mention: an https URL is used as-is, a repo path is read
  // through git into a data URL. null caches a failed read so a path that does
  // not resolve to an image is not retried on every hover.
  const imgCache = useRef(new Map<string, Promise<string | null>>())
  const endRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const messages = thread?.messages ?? []
  const pending = thread?.pending ?? false
  const attachments = thread?.attachments ?? []
  const skipped = thread?.skipped ?? []
  const { catalogs } = useModelCatalogs(profile.ai)
  const modelGroups = useMemo(
    () => chatModelGroups(profile.ai, Object.fromEntries(Object.entries(catalogs).map(([id, c]) => [id, c.models]))),
    [profile.ai, catalogs]
  )
  // The header shows the account the chat is actually pointed at, so switching
  // account elsewhere is visible here rather than silently changing the answer.
  const chatAssignment = profile.ai.assignments?.chat
  const chatSelection = chatAssignment ? `${chatAssignment.accountId}\u0000${chatAssignment.model}` : ''
  const defaultChatModel = modelFor(profile.ai)
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

  // A draft handed over from elsewhere (an error toast's "Fix with AI") —
  // consumed only by the panel of the repo the error came from.
  useEffect(() => {
    if (!chatPrompt || chatPrompt.repoPath !== repoPath) return
    setDraft(chatPrompt.text)
    consumeChatPrompt()
    draftRef.current?.focus()
  }, [chatPrompt, repoPath, consumeChatPrompt])

  const approval: ChatActionApproval = profile.ai.repoChatApproval ?? 'ask'
  const actionsEnabled = profile.ai.repoChatActions !== false

  const runActions = (message: RepoChatEntry, auto = false): void => {
    const actions = message.actions
    if (!actions?.length) return
    if (message.execution) return
    const state = message.actionsState ?? 'pending'
    if (state !== 'pending' && state !== 'failed') return
    const execute = (): void => {
      setActions(repoPath, message.id, { actionsState: 'running', actionsAuto: auto, actionsError: undefined })
      let execution: RepoChatExecutionResult | undefined
      let failMessage = ''
      void useRepoStore
        .getState()
        .run(
          repoPath,
          interp(t('chat.actionsRunLabel'), { n: actions.length }),
          async () => {
            execution = await executeRepoChatActions(repoPath, actions)
            void finalizeActions(repoPath, message.id, execution, resolveAI(profile.ai, 'chat'))
            if (execution.error) throw new Error(execution.error.detail ?? execution.error.code)
          },
          undefined,
          null,
          // Keep the default error toast (it carries the "Fix with AI" button);
          // just remember the message for the card.
          (message_) => {
            failMessage = message_
            return false
          }
        )
        .then((ok) => {
          if (!execution) {
            setActions(
              repoPath,
              message.id,
              ok
                ? { actionsState: 'done', actionsApplied: actions.length }
                : { actionsState: 'failed', actionsError: failMessage }
            )
          }
        })
    }
    // Destructive proposals always confirm, whatever the approval mode says —
    // and the confirm names what would be lost.
    const destructive = destructiveAskFiles(actions)
    if (destructive.length) {
      openModal({
        kind: 'confirm',
        danger: true,
        title: t('chat.confirmDiscardTitle'),
        message: interp(t('chat.confirmDiscardMessage'), { files: destructive.join(', ') }),
        confirmLabel: t('chat.confirmDiscardOk'),
        onConfirm: execute
      })
      return
    }
    execute()
  }

  const dismissActions = (message: RepoChatEntry): void => {
    if ((message.actionsState ?? 'pending') !== 'pending') return
    setActions(repoPath, message.id, { actionsState: 'dismissed' })
  }

  // Approval modes act on arrival: the newest pending proposal runs itself
  // when the mode covers every action in it. Marking it 'running' inside
  // runActions is synchronous, so a re-render cannot start it twice.
  useEffect(() => {
    const last = messages.at(-1)
    if (!last || last.role !== 'assistant' || !last.actions?.length) return
    if ((last.actionsState ?? 'pending') !== 'pending') return
    if (!askActionsAutoRun(last.actions, approval)) return
    runActions(last, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per new proposal
  }, [messages])

  const submit = (): void => {
    const content = draft.trim()
    if (!canSubmitRepoChat(profile.ai.enabled !== false, pending, content)) return
    setDraft('')
    void send(repoPath, content, resolveAI(profile.ai, 'chat'))
  }

  const resolveImg = (ref: string): Promise<string | null> => {
    let promise = imgCache.current.get(ref)
    if (!promise) {
      promise = /^https?:/i.test(ref)
        ? Promise.resolve(ref)
        : gitApi.fileDataUrl(repoPath, ref.replace(/^\.\//, '')).catch(() => null)
      imgCache.current.set(ref, promise)
    }
    return promise
  }

  const onImgOver = (event: React.MouseEvent): void => {
    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-img]')
    const ref = el?.dataset.img
    if (!el || !ref || hoveredImg.current === ref) return
    hoveredImg.current = ref
    const rect = el.getBoundingClientRect()
    // Clamp into the viewport; flip above the mention when there is no room
    // below (the popup is capped at ~230px tall in CSS).
    const x = Math.max(8, Math.min(rect.left, window.innerWidth - 300))
    const y = rect.bottom + 236 <= window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - 236)
    void resolveImg(ref).then((url) => {
      if (url && hoveredImg.current === ref) setImgPreview({ ref, url, x, y })
    })
  }

  const onImgOut = (event: React.MouseEvent): void => {
    const from = (event.target as HTMLElement).closest('[data-img]')
    if (!from) return
    const to = event.relatedTarget
    if (to instanceof Node && from.contains(to)) return
    hoveredImg.current = null
    setImgPreview(null)
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
        <button
          type="button"
          className="icon-btn"
          title={t('aiWizard.configTitle')}
          aria-label={t('aiWizard.configTitle')}
          onClick={() => openModal({ kind: 'ai-config-wizard', repoPath, repoName })}
        >
          <Wand2 size={14} />
        </button>
        <div>
          <strong>{t('chat.title')}</strong>
          <span className="repo-chat-model">
            <select
              value={chatSelection}
              aria-label={t('chat.modelLabel')}
              title={t('chat.modelLabel')}
              onChange={(event) => {
                const [accountId, model] = event.target.value.split('\u0000')
                const assignments = { ...(profile.ai.assignments ?? {}) }
                if (!accountId) delete assignments.chat
                else assignments.chat = { accountId, model }
                saveProfile({ ...profile, ai: { ...profile.ai, assignments } })
              }}
            >
              <option value="">{interp(t('chat.modelDefault'), { model: defaultChatModel })}</option>
              {modelGroups.map((group) => (
                <optgroup key={group.accountId} label={group.label}>
                  {group.models.map((model) => (
                    <option key={`${group.accountId}-${model}`} value={`${group.accountId}\u0000${model}`}>
                      {model}
                    </option>
                  ))}
                </optgroup>
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
          <div className="repo-chat-messages" aria-live="polite" onMouseOver={onImgOver} onMouseOut={onImgOut}>
            {messages.length === 0 && (
              <div className="repo-chat-empty">
                <Bot size={28} />
                <strong>{interp(t('chat.emptyTitle'), { repo: repoName })}</strong>
                <p>{t('chat.emptyHint')}</p>
                <small>{t('chat.privacyHint')}</small>
                <div className="ai-ask-examples repo-chat-examples">
                  {[t('aiWizard.example1'), t('aiWizard.example2'), t('aiWizard.example3')].map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="ai-ask-chip"
                      disabled={pending}
                      onClick={() => {
                        setDraft(example)
                        draftRef.current?.focus()
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'assistant' ? (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  repoPath={repoPath}
                  onRunActions={(entry) => runActions(entry)}
                  onDismissActions={dismissActions}
                />
              ) : (
                <UserMessage key={message.id} message={message} />
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
                <button type="button" className="btn ghost small" onClick={() => void retry(repoPath, resolveAI(profile.ai, 'chat'))}>
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
              ref={draftRef}
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
              {actionsEnabled ? (
                <span className="repo-chat-approval" title={t('chat.approvalTitle')}>
                  <ShieldCheck size={12} />
                  <select
                    value={approval}
                    aria-label={t('chat.approvalTitle')}
                    onChange={(event) =>
                      saveProfile({
                        ...profile,
                        ai: { ...profile.ai, repoChatApproval: event.target.value as ChatActionApproval }
                      })
                    }
                  >
                    <option value="ask">{t('chat.approvalAsk')}</option>
                    <option value="auto-safe">{t('chat.approvalSafe')}</option>
                    <option value="auto-all">{t('chat.approvalAll')}</option>
                  </select>
                </span>
              ) : (
                <span>{t('chat.sendHint')}</span>
              )}
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
      {imgPreview &&
        createPortal(
          <div className="repo-chat-img-pop" style={{ left: imgPreview.x, top: imgPreview.y }}>
            <img src={imgPreview.url} alt={imgPreview.ref} onError={() => setImgPreview(null)} />
          </div>,
          document.body
        )}
    </section>
  )
}
