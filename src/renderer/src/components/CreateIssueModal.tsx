import { useState } from 'react'
import { CircleDot, Loader2 } from 'lucide-react'
import { hostingApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'

export function CreateIssueModal({ repoPath, remoteUrl }: { repoPath: string; remoteUrl: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const tokens = { github: profile.githubToken || undefined }

  const submit = async (): Promise<void> => {
    if (!title.trim()) return
    setBusy(true)
    try {
      const { url } = await hostingApi.createIssue(remoteUrl, tokens, { title: title.trim(), body: body.trim() })
      toast('success', 'Issue created')
      void useRepoStore.getState().refreshIssues(repoPath, { silent: true })
      void shellApi.openExternal(url)
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h3>
        <CircleDot size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        New issue
      </h3>
      <label className="modal-label">Title</label>
      <input
        autoFocus
        className="modal-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Issue title"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
      />
      <label className="modal-label">Description</label>
      <textarea
        className="pr-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe the issue… (Markdown supported)"
        spellCheck
      />
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => void submit()} disabled={busy || !title.trim()}>
          {busy ? <Loader2 size={14} className="spin" /> : <CircleDot size={14} />} Create issue
        </button>
      </div>
    </>
  )
}
