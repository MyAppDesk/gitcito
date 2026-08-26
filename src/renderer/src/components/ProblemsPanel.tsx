import { useEffect, useMemo } from 'react'
import { CircleX, TriangleAlert, Info, RefreshCw, X, Search, GitCompareArrows, Loader } from 'lucide-react'
import type { Problem, ProblemSeverity } from '../../../shared/types'
import { useProblemsStore } from '../stores/problems'
import { useRepoStore } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'
import { baseName, countBySeverity, dirName, filterProblems, groupByFile } from '../lib/problems'

/** Severity glyphs, the same three the counter in the status bar uses. */
export function severityIcon(severity: ProblemSeverity, size = 13): React.JSX.Element {
  if (severity === 'error') return <CircleX size={size} className="prob-icon prob-icon-error" />
  if (severity === 'warning') return <TriangleAlert size={size} className="prob-icon prob-icon-warning" />
  return <Info size={size} className="prob-icon prob-icon-info" />
}

/**
 * The Problems dock: everything the project's own analyzers said, grouped by
 * file, one click from the line that said it.
 *
 * The list is the whole repository by default. "Changed files only" is the
 * filter worth having — a flat list of every warning in a codebase is wallpaper
 * within a week, and the question a git client can answer that an editor cannot
 * is whether *this* diff is what introduced them.
 */
export function ProblemsPanel({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const result = useProblemsStore((s) => s.resultByRepo[repoPath])
  const running = useProblemsStore((s) => s.runningByRepo[repoPath] === true)
  const available = useProblemsStore((s) => s.availableByRepo[repoPath] ?? [])
  const severities = useProblemsStore((s) => s.severities)
  const changedOnly = useProblemsStore((s) => s.changedOnly)
  const query = useProblemsStore((s) => s.query)
  const run = useProblemsStore((s) => s.run)
  const cancel = useProblemsStore((s) => s.cancel)
  const toggleSeverity = useProblemsStore((s) => s.toggleSeverity)
  const setChangedOnly = useProblemsStore((s) => s.setChangedOnly)
  const setQuery = useProblemsStore((s) => s.setQuery)
  const status = useRepoStore((s) => s.repos[repoPath]?.status)
  const setFileView = useUIStore((s) => s.setFileView)
  const setProblemsOpen = useUIStore((s) => s.setProblemsOpen)

  // Opening the panel with nothing to show is a dead end — sweep once.
  useEffect(() => {
    if (!result && !running) void run(repoPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath])

  const problems = result?.problems ?? []
  const counts = useMemo(() => countBySeverity(problems), [problems])
  const changedFiles = useMemo(
    () => [...(status?.staged ?? []), ...(status?.unstaged ?? []), ...(status?.conflicted ?? [])].map((f) => f.path),
    [status]
  )
  const shown = useMemo(
    () => filterProblems(problems, { severities, changedOnly, changedFiles, query }),
    [problems, severities, changedOnly, changedFiles, query]
  )
  const groups = useMemo(() => groupByFile(shown), [shown])

  const open = (p: Problem): void => {
    setFileView({ repoPath, file: p.file, source: { type: 'tree' }, mode: 'file', line: p.line })
  }

  const severityChip = (severity: ProblemSeverity, n: number, label: string): React.JSX.Element => (
    <button
      className={`prob-count ${severities.includes(severity) ? 'on' : ''}`}
      title={label}
      onClick={() => toggleSeverity(severity)}
    >
      {severityIcon(severity)}
      <span>{n}</span>
    </button>
  )

  return (
    <section className="problems-panel" aria-label={t('problems.title')}>
      <header className="problems-head">
        <span className="problems-title">{t('problems.title')}</span>
        <span className="problems-counts">
          {severityChip('error', counts.error, t('problems.errors'))}
          {severityChip('warning', counts.warning, t('problems.warnings'))}
          {severityChip('info', counts.info, t('problems.infos'))}
        </span>
        <span className="problems-search">
          <Search size={12} />
          <input
            value={query}
            placeholder={t('problems.search')}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('problems.search')}
          />
        </span>
        <button
          className={`prob-toggle ${changedOnly ? 'on' : ''}`}
          title={t('problems.changedOnlyTitle')}
          onClick={() => setChangedOnly(!changedOnly)}
        >
          <GitCompareArrows size={13} />
          <span>{t('problems.changedOnly')}</span>
        </button>
        <span className="problems-head-spacer" />
        {running ? (
          <button className="icon-btn" title={t('problems.cancel')} onClick={() => cancel(repoPath)}>
            <Loader size={13} className="prob-spin" />
          </button>
        ) : (
          <button className="icon-btn" title={t('problems.rerun')} onClick={() => void run(repoPath)}>
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
            {running
              ? t('problems.running')
              : available.length === 0
                ? t('problems.noAnalyzers')
                : problems.length > 0
                  ? t('problems.filteredNone')
                  : t('problems.none')}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.file} className="prob-group">
              <div className="prob-file">
                <span className="prob-file-name">{baseName(g.file)}</span>
                <span className="prob-file-dir">{dirName(g.file)}</span>
                <span className="prob-file-count">{g.problems.length}</span>
              </div>
              {g.problems.map((p, i) => (
                <button
                  key={`${p.line}:${p.col}:${i}`}
                  className="prob-row"
                  // The row ellipsises; a long analyzer message keeps its tail here.
                  title={p.message}
                  onClick={() => open(p)}
                >
                  {severityIcon(p.severity)}
                  <span className="prob-msg">{p.message}</span>
                  {p.code && <span className="prob-code">{p.code}</span>}
                  <span className="prob-src">{p.source}</span>
                  <span className="prob-pos">
                    {p.line}:{p.col}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <footer className="problems-foot">
        {result && result.ran.length > 0 && (
          <span>{interp(t('problems.ranIn'), { tools: result.ran.join(', '), seconds: (result.ms / 1000).toFixed(1) })}</span>
        )}
        {result && result.missing.length > 0 && (
          <span className="problems-missing">{interp(t('problems.missing'), { tools: result.missing.join(', ') })}</span>
        )}
        {result?.truncated && <span className="problems-missing">{interp(t('problems.truncated'), { n: String(problems.length) })}</span>}
      </footer>
    </section>
  )
}
