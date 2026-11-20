import { useState } from 'react'
import { ClipboardList, GitBranchPlus, Loader2, Search } from 'lucide-react'
import { hostingApi } from '../infrastructure/api'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { workItemBranchName, type WorkItem } from '../lib/workItem'
import { readableError } from '../lib/gitErrorHint'
import { useT, interp } from '../i18n'

/**
 * Start a branch from an Azure Boards work item: look the number up in the
 * organization of the repository's Azure remote, then hand the create-branch
 * dialog a name built from it (`feature/123-title`, `bugfix/…` for a bug).
 */
export function WorkItemBranchModal({ spec }: { spec: Extract<ModalSpec, { kind: 'work-item-branch' }> }): React.JSX.Element {
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const azureToken = useSettingsStore((s) => s.activeProfile().azureToken)
  const [id, setId] = useState('')
  const [item, setItem] = useState<WorkItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookUp = async (): Promise<void> => {
    const n = Number(id.replace(/^(?:AB)?#/i, '').trim())
    if (!Number.isInteger(n) || n <= 0) return
    setBusy(true)
    setError(null)
    setItem(null)
    try {
      setItem(await hostingApi.workItem(spec.remoteUrl, { azure: azureToken || undefined }, n))
    } catch (err) {
      setError(readableError(err instanceof Error ? err.message : String(err), t, interp))
    } finally {
      setBusy(false)
    }
  }

  const createBranch = (): void => {
    if (!item) return
    openModal({
      kind: 'create-branch',
      path: spec.path,
      initialName: workItemBranchName(item),
      // i18n-ignore the Azure Boards mention and the work item's own title — both data
      description: `AB#${item.id} ${item.title}`
    })
  }

  return (
    <>
      <h3 className="modal-title-row">
        <ClipboardList size={17} /> {t('workItem.title')}
      </h3>
      <p className="modal-message">{t('workItem.intro')}</p>
      <div className="cb-ai-row">
        <input
          className="modal-input"
          autoFocus
          inputMode="numeric"
          value={id}
          placeholder={t('workItem.placeholder')}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void (item ? createBranch() : lookUp())
            if (e.key === 'Escape') closeModal()
          }}
        />
        <button className="btn ghost" onClick={() => void lookUp()} disabled={busy || !id.trim()}>
          {busy ? <Loader2 size={13} className="spin" /> : <Search size={13} />} {t('workItem.lookUp')}
        </button>
      </div>
      {error && <p className="prd-error">{error}</p>}
      {item && (
        <div className="work-item-card">
          <div className="work-item-meta">
            {item.type} #{item.id}
            {item.state ? ` · ${item.state}` : ''}
          </div>
          <div className="work-item-title">{item.title}</div>
          <code className="work-item-branch">{workItemBranchName(item)}</code>
        </div>
      )}
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('common.cancel')}
        </button>
        <button className="btn primary" onClick={createBranch} disabled={!item}>
          <GitBranchPlus size={13} /> {t('workItem.createBranch')}
        </button>
      </div>
    </>
  )
}
