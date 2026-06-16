import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { BranchCompareResult } from '../../../shared/types'
import { gitApi, hostingApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { DiffViewer } from './DiffViewer'

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

  const [result, setResult] = useState<BranchCompareResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [prBusy, setPrBusy] = useState(false)

  useEffect(() => {
    setLoading(true)
    gitApi.compareBranches(repoPath, branchA, branchB).then((r) => {
      setResult(r)
      setLoading(false)
    }).catch((err) => {
      toast('error', err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }, [repoPath, branchA, branchB])

  const openPR = async (): Promise<void> => {
    const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
    if (!origin) { toast('error', 'No remote found'); return }
    setPrBusy(true)
    try {
      await hostingApi.openCreatePR(origin.url, branchA, branchB)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setPrBusy(false)
    }
  }

  const hasToken = !!(profile.githubToken || profile.azureToken || profile.gitlabToken || profile.bitbucketToken)

  return (
    <div className="bc-root">
      <div className="bc-header">
        <h3>Compare branches</h3>
        <span className="bc-labels">
          <span className="bc-branch-a">{branchA}</span>
          <span className="bc-vs">vs</span>
          <span className="bc-branch-b">{branchB}</span>
        </span>
        <div className="bc-header-actions">
          {hasToken && (
            <button className="btn ghost small" onClick={openPR} disabled={prBusy}>
              {prBusy ? <Loader2 size={12} className="spin" /> : null} Open PR
            </button>
          )}
          <button className="btn ghost small" onClick={closeModal}>Close</button>
        </div>
      </div>

      {loading ? (
        <div className="bc-loading"><Loader2 size={20} className="spin" /></div>
      ) : result ? (
        <div className="bc-body">
          <div className="bc-commits-row">
            <div className="bc-commits-col">
              <div className="bc-col-title">
                <span className="bc-badge ahead">{result.aheadCommits.length}</span>
                commits in <strong>{branchA}</strong> not in {branchB}
              </div>
              <div className="bc-commits-list">
                {result.aheadCommits.length === 0 ? (
                  <div className="bc-empty">No unique commits</div>
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
                commits in <strong>{branchB}</strong> not in {branchA}
              </div>
              <div className="bc-commits-list">
                {result.behindCommits.length === 0 ? (
                  <div className="bc-empty">No unique commits</div>
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
            <div className="bc-diff-title">Combined diff ({branchB}…{branchA})</div>
            {result.diff.trim() ? (
              <div className="bc-diff-scroll">
                <DiffViewer diff={result.diff} />
              </div>
            ) : (
              <div className="bc-empty">No differences</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
