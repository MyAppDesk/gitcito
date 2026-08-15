import { useCallback, useEffect, useState } from 'react'
import { GitMerge, Play, Check, Settings2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { GitflowConfig, GitflowKind, GitflowStatus } from '../../../shared/types'
import { useT, interp, type TranslationKey } from '../i18n'

const KIND_LABEL: Record<GitflowKind, TranslationKey> = {
  feature: 'gitflow.kindFeature',
  release: 'gitflow.kindRelease',
  hotfix: 'gitflow.kindHotfix'
}

/** The prefix a kind uses, so the dialog can show the branch before creating it. */
function prefixOf(config: GitflowConfig, kind: GitflowKind): string {
  return kind === 'feature' ? config.featurePrefix : kind === 'release' ? config.releasePrefix : config.hotfixPrefix
}

export function GitflowModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const [status, setStatus] = useState<GitflowStatus | null>(null)
  const [draft, setDraft] = useState<GitflowConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [kind, setKind] = useState<GitflowKind>('feature')
  const [name, setName] = useState('')
  const [tagIt, setTagIt] = useState(true)
  const [tagMessage, setTagMessage] = useState('')

  const reload = useCallback(async (): Promise<void> => {
    const next = await gitApi.gitflowStatus(repoPath)
    setStatus(next)
    setDraft(next.config)
    // A repo with no layout yet opens straight into the setup form; there is
    // nothing else to show it.
    setEditing(!next.initialized)
  }, [repoPath])

  // The current branch drives half of this dialog, so re-read when it moves.
  useEffect(() => {
    void reload()
  }, [reload, repo?.branches.current])

  if (!status || !draft) return <div className="gitflow-modal" />

  const { config, currentFlow } = status
  const branchToStart = prefixOf(config, kind) + name.trim()
  const baseOf = (k: GitflowKind): string => (k === 'hotfix' ? config.main : config.develop)

  const field = (label: string, key: keyof GitflowConfig): React.JSX.Element => (
    <label className="gitflow-field">
      <span>{label}</span>
      <input className="modal-input" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
    </label>
  )

  const save = async (): Promise<void> => {
    await repoActions.gitflowInit(repoPath, draft)
    setEditing(false)
    await reload()
  }

  const start = async (): Promise<void> => {
    if (!name.trim()) return
    await repoActions.gitflowStart(repoPath, kind, name.trim())
    setName('')
    await reload()
  }

  const finish = (): void => {
    if (!currentFlow) return
    const targets = currentFlow.kind === 'feature' ? [config.develop] : [config.main, config.develop]
    openModal({
      kind: 'confirm',
      danger: true,
      title: interp(t('confirm.gitflowFinish.title'), { branch: status.current }),
      message: interp(t('confirm.gitflowFinish.message'), {
        branch: status.current,
        targets: targets.join(' + ')
      }),
      confirmLabel: t('confirm.gitflowFinish.ok'),
      onConfirm: () => {
        void repoActions
          .gitflowFinish(repoPath, currentFlow.kind, currentFlow.name, {
            tag: currentFlow.kind === 'feature' ? false : tagIt,
            message: tagMessage.trim() || undefined
          })
          .then(() => reload())
      }
    })
  }

  return (
    <div className="gitflow-modal">
      <h3>
        <GitMerge size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('gitflow.title')}
      </h3>
      <p className="settings-hint">{t('gitflow.intro')}</p>

      {editing ? (
        <>
          <p className="settings-hint">{t('gitflow.setupIntro')}</p>
          <div className="gitflow-grid">
            {field(t('gitflow.mainBranch'), 'main')}
            {field(t('gitflow.developBranch'), 'develop')}
            {field(t('gitflow.featurePrefix'), 'featurePrefix')}
            {field(t('gitflow.releasePrefix'), 'releasePrefix')}
            {field(t('gitflow.hotfixPrefix'), 'hotfixPrefix')}
            {field(t('gitflow.tagPrefix'), 'versionTagPrefix')}
          </div>
          {!status.hasDevelop && (
            <p className="modal-hint">
              {interp(t('gitflow.createsDevelop'), { branch: draft.develop, main: draft.main })}
            </p>
          )}
          <div className="modal-actions">
            {status.initialized && (
              <button className="btn ghost" type="button" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </button>
            )}
            <button className="btn primary" type="button" onClick={() => void save()}>
              <Check size={13} /> {t('gitflow.setUp')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="gitflow-section">
            <h4>{t('gitflow.startTitle')}</h4>
            <div className="gitflow-start-row">
              <label className="gitflow-field">
                <span>{t('gitflow.kind')}</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as GitflowKind)}>
                  {(['feature', 'release', 'hotfix'] as GitflowKind[]).map((k) => (
                    <option key={k} value={k}>
                      {t(KIND_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gitflow-field grow">
                <span>{t('gitflow.name')}</span>
                <input
                  className="modal-input"
                  value={name}
                  placeholder={t('gitflow.namePlaceholder')}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void start()
                  }}
                />
              </label>
              <button className="btn primary" type="button" disabled={!name.trim()} onClick={() => void start()}>
                <Play size={13} /> {t('gitflow.start')}
              </button>
            </div>
            {name.trim() && (
              <p className="modal-hint">
                {interp(t('gitflow.startsFrom'), { branch: branchToStart, base: baseOf(kind) })}
              </p>
            )}
          </div>

          <div className="gitflow-section">
            <h4>{interp(t('gitflow.finishTitle'), { branch: currentFlow ? status.current : '—' })}</h4>
            {currentFlow ? (
              <>
                <p className="settings-hint">
                  {currentFlow.kind === 'feature'
                    ? interp(t('gitflow.finishFeature'), { develop: config.develop })
                    : tagIt
                      ? interp(t('gitflow.finishRelease'), {
                          main: config.main,
                          develop: config.develop,
                          tag: config.versionTagPrefix + currentFlow.name
                        })
                      : interp(t('gitflow.finishNoTag'), { main: config.main, develop: config.develop })}
                </p>
                {currentFlow.kind !== 'feature' && (
                  <>
                    <label className="clone-partial">
                      <input type="checkbox" checked={tagIt} onChange={(e) => setTagIt(e.target.checked)} />
                      <span>{t('gitflow.tagIt')}</span>
                    </label>
                    {tagIt && (
                      <label className="gitflow-field">
                        <span>{t('gitflow.tagMessage')}</span>
                        <input
                          className="modal-input"
                          value={tagMessage}
                          onChange={(e) => setTagMessage(e.target.value)}
                        />
                      </label>
                    )}
                  </>
                )}
                <p className="modal-hint">{t('gitflow.undoable')}</p>
                <div className="modal-actions">
                  <button className="btn danger" type="button" onClick={finish}>
                    <Check size={13} /> {t('gitflow.finish')}
                  </button>
                </div>
              </>
            ) : (
              <p className="settings-hint">{t('gitflow.notFlowBranch')}</p>
            )}
          </div>

          <button className="link-btn" type="button" onClick={() => setEditing(true)}>
            <Settings2 size={12} /> {t('gitflow.editLayout')}
          </button>
        </>
      )}
    </div>
  )
}
