import { useState } from 'react'
import { Tag, ShieldCheck } from 'lucide-react'
import { repoActions } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'

/** Create a lightweight, annotated, or signed tag at a commit (or HEAD). */
export function CreateTagModal({
  repoPath,
  hash,
  at
}: {
  repoPath: string
  hash?: string
  at?: string
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const t = useT()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sign, setSign] = useState(false)

  const submit = (): void => {
    const n = name.trim()
    if (!n) return
    void repoActions.createTag(repoPath, n, hash, {
      message: message.trim() || undefined,
      sign
    })
    closeModal()
  }

  return (
    <div className="create-tag">
      <h3>
        <Tag size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('createTag.title')}
      </h3>
      {at && <p className="settings-hint">{interp(t('createTag.tagging'), { at })}</p>}

      <label className="settings-field">
        <span className="settings-field-label">{t('createTag.nameLabel')}</span>
        <input
          className="modal-input"
          autoFocus
          placeholder={t('createTag.namePlaceholder')}
          value={name}
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
        />
      </label>

      <label className="settings-field">
        <span className="settings-field-label">
          {t('createTag.messageLabel')} <span className="settings-hint">{t('createTag.messageHint')}</span>
        </span>
        <textarea
          className="modal-input create-tag-msg"
          placeholder={t('createTag.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <label className="create-tag-sign">
        <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
        <ShieldCheck size={13} /> {t('createTag.sign')}
      </label>

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>{t('bisect.cancel')}</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>
          <Tag size={14} /> {t('createTag.createButton')}
        </button>
      </div>
    </div>
  )
}
