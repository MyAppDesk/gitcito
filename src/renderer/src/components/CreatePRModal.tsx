import { useEffect, useRef, useState } from 'react'
import { GitPullRequest, Loader2, ExternalLink, ArrowRight } from 'lucide-react'
import { gitApi, hostingApi } from '../infrastructure/api'
import { useUIStore, type ModalSpec } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'

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

  const tokens = { github: profile.githubToken || undefined, azure: profile.azureToken || undefined }
  const valid = !!remoteUrl && !!source && !!target && source !== target && !!title.trim() && !busy

  const submit = async (): Promise<void> => {
    if (!valid) return
    setBusy(true)
    try {
      const res = await hostingApi.createPR(remoteUrl, tokens, { title: title.trim(), body, source, target, draft })
      closeModal()
      toast('success', `Created PR #${res.number}`)
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
        Create pull request
      </h3>

      <div className="pr-branch-pick">
        <label className="pr-branch-field">
          <span>From</span>
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
          <span>Into</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {locals.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>
      {source === target && <p className="pr-warn">Pick two different branches.</p>}
      {!remoteUrl && <p className="pr-warn">No remote configured — add an origin to create a PR.</p>}

      <label className="modal-label">Title</label>
      <input
        autoFocus
        className="modal-input"
        value={title}
        onChange={(e) => {
          titleTouched.current = true
          setTitle(e.target.value)
        }}
        placeholder="Pull request title"
      />

      <label className="modal-label">Description</label>
      <textarea
        className="pr-body"
        value={body}
        onChange={(e) => {
          bodyTouched.current = true
          setBody(e.target.value)
        }}
        placeholder="Describe the change…"
        spellCheck
      />

      <label className="pr-draft">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
        <span>Create as draft</span>
      </label>

      <div className="modal-actions pr-actions">
        <button
          className="btn ghost small"
          onClick={openInBrowser}
          disabled={busy || !remoteUrl || source === target}
          title="Open the host's compare page instead"
        >
          <ExternalLink size={13} /> Open in browser
        </button>
        <span className="pr-actions-spacer" />
        <button className="btn ghost" onClick={closeModal} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => void submit()} disabled={!valid}>
          {busy ? <Loader2 size={13} className="spin" /> : null} Create PR
        </button>
      </div>
    </>
  )
}
