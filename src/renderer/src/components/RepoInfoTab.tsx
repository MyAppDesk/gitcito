import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Copy, Check, Trash2, Pencil, ExternalLink, Loader2, Info } from 'lucide-react'
import { infoApi, shellApi } from '../infrastructure/api'
import { FIELD_PRESETS, fieldPreset, fieldHref } from '../lib/infoFields'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import type { InfoEntry } from '../../../shared/types'

interface Draft {
  id?: string
  field: string
  label: string
  value: string
}

/** Per-repo, non-private metadata: App ID, bundle id, website, social links…
 *  Plaintext (not the vault) — reference info you revisit, presented as cards. */
export function RepoInfoTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const [entries, setEntries] = useState<InfoEntry[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void infoApi.list(repoPath).then(setEntries)
  }, [repoPath])

  const startAdd = (): void =>
    setDraft({ field: 'website', label: fieldPreset('website').label, value: '' })
  const startEdit = (e: InfoEntry): void =>
    setDraft({ id: e.id, field: e.field, label: e.label, value: e.value })

  // Picking a preset retitles the field, unless the user already customised the label.
  const pickField = (id: string): void =>
    setDraft((d) =>
      d
        ? {
            ...d,
            field: id,
            label: !d.label.trim() || d.label === fieldPreset(d.field).label ? fieldPreset(id).label : d.label
          }
        : d
    )

  const save = async (): Promise<void> => {
    if (!draft || !draft.value.trim()) return
    setSaving(true)
    try {
      const next = await infoApi.upsert(repoPath, {
        id: draft.id,
        field: draft.field,
        label: draft.label.trim() || fieldPreset(draft.field).label,
        value: draft.value.trim()
      })
      setEntries(next)
      setDraft(null)
      toast('success', t('info.saved'))
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string): Promise<void> => setEntries(await infoApi.remove(repoPath, id))

  const copy = (e: InfoEntry): void => {
    void navigator.clipboard.writeText(e.value)
    setCopiedId(e.id)
    setTimeout(() => setCopiedId((c) => (c === e.id ? null : c)), 1200)
  }

  const open = (e: InfoEntry): void => {
    const href = fieldHref(e.field, e.value)
    if (href) void shellApi.openExternal(href)
  }

  return (
    <>
      <div className="repo-info-head">
        <span className="settings-hint">{t('info.hint')}</span>
        {entries && (
          <button className="btn ghost small" onClick={startAdd}>
            <Plus size={13} /> {t('info.add')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {draft && (
          <motion.div
            className="repo-info-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="repo-info-editor-row">
              <label className="repo-info-field-pick">
                <span className="repo-info-field-icon">
                  {(() => {
                    const I = fieldPreset(draft.field).Icon
                    return <I size={15} />
                  })()}
                </span>
                <select value={draft.field} onChange={(e) => pickField(e.target.value)}>
                  {FIELD_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <input
                className="modal-input"
                placeholder={t('info.labelPlaceholder')}
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </div>
            <input
              className="modal-input"
              placeholder={fieldPreset(draft.field).placeholder ?? t('info.valuePlaceholder')}
              value={draft.value}
              autoFocus
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save()
                else if (e.key === 'Escape') setDraft(null)
              }}
            />
            <div className="repo-info-editor-actions">
              <button className="btn ghost small" onClick={() => setDraft(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn primary small" onClick={() => void save()} disabled={!draft.value.trim() || saving}>
                {saving ? <Loader2 size={13} className="spin" /> : null} {t('common.save')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!entries ? (
        <div style={{ padding: 16 }}>
          <Loader2 size={15} className="spin" />
        </div>
      ) : entries.length === 0 && !draft ? (
        <div className="repo-info-empty">
          <Info size={22} />
          <p>{t('info.empty')}</p>
          <button className="btn primary small" onClick={startAdd}>
            <Plus size={13} /> {t('info.addFirst')}
          </button>
        </div>
      ) : (
        <div className="repo-info-grid">
          {entries.map((e) => {
            const preset = fieldPreset(e.field)
            const I = preset.Icon
            const href = fieldHref(e.field, e.value)
            return (
              <div key={e.id} className="repo-info-card">
                <span className="repo-info-card-icon">
                  <I size={16} />
                </span>
                <div className="repo-info-card-main">
                  <span className="repo-info-card-label">{e.label}</span>
                  {href ? (
                    <button className="repo-info-card-value link" title={e.value} onClick={() => open(e)}>
                      {e.value} <ExternalLink size={11} />
                    </button>
                  ) : (
                    <span className="repo-info-card-value" title={e.value}>
                      {e.value}
                    </span>
                  )}
                </div>
                <div className="repo-info-card-actions">
                  <button className="vault-act" title={t('info.copy')} onClick={() => copy(e)}>
                    {copiedId === e.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button className="vault-act" title={t('info.edit')} onClick={() => startEdit(e)}>
                    <Pencil size={13} />
                  </button>
                  <button className="vault-act danger" title={t('info.delete')} onClick={() => void del(e.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
