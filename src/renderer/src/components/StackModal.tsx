import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, RefreshCw, GitPullRequest, Plus, X, ChevronUp, ChevronDown, Upload, LogIn, Loader2 } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { StackInfo } from '../../../shared/types'
import { RefPicker, type RefOption } from './RefPicker'
import { moveLevel, stackOrder } from '../lib/stackOrder'
import { useT, interp } from '../i18n'

/**
 * The stack as a route: a start branch, then a list of stops, each one's PR
 * targeting the stop before it.
 *
 * Every edit is the same edit — hand the whole route back. Swap a stop, drop
 * one, move it up, start somewhere else: one list, one call, one undo entry.
 * The earlier version exposed the parent links directly (set parent, add above,
 * untrack, adopt) and left the reader to assemble the chain in their head.
 */
export function StackModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const repo = useRepoStore((s) => s.repos[repoPath])
  // A submit is a dozen network calls; show which one, where the user is
  // looking, instead of only spinning an icon.
  const busy = useUIStore((s) => s.busy)
  const [info, setInfo] = useState<StackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [adding, setAdding] = useState('')
  /** main/master by default — never offered as a stop, because a stop is rebased. */
  const [protectedNames, setProtectedNames] = useState<string[]>([])

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

  useEffect(() => {
    void gitApi
      .protectedBranches(repoPath)
      .then(setProtectedNames)
      .catch(() => setProtectedNames([]))
  }, [repoPath])

  const after = async (p: Promise<unknown>): Promise<void> => {
    await p
    await reload()
  }

  const branches = info?.branches ?? []
  const order = stackOrder(info)
  const trunk = info?.trunk || repo?.branches.locals.find((b) => /^(main|master)$/.test(b.name))?.name || ''
  const leaf = order[order.length - 1] ?? ''
  const anyRestack = branches.some((b) => b.needsRestack)
  const locals = useMemo(() => (repo?.branches.locals ?? []).map((b) => b.name), [repo?.branches.locals])

  /** Local branches plus remote-tracking refs — a stack can start on either. */
  const allRefs = useMemo<RefOption[]>(
    () => [
      ...locals.map((value) => ({ value, kind: 'local' as const })),
      ...(repo?.branches.remotes ?? []).map((r) => ({ value: r.fullName, kind: 'remote' as const }))
    ],
    [locals, repo?.branches.remotes]
  )
  /** What a stop can become: any local branch not already on the route. */
  const freeBranches = useMemo<RefOption[]>(
    () =>
      locals
        .filter((n) => n !== trunk && !order.includes(n) && !protectedNames.includes(n))
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, kind: 'local' as const })),
    [locals, order, trunk, protectedNames]
  )

  const prFor = (branch: string): { id: number; url: string } | undefined =>
    repo?.prs.find((p) => p.sourceBranch === branch)

  /** Every route edit lands here: the new list, against the one on screen. */
  const route = (nextTrunk: string, next: string[]): void => {
    if (nextTrunk === trunk && next.join(' ') === order.join(' ')) return
    void after(repoActions.stackSetRoute(repoPath, nextTrunk, next, trunk, order))
  }

  const move = (branch: string, direction: 1 | -1): void => {
    const next = moveLevel(order, branch, direction)
    if (next) route(trunk, next)
  }

  const addStop = (value: string): void => {
    const name = value.trim()
    if (!name) return
    setAdding('')
    // A branch that already exists joins the route; anything else is a new
    // branch, created on the tip of the stop it will sit above.
    if (locals.includes(name)) route(trunk, [...order, name])
    else void after(repoActions.stackInsert(repoPath, name, leaf || trunk))
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

  return (
    <div className="stack-modal">
      <h3>
        <Layers size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('stack.title')}
      </h3>
      <p className="settings-hint">{t('stack.routeHint')}</p>

      <div className="stack-route">
        <div className="stack-row start">
          <span className="stack-pin start" />
          <span className="stack-row-label">{t('stack.start')}</span>
          <DraftRefPicker
            className="stack-row-pick"
            initial={trunk}
            options={allRefs}
            placeholder={t('stack.trunkPlaceholder')}
            onCommit={(v) => v && route(v, order)}
          />
        </div>

        {order.map((name, i) => {
          const b = branches[i]
          const pr = prFor(name)
          return (
            <motion.div
              key={name}
              layout
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={`stack-row ${b?.isCurrent ? 'current' : ''}`}
            >
              <span className="stack-pin" />
              <span className="stack-row-label">{interp(t('stack.stop'), { n: i + 1 })}</span>
              <DraftRefPicker
                className="stack-row-pick"
                initial={name}
                // Its own name stays in the list, so the field is never a dead
                // control in a repository whose branches are all on the route.
                options={[{ value: name, kind: 'local' }, ...freeBranches]}
                onCommit={(v) => {
                  if (!v || v === name) return
                  route(
                    trunk,
                    order.map((n) => (n === name ? v : n))
                  )
                }}
              />
              <span className="stack-row-meta">
                {b && `${b.ahead} ${b.ahead === 1 ? t('stack.commit') : t('stack.commits')}`}
              </span>
              {b?.needsRestack && <span className="stack-badge warn">{t('stack.needsRestack')}</span>}
              {pr && (
                <button className="stack-pr-chip" title={pr.url} onClick={() => void window.api.openExternal(pr.url)}>
                  {/* i18n-ignore GitHub's own PR numbering */}
                  <GitPullRequest size={11} /> #{pr.id}
                </button>
              )}
              <div className="stack-row-actions">
                {!b?.isCurrent && (
                  <button
                    className="stack-icon-btn"
                    title={t('stack.checkout')}
                    onClick={() => void after(repoActions.checkout(repoPath, name))}
                  >
                    <LogIn size={13} />
                  </button>
                )}
                <button
                  className="stack-icon-btn"
                  title={t('stack.moveUp')}
                  disabled={i === 0}
                  onClick={() => move(name, -1)}
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  className="stack-icon-btn"
                  title={t('stack.moveDown')}
                  disabled={i === order.length - 1}
                  onClick={() => move(name, 1)}
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  className="stack-icon-btn danger"
                  title={t('stack.removeStop')}
                  onClick={() => route(trunk, order.filter((n) => n !== name))}
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )
        })}

        <motion.div layout className="stack-row add">
          <span className="stack-pin add">
            <Plus size={11} />
          </span>
          <span className="stack-row-label">{t('stack.addStop')}</span>
          <RefPicker
            className="stack-row-pick"
            value={adding}
            options={freeBranches}
            placeholder={t('stack.addStopPlaceholder')}
            onChange={setAdding}
            onCommit={addStop}
          />
        </motion.div>
      </div>

      {order.length === 0 && !loading && <p className="settings-hint">{t('stack.emptyRoute')}</p>}

      {submitting && busy && (
        <p className="stack-progress">
          <Loader2 size={13} className="spin" /> {busy}
        </p>
      )}

      <div className="stack-toolbar">
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
          disabled={order.length === 0}
          title={t('stack.pushAllHint')}
        >
          <Upload size={13} /> {t('stack.pushAll')}
        </button>
        <button
          className="btn primary small"
          onClick={() => void submitStack()}
          disabled={submitting || order.length === 0}
          title={t('stack.submitHint')}
        >
          <GitPullRequest size={13} className={submitting ? 'spin' : undefined} /> {t('stack.submit')}
        </button>
        <button className="btn ghost small" onClick={() => void reload()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> {t('stack.refresh')}
        </button>
      </div>
    </div>
  )
}

/**
 * A `RefPicker` that owns its draft text: the route's fields commit on
 * pick-or-Enter and are re-seeded from the stack on every reload, so holding
 * the half-typed value in the modal's state would only be a way to forget to
 * clear it.
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
  useEffect(() => setValue(initial), [initial])
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
