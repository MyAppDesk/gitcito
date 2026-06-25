import { useEffect, useRef, useState } from 'react'
import { GripVertical, Loader2 } from 'lucide-react'
import type { RebaseStep } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useT } from '../i18n'

type ActionKind = RebaseStep['action']

interface StepRow extends RebaseStep {
  id: string
}

export function InteractiveRebase({
  repoPath,
  base,
  baseSubject
}: {
  repoPath: string
  base: string
  baseSubject: string
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const refresh = useRepoStore((s) => s.refresh)
  const t = useT()

  const [steps, setSteps] = useState<StepRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    setLoading(true)
    gitApi.interactiveRebaseSteps(repoPath, base).then((raw) => {
      setSteps(raw.map((r, i) => ({ ...r, action: 'pick', id: `${r.hash}-${i}` })))
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }, [repoPath, base])

  const setAction = (id: string, action: ActionKind): void => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, action } : s))
  }

  const setNewMessage = (id: string, msg: string): void => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, newMessage: msg } : s))
  }

  const onDragStart = (idx: number): void => { dragIdx.current = idx }

  const onDragOver = (e: React.DragEvent, idx: number): void => {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === idx) return
    setSteps((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(idx, 0, item)
      dragIdx.current = idx
      return next
    })
  }

  const onDragEnd = (): void => { dragIdx.current = null }

  const confirm = async (): Promise<void> => {
    setBusy(true)
    try {
      await gitApi.runInteractiveRebase(repoPath, base, steps)
      // An `edit` step pauses the rebase for amending — say so instead of
      // claiming completion.
      const paused = steps.some((s) => s.action === 'edit')
      toast('success', paused ? t('rebase.paused') : t('rebase.completed'))
      closeModal()
      await refresh(repoPath)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="ir-loading">
        <Loader2 size={20} className="spin" />
        <span>{t('rebase.loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <h3>{t('rebase.title')}</h3>
        <div className="ir-error">{error}</div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={closeModal}>{t('rebase.cancel')}</button>
        </div>
      </>
    )
  }

  if (steps.length === 0) {
    return (
      <>
        <h3>{t('rebase.title')}</h3>
        <div className="ir-empty">{t('rebase.empty')}</div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={closeModal}>{t('rebase.cancel')}</button>
        </div>
      </>
    )
  }

  return (
    <>
      <h3>{t('rebase.title')}</h3>
      <p className="ir-base-label">{t('rebase.base')}<code>{base.slice(0, 7)}</code> {baseSubject}</p>
      <div className="ir-list">
        {steps.map((s, idx) => (
          <div
            key={s.id}
            className={`ir-step ${s.action === 'drop' ? 'ir-drop' : ''}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
          >
            <span className="ir-grip"><GripVertical size={14} /></span>
            <select
              className="ir-action"
              value={s.action}
              onChange={(e) => setAction(s.id, e.target.value as ActionKind)}
            >
              {(['pick', 'squash', 'fixup', 'drop', 'reword', 'edit'] as ActionKind[]).map((a) => (
                <option key={a} value={a}>{t(`rebase.${a}` as Parameters<typeof t>[0])}</option>
              ))}
            </select>
            <code className="ir-hash">{s.hash.slice(0, 7)}</code>
            {s.action === 'reword' ? (
              <input
                className="ir-subject-input"
                value={s.newMessage ?? s.subject}
                onChange={(e) => setNewMessage(s.id, e.target.value)}
                placeholder={t('rebase.rewordPlaceholder')}
              />
            ) : (
              <span className="ir-subject" title={s.subject}>{s.subject}</span>
            )}
          </div>
        ))}
      </div>
      <p className="ir-hint">{t('rebase.hint')}</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} disabled={busy}>{t('rebase.cancel')}</button>
        <button className="btn danger" onClick={confirm} disabled={busy}>
          {busy ? <Loader2 size={13} className="spin" /> : null} {t('rebase.rebase')}
        </button>
      </div>
    </>
  )
}
