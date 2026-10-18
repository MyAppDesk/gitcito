import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { gitApi } from '../infrastructure/api'
import { rankImageCandidates } from '../lib/repoImage'
import { useT, interp } from '../i18n'
import { loadRepoImage } from './RepoTabLabel'

type Thumb = string | null | 'loading'

/** One suggestion. Its thumbnail goes through the same read the tab uses, so a
 *  file the tab could not show (too large, unreadable) is marked here before it
 *  is picked rather than after. */
function Option({
  repoPath,
  path,
  active,
  onPick,
  onHover
}: {
  repoPath: string
  path: string
  active: boolean
  onPick: () => void
  onHover: () => void
}): React.JSX.Element {
  const t = useT()
  const [thumb, setThumb] = useState<Thumb>('loading')
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    let live = true
    void loadRepoImage(repoPath, path).then((u) => live && setThumb(u))
    return () => {
      live = false
    }
  }, [repoPath, path])
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  const slash = path.lastIndexOf('/')
  const unusable = thumb === null
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      className={`rip-opt ${active ? 'active' : ''}`}
      disabled={unusable}
      title={unusable ? t('repoSettings.tabImageUnusable') : path}
      // Keep focus in the input so picking does not count as leaving the field.
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={onPick}
    >
      <span className="rip-thumb">
        {thumb === 'loading' ? (
          <Loader2 size={12} className="spin" />
        ) : thumb ? (
          <img src={thumb} alt="" draggable={false} />
        ) : (
          <AlertTriangle size={12} />
        )}
      </span>
      <span className="rip-path">
        {slash >= 0 && <span className="rip-dir">{path.slice(0, slash + 1)}</span>}
        <span className="rip-name">{path.slice(slash + 1)}</span>
      </span>
    </button>
  )
}

/**
 * The tab image field: a path input that doubles as a search over the
 * repository's own images, with a thumbnail per suggestion. Typing a path by
 * hand still works — the list only suggests.
 */
export function RepoImagePicker({
  repoPath,
  value,
  onChange,
  preview,
  invalid
}: {
  repoPath: string
  value: string
  onChange: (value: string) => void
  preview: string | null
  invalid: boolean
}): React.JSX.Element {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [files, setFiles] = useState<string[] | null>(null)

  // Listed on first open, not on mount: most visits to this tab are about the
  // protected branches, and a large repository's file list is not free.
  useEffect(() => {
    if (!open || files !== null) return
    gitApi
      .listFiles(repoPath)
      .then(setFiles)
      .catch(() => setFiles([]))
  }, [open, files, repoPath])

  const candidates = useMemo(() => rankImageCandidates(files ?? [], query), [files, query])

  useEffect(() => setActive(0), [query])

  const show = (q: string): void => {
    setQuery(q)
    setOpen(true)
  }

  const pick = (path: string): void => {
    onChange(path)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return show('')
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => Math.max(0, Math.min(candidates.length - 1, i + step)))
    } else if (e.key === 'Enter' && open && candidates[active]) {
      e.preventDefault()
      pick(candidates[active])
    } else if (e.key === 'Escape' && open) {
      // Close the list, not the modal around it.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div
      className="rip"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <div className="repo-image-row">
        <span className="repo-image-preview">{preview ? <img src={preview} alt="" /> : <ImageIcon size={14} />}</span>
        <div className="rip-field">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              show(e.target.value)
            }}
            onFocus={() => show('')}
            onKeyDown={onKeyDown}
            placeholder={t('repoSettings.tabImagePlaceholder')}
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-invalid={invalid}
          />
          {value && (
            <button
              type="button"
              className="rip-clear"
              title={t('repoSettings.tabImageClear')}
              aria-label={t('repoSettings.tabImageClear')}
              onClick={() => {
                onChange('')
                inputRef.current?.focus()
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`btn ghost small ${open ? 'active' : ''}`}
          aria-label={t('repoSettings.tabImageBrowse')}
          title={t('repoSettings.tabImageBrowse')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) return setOpen(false)
            show('')
            inputRef.current?.focus()
          }}
        >
          <ChevronDown size={13} className={open ? 'rip-chevron open' : 'rip-chevron'} />
        </button>
      </div>
      {open && (
        <div className="rip-list" role="listbox">
          {files === null ? (
            <div className="rip-empty">
              <Loader2 size={14} className="spin" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="rip-empty">
              {query.trim()
                ? interp(t('repoSettings.tabImageNoMatch'), { query: query.trim() })
                : t('repoSettings.tabImageNone')}
            </div>
          ) : (
            candidates.map((path, i) => (
              <Option
                key={path}
                repoPath={repoPath}
                path={path}
                active={i === active}
                onHover={() => setActive(i)}
                onPick={() => pick(path)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
