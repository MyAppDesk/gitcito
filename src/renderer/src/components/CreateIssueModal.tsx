import { useState } from 'react'
import { CircleDot, Loader2 } from 'lucide-react'
import { hostingApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { useT } from '../i18n'

export function CreateIssueModal({ repoPath, remoteUrl }: { repoPath: string; remoteUrl: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()
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
      toast('success', t('issue.created'))
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
        {t('issue.new')}
      </h3>
      <label className="modal-label">{t('issue.titleLabel')}</label>
      <input
        autoFocus
        className="modal-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('issue.titlePlaceholder')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
      />
      <label className="modal-label">{t('issue.descriptionLabel')}</label>
      <textarea
        className="pr-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('issue.descriptionPlaceholder')}
        spellCheck
      />
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} disabled={busy}>
          {t('common.cancel')}
        </button>
        <button className="btn primary" onClick={() => void submit()} disabled={busy || !title.trim()}>
          {busy ? <Loader2 size={14} className="spin" /> : <CircleDot size={14} />} {t('issue.create')}
        </button>
      </div>
    </>
  )
}
