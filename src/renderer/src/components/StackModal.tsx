import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Layers,
  Plus,
  RefreshCw,
  GitPullRequest,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  Upload,
  Link2
} from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { StackInfo } from '../../../shared/types'
import { RefPicker, type RefOption } from './RefPicker'
import { adoptableBranches, moveLevel, stackOrder, targetFor } from '../lib/stackOrder'
import { useT, interp } from '../i18n'

/**
 * The stack: a chain of branches where every PR targets the branch below it.
 *
 * The modal is a list with a top and a bottom because that is how the chain is
 * reasoned about — "put this one under that one", "add a level here". Every
 * edit is a picker or an arrow, never a typed branch name that has to be right
 * first time, and each row states what its PR will target so the chain is
 * readable without opening GitHub.
 */
export function StackModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const [info, setInfo] = useState<StackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  /** Which level's parent picker is open, if any. */
  const [editing, setEditing] = useState<string | null>(null)
  /** The "add a level" row: null when closed, else the parent it will sit on. */
  const [adding, setAdding] = useState<{ parent: string; name: string } | null>(null)
  const [adopt, setAdopt] = useState('')

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

  const branches = info?.branches ?? []
  const order = stackOrder(info)
  const leaf = order[order.length - 1] ?? repo?.branches.current ?? ''
  const trunk = info?.trunk ?? ''
  const anyRestack = branches.some((b) => b.needsRestack)
  const locals = useMemo(() => (repo?.branches.locals ?? []).map((b) => b.name), [repo?.branches.locals])

  /** Any local branch, plus the remote-tracking refs — a stack can sit on either. */
  const parentOptions = useMemo<RefOption[]>(
    () => [
      ...locals.map((value) => ({ value, kind: 'local' as const })),
      ...(repo?.branches.remotes ?? []).map((r) => ({ value: r.fullName, kind: 'remote' as const }))
    ],
    [locals, repo?.branches.remotes]
  )
  const adoptOptions = useMemo<RefOption[]>(
    () => adoptableBranches(locals, info).map((value) => ({ value, kind: 'local' as const })),
    [locals, info]
  )

  const prFor = (branch: string): { id: number; url: string } | undefined =>
    repo?.prs.find((p) => p.sourceBranch === branch)

  // Reordering replays the whole chain, so it goes through the store (busy
  // label, undo entry, conflict handling) rather than straight to the API.
  const move = (branch: string, direction: 1 | -1): void => {
    const next = moveLevel(order, branch, direction)
    if (!next || !trunk) return
    void after(repoActions.stackReorder(repoPath, trunk, next, order))
  }

  const submitStack = async (): Promise<void> => {
    setSubmitting(true)
    try {
      await repoActions.submitStack(repoPath)
    } finally {
      setSubmitting(false)
      await reload()
    }
  }

  const startAdd = (parent: string): void => {
    setAdding({ parent, name: '' })
    setEditing(null)
  }

  const confirmAdd = (): void => {
    if (!adding?.name.trim() || !adding.parent) return
    const child = branches.find((b) => b.parent === adding.parent)?.name
    const name = adding.name.trim()
    setAdding(null)
    void after(repoActions.stackInsert(repoPath, name, adding.parent, child))
  }

  // Display top (leaf) → bottom (trunk): the leaf is what you are working on.
  const display = branches.slice().reverse()

  return (
    <div className="stack-modal">
      <h3>
        <Layers size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('stack.title')}
      </h3>
      <p className="settings-hint">{t('stack.intro')}</p>

      <div className="stack-toolbar">
        <button className="btn ghost small" onClick={() => startAdd(leaf || trunk)} disabled={!repo || !leaf}>
          <Plus size={13} /> {t('stack.addLevel')}
        </button>
        <button
          className="btn primary small"
          onClick={() => void after(repoActions.stackRestack(repoPath, leaf))}
          disabled={!anyRestack || !leaf}
          title={anyRestack ? t('stack.restackHint') : t('stack.nothingToRestack')}
        >
          <RefreshCw size={13} /> {t('stack.restack')}
        </button>
        <button
          className="btn ghost small"
          onClick={() => void after(repoActions.stackPushAll(repoPath))}
          disabled={branches.length === 0}
          title={t('stack.pushAllHint')}
        >
          <Upload size={13} /> {t('stack.pushAll')}
        </button>
        <button
          className="btn primary small"
          onClick={() => void submitStack()}
          disabled={submitting || branches.length === 0}
          title={t('stack.submitHint')}
        >
          <GitPullRequest size={13} className={submitting ? 'spin' : undefined} /> {t('stack.submit')}
        </button>
        <button className="btn ghost small" onClick={() => void reload()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> {t('stack.refresh')}
        </button>
      </div>

      {/* The top of the chain — and the only way in when there is no stack yet. */}
      <AnimatePresence initial={false}>
        {adding && adding.parent === (leaf || trunk) && (
          <StackAddRow
            value={adding}
            options={parentOptions}
            onChange={setAdding}
            onConfirm={confirmAdd}
            onCancel={() => setAdding(null)}
          />
        )}
      </AnimatePresence>

      {branches.length === 0 ? (
        <p className="settings-hint">
          {loading
            ? t('stack.loading')
            : interp(t('stack.emptyHint'), { branch: repo?.branches.current ?? t('stack.currentBranch') })}
        </p>
      ) : (
        <div className="stack-list">
          {display.map((b, i) => {
            const pr = prFor(b.name)
            const target = targetFor(info, b.name)
            return (
              <motion.div
                key={b.name}
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={`stack-node ${b.isCurrent ? 'current' : ''}`}
              >
                <div className="stack-node-rail">
                  <span className="stack-node-dot" />
                </div>
                <div className="stack-node-body">
                  <div className="stack-node-head">
                    <span className="stack-node-name">{b.name}</span>
                    {b.isCurrent && <span className="stack-badge current">{t('stack.current')}</span>}
                    {b.needsRestack && <span className="stack-badge warn">{t('stack.needsRestack')}</span>}
                    {pr && (
                      <button
                        className="stack-pr-chip"
                        title={pr.url}
                        onClick={() => void window.api.openExternal(pr.url)}
                      >
                        {/* i18n-ignore GitHub's own PR numbering */}
                        <GitPullRequest size={11} /> #{pr.id}
                      </button>
                    )}
                    <div className="stack-node-right">
                      <span className="stack-node-ahead">
                        {b.ahead} {b.ahead === 1 ? t('stack.commit') : t('stack.commits')}
                      </span>
                      <div className="stack-move">
                        <button
                          className="stack-move-btn"
                          title={t('stack.moveUp')}
                          disabled={i === 0 || !trunk}
                          onClick={() => move(b.name, 1)}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          className="stack-move-btn"
                          title={t('stack.moveDown')}
                          disabled={i === display.length - 1 || !trunk}
                          onClick={() => move(b.name, -1)}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="stack-node-target">
                    {interp(t('stack.targets'), { target: target || t('stack.currentBranch') })}
                  </div>

                  {editing === b.name ? (
                    <div className="stack-parent-edit">
                      <DraftRefPicker
                        initial={b.parent ?? trunk}
                        options={parentOptions}
                        placeholder={t('stack.parentPlaceholder')}
                        onCommit={(v) => {
                          setEditing(null)
                          if (v && v !== b.parent) void after(repoActions.stackSetParent(repoPath, b.name, v))
                        }}
                      />
                      <button className="link-btn" onClick={() => setEditing(null)}>
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="stack-node-actions">
                      {!b.isCurrent && (
                        <button className="link-btn" onClick={() => void after(repoActions.checkout(repoPath, b.name))}>
                          <Check size={12} /> {t('stack.checkout')}
                        </button>
                      )}
                      <button className="link-btn" onClick={() => setEditing(b.name)}>
                        <Link2 size={12} /> {t('stack.setParent')}
                      </button>
                      <button className="link-btn" onClick={() => startAdd(b.name)}>
                        <Plus size={12} /> {t('stack.addAbove')}
                      </button>
                      {b.parent && (
                        <button className="link-btn" onClick={() => openModal({ kind: 'create-pr', repoPath, source: b.name, target: b.parent ?? undefined })}>
                          <GitPullRequest size={12} /> {t('stack.openPr')}
                        </button>
                      )}
                      {b.parent && (
                        <button
                          className="link-btn danger"
                          onClick={() => void after(repoActions.stackClearParent(repoPath, b.name))}
                        >
                          <X size={12} /> {t('stack.untrack')}
                        </button>
                      )}
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {adding && adding.parent === b.name && b.name !== (leaf || trunk) && (
                      <StackAddRow
                        value={adding}
                        options={parentOptions}
                        onChange={setAdding}
                        onConfirm={confirmAdd}
                        onCancel={() => setAdding(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}

          <motion.div layout className="stack-node trunk">
            <div className="stack-node-rail">
              <CornerDownRight size={13} className="stack-trunk-icon" />
            </div>
            <div className="stack-node-body">
              <span className="stack-badge">{t('stack.base')}</span>
              <DraftRefPicker
                className="stack-trunk-pick"
                initial={trunk}
                options={parentOptions}
                placeholder={t('stack.trunkPlaceholder')}
                onCommit={(v) => {
                  // Re-linking the bottom onto a different trunk is a reorder
                  // with the same order — the replay is what makes it real.
                  if (v && v !== trunk && order.length)
                    void after(repoActions.stackReorder(repoPath, v, order, order, trunk))
                }}
              />
              <span className="settings-hint stack-trunk-hint">{t('stack.trunkHint')}</span>
            </div>
          </motion.div>
        </div>
      )}

      {adoptOptions.length > 0 && (
        <div className="stack-adopt">
          <span className="stack-adopt-label">{t('stack.adopt')}</span>
          <RefPicker
            value={adopt}
            options={adoptOptions}
            placeholder={t('stack.adoptPlaceholder')}
            onChange={setAdopt}
            onCommit={(v) => {
              if (!v) return
              setAdopt('')
              void after(repoActions.stackSetParent(repoPath, v, leaf || trunk))
            }}
          />
          <span className="settings-hint">{interp(t('stack.adoptHint'), { branch: leaf || trunk })}</span>
        </div>
      )}
    </div>
  )
}

/** The inline "new level" row — a name and the level it sits on. */
function StackAddRow({
  value,
  options,
  onChange,
  onConfirm,
  onCancel
}: {
  value: { parent: string; name: string }
  options: RefOption[]
  onChange: (v: { parent: string; name: string }) => void
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  const t = useT()
  return (
    <motion.div
      layout
      className="stack-add"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.16 }}
    >
      <input
        className="modal-input stack-add-name"
        autoFocus
        spellCheck={false}
        value={value.name}
        placeholder={t('stack.namePlaceholder')}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm()
          if (e.key === 'Escape') {
            e.stopPropagation() // keep Escape from closing the whole modal
            onCancel()
          }
        }}
      />
      <span className="stack-add-on">{t('stack.on')}</span>
      <RefPicker
        className="stack-add-parent"
        value={value.parent}
        options={options}
        onChange={(v) => onChange({ ...value, parent: v })}
      />
      <button className="btn primary small" onClick={onConfirm} disabled={!value.name.trim()}>
        {t('common.create')}
      </button>
      <button className="btn ghost small" onClick={onCancel}>
        {t('common.cancel')}
      </button>
    </motion.div>
  )
}

/**
 * A `RefPicker` that owns its draft text. The stack's pickers all commit on
 * pick-or-Enter and are thrown away afterwards, so holding the half-typed value
 * in the parent's state would only be a way to forget to clear it.
 */
function DraftRefPicker({
  initial,
  options,
  placeholder,
  className,
  onCommit
}: {
  initial: string
  options: RefOption[]
  placeholder?: string
  className?: string
  onCommit: (v: string) => void
}): React.JSX.Element {
  const [value, setValue] = useState(initial)
  return (
    <RefPicker
      className={className}
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={setValue}
      onCommit={onCommit}
    />
  )
}
