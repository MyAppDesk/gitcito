import { useMemo, useState } from 'react'
import { Archive, FileDown, FileUp, FolderOpen, Loader2, Package, PackageOpen } from 'lucide-react'
import { gitApi, shellApi } from '../infrastructure/api'
import { useUIStore } from '../stores/ui'
import { useRepoStore, repoActions } from '../stores/repo'
import { RefPicker, type RefOption } from './RefPicker'
import type { ArchiveFormat, BundleInfo, BundleScope } from '../../../shared/types'
import { useT, interp } from '../i18n'

/** Human-readable byte size. */
function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

/** Last path segment of a repo path, used to name the file being written. */
function repoName(path: string): string {
  return path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'repository'
}

/** A ref turned into something safe to put in a filename. */
function slug(ref: string): string {
  return ref.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'HEAD'
}

/**
 * Putting a repository into a single file, and taking one back out.
 *
 * Two formats that look alike and are not: a **bundle** is history — git clones
 * and fetches from it like a remote, which is how work crosses a gap no network
 * spans. An **archive** is the files at one commit and nothing else: no history,
 * no refs, nothing to pull from.
 */
export function ExportModal({
  repoPath,
  initialTab
}: {
  repoPath: string
  initialTab?: 'bundle' | 'archive'
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const repo = useRepoStore((s) => s.repos[repoPath])
  const [tab, setTab] = useState<'bundle' | 'archive'>(initialTab ?? 'bundle')
  const [busy, setBusy] = useState(false)
  // The file just written, so the result is a place on disk and not only a toast.
  const [written, setWritten] = useState<{ path: string; bytes: number } | null>(null)

  const current = repo?.branches.current || 'HEAD'
  const refOptions = useMemo<RefOption[]>(() => {
    const out: RefOption[] = []
    for (const l of repo?.branches.locals ?? []) out.push({ value: l.name, kind: 'local' })
    for (const r of repo?.branches.remotes ?? []) out.push({ value: r.fullName, kind: 'remote' })
    for (const tg of repo?.branches.tags ?? []) out.push({ value: tg.name, kind: 'tag' })
    return out
  }, [repo?.branches])

  const fail = (err: unknown): void => toast('error', err instanceof Error ? err.message : String(err))

  // ── Bundle ────────────────────────────────────────────────────────────────
  const [scope, setScope] = useState<'all' | 'ref' | 'range'>('all')
  const [bundleRef, setBundleRef] = useState(current)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState(current)

  const createBundle = async (): Promise<void> => {
    const spec: BundleScope =
      scope === 'all'
        ? { kind: 'all' }
        : scope === 'ref'
          ? { kind: 'ref', ref: bundleRef.trim() }
          : { kind: 'range', from: rangeFrom.trim(), to: rangeTo.trim() }
    const name =
      scope === 'all' ? `${repoName(repoPath)}.bundle` : `${repoName(repoPath)}-${slug(scope === 'ref' ? bundleRef : rangeTo)}.bundle`
    const file = await window.api.choosePath(t('export.saveBundle'), name, [
      { name: 'Git bundle', extensions: ['bundle'] } // i18n-ignore file-type filter, a git format name
    ])
    if (!file) return
    setBusy(true)
    setWritten(null)
    try {
      const res = await gitApi.bundleCreate(repoPath, file, spec)
      setWritten({ path: res.path, bytes: res.bytes })
      toast('success', interp(t('export.bundleWritten'), { n: String(res.refs), size: fmtBytes(res.bytes) }))
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  // ── Bundle import ─────────────────────────────────────────────────────────
  const [incoming, setIncoming] = useState<{ file: string; info: BundleInfo } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const openBundle = async (): Promise<void> => {
    const file = await window.api.openFilePath(t('export.openBundle'), [
      { name: 'Git bundle', extensions: ['bundle'] } // i18n-ignore file-type filter, a git format name
    ])
    if (!file) return
    setBusy(true)
    try {
      const info = await gitApi.bundleInspect(repoPath, file)
      setIncoming({ file, info })
      setPicked(new Set(info.refs.map((r) => r.name)))
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const importRefs = (): void => {
    if (!incoming) return
    setBusy(true)
    void repoActions
      .bundleFetch(repoPath, incoming.file, [...picked])
      .then((ok) => {
        if (ok) setIncoming(null)
      })
      .finally(() => setBusy(false))
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  const [archiveRef, setArchiveRef] = useState(current)
  const [format, setFormat] = useState<ArchiveFormat>('zip')
  const [prefix, setPrefix] = useState(`${repoName(repoPath)}/`)
  const [subdir, setSubdir] = useState('')

  const createArchive = async (): Promise<void> => {
    const ext = format === 'tar.gz' ? 'tar.gz' : format
    const file = await window.api.choosePath(
      t('export.saveArchive'),
      `${repoName(repoPath)}-${slug(archiveRef)}.${ext}`,
      [{ name: format, extensions: [ext] }] // i18n-ignore archive format name
    )
    if (!file) return
    setBusy(true)
    setWritten(null)
    try {
      const res = await gitApi.archiveCreate(repoPath, file, archiveRef, format, prefix, subdir)
      setWritten({ path: res.path, bytes: res.bytes })
      toast('success', interp(t('export.archiveWritten'), { size: fmtBytes(res.bytes) }))
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export-modal">
      <h3>
        <Package size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('export.title')}
      </h3>
      <div className="share-tabs">
        <button className={`btn small ${tab === 'bundle' ? 'primary' : 'ghost'}`} onClick={() => setTab('bundle')}>
          <Package size={13} /> {t('export.bundleTab')}
        </button>
        <button className={`btn small ${tab === 'archive' ? 'primary' : 'ghost'}`} onClick={() => setTab('archive')}>
          <Archive size={13} /> {t('export.archiveTab')}
        </button>
      </div>

      {tab === 'bundle' ? (
        <>
          <p className="settings-hint">{t('export.bundleIntro')}</p>

          <div className="export-scope">
            {(['all', 'ref', 'range'] as const).map((kind) => (
              <label key={kind} className="export-radio">
                <input type="radio" checked={scope === kind} onChange={() => setScope(kind)} />
                <span>
                  {kind === 'all' ? t('export.scopeAll') : kind === 'ref' ? t('export.scopeRef') : t('export.scopeRange')}
                </span>
              </label>
            ))}
          </div>

          {scope === 'ref' && (
            <div className="export-field">
              <label className="modal-label">{t('export.ref')}</label>
              <RefPicker value={bundleRef} options={refOptions} onChange={setBundleRef} />
            </div>
          )}
          {scope === 'range' && (
            <>
              <div className="export-field">
                <label className="modal-label">{t('export.rangeFrom')}</label>
                <RefPicker value={rangeFrom} options={refOptions} placeholder="v1.0" onChange={setRangeFrom} />
              </div>
              <div className="export-field">
                <label className="modal-label">{t('export.rangeTo')}</label>
                <RefPicker value={rangeTo} options={refOptions} onChange={setRangeTo} />
              </div>
              <p className="settings-hint">{t('export.rangeHint')}</p>
            </>
          )}

          <div className="modal-actions">
            <button className="btn ghost" type="button" disabled={busy} onClick={() => void openBundle()}>
              <PackageOpen size={13} /> {t('export.import')}
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={busy || (scope === 'ref' && !bundleRef.trim()) || (scope === 'range' && (!rangeFrom.trim() || !rangeTo.trim()))}
              onClick={() => void createBundle()}
            >
              {busy ? <Loader2 size={13} className="spin" /> : <FileUp size={13} />} {t('export.createBundle')}
            </button>
          </div>

          {incoming && (
            <div className="export-incoming">
              <div className="export-incoming-head">
                <FileDown size={13} />
                <strong>{incoming.file.split(/[/\\]/).pop()}</strong>
              </div>
              {!incoming.info.usable && (
                <p className="export-warn">
                  {interp(t('export.missingPrereqs'), { n: String(incoming.info.prerequisites.length) })}
                </p>
              )}
              {incoming.info.refs.map((ref) => (
                <label key={ref.name} className="export-ref-row">
                  <input
                    type="checkbox"
                    checked={picked.has(ref.name)}
                    onChange={() =>
                      setPicked((prev) => {
                        const next = new Set(prev)
                        if (!next.delete(ref.name)) next.add(ref.name)
                        return next
                      })
                    }
                  />
                  <span className="export-ref-name">{ref.name}</span>
                  <code>{ref.sha.slice(0, 7)}</code>
                </label>
              ))}
              <p className="settings-hint">{t('export.importHint')}</p>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setIncoming(null)}>
                  {t('common.cancel')}
                </button>
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy || !picked.size || !incoming.info.usable}
                  onClick={importRefs}
                >
                  <FileDown size={13} /> {t('export.importRefs')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="settings-hint">{t('export.archiveIntro')}</p>

          <div className="export-field">
            <label className="modal-label">{t('export.ref')}</label>
            <RefPicker value={archiveRef} options={refOptions} onChange={setArchiveRef} />
          </div>
          <div className="export-field">
            <label className="modal-label">{t('export.format')}</label>
            <select className="modal-input" value={format} onChange={(e) => setFormat(e.target.value as ArchiveFormat)}>
              {/* i18n-ignore archive format names, not prose */}
              <option value="zip">zip</option>
              <option value="tar.gz">tar.gz</option>
              <option value="tar">tar</option>
            </select>
          </div>
          <div className="export-field">
            <label className="modal-label">{t('export.prefix')}</label>
            <input className="modal-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            <span className="modal-hint">{t('export.prefixHint')}</span>
          </div>
          <div className="export-field">
            <label className="modal-label">{t('export.subdir')}</label>
            <input
              className="modal-input"
              value={subdir}
              placeholder="docs"
              onChange={(e) => setSubdir(e.target.value)}
            />
            <span className="modal-hint">{t('export.subdirHint')}</span>
          </div>
          <p className="settings-hint">{t('export.exportIgnore')}</p>

          <div className="modal-actions">
            <button className="btn primary" type="button" disabled={busy} onClick={() => void createArchive()}>
              {busy ? <Loader2 size={13} className="spin" /> : <Archive size={13} />} {t('export.createArchive')}
            </button>
          </div>
        </>
      )}

      {written && (
        <div className="export-result">
          <span className="export-result-path" title={written.path}>
            {written.path}
          </span>
          <span className="export-result-size">{fmtBytes(written.bytes)}</span>
          <button className="btn ghost small" type="button" onClick={() => void shellApi.revealInFolder(written.path)}>
            <FolderOpen size={12} /> {shellApi.revealLabel}
          </button>
        </div>
      )}
    </div>
  )
}
