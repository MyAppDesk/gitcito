import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  RefreshCw,
  GitPullRequest,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Upload,
  LogIn,
  Loader2,
  Check,
  CornerDownRight
} from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import type { StackInfo, StackBranch } from '../../../shared/types'
import { RefPicker, type RefOption } from './RefPicker'
import { moveLevel, stackOrder } from '../lib/stackOrder'
import { useT, interp } from '../i18n'

/**
 * The stack as a route you draw before you drive it.
 *
 * Two things this screen learned the hard way. **Editing is a draft**: picking
 * a branch in a dropdown changes a list on screen and nothing else, because the
 * real operation rebases branches and checks them out — doing that on every
 * click turns an exploratory edit into a conflicted repository. Nothing touches
 * git until **Apply**.
 *
 * And it is drawn **in merge order**, leaf first, each row naming the branch it
 * merges into, down to the trunk at the bottom. That is the sentence the reader
 * is already saying: this one goes into that one.
 */
export function StackModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const repo = useRepoStore((s) => s.repos[repoPath])
  const busy = useUIStore((s) => s.busy)
  const [info, setInfo] = useState<StackInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [adding, setAdding] = useState('')
  const [protectedNames, setProtectedNames] = useState<string[]>([])

  /** The route being drawn: bottom → top, like `StackInfo.branches`. */
  const [draft, setDraft] = useState<{ trunk: string; order: string[] } | null>(null)
  /**
   * Which stack to show. `stackInfo` answers for the branch you are standing
   * on, and applying a route leaves you where you started — often the trunk,
   * which is on no stack at all. Remembering the leaf keeps the route you were
   * just editing on screen instead of an empty one.
   */
  const [focus, setFocus] = useState<string | null>(null)

  const reload = useCallback(
    async (leaf?: string | null): Promise<void> => {
      setLoading(true)
      const target = leaf === undefined ? focus : leaf
      try {
        let fresh = await gitApi.stackInfo(repoPath, target ?? undefined)
        // The remembered leaf may have been taken off the route; fall back to
        // whatever the current branch is on rather than showing nothing.
        if (!fresh.branches.length && target) fresh = await gitApi.stackInfo(repoPath)
        setInfo(fresh)
        setFocus(stackOrder(fresh).at(-1) ?? null)
        setDraft({ trunk: fresh.trunk, order: stackOrder(fresh) })
      } catch {
        setInfo({ trunk: '', branches: [] })
        setDraft({ trunk: '', order: [] })
      } finally {
        setLoading(false)
      }
    },
    [repoPath, focus]
  )

  useEffect(() => {
    void reload()
    // `focus` is set by reload itself; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, repo?.branches.current])

  useEffect(() => {
    void gitApi
      .protectedBranches(repoPath)
      .then(setProtectedNames)
      .catch(() => setProtectedNames([]))
  }, [repoPath])

  const defaultTrunk = useMemo(
    () => (repo?.branches.locals ?? []).find((b) => /^(main|master)$/.test(b.name))?.name ?? '',
    [repo?.branches.locals]
  )
  // With no stack there is no trunk to read, but the field still has to offer
  // the obvious answer rather than an empty box.
  const saved = useMemo(
    () => ({ trunk: info?.trunk || (info && !info.branches.length ? defaultTrunk : ''), order: stackOrder(info) }),
    [info, defaultTrunk]
  )
  const trunk = draft?.trunk ?? saved.trunk
  const order = draft?.order ?? saved.order
  const dirty = trunk !== saved.trunk || order.join(' ') !== saved.order.join(' ')

  const branches = info?.branches ?? []
  const infoFor = (name: string): StackBranch | undefined => branches.find((b) => b.name === name)
  const leaf = saved.order[saved.order.length - 1] ?? ''
  const anyRestack = branches.some((b) => b.needsRestack)
  const locals = useMemo(() => (repo?.branches.locals ?? []).map((b) => b.name), [repo?.branches.locals])

  /** Local branches plus remote-tracking refs — a stack can land on either. */
  const allRefs = useMemo<RefOption[]>(
    () => [
      ...locals.map((value) => ({ value, kind: 'local' as const })),
      ...(repo?.branches.remotes ?? []).map((r) => ({ value: r.fullName, kind: 'remote' as const }))
    ],
    [locals, repo?.branches.remotes]
  )
  /** What a stop can become: a local branch not already on the route, and never
   *  a protected one — a stop gets rebased. */
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

  // ─── Draft edits: on screen only, until Apply ─────────────────────────────
  const edit = (next: { trunk?: string; order?: string[] }): void =>
    setDraft({ trunk: next.trunk ?? trunk, order: next.order ?? order })

  const move = (branch: string, direction: 1 | -1): void => {
    const next = moveLevel(order, branch, direction)
    if (next) edit({ order: next })
  }

  const addStop = (value: string): void => {
    const name = value.trim()
    if (!name || order.includes(name) || name === trunk) return
    setAdding('')
    edit({ order: [...order, name] })
  }

  const apply = async (): Promise<void> => {
    if (!dirty) return
    setApplying(true)
    const leafApplied = order[order.length - 1] ?? null
    try {
      await repoActions.stackSetRoute(repoPath, trunk, order, saved.trunk, saved.order)
    } finally {
      setApplying(false)
      await reload(leafApplied)
    }
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

  const after = async (p: Promise<unknown>): Promise<void> => {
    await p
    await reload()
  }

  // Drawn leaf-first: the branch on top merges into the one below it.
  const rows = order.slice().reverse()
  const working = applying || submitting

  return (
    <div className="stack-modal">
      <h3>
        <Layers size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('stack.title')}
      </h3>
      <p className="settings-hint">{t('stack.routeHint')}</p>

      <div className="stack-route">
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

        {rows.map((name, row) => {
          const i = order.length - 1 - row // index in the bottom → top order
          const b = infoFor(name)
          const pr = prFor(name)
          const into = i === 0 ? trunk : order[i - 1]
          const isNew = !locals.includes(name)
          return (
            <motion.div
              key={name}
              layout
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={`stack-row ${b?.isCurrent ? 'current' : ''}`}
            >
              <span className="stack-pin" />
              <DraftRefPicker
                className="stack-row-pick"
                initial={name}
                // Its own name stays in the list, so the field is never a dead
                // control in a repository whose branches are all on the route.
                options={[{ value: name, kind: 'local' }, ...freeBranches]}
                onCommit={(v) => {
                  if (!v || v === name || order.includes(v)) return
                  edit({ order: order.map((n) => (n === name ? v : n)) })
                }}
              />
              <span className="stack-row-into" title={interp(t('stack.mergesInto'), { target: into })}>
                <CornerDownRight size={11} /> {into || '—'}
              </span>
              <span className="stack-row-meta">
                {isNew
                  ? t('stack.willBeCreated')
                  : b && `${b.ahead} ${b.ahead === 1 ? t('stack.commit') : t('stack.commits')}`}
              </span>
              {b?.needsRestack && <span className="stack-badge warn">{t('stack.needsRestack')}</span>}
              {pr && (
                <button className="stack-pr-chip" title={pr.url} onClick={() => void window.api.openExternal(pr.url)}>
                  {/* i18n-ignore GitHub's own PR numbering */}
                  <GitPullRequest size={11} /> #{pr.id}
                </button>
              )}
              <div className="stack-row-actions">
                {!b?.isCurrent && !isNew && (
                  <button
                    className="stack-icon-btn"
                    title={t('stack.checkout')}
                    disabled={working}
                    onClick={() => void after(repoActions.checkout(repoPath, name))}
                  >
                    <LogIn size={13} />
                  </button>
                )}
                <button
                  className="stack-icon-btn"
                  title={t('stack.moveUp')}
                  disabled={row === 0}
                  onClick={() => move(name, 1)}
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  className="stack-icon-btn"
                  title={t('stack.moveDown')}
                  disabled={row === rows.length - 1}
                  onClick={() => move(name, -1)}
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  className="stack-icon-btn danger"
                  title={t('stack.removeStop')}
                  onClick={() => edit({ order: order.filter((n) => n !== name) })}
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )
        })}

        <motion.div layout className="stack-row start">
          <span className="stack-pin start" />
          <span className="stack-row-label">{t('stack.landsOn')}</span>
          <DraftRefPicker
            className="stack-row-pick"
            initial={trunk}
            options={allRefs}
            placeholder={t('stack.trunkPlaceholder')}
            onCommit={(v) => v && v !== trunk && edit({ trunk: v })}
          />
        </motion.div>
      </div>

      {order.length === 0 && !loading && <p className="settings-hint">{t('stack.emptyRoute')}</p>}

      {dirty && (
        <div className="stack-apply">
          <span className="stack-apply-note">{t('stack.draftNote')}</span>
          <button className="btn primary small" onClick={() => void apply()} disabled={working}>
            <Check size={13} className={applying ? 'spin' : undefined} /> {t('stack.apply')}
          </button>
          <button className="btn ghost small" onClick={() => setDraft(saved)} disabled={working}>
            {t('stack.discard')}
          </button>
        </div>
      )}

      {working && busy && (
        <p className="stack-progress">
          <Loader2 size={13} className="spin" /> {busy}
        </p>
      )}

      <div className="stack-toolbar">
        <button
          className="btn primary small"
          onClick={() => void after(repoActions.stackRestack(repoPath, leaf))}
          disabled={!anyRestack || !leaf || dirty || working}
          title={anyRestack ? t('stack.restackHint') : t('stack.nothingToRestack')}
        >
          <RefreshCw size={13} /> {t('stack.restack')}
        </button>
        <button
          className="btn ghost small"
          onClick={() => void after(repoActions.stackPushAll(repoPath))}
          disabled={saved.order.length === 0 || dirty || working}
          title={t('stack.pushAllHint')}
        >
          <Upload size={13} /> {t('stack.pushAll')}
        </button>
        <button
          className="btn primary small"
          onClick={() => void submitStack()}
          disabled={saved.order.length === 0 || dirty || working}
          title={dirty ? t('stack.applyFirst') : t('stack.submitHint')}
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
 * A `RefPicker` that owns its draft text and re-seeds when the route changes
 * under it, so a field never shows a name its row no longer holds.
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
