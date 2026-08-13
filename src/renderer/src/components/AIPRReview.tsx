import { useEffect, useState } from 'react'
import { Loader2, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'
import { gitApi, aiApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { renderMarkdown } from '../preview/markdown'
import { useT } from '../i18n'
import type { PRReviewFinding } from '../../../shared/types'

/** Findings carry an app-resolved path:line, so they render as a located list. */
function FindingList({ findings }: { findings: PRReviewFinding[] }): React.JSX.Element {
  return (
    <ul className="ai-pr-findings">
      {findings.map((f, i) => (
        <li key={i} className="ai-pr-finding">
          <span className={`ai-pr-sev ${f.severity}`}>{f.severity}</span>
          <div className="ai-pr-finding-body">
            <code className="ai-pr-loc">
              {f.path}:{f.line}
            </code>
            <div>{f.kind === 'suggestion' ? f.suggestion || f.claim : f.claim}</div>
            {f.kind === 'risk' && f.suggestion && <div className="ai-pr-fix">{f.suggestion}</div>}
          </div>
        </li>
      ))}
    </ul>
  )
}

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
  const t = useT()
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const activeProfile = useSettingsStore((s) => s.activeProfile)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState('')
  const [risks, setRisks] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [findings, setFindings] = useState<PRReviewFinding[]>([])

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
        setFindings(result.findings ?? [])
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [repoPath, sourceBranch, targetBranch])

  const riskFindings = findings.filter((f) => f.kind === 'risk')
  const suggestionFindings = findings.filter((f) => f.kind === 'suggestion')

  return (
    <>
      <div className="ai-pr-header">
        <Sparkles size={16} />
        <h3>{t('aiPrReview.title')}</h3>
        <span className="ai-pr-title">{prTitle}</span>
      </div>
      <p className="ai-pr-branches">
        <code>{sourceBranch}</code> → <code>{targetBranch}</code>
      </p>

      {loading ? (
        <div className="ai-pr-loading">
          <Loader2 size={20} className="spin" />
          <span>{t('aiPrReview.analysing')}</span>
        </div>
      ) : (
        <div className="ai-pr-body">
          {summary && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title">
                <Sparkles size={13} /> {t('aiPrReview.summary')}
              </div>
              <div className="ai-pr-text">{summary}</div>
            </section>
          )}
          {risks && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title ai-pr-risk">
                <AlertTriangle size={13} /> {t('aiPrReview.risks')}
              </div>
              {riskFindings.length > 0 ? (
                <FindingList findings={riskFindings} />
              ) : (
                <div
                  className="ai-pr-text md-preview"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(risks) }}
                />
              )}
            </section>
          )}
          {suggestions && (
            <section className="ai-pr-section">
              <div className="ai-pr-section-title ai-pr-suggest">
                <Lightbulb size={13} /> {t('aiPrReview.suggestions')}
              </div>
              {suggestionFindings.length > 0 ? (
                <FindingList findings={suggestionFindings} />
              ) : (
                <div
                  className="ai-pr-text md-preview"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestions) }}
                />
              )}
            </section>
          )}
          {!summary && !risks && !suggestions && (
            <div className="ai-pr-empty">{t('aiPrReview.empty')}</div>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>
          {t('common.close')}
        </button>
      </div>
    </>
  )
}
