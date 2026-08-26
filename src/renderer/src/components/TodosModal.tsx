import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckSquare,
  Plus,
  Search,
  Trash2,
  GitBranch,
  Flag,
  GripVertical,
  ArrowUp,
  ArrowDown,
  SignalHigh,
  SignalLow,
  SignalMedium,
  ListTree,
  Columns3,
  CornerDownRight,
  X
} from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'
import {
  TODO_STATUSES,
  childrenOf,
  filterTodos,
  sortTodos,
  subtaskProgress,
  todoStatus,
  todoSummary,
  topLevelTodos
} from '../lib/todos'
import { canonicalRepoPath } from '../lib/repoAlias'
import { timeAgo } from '../lib/timeAgo'
import type { RepoTodo, TodoPriority, TodoStatus } from '../../../shared/types'
import { TodoPriorityIcon } from './TodoPriorityIcon'
import { TodoStatusIcon, TODO_STATUS_LABEL } from './TodoStatusIcon'
import { useT, interp, type TranslationKey } from '../i18n'

/** Priority chips, in the order they read as a scale. Keys, not strings, so a
 *  language switch repaints them (see CLAUDE.md §3 rule 4). */
const PRIORITIES: { id: TodoPriority; labelKey: TranslationKey; Icon: typeof Flag }[] = [
  { id: 'low', labelKey: 'todos.priorityLow', Icon: SignalLow },
  { id: 'normal', labelKey: 'todos.priorityNormal', Icon: SignalMedium },
  { id: 'high', labelKey: 'todos.priorityHigh', Icon: SignalHigh }
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
  const [view, setView] = useState<'list' | 'board'>('list')
  const [subDraft, setSubDraft] = useState('')
  // One switch, two surfaces: the same setting the sidebar reads, so ticking it
  // here is not a per-modal preference that silently disagrees with the tree.
  const showDone = !useSettingsStore((s) => s.settings.todosHideDone)
  const setShowDone = (on: boolean): void =>
    store.getState().update((s) => ({ ...s, todosHideDone: !on }))
  const [selId, setSelId] = useState<string | undefined>(focusId)
  const addRef = useRef<HTMLInputElement>(null)
  const manual = !!useSettingsStore((s) => s.settings.todosManualOrder)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TodoStatus | null>(null)

  useEffect(() => {
    addRef.current?.focus()
  }, [])

  // A subtask that matches the filter has to drag its parent into view with it,
  // or the hit is invisible: the row it belongs under was filtered away.
  const matches = useMemo(() => {
    const q = query.trim()
    return (td: RepoTodo): boolean =>
      !q || filterTodos([td, ...childrenOf(list, td.id)], q).length > 0
  }, [list, query])

  const visible = useMemo(() => {
    const sorted = sortTodos(topLevelTodos(list), manual)
    const kept = showDone ? sorted : sorted.filter((td) => !td.done)
    return kept.filter(matches)
  }, [list, manual, showDone, matches])

  const columns = useMemo(
    () =>
      TODO_STATUSES.map((status) => ({
        status,
        items: sortTodos(topLevelTodos(list), manual).filter(
          (td) => todoStatus(td) === status && matches(td)
        )
      })),
    [list, manual, matches]
  )

  const summary = todoSummary(list)
  const selected = list.find((td) => td.id === selId) ?? null
  const selectedKids = useMemo(
    () => (selected && !selected.parentId ? childrenOf(list, selected.id) : []),
    [list, selected]
  )
  const parentOfSelected = selected?.parentId ? list.find((td) => td.id === selected.parentId) : null

  // Reordering a filtered list would move rows past neighbours nobody can see,
  // so the handles step aside until the filter is cleared.
  const canReorder = !query.trim()
  const scope = view === 'board' ? ('column' as const) : ('list' as const)

  const add = (): void => {
    const title = draft.trim()
    if (!title) return
    store.getState().addTodo(repoPath, title, { priority: draftPriority, branch })
    setDraft('')
    setDraftPriority('normal')
  }

  const addSub = (): void => {
    const title = subDraft.trim()
    if (!title || !selected || selected.parentId) return
    store.getState().addTodo(repoPath, title, { branch, parentId: selected.id })
    setSubDraft('')
  }

  const move = (id: string, dir: -1 | 1): void => store.getState().moveTodo(repoPath, id, dir, scope)

  const drop = (toId: string | null, column?: TodoStatus): void => {
    const from = dragId
    setDragId(null)
    setOverId(null)
    setOverCol(null)
    if (!from || from === toId) return
    const settings = store.getState()
    // Crossing a column is a status change first; the drop position inside the
    // new column is only meaningful once the card is actually in it.
    if (column && todoStatus(list.find((td) => td.id === from) ?? ({} as RepoTodo)) !== column) {
      settings.setTodoStatus(repoPath, from, column)
    }
    settings.reorderTodos(repoPath, from, toId, scope)
  }

  const remove = (todo: RepoTodo): void => {
    const kids = childrenOf(list, todo.id).length
    openModal({
      kind: 'confirm',
      title: t('todos.deleteTitle'),
      message: kids
        ? interp(t('todos.deleteWithSubtasks'), { title: todo.title, n: kids })
        : interp(t('todos.deleteConfirm'), { title: todo.title }),
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

  const dragProps = (
    td: RepoTodo,
    movable: boolean,
    column?: TodoStatus
  ): React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean } => ({
    draggable: movable,
    onDragStart: (e) => {
      setDragId(td.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => {
      setDragId(null)
      setOverId(null)
      setOverCol(null)
    },
    onDragOver: (e) => {
      if (!dragId) return
      e.preventDefault()
      e.stopPropagation()
      setOverId(td.id)
    },
    onDragLeave: () => setOverId((cur) => (cur === td.id ? null : cur)),
    onDrop: (e) => {
      e.preventDefault()
      e.stopPropagation()
      drop(td.id, column)
    }
  })

  const reorderButtons = (td: RepoTodo): React.JSX.Element => (
    <span className="todo-move">
      <button
        className="icon-btn"
        title={t('todos.moveUp')}
        aria-label={t('todos.moveUp')}
        onClick={(e) => {
          e.stopPropagation()
          move(td.id, -1)
        }}
      >
        <ArrowUp size={12} />
      </button>
      <button
        className="icon-btn"
        title={t('todos.moveDown')}
        aria-label={t('todos.moveDown')}
        onClick={(e) => {
          e.stopPropagation()
          move(td.id, 1)
        }}
      >
        <ArrowDown size={12} />
      </button>
    </span>
  )

  const rowKeys = (td: RepoTodo, movable: boolean) => (e: React.KeyboardEvent): void => {
    // Alt+arrow moves the row; a bare arrow still belongs to the list.
    if (movable && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      move(td.id, e.key === 'ArrowUp' ? -1 : 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelId(td.id)
    }
  }

  const todoRow = (td: RepoTodo, opts: { sub?: boolean } = {}): React.JSX.Element => {
    const movable = canReorder && !td.done
    const kids = subtaskProgress(list, td.id)
    return (
      <div
        key={td.id}
        className={`todo-row ${opts.sub ? 'sub' : ''} ${td.done ? 'done' : ''} ${selId === td.id ? 'active' : ''} prio-${td.priority} ${overId === td.id ? 'drop-target' : ''} ${dragId === td.id ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        {...dragProps(td, movable)}
        onClick={() => setSelId(td.id)}
        onKeyDown={rowKeys(td, movable)}
      >
        {movable && <GripVertical className="todo-grip" size={13} aria-hidden="true" />}
        {opts.sub && <CornerDownRight className="todo-sub-arrow" size={12} aria-hidden="true" />}
        <input
          type="checkbox"
          checked={td.done}
          aria-label={td.done ? t('todos.markOpen') : t('todos.markDone')}
          title={td.done ? t('todos.markOpen') : t('todos.markDone')}
          onClick={(e) => e.stopPropagation()}
          onChange={() => store.getState().toggleTodo(repoPath, td.id)}
        />
        <TodoStatusIcon status={todoStatus(td)} size={13} />
        <span className="todo-row-body">
          <span className="todo-row-title">{td.title}</span>
          <span className="todo-row-meta">
            {when(td.done ? td.doneAt : td.createdAt)}
            {td.notes ? ` · ${t('todos.hasNotes')}` : ''}
          </span>
        </span>
        {kids.total > 0 && (
          <span className="todo-sub-count" title={t('todos.subtasks')}>
            {interp(t('todos.subtaskCount'), { done: kids.done, total: kids.total })}
          </span>
        )}
        {!td.done && <TodoPriorityIcon priority={td.priority} size={13} />}
        {movable && reorderButtons(td)}
      </div>
    )
  }

  const boardCard = (td: RepoTodo, status: TodoStatus): React.JSX.Element => {
    const kids = subtaskProgress(list, td.id)
    return (
      <div
        key={td.id}
        className={`todo-card ${selId === td.id ? 'active' : ''} prio-${td.priority} ${overId === td.id ? 'drop-target' : ''} ${dragId === td.id ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        {...dragProps(td, true, status)}
        onClick={() => setSelId(td.id)}
        onKeyDown={rowKeys(td, canReorder)}
      >
        <span className="todo-card-title">{td.title}</span>
        <span className="todo-card-meta">
          <TodoPriorityIcon priority={td.priority} size={12} />
          {kids.total > 0 && (
            <span className="todo-sub-count">
              {interp(t('todos.subtaskCount'), { done: kids.done, total: kids.total })}
            </span>
          )}
          {td.branch && (
            <span className="todo-card-branch" title={interp(t('todos.writtenOn'), { branch: td.branch })}>
              <GitBranch size={10} /> {td.branch}
            </span>
          )}
        </span>
      </div>
    )
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
              className={`codesearch-tab prio-chip ${p.id} ${draftPriority === p.id ? 'active' : ''}`}
              title={t('todos.priority')}
              onClick={() => setDraftPriority(p.id)}
            >
              <p.Icon size={12} /> {t(p.labelKey)}
            </button>
          ))}
        </div>
        <button className="btn primary small" disabled={!draft.trim()} onClick={add}>
          <Plus size={13} /> {t('todos.add')}
        </button>
      </div>

      <div className="todos-filters">
        <div className="codesearch-tabs" style={{ margin: 0 }}>
          <button
            className={`codesearch-tab ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            <ListTree size={12} /> {t('todos.viewList')}
          </button>
          <button
            className={`codesearch-tab ${view === 'board' ? 'active' : ''}`}
            onClick={() => setView('board')}
          >
            <Columns3 size={12} /> {t('todos.viewBoard')}
          </button>
        </div>
        <span className="todos-search">
          <Search size={12} />
          <input
            value={query}
            placeholder={t('todos.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
        {view === 'list' && (
          <label className="todos-toggle">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            {t('todos.showDone')}
          </label>
        )}
        <label className="todos-toggle" title={t('todos.manualOrderHint')}>
          <input
            type="checkbox"
            checked={manual}
            onChange={(e) => store.getState().setTodosManualOrder(repoPath, e.target.checked)}
          />
          {t('todos.manualOrder')}
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

      <div className="todos-body">
        {view === 'list' ? (
          <div
            className="todos-list"
            onDragOver={(e) => {
              if (dragId) e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              drop(null)
            }}
          >
            {list.length === 0 && <div className="sb-empty">{t('todos.empty')}</div>}
            {list.length > 0 && visible.length === 0 && <div className="sb-empty">{t('todos.noMatch')}</div>}
            {visible.map((td) => (
              <div key={td.id} className="todo-group">
                {todoRow(td)}
                {childrenOf(list, td.id)
                  .filter((kid) => showDone || !kid.done)
                  .map((kid) => todoRow(kid, { sub: true }))}
              </div>
            ))}
          </div>
        ) : (
          <div className="todo-board">
            {columns.map((col) => (
              <div
                key={col.status}
                className={`todo-col ${overCol === col.status ? 'drop-target' : ''}`}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  setOverCol(col.status)
                }}
                onDragLeave={() => setOverCol((cur) => (cur === col.status ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault()
                  drop(null, col.status)
                }}
              >
                <div className="todo-col-head">
                  <TodoStatusIcon status={col.status} size={13} />
                  <span className="todo-col-title">{t(TODO_STATUS_LABEL[col.status])}</span>
                  <span className="todo-col-count">{col.items.length}</span>
                </div>
                <div className="todo-col-body">
                  {col.items.length === 0 && <div className="todo-col-empty">{t('todos.columnEmpty')}</div>}
                  {col.items.map((td) => boardCard(td, col.status))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The detail is a sheet over the list, not a column beside it: the board
          needs the full width, and a permanent empty pane saying "pick a todo"
          is furniture. */}
      {selected && (
        <div className="todo-sheet-backdrop" role="presentation" onClick={() => setSelId(undefined)}>
          <div
            className="todo-sheet"
            role="dialog"
            aria-label={t('todos.detailTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="todo-sheet-head">
              <TodoStatusIcon status={todoStatus(selected)} size={14} />
              <span className="todo-sheet-title">{t('todos.detailTitle')}</span>
              <button
                className="icon-btn"
                title={t('common.close')}
                aria-label={t('common.close')}
                onClick={() => setSelId(undefined)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="todos-detail">
              {parentOfSelected && (
                <button
                  className="btn ghost small todos-parent-link"
                  onClick={() => setSelId(parentOfSelected.id)}
                >
                  <CornerDownRight size={12} />
                  {interp(t('todos.partOf'), { title: parentOfSelected.title })}
                </button>
              )}

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
                  rows={5}
                  value={selected.notes ?? ''}
                  placeholder={t('todos.notesPlaceholder')}
                  onChange={(e) => store.getState().patchTodo(repoPath, selected.id, { notes: e.target.value })}
                />
              </label>

              <div className="todos-field">
                <span className="todos-field-label">{t('todos.status')}</span>
                <div className="codesearch-tabs todos-status-tabs" style={{ margin: 0 }}>
                  {TODO_STATUSES.map((st) => (
                    <button
                      key={st}
                      className={`codesearch-tab status-chip ${st} ${todoStatus(selected) === st ? 'active' : ''}`}
                      onClick={() => store.getState().setTodoStatus(repoPath, selected.id, st)}
                    >
                      <TodoStatusIcon status={st} size={12} /> {t(TODO_STATUS_LABEL[st])}
                    </button>
                  ))}
                </div>
              </div>

              <div className="todos-field">
                <span className="todos-field-label">
                  <Flag size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                  {t('todos.priority')}
                </span>
                <div className="codesearch-tabs" style={{ margin: 0 }}>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      className={`codesearch-tab prio-chip ${p.id} ${selected.priority === p.id ? 'active' : ''}`}
                      onClick={() => store.getState().patchTodo(repoPath, selected.id, { priority: p.id })}
                    >
                      <p.Icon size={12} /> {t(p.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {!selected.parentId && (
                <div className="todos-field">
                  <span className="todos-field-label">{t('todos.subtasks')}</span>
                  {selectedKids.map((kid) => (
                    <div key={kid.id} className={`todo-subrow ${kid.done ? 'done' : ''}`}>
                      <input
                        type="checkbox"
                        checked={kid.done}
                        aria-label={kid.done ? t('todos.markOpen') : t('todos.markDone')}
                        title={kid.done ? t('todos.markOpen') : t('todos.markDone')}
                        onChange={() => store.getState().toggleTodo(repoPath, kid.id)}
                      />
                      <input
                        className="todo-subrow-title"
                        value={kid.title}
                        onChange={(e) => store.getState().patchTodo(repoPath, kid.id, { title: e.target.value })}
                      />
                      <button
                        className="icon-btn danger"
                        title={t('todos.delete')}
                        aria-label={t('todos.delete')}
                        onClick={() => store.getState().deleteTodo(repoPath, kid.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="todo-subadd">
                    <input
                      value={subDraft}
                      placeholder={t('todos.subtaskPlaceholder')}
                      onChange={(e) => setSubDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSub()
                        }
                      }}
                    />
                    <button className="btn small" disabled={!subDraft.trim()} onClick={addSub}>
                      <Plus size={12} /> {t('todos.addSubtask')}
                    </button>
                  </div>
                </div>
              )}

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
            </div>
          </div>
        </div>
      )}

      <div className="todos-footer">
        <span className="settings-hint">{t('todos.storageHint')}</span>
        <button className="btn small" onClick={closeModal}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
