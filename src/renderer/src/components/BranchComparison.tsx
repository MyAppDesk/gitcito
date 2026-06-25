import { useEffect, useMemo, useState } from 'react'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import type { BranchCompareResult } from '../../../shared/types'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { DiffViewer } from './DiffViewer'
import { useT, interp } from '../i18n'

function timeAgo(unix: number): string {
  const d = Date.now() / 1000 - unix
  if (d < 60) return 'now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export function BranchComparison({
  repoPath,
  branchA,
  branchB
}: {
  repoPath: string
  branchA: string
  branchB: string
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const profile = useSettingsStore((s) => s.activeProfile())
  const t = useT()

  // Both refs are editable so this works as a general "compare any two refs"
  // tool, not just branch-vs-current. A is the compare ref, B is the base.
  const [a, setA] = useState(branchA)
  const [b, setB] = useState(branchB)
  const [result, setResult] = useState<BranchCompareResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Every ref the user can pick from, for the datalist (free-typing a raw SHA
  // also works, since compareBranches just passes the strings to git).
  const refOptions = useMemo<string[]>(() => {
    const out: string[] = []
    for (const l of repo?.branches.locals ?? []) out.push(l.name)
    for (const r of repo?.branches.remotes ?? []) out.push(r.fullName)
    for (const tg of repo?.branches.tags ?? []) out.push(tg.name)
    return [...new Set(out)]
  }, [repo?.branches])

  useEffect(() => {
    if (!a.trim() || !b.trim()) return
    setLoading(true)
    gitApi.compareBranches(repoPath, a.trim(), b.trim()).then((r) => {
      setResult(r)
      setLoading(false)
    }).catch((err) => {
      toast('error', err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }, [repoPath, a, b])

  const swap = (): void => {
    setA(b)
    setB(a)
  }

  const openPR = (): void => {
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) {
      toast('error', t('compare.noRemote'))
      return
    }
    const ahead = result?.aheadCommits ?? []
    // One commit → use its subject; otherwise fall back to the branch name.
    const defaultTitle = ahead.length === 1 ? ahead[0].subject : a
    const defaultBody = ahead.map((c) => `- ${c.subject}`).join('\n')
    useUIStore.getState().openModal({
      kind: 'create-pr',
      repoPath,
      remoteUrl: origin.url,
      source: a,
      target: b,
      defaultTitle,
      defaultBody
    })
  }

  const hasToken = !!(profile.githubToken || profile.azureToken || profile.gitlabToken || profile.bitbucketToken)

  return (
    <div className="bc-root">
      <div className="bc-header">
        <div className="bc-header-top">
          <h3>{t('compare.title')}</h3>
          <div className="bc-header-actions">
            {hasToken && (
              <button className="btn primary small" onClick={openPR}>
                {t('compare.createPr')}
              </button>
            )}
            <button className="btn ghost small" onClick={closeModal}>{t('bisect.cancel')}</button>
          </div>
        </div>
        <span className="bc-labels">
          <input
            className="modal-input bc-ref-input"
            list="bc-refs"
            value={a}
            spellCheck={false}
            placeholder={t('compare.refPlaceholder')}
            onChange={(e) => setA(e.target.value)}
          />
          <button className="btn ghost icon-only bc-swap" title={t('compare.swapTitle')} onClick={swap}>
            <ArrowLeftRight size={13} />
          </button>
          <input
            className="modal-input bc-ref-input"
            list="bc-refs"
            value={b}
            spellCheck={false}
            placeholder={t('compare.refPlaceholder')}
            onChange={(e) => setB(e.target.value)}
          />
          <datalist id="bc-refs">
            {refOptions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </span>
      </div>

      {loading ? (
        <div className="bc-loading"><Loader2 size={20} className="spin" /></div>
      ) : result ? (
        <div className="bc-body">
          <div className="bc-commits-row">
            <div className="bc-commits-col">
              <div className="bc-col-title">
                <span className="bc-badge ahead">{result.aheadCommits.length}</span>
                {t('compare.commitsIn')} <strong>{a}</strong> {t('compare.notIn')} {b}
              </div>
              <div className="bc-commits-list">
                {result.aheadCommits.length === 0 ? (
                  <div className="bc-empty">{t('compare.noUnique')}</div>
                ) : (
                  result.aheadCommits.map((c) => (
                    <div key={c.hash} className="bc-commit">
                      <code className="bc-sha">{c.hash.slice(0, 7)}</code>
                      <span className="bc-msg" title={c.subject}>{c.subject}</span>
                      <span className="bc-date">{timeAgo(c.date)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bc-commits-col">
              <div className="bc-col-title">
                <span className="bc-badge behind">{result.behindCommits.length}</span>
                {t('compare.commitsIn')} <strong>{b}</strong> {t('compare.notIn')} {a}
              </div>
              <div className="bc-commits-list">
                {result.behindCommits.length === 0 ? (
                  <div className="bc-empty">{t('compare.noUnique')}</div>
                ) : (
                  result.behindCommits.map((c) => (
                    <div key={c.hash} className="bc-commit">
                      <code className="bc-sha">{c.hash.slice(0, 7)}</code>
                      <span className="bc-msg" title={c.subject}>{c.subject}</span>
                      <span className="bc-date">{timeAgo(c.date)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bc-diff-section">
            <div className="bc-diff-title">{interp(t('compare.combinedDiff'), { b, a })}</div>
            {result.diff.trim() ? (
              <div className="bc-diff-scroll">
                <DiffViewer diff={result.diff} />
              </div>
            ) : (
              <div className="bc-empty">{t('compare.noDiff')}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
