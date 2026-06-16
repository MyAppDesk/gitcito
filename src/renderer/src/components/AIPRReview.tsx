import { useEffect, useState } from 'react'
import { Loader2, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'
import { gitApi, aiApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { renderMarkdown } from '../preview/markdown'

export function AIPRReview({
  repoPath,
  prTitle,
  sourceBranch,
  targetBranch
}: {
  repoPath: string
  prTitle: string
  sourceBranch: string
  targetBranch: string
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const activeProfile = useSettingsStore((s) => s.activeProfile)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState('')
  const [risks, setRisks] = useState('')
  const [suggestions, setSuggestions] = useState('')

  useEffect(() => {
    const run = async (): Promise<void> => {
      setLoading(true)
      try {
        const diff = await gitApi.compareBranches(repoPath, sourceBranch, targetBranch)
        if (!diff.diff.trim()) {
          setSummary('No differences found between these branches.')
          setLoading(false)
          return
        }
        const result = await aiApi.reviewPR(diff.diff, activeProfile().ai)
        setSummary(result.summary)
        setRisks(result.risks)
        setSuggestions(result.suggestions)
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [repoPath, sourceBranch, targetBranch])

  return (
    <>
      <div className="ai-pr-header">
        <Sparkles size={16} />
        <h3>AI PR Review</h3>
        <span className="ai-pr-title">{prTitle}</span>
      </div>
      <p className="ai-pr-branches">
        <code>{sourceBranch}</code> → <code>{targetBranch}</code>
      </p>

      {loading ? (
        <div className="ai-pr-loading">
          <Loader2 size={20} className="spin" />
          <span>Analysing diff…</span>
        </div>
      ) : (
        <div className="ai-pr-body">
          {summary && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title"><Sparkles size={13} /> Summary</div>
              <div className="ai-pr-text">{summary}</div>
            </section>
          )}
          {risks && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title ai-pr-risk"><AlertTriangle size={13} /> Risks</div>
              <div
                className="ai-pr-text md-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(risks) }}
              />
            </section>
          )}
          {suggestions && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title ai-pr-suggest"><Lightbulb size={13} /> Suggestions</div>
              <div
                className="ai-pr-text md-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestions) }}
              />
            </section>
          )}
          {!summary && !risks && !suggestions && (
            <div className="ai-pr-empty">No review content returned.</div>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>Close</button>
      </div>
    </>
  )
}
