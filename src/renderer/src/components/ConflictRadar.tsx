import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Check, CircleSlash, Loader2, Radar, RefreshCw } from 'lucide-react'
import type { MergePreviewEntry, MergePreviewResult, MergeRiskKind } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { RefPicker, type RefOption } from './RefPicker'
import { useT, interp } from '../i18n'

type Scope = 'local' | 'remote' | 'all'

const RANK: Record<MergeRiskKind, number> = { conflict: 0, error: 1, clean: 2, merged: 3 }

/** Conflicts first, worst first; everything else keeps a stable alphabetical order. */
function sortEntries(entries: MergePreviewEntry[]): MergePreviewEntry[] {
  return [...entries].sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status]
    if (a.files.length !== b.files.length) return b.files.length - a.files.length
    return a.ref.localeCompare(b.ref)
  })
}

/** Files ranked by how many branches would fight over them. */
export function conflictHotspots(entries: MergePreviewEntry[]): { path: string; refs: string[] }[] {
  const byFile = new Map<string, string[]>()
  for (const e of entries) {
    for (const f of e.files) {
      const refs = byFile.get(f)
      if (refs) refs.push(e.ref)
      else byFile.set(f, [e.ref])
    }
  }
  return [...byFile.entries()]
    .map(([path, refs]) => ({ path, refs }))
    .sort((a, b) => b.refs.length - a.refs.length || a.path.localeCompare(b.path))
}

function StatusIcon({ status }: { status: MergeRiskKind }): React.JSX.Element {
  if (status === 'conflict') return <AlertTriangle size={13} />
  if (status === 'error') return <CircleSlash size={13} />
  if (status === 'merged') return <Check size={13} />
  return <Check size={13} />
}

export function ConflictRadar({
  repoPath,
  initialBase
}: {
  repoPath: string
  initialBase?: string
}): React.JSX.Element {
  const openModal = useUIStore((s) => s.openModal)
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const patch = useRepoStore((s) => s.patch)
  const t = useT()

  const [base, setBase] = useState(initialBase || repo?.branches.current || 'HEAD')
  const [scope, setScope] = useState<Scope>('local')
  const [result, setResult] = useState<MergePreviewResult | null>(repo?.mergeRisk ?? null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hideQuiet, setHideQuiet] = useState(false)

  const refOptions = useMemo<RefOption[]>(() => {
    const out: RefOption[] = []
    for (const l of repo?.branches.locals ?? []) out.push({ value: l.name, kind: 'local' })
    for (const r of repo?.branches.remotes ?? []) out.push({ value: r.fullName, kind: 'remote' })
    for (const tg of repo?.branches.tags ?? []) out.push({ value: tg.name, kind: 'tag' })
    return out
  }, [repo?.branches])

  /** Everything worth merging into `target`, minus `target` itself. */
  const refsFor = useCallback(
    (target: string): string[] => {
      const locals = (repo?.branches.locals ?? []).map((b) => b.name)
      const remotes = (repo?.branches.remotes ?? []).map((b) => b.fullName)
      const picked = scope === 'local' ? locals : scope === 'remote' ? remotes : [...locals, ...remotes]
      return picked.filter((r) => r !== target)
    },
    [repo?.branches, scope]
  )

  // `overrideBase` lets the ref picker rescan with the ref just chosen, without
  // waiting a render for the state update to land.
  const scan = useCallback(
    async (overrideBase?: string) => {
      const target = (overrideBase ?? base).trim()
      const refs = refsFor(target)
      if (!target || refs.length === 0) {
        setResult({ base: target, baseSha: '', entries: [], scannedAt: Date.now() })
        return
      }
      setLoading(true)
      try {
        const r = await gitApi.mergePreview(repoPath, target, refs)
        setResult(r)
        // Kept on the repo so branch rows in the sidebar can show the same verdict.
        patch(repoPath, { mergeRisk: r })
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [repoPath, base, refsFor, patch, toast]
  )

  // Scan once on open, then only when the user asks (a scan is N merges).
  useEffect(() => {
    void scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const entries = useMemo(() => sortEntries(result?.entries ?? []), [result])
  const shown = useMemo(
    () => (hideQuiet ? entries.filter((e) => e.status === 'conflict' || e.status === 'error') : entries),
    [entries, hideQuiet]
  )
  const hotspots = useMemo(() => conflictHotspots(entries), [entries])
  const counts = useMemo(() => {
    const c = { conflict: 0, clean: 0, merged: 0, error: 0 } as Record<MergeRiskKind, number>
    for (const e of entries) c[e.status]++
    return c
  }, [entries])

  const toggle = (ref: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(ref)) next.delete(ref)
      else next.add(ref)
      return next
    })

  const compare = (ref: string): void =>
    openModal({ kind: 'branch-compare', repoPath, branchA: ref, branchB: base })

  return (
    <div className="radar-root">
      <div className="radar-header">
        <div className="radar-header-top">
          <Radar size={15} className="radar-title-icon" />
          <h3>{t('radar.title')}</h3>
          <div className="radar-header-actions">
            <button className="btn primary small" onClick={() => void scan()} disabled={loading}>
              {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
              {t('radar.scan')}
            </button>
          </div>
        </div>
        <div className="radar-controls">
          <label className="radar-label">{t('radar.base')}</label>
          <RefPicker
            className="radar-ref-input"
            value={base}
            options={refOptions}
            onChange={setBase}
            // Picking a ref rescans straight away — the whole point of the
            // field is "what happens if I aim at this instead".
            onCommit={(v) => void scan(v)}
          />
          <div className="radar-scope">
            {(['local', 'remote', 'all'] as Scope[]).map((s) => (
              <button
                key={s}
                className={`radar-scope-btn ${scope === s ? 'active' : ''}`}
                onClick={() => setScope(s)}
              >
                {t(`radar.scope.${s}` as 'radar.scope.local')}
              </button>
            ))}
          </div>
        </div>
        <div className="radar-summary">
          <span className="radar-pill conflict">
            {interp(t('radar.countConflict'), { n: String(counts.conflict) })}
          </span>
          <span className="radar-pill clean">{interp(t('radar.countClean'), { n: String(counts.clean) })}</span>
          <span className="radar-pill merged">{interp(t('radar.countMerged'), { n: String(counts.merged) })}</span>
          {counts.error > 0 && (
            <span className="radar-pill error">{interp(t('radar.countError'), { n: String(counts.error) })}</span>
          )}
          <label className="radar-toggle">
            <input type="checkbox" checked={hideQuiet} onChange={(e) => setHideQuiet(e.target.checked)} />
            {t('radar.onlyRisky')}
          </label>
        </div>
      </div>

      {loading && !result ? (
        <div className="radar-loading">
          <Loader2 size={20} className="spin" />
        </div>
      ) : (
        <div className="radar-body">
          <div className="radar-list">
            {shown.length === 0 ? (
              <div className="radar-empty">{t('radar.empty')}</div>
            ) : (
              shown.map((e) => {
                const open = expanded.has(e.ref)
                const hasDetail = e.files.length > 0 || !!e.message
                return (
                  <div key={e.ref} className={`radar-row-wrap ${e.status}`}>
                    <div
                      className="radar-row"
                      onClick={() => hasDetail && toggle(e.ref)}
                      role={hasDetail ? 'button' : undefined}
                    >
                      <span className="radar-chevron">
                        {hasDetail ? open ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : null}
                      </span>
                      <span className={`radar-dot ${e.status}`}>
                        <StatusIcon status={e.status} />
                      </span>
                      <span className="radar-ref" title={e.ref}>
                        {e.ref}
                      </span>
                      <span className={`radar-status ${e.status}`}>
                        {e.status === 'conflict'
                          ? interp(t('radar.conflictFiles'), { n: String(e.files.length) })
                          : t(`radar.status.${e.status}` as 'radar.status.clean')}
                      </span>
                      <button
                        className="btn ghost small radar-compare"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          compare(e.ref)
                        }}
                      >
                        {t('radar.compare')}
                      </button>
                    </div>
                    {open && (
                      <div className="radar-detail">
                        {e.files.map((f) => (
                          <div key={f} className="radar-file" title={f}>
                            {f}
                          </div>
                        ))}
                        {e.message && <div className="radar-message">{e.message}</div>}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {hotspots.length > 0 && (
            <div className="radar-hotspots">
              <div className="radar-hotspots-title">{t('radar.hotspots')}</div>
              <div className="radar-hotspots-list">
                {hotspots.slice(0, 20).map((h) => (
                  <div key={h.path} className="radar-hotspot">
                    <span className="radar-hotspot-count">{h.refs.length}</span>
                    <span className="radar-hotspot-path" title={h.path}>
                      {h.path}
                    </span>
                    <span className="radar-hotspot-refs" title={h.refs.join(', ')}>
                      {h.refs.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
