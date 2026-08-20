import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleSlash, GitMerge, Loader2, Radar, Sparkles, SquarePen, Upload } from 'lucide-react'
import type { CommitEditInfo, CommitEditPreview, FileEntry } from '../../../shared/types'
import { gitApi, aiApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { repoActions, useRepoStore } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useT, interp } from '../i18n'

/** Per-file editor state: original blob + current draft. */
interface FileDraft {
  original: string
  draft: string
  binary: boolean
  tooLarge: boolean
  missing: boolean
}

export function CommitEditModal({
  repoPath,
  sha,
  subject
}: {
  repoPath: string
  sha: string
  subject: string
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)

  const [info, setInfo] = useState<CommitEditInfo | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [drafts, setDrafts] = useState<Record<string, FileDraft>>({})
  const [selFile, setSelFile] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<CommitEditPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const aiEnabled = useSettingsStore((s) => s.activeProfile().ai.enabled !== false)
  const aiFor = useSettingsStore((s) => s.aiFor)
  const branch = useRepoStore((s) => s.repos[repoPath]?.branches.current ?? '')

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [i, f] = await Promise.all([gitApi.commitEditInfo(repoPath, sha), gitApi.commitFiles(repoPath, sha)])
        if (!live) return
        setInfo(i)
        setMessage(i.message)
        setFiles(f)
      } catch (err) {
        toast('error', err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      live = false
    }
  }, [repoPath, sha, toast])

  const selectFile = async (f: FileEntry): Promise<void> => {
    setSelFile(f.path)
    if (drafts[f.path]) return
    if (f.status === 'D') {
      setDrafts((d) => ({ ...d, [f.path]: { original: '', draft: '', binary: false, tooLarge: false, missing: true } }))
      return
    }
    const blob = await gitApi.blobAtCommit(repoPath, sha, f.path).catch(() => null)
    setDrafts((d) => ({
      ...d,
      [f.path]: {
        original: blob?.content ?? '',
        draft: blob?.content ?? '',
        binary: blob?.binary ?? false,
        tooLarge: blob ? blob.content === null && !blob.binary : false,
        missing: blob === null
      }
    }))
  }

  const edits = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [path, d] of Object.entries(drafts)) {
      if (!d.binary && !d.tooLarge && !d.missing && d.draft !== d.original) out[path] = d.draft
    }
    return out
  }, [drafts])

  const messageChanged = info !== null && message.trim() !== info.message.trim()
  const dirty = Object.keys(edits).length > 0 || messageChanged
  // Ancestry is the only hard requirement — merges in the range are replayed
  // with their recorded resolutions.
  const editable = Boolean(info?.ancestor)

  // Any change invalidates the last forecast.
  const setDraft = (path: string, draft: string): void => {
    setDrafts((d) => ({ ...d, [path]: { ...d[path], draft } }))
    setPreview(null)
  }

  const runPreview = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      setPreview(await gitApi.commitEditPreview(repoPath, sha, edits, message))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [repoPath, sha, edits, message, toast])

  // AI message from the commit's own diff — works for any commit, not just HEAD.
  const generateMessage = async (): Promise<void> => {
    setAiBusy(true)
    try {
      const diff = await gitApi.commitDiff(repoPath, sha)
      if (!diff.trim()) {
        toast('info', t('commitPanel.nothingToSummarize'))
        return
      }
      const msg = await aiApi.commitMessage(diff, aiFor('commit'), { branch })
      setMessage(msg.description ? `${msg.summary}\n\n${msg.description}` : msg.summary)
      setPreview(null)
      toast('success', t('commitPanel.aiGenerated'))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  const apply = (): void => {
    openModal({
      kind: 'confirm',
      title: t('commitEdit.applyTitle'),
      message: interp(info?.pushed ? t('commitEdit.applyConfirmPushed') : t('commitEdit.applyConfirm'), {
        sha: sha.slice(0, 7),
        n: info?.descendants ?? 0
      }),
      confirmLabel: t('commitEdit.apply'),
      onConfirm: () => {
        void repoActions.commitEditApply(repoPath, sha, edits, message).then((ok) => {
          if (ok) closeModal()
        })
      }
    })
  }

  const sel = drafts[selFile]

  return (
    <div className="commitedit">
      <h3>
        <SquarePen size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('commitEdit.title')}
        <span className="commitedit-sha">{sha.slice(0, 7)}</span>
        <span className="commitedit-subject" title={subject}>
          {subject}
        </span>
      </h3>
      <p className="settings-hint">{t('commitEdit.intro')}</p>

      {info && !info.ancestor && (
        <div className="commitedit-banner error">
          <CircleSlash size={13} /> {t('commitEdit.notLinear')}
        </div>
      )}
      {info && info.ancestor && info.merges > 0 && (
        <div className="commitedit-banner">
          <GitMerge size={13} /> {interp(t('commitEdit.mergesInRange'), { n: info.merges })}
        </div>
      )}
      {info?.pushed && info.ancestor && (
        <div className="commitedit-banner warn">
          <Upload size={13} /> {t('commitEdit.pushedWarning')}
        </div>
      )}

      <div className="commitedit-label-row">
        <label className="commitedit-label">{t('commitEdit.message')}</label>
        {aiEnabled && (
          <button
            className="icon-btn commit-edit-btn"
            type="button"
            title={t('commitPanel.generateWithAiTitle')}
            disabled={!editable || aiBusy}
            onClick={() => void generateMessage()}
          >
            {aiBusy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
          </button>
        )}
      </div>
      <textarea
        className="commitedit-message"
        value={message}
        disabled={!editable}
        rows={2}
        onChange={(e) => {
          setMessage(e.target.value)
          setPreview(null)
        }}
      />

      <div className="commitedit-split">
        <div className="commitedit-files">
          {files.map((f) => {
            const d = drafts[f.path]
            const changed = d && !d.binary && !d.missing && d.draft !== d.original
            return (
              <div
                key={f.path}
                className={`snapshot-file-row ${selFile === f.path ? 'active' : ''}`}
                onClick={() => void selectFile(f)}
              >
                <span className={`snapshot-file-status st-${f.status.toLowerCase()}`}>{f.status}</span>
                <span className="snapshot-file-path">{f.path}</span>
                {changed && <span className="commitedit-dot" title={t('commitEdit.modified')} />}
              </div>
            )
          })}
        </div>
        <div className="commitedit-editor">
          {!sel ? (
            <p className="settings-hint" style={{ padding: 10 }}>{t('commitEdit.selectFile')}</p>
          ) : sel.missing ? (
            <p className="settings-hint" style={{ padding: 10 }}>{t('commitEdit.notEditable')}</p>
          ) : sel.binary ? (
            <p className="settings-hint" style={{ padding: 10 }}>{t('commitEdit.binary')}</p>
          ) : sel.tooLarge ? (
            <p className="settings-hint" style={{ padding: 10 }}>{t('commitEdit.tooLarge')}</p>
          ) : (
            <textarea
              className="commitedit-textarea"
              value={sel.draft}
              disabled={!editable}
              spellCheck={false}
              onChange={(e) => setDraft(selFile, e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="commitedit-cascade">
        <div className="commitedit-cascade-head">
          <button className="btn ghost small" onClick={() => void runPreview()} disabled={!editable || !dirty || busy}>
            {busy ? <Loader2 size={13} className="spin" /> : <Radar size={13} />} {t('commitEdit.preview')}
          </button>
          {info && info.ancestor && (
            <span className="settings-hint">{interp(t('commitEdit.descendants'), { n: info.descendants })}</span>
          )}
          <button
            className="btn primary small"
            style={{ marginLeft: 'auto' }}
            onClick={apply}
            disabled={!editable || !dirty || busy || (preview !== null && preview.newTip === null)}
          >
            <SquarePen size={13} /> {t('commitEdit.apply')}
          </button>
        </div>
        {preview && (
          <div className="commitedit-steps">
            {preview.steps.length === 0 && <p className="settings-hint">{t('commitEdit.noDescendants')}</p>}
            {preview.steps.map((s) => (
              <div key={s.sha} className={`commitedit-step ${s.status}`}>
                {s.status === 'clean' ? (
                  <Check size={12} />
                ) : s.status === 'conflict' ? (
                  <AlertTriangle size={12} />
                ) : (
                  <CircleSlash size={12} />
                )}
                {s.merge && <GitMerge size={12} className="commitedit-step-merge" aria-hidden="true" />}
                <span className="commitedit-step-subject">{s.subject}</span>
                {s.status === 'conflict' && (
                  <span className="commitedit-step-files" title={s.files.join('\n')}>
                    {interp(t('radar.conflictFiles'), { n: String(s.files.length) })}
                  </span>
                )}
              </div>
            ))}
            {preview.newTip === null && <p className="commitedit-banner error">{t('commitEdit.conflictHint')}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
