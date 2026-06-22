import { useState } from 'react'
import { Tag, ShieldCheck } from 'lucide-react'
import { repoActions } from '../stores/repo'
import { useUIStore } from '../stores/ui'

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
        Create tag
      </h3>
      {at && <p className="settings-hint">Tagging {at}</p>}

      <label className="settings-field">
        <span className="settings-field-label">Tag name</span>
        <input
          className="modal-input"
          autoFocus
          placeholder="v1.0.0"
          value={name}
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
        />
      </label>

      <label className="settings-field">
        <span className="settings-field-label">
          Message <span className="settings-hint">(optional — makes it an annotated tag)</span>
        </span>
        <textarea
          className="modal-input create-tag-msg"
          placeholder="Release notes / annotation…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <label className="create-tag-sign">
        <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
        <ShieldCheck size={13} /> Sign this tag (GPG/SSH)
      </label>

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!name.trim()}>
          <Tag size={14} /> Create tag
        </button>
      </div>
    </div>
  )
}
