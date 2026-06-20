import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2, Copy, Check, Save, RefreshCw } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore } from '../stores/repo'

export function ChangelogGenModal({ repoPath }: { repoPath: string }): React.JSX.Element {
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])

  // Ref options: tags (newest first as git lists them) + local branches.
  const tags = useMemo(() => (repo?.branches.tags ?? []).map((t) => t.name), [repo])
  const branches = useMemo(() => repo?.branches.locals.map((b) => b.name) ?? [], [repo])

  const [from, setFrom] = useState('') // '' = auto (latest tag)
  const [to, setTo] = useState('HEAD')
  const [version, setVersion] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await gitApi.generateChangelog(repoPath, { from: from || undefined, to, version: version || undefined })
      setMarkdown(res.markdown)
      setCount(res.count)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  // Generate once on open.
  useEffect(() => {
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const save = async (): Promise<void> => {
    try {
      await gitApi.writeChangelogFile(repoPath, markdown)
      toast('success', 'Prepended to CHANGELOG.md')
      void useRepoStore.getState().refresh(repoPath)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="clgen">
      <h3>
        <FileText size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        Generate changelog
      </h3>
      <p className="settings-hint">
        Groups Conventional-Commit messages (<code>feat</code>, <code>fix</code>, <code>perf</code>…) between two
        refs. Breaking changes (<code>!</code> or <code>BREAKING CHANGE</code>) are surfaced first.
      </p>

      <div className="clgen-controls">
        <label className="settings-field">
          <span className="settings-field-label">From</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Auto (latest tag)</option>
            {tags.length > 0 && (
              <optgroup label="Tags">
                {tags.map((t) => (
                  <option key={`t:${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Branches">
              {branches.map((b) => (
                <option key={`b:${b}`} value={b}>
                  {b}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="settings-field">
          <span className="settings-field-label">To</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="HEAD">HEAD</option>
            {tags.length > 0 && (
              <optgroup label="Tags">
                {tags.map((t) => (
                  <option key={`t2:${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Branches">
              {branches.map((b) => (
                <option key={`b2:${b}`} value={b}>
                  {b}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="settings-field">
          <span className="settings-field-label">Version heading (optional)</span>
          <input className="modal-input" value={version} placeholder="v1.2.0" onChange={(e) => setVersion(e.target.value)} />
        </label>
        <button className="btn primary" onClick={() => void generate()} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          Generate
        </button>
      </div>

      <div className="clgen-meta">
        {count != null && <span>{count} commit{count === 1 ? '' : 's'} included</span>}
      </div>

      <textarea className="clgen-preview" value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} />

      <div className="modal-actions">
        <button className="btn ghost" onClick={() => void copy()} disabled={!markdown}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="btn primary" onClick={() => void save()} disabled={!markdown}>
          <Save size={14} />
          Save to CHANGELOG.md
        </button>
      </div>
    </div>
  )
}
