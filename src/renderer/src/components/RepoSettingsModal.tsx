import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings, X, ShieldCheck, Loader2, BarChart3, History, ScrollText, Flame } from 'lucide-react'
import { gitApi, logApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { AnalyticsSection, RepoHistorySection } from './SettingsPanel'
import { InsightsPage } from './InsightsPage'
import { useT } from '../i18n'
import type { LogEntry } from '../../../shared/types'

function relTime(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(ms).toLocaleString()
}

/** This repo's recent operation log, inline; the full filterable log opens as a page. */
function RepoLogsTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    logApi
      .get()
      .then((all) => setEntries(all.filter((e) => e.repoPath === repoPath).reverse()))
      .finally(() => setLoading(false))
  }, [repoPath])

  const openAll = (): void => {
    useSettingsStore.getState().openPageTab({ type: 'logs' })
    closeModal()
  }

  return (
    <>
      <div className="repo-logs-head">
        <span className="settings-hint">Git operations gitcito ran on this repo, newest first.</span>
        <button className="btn ghost small" onClick={openAll}>
          <ScrollText size={13} /> Open full operation log
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 12 }}>
          <Loader2 size={15} className="spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="settings-hint" style={{ marginTop: 10 }}>No operations recorded for this repo yet.</p>
      ) : (
        <div className="repo-logs-list">
          {entries.map((e, i) => (
            <div key={`${e.ts}-${i}`} className="repo-log-row">
              <span className={`repo-log-dot ${e.ok ? 'ok' : 'fail'}`} />
              <span className="repo-log-event">{e.event}</span>
              <span className="repo-log-err">{!e.ok && e.error ? e.error : ''}</span>
              <span className="repo-log-time">{relTime(e.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

type Tab = 'general' | 'analytics' | 'insights' | 'history' | 'logs'

/** A chip multi-select: pick from the repo's branches or type a free value. */
function BranchMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Add a branch…'
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}): React.JSX.Element {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const available = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(text.toLowerCase()))
  const canAddTyped = text.trim() && !value.includes(text.trim())

  const add = (b: string): void => {
    const v = b.trim()
    if (!v || value.includes(v)) return
    onChange([...value, v])
    setText('')
    setOpen(false)
  }
  const remove = (b: string): void => onChange(value.filter((x) => x !== b))

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="bms" ref={ref}>
      <div className="bms-control" onClick={() => setOpen(true)}>
        {value.map((b) => (
          <span key={b} className="bms-chip">
            {b}
            <button className="bms-chip-x" onClick={(e) => { e.stopPropagation(); remove(b) }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="bms-input"
          value={text}
          placeholder={value.length ? '' : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canAddTyped) { e.preventDefault(); add(text) }
            else if (e.key === 'Backspace' && !text && value.length) remove(value[value.length - 1])
          }}
        />
      </div>
      {open && (available.length > 0 || canAddTyped) && (
        <div className="bms-menu">
          {available.map((o) => (
            <button key={o} className="bms-opt" onClick={() => add(o)}>
              {o}
            </button>
          ))}
          {canAddTyped && (
            <button className="bms-opt add" onClick={() => add(text)}>
              Add “{text.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function GeneralTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const t = useT()
  const repo = useRepoStore((s) => s.repos[repoPath])
  const branchOptions = useMemo(() => repo?.branches.locals.map((b) => b.name) ?? [], [repo])
  const [protectedBranches, setProtected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    gitApi
      .protectedBranches(repoPath)
      .then(setProtected)
      .catch(() => setProtected([]))
      .finally(() => setLoading(false))
  }, [repoPath])

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      await gitApi.setProtectedBranches(repoPath, protectedBranches)
      toast('success', 'Repo settings saved')
      closeModal()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={14} /> {t('repoSettings.protectedBranches')}
      </h4>
      <span className="settings-hint">{t('repoSettings.protectedBranchesHint')}</span>
      {loading ? (
        <div style={{ padding: 12 }}>
          <Loader2 size={15} className="spin" />
        </div>
      ) : (
        <BranchMultiSelect options={branchOptions} value={protectedBranches} onChange={setProtected} placeholder={t('repoSettings.addBranch')} />
      )}
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button className="btn primary" onClick={() => void save()} disabled={saving || loading}>
          {saving ? <Loader2 size={14} className="spin" /> : null} {t('common.save')}
        </button>
      </div>
    </>
  )
}

export function RepoSettingsModal({ repoPath, initialTab }: { repoPath: string; initialTab?: Tab }): React.JSX.Element {
  const repo = useRepoStore((s) => s.repos[repoPath])
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const t = useT()
  const [tab, setTab] = useState<Tab>(initialTab ?? 'general')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('repoSettings.general'), icon: <Settings size={13} /> },
    { id: 'analytics', label: t('repoSettings.analytics'), icon: <BarChart3 size={13} /> },
    { id: 'insights', label: t('repoSettings.insights'), icon: <Flame size={13} /> },
    { id: 'history', label: t('repoSettings.history'), icon: <History size={13} /> },
    { id: 'logs', label: t('repoSettings.logs'), icon: <ScrollText size={13} /> }
  ]

  return (
    <div className="repo-settings">
      <h3>
        <Settings size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('repoSettings.title')} — {repo?.name}
      </h3>
      <div className="repo-settings-tabs">
        {tabs.map((tb) => (
          <button key={tb.id} className={`codesearch-tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>
      <div className="repo-settings-body">
        {tab === 'general' && <GeneralTab repoPath={repoPath} />}
        {tab === 'analytics' && <AnalyticsSection aiEnabled={aiEnabled} />}
        {tab === 'insights' && <InsightsPage repoPath={repoPath} />}
        {tab === 'history' && <RepoHistorySection />}
        {tab === 'logs' && <RepoLogsTab repoPath={repoPath} />}
      </div>
    </div>
  )
}
