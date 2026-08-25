import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ListOrdered, MessageSquareText, PenLine, X } from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { cliApi } from '../infrastructure/api'
import { useT, interp } from '../i18n'
import { lintCommit, subjectCounterLevel, SUBJECT_IDEAL_LEN } from '../lib/commitLint'
import { editKindFor, splitMessage, type CliEditKind } from '../lib/cliEdit'

/**
 * The file git handed us through `core.editor = gitcito --wait`.
 *
 * A `git commit` is blocked on a shell process for as long as this dialog is
 * open, which makes one rule absolute: **every exit path answers**. Saving
 * writes the text back; cancelling writes an empty file, which git reads as
 * "abort"; and closing the dialog by any other means — Escape, the backdrop,
 * a reload — counts as cancelling, because a terminal waiting forever is the
 * worst thing this feature could do to someone.
 */
export function CliEditModal({
  file,
  sentinel,
  content
}: {
  file: string
  sentinel: string
  content: string
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()

  const [text, setText] = useState(content)
  const [busy, setBusy] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  // Whether this dialog has already answered git. The unmount cleanup reads it
  // through a ref because it runs after the last render.
  const answered = useRef(false)

  const kind: CliEditKind = useMemo(() => editKindFor(file), [file])
  const { subject, comments } = useMemo(() => splitMessage(text), [text])
  const hints = kind === 'message' ? lintCommit(subject, splitMessage(text).body) : []

  useEffect(() => {
    areaRef.current?.focus()
    // Put the caret at the start: git's own editors open on the subject line,
    // and the template below it is not what anyone came to type over.
    areaRef.current?.setSelectionRange(subject.length, subject.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Any unmount that has not answered is an abort. Registered once, so a
  // re-render never releases git behind the user's back.
  useEffect(() => {
    return () => {
      if (!answered.current) void cliApi.finishEdit(sentinel, null)
    }
  }, [sentinel])

  const finish = async (value: string | null): Promise<void> => {
    if (answered.current) return
    setBusy(true)
    answered.current = true
    const res = await cliApi.finishEdit(sentinel, value)
    setBusy(false)
    if (!res.ok) {
      // git is already unblocked either way; say what happened rather than
      // pretending the save landed.
      toast('error', res.error ?? t('cliEdit.saveFailed'))
    }
    closeModal()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void finish(text)
    }
  }

  const title =
    kind === 'message' ? t('cliEdit.titleMessage') : kind === 'todo' ? t('cliEdit.titleTodo') : t('cliEdit.titleFile')
  const Icon = kind === 'message' ? MessageSquareText : kind === 'todo' ? ListOrdered : PenLine
  const counterLevel = subjectCounterLevel(subject.length)

  return (
    <div className="cliedit-root">
      <div className="cliedit-head">
        <span className="cliedit-icon">
          <Icon size={17} />
        </span>
        <div className="cliedit-head-text">
          <h3>{title}</h3>
          <span className="cliedit-sub" title={file}>
            {file}
          </span>
        </div>
      </div>

      <textarea
        ref={areaRef}
        className="cliedit-area mono"
        value={text}
        spellCheck={kind === 'message'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={title}
      />

      <div className="cliedit-meta">
        {kind === 'message' && (
          <span className={`cliedit-counter ${counterLevel}`}>
            {interp(t('cliEdit.subjectCount'), { n: String(subject.length), ideal: String(SUBJECT_IDEAL_LEN) })}
          </span>
        )}
        {kind === 'todo' && <span className="cliedit-note">{t('cliEdit.todoHint')}</span>}
        {comments > 0 && (
          <span className="cliedit-note">{interp(t('cliEdit.commentLines'), { n: String(comments) })}</span>
        )}
      </div>

      {hints.length > 0 && (
        <ul className="cliedit-hints">
          {hints.map((h) => (
            <li key={`${h.key}`} className={h.level}>
              {interp(t(h.key), h.vars ?? {})}
            </li>
          ))}
        </ul>
      )}

      <div className="cliedit-actions">
        <span className="cliedit-abort">{t('cliEdit.cancelExplains')}</span>
        <button className="btn ghost" disabled={busy} onClick={() => void finish(null)}>
          <X size={13} />
          {t('cliEdit.cancel')}
        </button>
        <button className="btn primary" disabled={busy} onClick={() => void finish(text)}>
          <Check size={13} />
          {t('cliEdit.save')}
        </button>
      </div>
    </div>
  )
}
