import { useCallback, useEffect, useState } from 'react'
import { Layers, Plus, RefreshCw, GitPullRequest, Check, X, ArrowUpDown, CornerDownRight } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { StackInfo } from '../../../shared/types'
import { useT } from '../i18n'

export function StackModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const [info, setInfo] = useState<StackInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setInfo(await gitApi.stackInfo(repoPath))
    } catch {
      setInfo({ trunk: '', branches: [] })
    } finally {
      setLoading(false)
    }
  }, [repoPath])

  useEffect(() => {
    void reload()
  }, [reload, repo?.branches.current])

  const after = async (p: Promise<unknown>): Promise<void> => {
    await p
    await reload()
  }

  const newStacked = (): void => {
    openModal({
      kind: 'input',
      title: t('stack.newStacked'),
      label: `Create a branch on top of "${repo?.branches.current ?? 'current'}"`,
      placeholder: 'feature/part-2',
      submitLabel: 'Create',
      onSubmit: (name) => void repoActions.createStackedBranch(repoPath, name)
    })
  }

  const setParent = (branch: string): void => {
    const others = (repo?.branches.locals ?? []).map((b) => b.name).filter((n) => n !== branch)
    useUIStore.getState().openContextMenu(window.innerWidth / 2 - 120, 200, [
      ...others.map((n) => ({ label: n, onClick: () => void after(repoActions.stackSetParent(repoPath, branch, n)) }))
    ])
  }

  const createPr = (source: string, target: string | null): void => {
    openModal({ kind: 'create-pr', repoPath, source, target: target ?? undefined })
  }

  const branches = info?.branches ?? []
  const leaf = branches[branches.length - 1]?.name ?? repo?.branches.current ?? ''
  const anyRestack = branches.some((b) => b.needsRestack)
  // Display top (leaf) → bottom (trunk).
  const display = branches.slice().reverse()

  return (
    <div className="stack-modal">
      <h3>
        <Layers size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('stack.title')}
      </h3>
      <p className="settings-hint">{t('stack.intro')}</p>

      <div className="stack-toolbar">
        <button className="btn ghost small" onClick={newStacked} disabled={!repo}>
          <Plus size={13} /> {t('stack.newStacked')}
        </button>
        <button
          className="btn primary small"
          onClick={() => void after(repoActions.stackRestack(repoPath, leaf))}
          disabled={!anyRestack || !leaf}
          title={anyRestack ? 'Cascade-rebase the stack onto current parents' : 'Nothing to restack'}
        >
          <RefreshCw size={13} /> {t('stack.restack')}
        </button>
        <button className="btn ghost small" onClick={() => void reload()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> {t('stack.refresh')}
        </button>
      </div>

      {branches.length === 0 ? (
        <p className="settings-hint">
          {loading ? 'Loading…' : t('stack.empty')}
        </p>
      ) : (
        <div className="stack-list">
          {display.map((b) => (
            <div key={b.name} className={`stack-node ${b.isCurrent ? 'current' : ''}`}>
              <div className="stack-node-rail">
                <span className="stack-node-dot" />
              </div>
              <div className="stack-node-body">
                <div className="stack-node-head">
                  <span className="stack-node-name">{b.name}</span>
                  {b.isCurrent && <span className="stack-badge current">{t('stack.current')}</span>}
                  {b.needsRestack && <span className="stack-badge warn">{t('stack.needsRestack')}</span>}
                  <span className="stack-node-ahead">
                    {b.ahead} commit{b.ahead === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="stack-node-actions">
                  {!b.isCurrent && (
                    <button className="link-btn" onClick={() => void after(repoActions.checkout(repoPath, b.name))}>
                      <Check size={12} /> {t('stack.checkout')}
                    </button>
                  )}
                  <button className="link-btn" onClick={() => setParent(b.name)}>
                    <ArrowUpDown size={12} /> {t('stack.setParent')}
                  </button>
                  {b.parent && (
                    <button className="link-btn" onClick={() => createPr(b.name, b.parent)}>
                      <GitPullRequest size={12} /> PR → {b.parent}
                    </button>
                  )}
                  {b.parent && (
                    <button className="link-btn danger" onClick={() => void after(repoActions.stackClearParent(repoPath, b.name))}>
                      <X size={12} /> {t('stack.untrack')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {info?.trunk && (
            <div className="stack-node trunk">
              <div className="stack-node-rail">
                <CornerDownRight size={13} className="stack-trunk-icon" />
              </div>
              <div className="stack-node-body">
                <span className="stack-node-name">{info.trunk}</span>
                <span className="stack-badge">{t('stack.base')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
