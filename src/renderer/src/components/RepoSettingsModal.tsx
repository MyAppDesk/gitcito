import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings, ShieldCheck, Loader2, BarChart3, History, ScrollText, Flame, Info, KeyRound, FileCog } from 'lucide-react'
import { gitApi, logApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { AnalyticsSection, RepoHistorySection } from './SettingsPanel'
import { InsightsPage } from './InsightsPage'
import { RepoInfoTab } from './RepoInfoTab'
import { RepoVaultTab } from './RepoVaultTab'
import { useT, t as tr, interp } from '../i18n'
import { BranchMultiSelect } from './BranchMultiSelect'
import { RepoConfigTab } from './RepoConfigTab'
import type { LogEntry } from '../../../shared/types'

function relTime(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return tr('time.justNow')
  if (m < 60) return interp(tr('time.minutesAgo'), { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return interp(tr('time.hoursAgo'), { n: h })
  return new Date(ms).toLocaleString()
}

/** This repo's recent operation log, inline; the full filterable log opens as a page. */
function RepoLogsTab({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
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
        <span className="settings-hint">{t('repoLogs.hint')}</span>
        <button className="btn ghost small" onClick={openAll}>
          <ScrollText size={13} /> {t('repoLogs.openFull')}
        </button>
      </div>
      {loading ? (
        <div style={{ padding: 12 }}>
          <Loader2 size={15} className="spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="settings-hint" style={{ marginTop: 10 }}>
          {t('repoLogs.empty')}
        </p>
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

type Tab = 'general' | 'config' | 'info' | 'vault' | 'analytics' | 'insights' | 'history' | 'logs'

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
  // Easter egg: five title clicks inside 1.5s open the cosmos view. Deliberately
  // undocumented — finding it is the point, so it stays out of docs/help and the
  // screenshot manifest.
  const titleClicks = useRef<number[]>([])

  const onTitleClick = (): void => {
    const now = Date.now()
    const clicks = titleClicks.current.filter((ts) => now - ts < 1500)
    clicks.push(now)
    titleClicks.current = clicks
    if (clicks.length >= 5) {
      titleClicks.current = []
      useUIStore.getState().openCosmos(repoPath)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('repoSettings.general'), icon: <Settings size={13} /> },
    { id: 'config', label: t('repoSettings.config'), icon: <FileCog size={13} /> },
    { id: 'info', label: t('repoSettings.info'), icon: <Info size={13} /> },
    { id: 'vault', label: t('repoSettings.vault'), icon: <KeyRound size={13} /> },
    { id: 'analytics', label: t('repoSettings.analytics'), icon: <BarChart3 size={13} /> },
    { id: 'insights', label: t('repoSettings.insights'), icon: <Flame size={13} /> },
    { id: 'history', label: t('repoSettings.history'), icon: <History size={13} /> },
    { id: 'logs', label: t('repoSettings.logs'), icon: <ScrollText size={13} /> }
  ]

  return (
    <div className="repo-settings">
      <h3 onClick={onTitleClick} style={{ cursor: 'default', userSelect: 'none' }}>
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
        {tab === 'config' && <RepoConfigTab repoPath={repoPath} />}
        {tab === 'info' && <RepoInfoTab repoPath={repoPath} />}
        {tab === 'vault' && <RepoVaultTab repoPath={repoPath} />}
        {tab === 'analytics' && <AnalyticsSection aiEnabled={aiEnabled} />}
        {tab === 'insights' && <InsightsPage repoPath={repoPath} />}
        {tab === 'history' && <RepoHistorySection />}
        {tab === 'logs' && <RepoLogsTab repoPath={repoPath} />}
      </div>
    </div>
  )
}
