import { useState } from 'react'
import { GitPullRequest, Loader2, ExternalLink } from 'lucide-react'
import { hostingApi } from '../infrastructure/api'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'

export function CreatePRModal({ spec }: { spec: Extract<ModalSpec, { kind: 'create-pr' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())

  const [title, setTitle] = useState(spec.defaultTitle)
  const [body, setBody] = useState(spec.defaultBody)
  const [draft, setDraft] = useState(false)
  const [busy, setBusy] = useState(false)

  const tokens = { github: profile.githubToken || undefined, azure: profile.azureToken || undefined }

  const submit = async (): Promise<void> => {
    if (!title.trim()) return
    setBusy(true)
    try {
      const res = await hostingApi.createPR(spec.remoteUrl, tokens, {
        title: title.trim(),
        body,
        source: spec.source,
        target: spec.target,
        draft
      })
      closeModal()
      toast('success', `Created PR #${res.number}`)
      void window.api.openExternal(res.url)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const openInBrowser = (): void => {
    closeModal()
    void hostingApi.openCreatePR(spec.remoteUrl, spec.source, spec.target)
  }

  return (
    <>
      <h3>
        <GitPullRequest size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Create pull request
      </h3>
      <p className="pr-branches">
        <code>{spec.source}</code> → <code>{spec.target}</code>
      </p>

      <label className="modal-label">Title</label>
      <input
        autoFocus
        className="modal-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Pull request title"
      />

      <label className="modal-label">Description</label>
      <textarea
        className="pr-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe the change…"
        spellCheck
      />

      <label className="pr-draft">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>Create as draft</span>
      </label>

      <div className="modal-actions pr-actions">
        <button className="btn ghost small" onClick={openInBrowser} disabled={busy} title="Open the host's compare page instead">
          <ExternalLink size={13} /> Open in browser
        </button>
        <span className="pr-actions-spacer" />
        <button className="btn ghost" onClick={closeModal} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => void submit()} disabled={busy || !title.trim()}>
          {busy ? <Loader2 size={13} className="spin" /> : null} Create PR
        </button>
      </div>
    </>
  )
}
