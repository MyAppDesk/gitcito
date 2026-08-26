import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckSquare, Plus, Search, Trash2, GitBranch, Flag } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import { filterTodos, sortTodos, todoSummary } from '../lib/todos'
import { canonicalRepoPath } from '../lib/repoAlias'
import { timeAgo } from '../lib/timeAgo'
import type { RepoTodo, TodoPriority } from '../../../shared/types'
import { useT, interp, type TranslationKey } from '../i18n'

/** Priority chips, in the order they read as a scale. Keys, not strings, so a
 *  language switch repaints them (see CLAUDE.md §3 rule 4). */
const PRIORITIES: { id: TodoPriority; labelKey: TranslationKey }[] = [
  { id: 'low', labelKey: 'todos.priorityLow' },
  { id: 'normal', labelKey: 'todos.priorityNormal' },
  { id: 'high', labelKey: 'todos.priorityHigh' }
]

export function TodosModal({ repoPath, focusId }: { repoPath: string; focusId?: string }): React.JSX.Element {
  const t = useT()
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const store = useSettingsStore
  const branch = useRepoStore((s) => s.repos[repoPath]?.branches.current)
  // Subscribe to the whole path-keyed map — the slice for this repo keeps its
  // array identity across unrelated settings writes, so the memos below hold.
  const byRepo = useSettingsStore((s) => s.settings.repoTodos)
  const list = useMemo(() => byRepo?.[canonicalRepoPath(repoPath)] ?? [], [byRepo, repoPath])

  const [draft, setDraft] = useState('')
  const [draftPriority, setDraftPriority] = useState<TodoPriority>('normal')
  const [query, setQuery] = useState('')
  // One switch, two surfaces: the same setting the sidebar reads, so ticking it
  // here is not a per-modal preference that silently disagrees with the tree.
  const showDone = !useSettingsStore((s) => s.settings.todosHideDone)
  const setShowDone = (on: boolean): void =>
    store.getState().update((s) => ({ ...s, todosHideDone: !on }))
  const [selId, setSelId] = useState<string | undefined>(focusId)
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    addRef.current?.focus()
  }, [])

  const visible = useMemo(() => {
    const sorted = sortTodos(list)
    const kept = showDone ? sorted : sorted.filter((td) => !td.done)
    return filterTodos(kept, query)
  }, [list, showDone, query])

  const summary = todoSummary(list)
  const selected = list.find((td) => td.id === selId) ?? null

  const add = (): void => {
    const title = draft.trim()
    if (!title) return
    store.getState().addTodo(repoPath, title, { priority: draftPriority, branch })
    setDraft('')
    setDraftPriority('normal')
  }

  const remove = (todo: RepoTodo): void => {
    openModal({
      kind: 'confirm',
      title: t('todos.deleteTitle'),
      message: interp(t('todos.deleteConfirm'), { title: todo.title }),
      confirmLabel: t('todos.delete'),
      danger: true,
      onConfirm: () => {
        store.getState().deleteTodo(repoPath, todo.id)
        if (selId === todo.id) setSelId(undefined)
      }
    })
  }

  const clearDone = (): void => {
    openModal({
      kind: 'confirm',
      title: t('todos.clearDone'),
      message: interp(t('todos.clearDoneConfirm'), { n: summary.done }),
      confirmLabel: t('todos.clearDone'),
      danger: true,
      onConfirm: () => {
        store.getState().clearDoneTodos(repoPath)
        setSelId(undefined)
      }
    })
  }

  const when = (at: number | undefined): string => {
    if (!at) return ''
    const ago = timeAgo(at, Date.now())
    return ago ? interp(t(ago.key), { n: ago.n }) : new Date(at).toLocaleString()
  }

  return (
    <div className="todos">
      <h3>
        <CheckSquare size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('todos.title')}
      </h3>
      <p className="settings-hint">{t('todos.intro')}</p>

      <div className="todos-toolbar">
        <input
          ref={addRef}
          className="todos-add-input"
          value={draft}
          placeholder={t('todos.addPlaceholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <div className="codesearch-tabs" style={{ margin: 0 }}>
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              className={`codesearch-tab ${draftPriority === p.id ? 'active' : ''}`}
              title={t('todos.priority')}
              onClick={() => setDraftPriority(p.id)}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <button className="btn primary small" disabled={!draft.trim()} onClick={add}>
          <Plus size={13} /> {t('todos.add')}
        </button>
      </div>

      <div className="todos-filters">
        <span className="todos-search">
          <Search size={12} />
          <input
            value={query}
            placeholder={t('todos.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
        <label className="todos-toggle">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          {t('todos.showDone')}
        </label>
        <span className="todos-summary">
          {interp(t('todos.counts'), { open: summary.open, done: summary.done })}
        </span>
        {summary.done > 0 && (
          <button className="btn ghost small" onClick={clearDone}>
            <Trash2 size={13} /> {t('todos.clearDone')}
          </button>
        )}
      </div>

      <div className="todos-split">
        <div className="todos-list">
          {list.length === 0 && <div className="sb-empty">{t('todos.empty')}</div>}
          {list.length > 0 && visible.length === 0 && <div className="sb-empty">{t('todos.noMatch')}</div>}
          {visible.map((td) => (
            <div
              key={td.id}
              className={`todo-row ${td.done ? 'done' : ''} ${selId === td.id ? 'active' : ''} prio-${td.priority}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelId(td.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelId(td.id)
                }
              }}
            >
              <input
                type="checkbox"
                checked={td.done}
                aria-label={td.done ? t('todos.markOpen') : t('todos.markDone')}
                title={td.done ? t('todos.markOpen') : t('todos.markDone')}
                onClick={(e) => e.stopPropagation()}
                onChange={() => store.getState().toggleTodo(repoPath, td.id)}
              />
              <span className="todo-row-body">
                <span className="todo-row-title">{td.title}</span>
                <span className="todo-row-meta">
                  {when(td.done ? td.doneAt : td.createdAt)}
                  {td.notes ? ` · ${t('todos.hasNotes')}` : ''}
                </span>
              </span>
              {td.priority !== 'normal' && !td.done && (
                <span className={`todo-prio-dot ${td.priority}`} title={t(td.priority === 'high' ? 'todos.priorityHigh' : 'todos.priorityLow')} />
              )}
            </div>
          ))}
        </div>

        <div className="todos-detail">
          {!selected && <div className="sb-empty">{t('todos.selectHint')}</div>}
          {selected && (
            <>
              <label className="todos-field">
                <span className="todos-field-label">{t('todos.titleLabel')}</span>
                <input
                  value={selected.title}
                  onChange={(e) => store.getState().patchTodo(repoPath, selected.id, { title: e.target.value })}
                />
              </label>

              <label className="todos-field">
                <span className="todos-field-label">{t('todos.notes')}</span>
                <textarea
                  rows={8}
                  value={selected.notes ?? ''}
                  placeholder={t('todos.notesPlaceholder')}
                  onChange={(e) => store.getState().patchTodo(repoPath, selected.id, { notes: e.target.value })}
                />
              </label>

              <div className="todos-field">
                <span className="todos-field-label">
                  <Flag size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                  {t('todos.priority')}
                </span>
                <div className="codesearch-tabs" style={{ margin: 0 }}>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      className={`codesearch-tab ${selected.priority === p.id ? 'active' : ''}`}
                      onClick={() => store.getState().patchTodo(repoPath, selected.id, { priority: p.id })}
                    >
                      {t(p.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="todos-meta">
                <div>{interp(t('todos.created'), { when: when(selected.createdAt) })}</div>
                {selected.done && selected.doneAt && (
                  <div>{interp(t('todos.completed'), { when: when(selected.doneAt) })}</div>
                )}
                {selected.branch && (
                  <div>
                    <GitBranch size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                    {interp(t('todos.writtenOn'), { branch: selected.branch })}
                  </div>
                )}
              </div>

              <div className="todos-detail-actions">
                <button
                  className="btn small"
                  onClick={() => store.getState().toggleTodo(repoPath, selected.id)}
                >
                  <CheckSquare size={13} /> {selected.done ? t('todos.markOpen') : t('todos.markDone')}
                </button>
                <button className="btn ghost small danger" onClick={() => remove(selected)}>
                  <Trash2 size={13} /> {t('todos.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="todos-footer">
        <span className="settings-hint">{t('todos.storageHint')}</span>
        <button className="btn small" onClick={closeModal}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
