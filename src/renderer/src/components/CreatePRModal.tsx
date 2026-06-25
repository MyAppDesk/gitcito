import { useEffect, useRef, useState } from 'react'
import { GitPullRequest, Loader2, ExternalLink, ArrowRight, Sparkles } from 'lucide-react'
import { gitApi, hostingApi, aiApi } from '../infrastructure/api'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { useT, interp } from '../i18n'

/** Best guess at the base branch when none is supplied — never the source itself. */
function guessTarget(branches: string[], source: string): string {
  return (
    branches.find((b) => (b === 'main' || b === 'master') && b !== source) ??
    branches.find((b) => b !== source) ??
    ''
  )
}

export function CreatePRModal({ spec }: { spec: Extract<ModalSpec, { kind: 'create-pr' }> }): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const profile = useSettingsStore((s) => s.activeProfile())
  const repo = useRepoStore((s) => s.repos[spec.repoPath])

  const locals = repo?.branches.locals.map((b) => b.name) ?? []
  const origin = repo?.remotes.find((r) => r.name === 'origin') ?? repo?.remotes[0]
  const remoteUrl = spec.remoteUrl ?? origin?.url ?? ''

  const initialSource = spec.source ?? repo?.branches.current ?? locals[0] ?? ''
  const [source, setSource] = useState(initialSource)
  const [target, setTarget] = useState(spec.target ?? guessTarget(locals, initialSource))
  const [title, setTitle] = useState(spec.defaultTitle ?? '')
  const [body, setBody] = useState(spec.defaultBody ?? '')
  const [draft, setDraft] = useState(false)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [reviewers, setReviewers] = useState('')
  const [labels, setLabels] = useState('')
  const [assignees, setAssignees] = useState('')
  const aiEnabled = profile.ai?.enabled !== false
  const t = useT()

  // Draft the PR title + body from the branch's commits + diff via AI.
  const aiDraft = async (): Promise<void> => {
    if (!source || !target || source === target) return
    setAiBusy(true)
    try {
      const cmp = await gitApi.compareBranches(spec.repoPath, source, target)
      const commits = cmp.aheadCommits.map((c) => `- ${c.subject}`).join('\n')
      const { title: t, body: b } = await aiApi.prDescription(commits, cmp.diff, profile.ai)
      if (t) {
        titleTouched.current = true
        setTitle(t)
      }
      if (b) {
        bodyTouched.current = true
        setBody(b)
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  // Auto-fill title/body from the commits unique to `source` — unless the opener
  // already supplied a title, or the user has started editing the fields.
  const titleTouched = useRef(!!spec.defaultTitle)
  const bodyTouched = useRef(!!spec.defaultBody)
  useEffect(() => {
    if (!remoteUrl || !source || !target || source === target) return
    if (titleTouched.current && bodyTouched.current) return
    let cancelled = false
    void gitApi.compareBranches(spec.repoPath, source, target).then((r) => {
      if (cancelled) return
      const ahead = r.aheadCommits
      if (!titleTouched.current) setTitle(ahead.length === 1 ? ahead[0].subject : source)
      if (!bodyTouched.current) setBody(ahead.map((c) => `- ${c.subject}`).join('\n'))
    })
    return () => {
      cancelled = true
    }
  }, [spec.repoPath, source, target, remoteUrl])

  const tokens = {
    github: profile.githubToken || undefined,
    azure: profile.azureToken || undefined,
    gitlab: profile.gitlabToken || undefined,
    bitbucket: profile.bitbucketToken || undefined
  }
  const valid = !!remoteUrl && !!source && !!target && source !== target && !!title.trim() && !busy
  const isGitHub = /github\.com/i.test(remoteUrl ?? '')

  const splitList = (s: string): string[] =>
    s
      .split(',')
      .map((x) => x.trim().replace(/^@/, ''))
      .filter(Boolean)

  const submit = async (): Promise<void> => {
    if (!valid) return
    setBusy(true)
    try {
      const res = await hostingApi.createPR(remoteUrl, tokens, { title: title.trim(), body, source, target, draft })
      // Best-effort: apply reviewers / labels / assignees (GitHub only).
      if (isGitHub && (reviewers.trim() || labels.trim() || assignees.trim())) {
        await hostingApi
          .applyPrMeta(remoteUrl, tokens, res.number, {
            reviewers: splitList(reviewers),
            labels: splitList(labels),
            assignees: splitList(assignees)
          })
          .catch(() => {})
      }
      closeModal()
      toast('success', interp(t('createPR.created'), { n: res.number }))
      void window.api.openExternal(res.url)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const openInBrowser = (): void => {
    closeModal()
    void hostingApi.openCreatePR(remoteUrl, source, target)
  }

  return (
    <>
      <h3>
        <GitPullRequest size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('createPR.title')}
      </h3>

      <div className="pr-branch-pick">
        <label className="pr-branch-field">
          <span>{t('createPR.from')}</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {locals.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight size={14} className="pr-branch-arrow" />
        <label className="pr-branch-field">
          <span>{t('createPR.into')}</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {locals.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>
      {source === target && <p className="pr-warn">{t('createPR.differentBranches')}</p>}
      {!remoteUrl && <p className="pr-warn">{t('createPR.noRemote')}</p>}

      <label className="modal-label">{t('createPR.titleLabel')}</label>
      <input
        autoFocus
        className="modal-input"
        value={title}
        onChange={(e) => {
          titleTouched.current = true
          setTitle(e.target.value)
        }}
        placeholder={t('createPR.titlePlaceholder')}
      />

      <div className="pr-desc-label">
        <label className="modal-label">{t('createPR.descriptionLabel')}</label>
        {aiEnabled && (
          <button
            className="btn ghost small"
            onClick={() => void aiDraft()}
            disabled={aiBusy || !remoteUrl || source === target}
            title={t('createPR.aiDraftTitle')}
          >
            {aiBusy ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} {t('createPR.aiDraft')}
          </button>
        )}
      </div>
      <textarea
        className="pr-body"
        value={body}
        onChange={(e) => {
          bodyTouched.current = true
          setBody(e.target.value)
        }}
        placeholder={t('createPR.descriptionPlaceholder')}
        spellCheck
      />

      {isGitHub && (
        <div className="pr-meta">
          <label className="modal-label">{t('createPR.reviewersLabel')}</label>
          <input className="modal-input" value={reviewers} onChange={(e) => setReviewers(e.target.value)} placeholder={t('createPR.reviewersPlaceholder')} />
          <div className="form-row two">
            <label>
              {t('createPR.labelsLabel')}
              <input className="modal-input" value={labels} onChange={(e) => setLabels(e.target.value)} placeholder={t('createPR.labelsPlaceholder')} />
            </label>
            <label>
              {t('createPR.assigneesLabel')}
              <input className="modal-input" value={assignees} onChange={(e) => setAssignees(e.target.value)} placeholder={t('createPR.assigneesPlaceholder')} />
            </label>
          </div>
        </div>
      )}

      <label className="pr-draft">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>{t('createPR.createDraft')}</span>
      </label>

      <div className="modal-actions pr-actions">
        <button
          className="btn ghost small"
          onClick={openInBrowser}
          disabled={busy || !remoteUrl || source === target}
          title={t('createPR.openBrowserTitle')}
        >
          <ExternalLink size={13} /> {t('createPR.openBrowser')}
        </button>
        <span className="pr-actions-spacer" />
        <button className="btn ghost" onClick={closeModal} disabled={busy}>
          {t('bisect.cancel')}
        </button>
        <button className="btn primary" onClick={() => void submit()} disabled={!valid}>
          {busy ? <Loader2 size={13} className="spin" /> : null} {t('createPR.createButton')}
        </button>
      </div>
    </>
  )
}
