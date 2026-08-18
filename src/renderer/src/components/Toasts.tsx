import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, Copy, Check, Bug, Sparkles } from 'lucide-react'
import { useUIStore, type Toast } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { repoChatAvailable } from '../lib/repoChatUI'
import { useT, interp } from '../i18n'

const icons = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />
}

/** Pre-fills a GitHub issue with the failing error message, so a bug report
 *  takes one click instead of the user retyping what they just saw. */
function reportIssueUrl(message: string): string {
  const title = message.split('\n')[0].slice(0, 120)
  const body = `**Error**\n\n\`\`\`\n${message}\n\`\`\`\n`
  const params = new URLSearchParams({ title, body })
  return `https://github.com/MyAppDesk/gitcito/issues/new?${params.toString()}`
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }): React.JSX.Element {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const [copied, setCopied] = useState(false)
  const msgRef = useRef<HTMLSpanElement>(null)
  const aiChat = useSettingsStore((state) => repoChatAvailable(state.activeProfile().ai))
  const openChatPanelWith = useUIStore((state) => state.openChatPanelWith)

  // Measured while clamped (base CSS limits to 3 lines), so a taller scrollHeight
  // means the text is longer than the clamp and worth a "show more" toggle.
  useLayoutEffect(() => {
    const el = msgRef.current
    if (el) setOverflowing(el.scrollHeight - el.clientHeight > 1)
  }, [toast.message])

  const copy = (e: React.MouseEvent): void => {
    e.stopPropagation()
    void navigator.clipboard?.writeText(toast.message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <motion.div
      className={`toast toast-${toast.kind}`}
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      layout
    >
      {icons[toast.kind]}
      <div className="toast-body">
        <span
          ref={msgRef}
          className={`toast-msg ${expanded ? 'expanded' : ''} ${overflowing ? 'clickable' : ''}`}
          onClick={() => overflowing && setExpanded((v) => !v)}
        >
          {toast.message}
        </span>
        {overflowing && (
          <button className="toast-more" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('toast.showLess') : t('toast.showMore')}
          </button>
        )}
      </div>
      <div className="toast-actions">
        {toast.kind === 'error' && toast.repoPath && aiChat && (
          <button
            title={t('toast.fixWithAI')}
            onClick={(e) => {
              e.stopPropagation()
              openChatPanelWith(
                toast.repoPath as string,
                interp(t('chat.fixPromptDraft'), { message: toast.message })
              )
              onDismiss()
            }}
          >
            <Sparkles size={13} />
          </button>
        )}
        {toast.kind === 'error' && (
          <button
            title={t('toast.reportIssue')}
            onClick={(e) => {
              e.stopPropagation()
              void window.api.openExternal(reportIssueUrl(toast.message))
            }}
          >
            <Bug size={13} />
          </button>
        )}
        <button title={t('toast.copyMessage')} onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button title={t('toast.dismiss')} onClick={onDismiss}>
          <X size={13} />
        </button>
      </div>
    </motion.div>
  )
}

export function Toasts(): React.JSX.Element {
  const { toasts, dismissToast } = useUIStore()
  // In screenshot mode, hide transient toasts so README shots never capture a
  // stray "error invoking…" popup from background hosting/git calls.
  const visible = window.api?.shotMode ? [] : toasts
  return (
    <div className="toasts">
      <AnimatePresence>
        {visible.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
