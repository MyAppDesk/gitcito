import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Plus, Trash2, Copy, Check, Eye, EyeOff, FolderGit2, Globe, ShieldAlert, Info, ClipboardCopy } from 'lucide-react'
import { vaultApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { tabRepos } from '../../../shared/types'
import type { VaultEntry, VaultListResult } from '../../../shared/types'
import { useT } from '../i18n'

type Scope = 'repo' | 'global'

interface DraftState {
  scope: Scope
  key: string
  value: string
  note: string
}

function EntryRow({
  entry,
  forceReveal,
  onCopy,
  onDelete
}: {
  entry: VaultEntry
  forceReveal: boolean
  onCopy: (v: string) => void
  onDelete: () => void
}): React.JSX.Element {
  const t = useT()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const show = revealed || forceReveal
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
      <span className="vault-value mono">{show ? entry.value : '•'.repeat(Math.min(entry.value.length || 6, 18))}</span>
      {entry.note && <span className="vault-note" title={entry.note}>{entry.note}</span>}
      <button className="vault-act" title={revealed ? t('vault.hide') : t('vault.reveal')} onClick={() => setRevealed((v) => !v)}>
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

export function VaultPage({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const recents = useSettingsStore((s) => s.settings.recentRepos)

  // Every repo gitcito knows about, so you can browse/reference another repo's
  // secrets without opening it.
  const knownRepos = useMemo(() => {
    const map = new Map<string, string>()
    for (const tab of tabs) for (const r of tabRepos(tab)) map.set(r.path, r.name)
    for (const r of recents) if (!map.has(r.path)) map.set(r.path, r.name)
    if (!map.has(repoPath)) map.set(repoPath, repoPath.split('/').pop() ?? repoPath)
    return [...map.entries()].map(([path, name]) => ({ path, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [tabs, recents, repoPath])

  const [selectedRepo, setSelectedRepo] = useState(repoPath)
  const [data, setData] = useState<VaultListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [revealAll, setRevealAll] = useState(false)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setData(await vaultApi.list(selectedRepo))
    } finally {
      setLoading(false)
    }
  }, [selectedRepo])

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
      await vaultApi.upsert(draft.scope, selectedRepo, {
        key: draft.key.trim(),
        value: draft.value,
        note: draft.note.trim() || undefined
      })
    )
    setDraft(null)
    toast('success', t('vault.saved'))
  }

  const del = async (scope: Scope, id: string): Promise<void> => {
    setData(await vaultApi.remove(scope, selectedRepo, id))
  }

  const section = (
    scope: Scope,
    title: React.ReactNode,
    icon: React.ReactNode,
    entries: VaultEntry[],
    hint: string
  ): React.JSX.Element => (
    <section className="vault-section">
      <div className="vault-section-head">
        <h2>
          {icon} {title}
        </h2>
        <div className="vault-section-actions">
          {entries.length > 0 && (
            <button className="btn ghost small" title={t('vault.copyAllTitle')} onClick={() => copyAsEnv(entries)}>
              <ClipboardCopy size={13} /> {t('vault.copyAsEnv')}
            </button>
          )}
          <button className="btn ghost small" onClick={() => setDraft({ scope, key: '', value: '', note: '' })}>
            <Plus size={13} /> {t('vault.add')}
          </button>
        </div>
      </div>
      <span className="settings-hint">{hint}</span>
      {draft?.scope === scope && (
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
            <EntryRow key={e.id} entry={e} forceReveal={revealAll} onCopy={copy} onDelete={() => void del(scope, e.id)} />
          ))}
        </div>
      )}
    </section>
  )

  // The repo-scope header carries the repo switcher.
  const repoTitle = (
    <span className="vault-repo-select">
      {t('vault.repo')}
      <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}>
        {knownRepos.map((r) => (
          <option key={r.path} value={r.path}>
            {r.name}
          </option>
        ))}
      </select>
    </span>
  )

  return (
    <div className="changelog-page">
      <motion.div className="changelog-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header className="changelog-header">
          <div className="changelog-title">
            <KeyRound size={20} />
            <div>
              <h1>{t('vault.title')}</h1>
              <span className="settings-hint">{t('vault.subtitle')}</span>
            </div>
          </div>
        </header>

        <div className="vault-explainer">
          <Info size={15} />
          <span>{t('vault.explainer')}</span>
        </div>

        {data && !data.available ? (
          <div className="vault-unavailable">
            <ShieldAlert size={16} />
            <span>{t('vault.unavailable')}</span>
          </div>
        ) : !data ? (
          <p className="settings-hint">{loading ? t('vault.unlocking') : ''}</p>
        ) : (
          <>
            <div className="vault-toolbar">
              <button className="btn ghost small" onClick={() => setRevealAll((v) => !v)}>
                {revealAll ? <EyeOff size={13} /> : <Eye size={13} />} {revealAll ? t('vault.hideAll') : t('vault.revealAll')}
              </button>
            </div>
            {section('global', t('vault.global'), <Globe size={15} />, data.global, t('vault.globalHint'))}
            {section('repo', repoTitle, <FolderGit2 size={15} />, data.repo, t('vault.repoHint'))}
          </>
        )}
      </motion.div>
    </div>
  )
}
