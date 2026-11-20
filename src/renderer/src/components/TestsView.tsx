import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, CircleDashed, RefreshCw, X, Search, Loader, Play, ListFilter } from 'lucide-react'
import type { TestCase, TestStatus } from '../../../shared/types'
import { useProblemsStore } from '../stores/problems'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'
import { baseName, dirName } from '../lib/problems'
import { filterTestFiles } from '../lib/testResults'
import { DockTabs } from './ProblemsPanel'

function statusIcon(status: TestStatus, size = 13): React.JSX.Element {
  if (status === 'failed') return <CircleX size={size} className="prob-icon prob-icon-error" />
  if (status === 'passed') return <CircleCheck size={size} className="test-icon-pass" />
  return <CircleDashed size={size} className="prob-icon prob-icon-info" />
}

/**
 * The Tests half of the dock: the project's suite (vitest or jest), run on
 * demand, read from the runner's JSON report. A failed test opens its file at
 * the line the stack points to; its message unfolds under the row.
 */
export function TestsView({ repoPath }: { repoPath: string }): React.JSX.Element {
  const t = useT()
  const result = useProblemsStore((s) => s.testByRepo[repoPath])
  const running = useProblemsStore((s) => !!s.testRunningByRepo[repoPath])
  const runner = useProblemsStore((s) => s.testRunnerByRepo[repoPath])
  const failedOnly = useProblemsStore((s) => s.failedOnly)
  const { detectTests, runTests, cancelTests, setFailedOnly } = useProblemsStore.getState()
  const setFileView = useUIStore((s) => s.setFileView)
  const setProblemsOpen = useUIStore((s) => s.setProblemsOpen)
  const [query, setQuery] = useState('')
  const [openMsg, setOpenMsg] = useState<string | null>(null)

  useEffect(() => {
    void detectTests(repoPath)
  }, [repoPath, detectTests])

  const files = useMemo(() => filterTestFiles(result?.files ?? [], { failedOnly, query }), [result, failedOnly, query])

  const open = (file: string, test: TestCase): void => {
    if (test.message) setOpenMsg(openMsg === `${file}#${test.name}` ? null : `${file}#${test.name}`)
    setFileView({ repoPath, file, source: { type: 'tree' }, mode: 'file', ...(test.line ? { line: test.line } : {}) })
  }

  const empty = running
    ? t('tests.running')
    : !runner
      ? t('tests.detecting')
      : !runner.runner
        ? t('tests.noRunner')
        : !runner.installed
          ? interp(t('tests.notInstalled'), { runner: runner.runner })
          : !result
            ? t('tests.idle')
            : result.error
              ? t('tests.noReport')
              : t('tests.noneShown')

  return (
    <section className="problems-panel" aria-label={t('tests.title')}>
      <header className="problems-head">
        <DockTabs />
        {result && !result.error && (
          <span className="problems-counts test-counts">
            <span className="prob-count">{statusIcon('passed')}<span>{result.passed}</span></span>
            <span className="prob-count">{statusIcon('failed')}<span>{result.failed}</span></span>
            <span className="prob-count">{statusIcon('skipped')}<span>{result.skipped}</span></span>
          </span>
        )}
        <span className="problems-search">
          <Search size={12} />
          <input value={query} placeholder={t('tests.search')} onChange={(e) => setQuery(e.target.value)} aria-label={t('tests.search')} />
        </span>
        <button className={`prob-toggle ${failedOnly ? 'on' : ''}`} onClick={() => setFailedOnly(!failedOnly)}>
          <ListFilter size={13} />
          <span>{t('tests.failedOnly')}</span>
        </button>
        <span className="problems-head-spacer" />
        {running ? (
          <button className="icon-btn" title={t('tests.cancel')} onClick={() => cancelTests(repoPath)}>
            <Loader size={13} className="prob-spin" />
          </button>
        ) : (
          <button
            className="icon-btn"
            title={result ? t('tests.rerun') : t('tests.run')}
            disabled={!runner?.installed}
            onClick={() => void runTests(repoPath)}
          >
            {result ? <RefreshCw size={13} /> : <Play size={13} />}
          </button>
        )}
        <button className="icon-btn" title={t('problems.close')} onClick={() => setProblemsOpen(repoPath, false)}>
          <X size={13} />
        </button>
      </header>

      <div className="problems-body">
        {files.length === 0 ? (
          <>
            <p className="problems-empty">{empty}</p>
            {!running && result?.error && <pre className="test-error">{result.error}</pre>}
          </>
        ) : (
          files.map((f) => (
            <div key={f.file} className="prob-group">
              <div className="prob-file">
                {statusIcon(f.status)}
                <span className="prob-file-name">{baseName(f.file)}</span>
                <span className="prob-file-dir">{dirName(f.file)}</span>
                <span className="prob-file-count">{f.tests.length}</span>
              </div>
              {f.tests.map((test, i) => {
                const key = `${f.file}#${test.name}`
                return (
                  <div key={`${test.name}:${i}`}>
                    <button className="prob-row" title={test.message ?? test.name} onClick={() => open(f.file, test)}>
                      {statusIcon(test.status)}
                      <span className="prob-msg">{test.name || t('tests.fileFailed')}</span>
                      {test.ms > 0 && <span className="prob-src">{interp(t('tests.ms'), { ms: String(test.ms) })}</span>}
                      {test.line && <span className="prob-pos">{test.line}</span>}
                    </button>
                    {openMsg === key && test.message && <pre className="test-message">{test.message}</pre>}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <footer className="problems-foot">
        {result && !running && (
          <span>
            {interp(t('tests.ranIn'), { runner: result.runner, seconds: (result.ms / 1000).toFixed(1) })}
          </span>
        )}
      </footer>
    </section>
  )
}
