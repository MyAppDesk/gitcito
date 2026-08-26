import { useEffect, useMemo } from 'react'
import { RefreshCw, X, Search, GitCompareArrows, Loader, Folder, User, Tag, FileCode } from 'lucide-react'
import type { CodeTodo } from '../../../shared/types'
import { useProblemsStore } from '../stores/problems'
import { useRepoStore } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useT, interp, type TranslationKey } from '../i18n'
import {
  TODO_GROUP_BYS,
  countByTag,
  filterCodeTodos,
  folderOf,
  groupCodeTodos,
  type TodoGroupBy
} from '../lib/codeTodos'
import { DockTabs } from './ProblemsPanel'

/** Labels for the group-by control — the key, never the string (§3.4). */
const GROUP_LABELS: Record<TodoGroupBy, TranslationKey> = {
  tag: 'ctodo.byTag',
  owner: 'ctodo.byOwner',
  folder: 'ctodo.byFolder',
  file: 'ctodo.byFile'
}

const GROUP_ICONS: Record<TodoGroupBy, React.JSX.Element> = {
  tag: <Tag size={12} />,
  owner: <User size={12} />,
  folder: <Folder size={12} />,
  file: <FileCode size={12} />
}

/**
 * The TODO half of the dock: every marker the source carries, grouped.
 *
 * A flat list of TODOs is a list nobody reads, which is why the grouping is the
 * feature rather than the search. `TODO(cgm)` and `TODO (cgm)` are the same
 * person; `// todo`, `//TODO` and `# TODO:` are the same tag; and everything
 * with no name on it is one pile you can look at deliberately. Group by owner
 * to see a backlog, by folder to see which corner of the repo is rotting, by
 * tag to separate a `FIXME` from an idea somebody had.
 */
export function CodeTodosView({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const result = useProblemsStore((s) => s.todoByRepo[repoPath])
  const running = useProblemsStore((s) => s.todoRunningByRepo[repoPath] === true)
  const tags = useProblemsStore((s) => s.tags)
  const owners = useProblemsStore((s) => s.owners)
  const changedOnly = useProblemsStore((s) => s.changedOnly)
  const query = useProblemsStore((s) => s.todoQuery)
  const groupBy = useProblemsStore((s) => s.groupBy)
  const scan = useProblemsStore((s) => s.scanTodos)
  const cancel = useProblemsStore((s) => s.cancelTodos)
  const toggleTag = useProblemsStore((s) => s.toggleTag)
  const toggleOwner = useProblemsStore((s) => s.toggleOwner)
  const setChangedOnly = useProblemsStore((s) => s.setChangedOnly)
  const setQuery = useProblemsStore((s) => s.setTodoQuery)
  const setGroupBy = useProblemsStore((s) => s.setGroupBy)
  const status = useRepoStore((s) => s.repos[repoPath]?.status)
  const setFileView = useUIStore((s) => s.setFileView)
  const setProblemsOpen = useUIStore((s) => s.setProblemsOpen)

  // One `git grep` costs milliseconds; opening the tab with nothing in it costs
  // the user a click to learn that.
  useEffect(() => {
    if (!result && !running) void scan(repoPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath])

  const todos = result?.todos ?? []
  const changedFiles = useMemo(
    () => [...(status?.staged ?? []), ...(status?.unstaged ?? []), ...(status?.conflicted ?? [])].map((f) => f.path),
    [status]
  )
  const shown = useMemo(
    () => filterCodeTodos(todos, { tags, owners, changedOnly, changedFiles, query }),
    [todos, tags, owners, changedOnly, changedFiles, query]
  )
  // Chips count the *unfiltered* scan, so turning a tag off does not make the
  // chip that turned it off disappear.
  const tagCounts = useMemo(() => countByTag(todos), [todos])
  const groups = useMemo(() => groupCodeTodos(shown, groupBy), [shown, groupBy])

  const open = (td: CodeTodo): void => {
    setFileView({ repoPath, file: td.file, source: { type: 'tree' }, mode: 'file', line: td.line })
  }

  /** The empty key means something different per axis, and both are real groups. */
  const groupLabel = (key: string): string => {
    if (key !== '') return key
    return groupBy === 'owner' ? t('ctodo.unowned') : t('ctodo.root')
  }

  return (
    <section className="problems-panel" aria-label={t('ctodo.title')}>
      <header className="problems-head">
        <DockTabs />
        <span className="problems-counts">
          {tagCounts.slice(0, 6).map((tally) => (
            <button
              key={tally.key}
              className={`prob-count todo-chip ${tags.includes(tally.key) ? 'on' : ''}`}
              title={interp(t('ctodo.tagFilter'), { tag: tally.key })}
              onClick={() => toggleTag(tally.key)}
            >
              <span className={`todo-tag todo-tag-${tally.key.toLowerCase()}`}>{tally.key}</span>
              <span>{tally.n}</span>
            </button>
          ))}
        </span>
        <span className="problems-search">
          <Search size={12} />
          <input
            value={query}
            placeholder={t('ctodo.search')}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('ctodo.search')}
          />
        </span>
        <span className="todo-groupby" role="group" aria-label={t('ctodo.groupBy')}>
          {TODO_GROUP_BYS.map((by) => (
            <button
              key={by}
              className={`prob-toggle ${groupBy === by ? 'on' : ''}`}
              title={interp(t('ctodo.groupByTitle'), { axis: t(GROUP_LABELS[by]) })}
              onClick={() => setGroupBy(by)}
            >
              {GROUP_ICONS[by]}
              <span>{t(GROUP_LABELS[by])}</span>
            </button>
          ))}
        </span>
        <button
          className={`prob-toggle ${changedOnly ? 'on' : ''}`}
          title={t('ctodo.changedOnlyTitle')}
          onClick={() => setChangedOnly(!changedOnly)}
        >
          <GitCompareArrows size={13} />
          <span>{t('problems.changedOnly')}</span>
        </button>
        <span className="problems-head-spacer" />
        {running ? (
          <button className="icon-btn" title={t('ctodo.cancel')} onClick={() => cancel(repoPath)}>
            <Loader size={13} className="prob-spin" />
          </button>
        ) : (
          <button className="icon-btn" title={t('ctodo.rerun')} onClick={() => void scan(repoPath)}>
            <RefreshCw size={13} />
          </button>
        )}
        <button className="icon-btn" title={t('problems.close')} onClick={() => setProblemsOpen(repoPath, false)}>
          <X size={13} />
        </button>
      </header>

      <div className="problems-body">
        {groups.length === 0 ? (
          <p className="problems-empty">
            {running ? t('ctodo.running') : todos.length > 0 ? t('ctodo.filteredNone') : t('ctodo.none')}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="prob-group">
              <div className="prob-file">
                <span className="prob-file-name">{groupLabel(g.key)}</span>
                {(groupBy === 'file' || groupBy === 'folder') && g.key !== '' && (
                  <span className="prob-file-dir">{groupBy === 'file' ? folderOf(g.key) : ''}</span>
                )}
                <span className="prob-file-count">{g.todos.length}</span>
              </div>
              {g.todos.map((td, i) => (
                <button
                  key={`${td.file}:${td.line}:${i}`}
                  className="prob-row todo-row"
                  // The row ellipsises; the whole source line survives here.
                  title={td.text}
                  onClick={() => open(td)}
                >
                  <span className={`todo-tag todo-tag-${td.tag.toLowerCase()}`}>{td.tag}</span>
                  <span className="prob-msg">{td.message || td.text}</span>
                  {td.owner && groupBy !== 'owner' && (
                    <span
                      className="todo-owner"
                      title={interp(t('ctodo.owned'), { owner: td.owner })}
                      onClick={(e) => {
                        // The badge filters without leaving the row's job — a
                        // nested button is invalid markup inside one.
                        e.stopPropagation()
                        toggleOwner(td.owner ?? '')
                      }}
                    >
                      {td.owner}
                    </span>
                  )}
                  {groupBy !== 'file' && <span className="prob-src">{td.file}</span>}
                  <span className="prob-pos">{td.line}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <footer className="problems-foot">
        {result && (
          <span>
            {interp(t('ctodo.scanned'), { n: String(todos.length), seconds: (result.ms / 1000).toFixed(1) })}
          </span>
        )}
        {owners.length > 0 && (
          <button className="problems-clear" onClick={() => owners.forEach((o) => toggleOwner(o))}>
            {interp(t('ctodo.clearOwners'), { n: String(owners.length) })}
          </button>
        )}
        {result?.truncated && <span className="problems-missing">{interp(t('ctodo.truncated'), { n: String(todos.length) })}</span>}
      </footer>
    </section>
  )
}
