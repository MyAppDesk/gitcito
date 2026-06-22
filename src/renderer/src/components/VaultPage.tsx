import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe,
  ShieldAlert,
  Info,
  ClipboardCopy,
  Loader2
} from 'lucide-react'
import { vaultApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import type { VaultEntry, VaultListResult } from '../../../shared/types'
import { useT } from '../i18n'

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

/** The standalone Vault page — now GLOBAL secrets only. Per-repo secrets moved
 *  into Repo Settings → Vault. Global entries are referenceable from any repo. */
export function VaultPage(): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const [data, setData] = useState<VaultListResult | null>(null)
  const [draft, setDraft] = useState<{ key: string; value: string; note: string } | null>(null)
  const [revealAll, setRevealAll] = useState(false)

  // Global entries don't depend on a repo; pass an empty path.
  const reload = useCallback(async (): Promise<void> => {
    setData(await vaultApi.list(''))
  }, [])

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
      await vaultApi.upsert('global', '', {
        key: draft.key.trim(),
        value: draft.value,
        note: draft.note.trim() || undefined
      })
    )
    setDraft(null)
    toast('success', t('vault.saved'))
  }

  const del = async (id: string): Promise<void> => setData(await vaultApi.remove('global', '', id))

  const entries = data?.global ?? []

  return (
    <div className="changelog-page">
      <motion.div className="changelog-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header className="changelog-header">
          <div className="changelog-title">
            <KeyRound size={20} />
            <div>
              <h1>{t('vault.globalTitle')}</h1>
              <span className="settings-hint">{t('vault.globalSubtitle')}</span>
            </div>
          </div>
          <span className="vault-scope-badge">
            <Globe size={12} /> {t('vault.global')}
          </span>
        </header>

        <div className="vault-explainer">
          <Info size={15} />
          <span>{t('vault.explainer')}</span>
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
          <section className="vault-section">
            <div className="vault-section-head">
              <div className="vault-section-actions">
                {entries.length > 0 && (
                  <button className="btn ghost small" title={t('vault.copyAllTitle')} onClick={() => copyAsEnv(entries)}>
                    <ClipboardCopy size={13} /> {t('vault.copyAsEnv')}
                  </button>
                )}
                {entries.length > 0 && (
                  <button className="btn ghost small" onClick={() => setRevealAll((v) => !v)}>
                    {revealAll ? <EyeOff size={13} /> : <Eye size={13} />} {revealAll ? t('vault.hideAll') : t('vault.revealAll')}
                  </button>
                )}
                <button className="btn primary small" onClick={() => setDraft({ key: '', value: '', note: '' })}>
                  <Plus size={13} /> {t('vault.add')}
                </button>
              </div>
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

            {entries.length === 0 ? (
              <div className="vault-empty">{t('vault.noEntries')}</div>
            ) : (
              <div className="vault-list">
                {entries.map((e) => (
                  <EntryRow key={e.id} entry={e} reveal={revealAll} onCopy={copy} onDelete={() => void del(e.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </motion.div>
    </div>
  )
}
