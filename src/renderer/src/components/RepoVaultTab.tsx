import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldAlert,
  Globe,
  ClipboardCopy,
  Loader2
} from 'lucide-react'
import { vaultApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useT } from '../i18n'
import type { VaultEntry, VaultListResult } from '../../../shared/types'

function EntryRow({
  entry,
  reveal,
  onCopy,
  onDelete
}: {
  entry: VaultEntry
  reveal: boolean
  onCopy: (v: string) => void
  onDelete: () => void
}): React.JSX.Element {
  const t = useT()
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const show = shown || reveal
  const copy = (): void => {
    onCopy(entry.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="vault-row">
      <span className="vault-key" title={entry.key}>
        {entry.key}
      </span>
      <span className="vault-value mono">
        {show ? entry.value : '•'.repeat(Math.min(entry.value.length || 6, 18))}
      </span>
      {entry.note && (
        <span className="vault-note" title={entry.note}>
          {entry.note}
        </span>
      )}
      <button className="vault-act" title={shown ? t('vault.hide') : t('vault.reveal')} onClick={() => setShown((v) => !v)}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button className="vault-act" title={t('vault.copyValue')} onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button className="vault-act danger" title={t('vault.delete')} onClick={onDelete}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/** Repo-scoped secrets, shown inside Repo Settings. Global secrets live in the
 *  standalone Vault page — a button here jumps there. */
export function RepoVaultTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const closeModal = useUIStore((s) => s.closeModal)
  const [data, setData] = useState<VaultListResult | null>(null)
  const [draft, setDraft] = useState<{ key: string; value: string; note: string } | null>(null)
  const [revealAll, setRevealAll] = useState(false)

  const reload = useCallback(async (): Promise<void> => {
    setData(await vaultApi.list(repoPath))
  }, [repoPath])

  useEffect(() => {
    void reload()
  }, [reload])

  const copy = (v: string): void => void navigator.clipboard.writeText(v)

  const copyAsEnv = (entries: VaultEntry[]): void => {
    if (entries.length === 0) return
    void navigator.clipboard.writeText(entries.map((e) => `${e.key}=${e.value}`).join('\n'))
    toast('success', `${entries.length} ${t('vault.copiedEnv')}`)
  }

  const saveDraft = async (): Promise<void> => {
    if (!draft || !draft.key.trim()) return
    setData(
      await vaultApi.upsert('repo', repoPath, {
        key: draft.key.trim(),
        value: draft.value,
        note: draft.note.trim() || undefined
      })
    )
    setDraft(null)
    toast('success', t('vault.saved'))
  }

  const del = async (id: string): Promise<void> => setData(await vaultApi.remove('repo', repoPath, id))

  const openGlobal = (): void => {
    useSettingsStore.getState().openPageTab({ type: 'vault' })
    closeModal()
  }

  return (
    <>
      <div className="repo-info-head">
        <span className="settings-hint">{t('vault.repoTabHint')}</span>
        <button className="btn ghost small" onClick={openGlobal}>
          <Globe size={13} /> {t('vault.openGlobal')}
        </button>
      </div>

      {!data ? (
        <div style={{ padding: 16 }}>
          <Loader2 size={15} className="spin" />
        </div>
      ) : !data.available ? (
        <div className="vault-unavailable">
          <ShieldAlert size={16} />
          <span>{t('vault.unavailable')}</span>
        </div>
      ) : (
        <>
          <div className="vault-toolbar">
            {data.repo.length > 0 && (
              <button className="btn ghost small" title={t('vault.copyAllTitle')} onClick={() => copyAsEnv(data.repo)}>
                <ClipboardCopy size={13} /> {t('vault.copyAsEnv')}
              </button>
            )}
            {data.repo.length > 0 && (
              <button className="btn ghost small" onClick={() => setRevealAll((v) => !v)}>
                {revealAll ? <EyeOff size={13} /> : <Eye size={13} />} {revealAll ? t('vault.hideAll') : t('vault.revealAll')}
              </button>
            )}
            <button className="btn ghost small" onClick={() => setDraft({ key: '', value: '', note: '' })}>
              <Plus size={13} /> {t('vault.add')}
            </button>
          </div>

          {draft && (
            <div className="vault-draft">
              <input className="modal-input" placeholder="KEY" value={draft.key} autoFocus onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
              <input className="modal-input" placeholder="value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
              <input className="modal-input" placeholder={t('vault.notePlaceholder')} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && void saveDraft()} />
              <button className="btn primary small" onClick={() => void saveDraft()} disabled={!draft.key.trim()}>{t('vault.save')}</button>
              <button className="btn ghost small" onClick={() => setDraft(null)}>{t('vault.cancel')}</button>
            </div>
          )}

          {data.repo.length === 0 ? (
            <div className="vault-empty">{t('vault.noEntries')}</div>
          ) : (
            <div className="vault-list">
              {data.repo.map((e) => (
                <EntryRow key={e.id} entry={e} reveal={revealAll} onCopy={copy} onDelete={() => void del(e.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
