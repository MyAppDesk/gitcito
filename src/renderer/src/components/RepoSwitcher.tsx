import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderGit2, FolderSearch, Search } from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { repoDisplayName } from '../lib/repoAlias'
import { filterSwitcher, switcherEntries, type SwitcherEntry } from '../lib/repoSwitcher'
import { repoCloseStatus } from '../lib/tabClose'
import { useT, interp } from '../i18n'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** The name with the matched letters marked. */
function Highlighted({ name, hits }: { name: string; hits: number[] }): ReactNode {
  if (hits.length === 0) return name
  const set = new Set(hits)
  return [...name].map((ch, i) => (set.has(i) ? <mark key={i}>{ch}</mark> : ch))
}

/**
 * Cmd/Ctrl+J — jump to an open repository by name. Lighter than the command
 * palette on purpose: no backdrop, only open repositories, most recently used
 * first, so Cmd/Ctrl+J Enter goes back to the repository you just left.
 */
export function RepoSwitcher(): React.JSX.Element {
  const t = useT()
  const open = useUIStore((s) => s.repoSwitcherOpen)
  const setOpen = useUIStore((s) => s.setRepoSwitcher)
  const mru = useUIStore((s) => s.repoMru)
  const tabs = useSettingsStore((s) => s.settings.tabs)
  const activeTabId = useSettingsStore((s) => s.settings.activeTabId)
  const aliases = useSettingsStore((s) => s.settings.repoAliases)
  const repos = useRepoStore((s) => s.repos)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    requestAnimationFrame(() => inputRef.current?.focus())
    // A press outside only dismisses: capture it so it does not also land on
    // whatever sits underneath.
    const onDown = (e: MouseEvent): void => {
      if (panelRef.current?.contains(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [open, setOpen])

  const entries = useMemo(
    () => (open ? switcherEntries(tabs, activeTabId, mru, (path, name) => repoDisplayName(path, aliases, name)) : []),
    [open, tabs, activeTabId, mru, aliases]
  )
  const results = useMemo(
    () => filterSwitcher(entries, query, (path) => repos[path]?.branches.current),
    [entries, query, repos]
  )
  // The current repository is shown, dimmed, but never selectable; the last row
  // hands the search over to the Repositories page.
  const choices = results.filter((e) => !e.current)
  const current = query.trim() ? null : (results.find((e) => e.current) ?? null)
  const findIdx = choices.length

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (entry: SwitcherEntry): void => {
    setOpen(false)
    const st = useSettingsStore.getState()
    st.setActiveTab(entry.tabId)
    const tab = st.settings.tabs.find((x) => x.id === entry.tabId)
    if (tab?.kind === 'group') st.setGroupActiveRepo(entry.tabId, entry.path)
  }
  const findElsewhere = (): void => {
    setOpen(false)
    useUIStore.getState().setRepositoriesQuery(query.trim())
    useSettingsStore.getState().openPageTab({ type: 'repositories' })
  }
  const fire = (idx: number): void => {
    if (idx === findIdx) findElsewhere()
    else if (choices[idx]) go(choices[idx])
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, findIdx))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      fire(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  const mod = isMac ? '⌘' : 'Ctrl+'
  const row = (e: SwitcherEntry, idx: number | null): React.JSX.Element => {
    const data = repos[e.path]
    const branch = data?.branches.current
    // The same dot the tab carries: uncommitted work, or a conflict in progress.
    const status = repoCloseStatus(data)
    const body = (
      <>
        <FolderGit2 size={15} className="repo-switcher-icon" />
        <span className="repo-switcher-name">
          <Highlighted name={e.name} hits={e.hits} />
        </span>
        {branch && <span className="repo-switcher-branch">{branch}</span>}
        {e.groupName && <span className="repo-switcher-group">{e.groupName}</span>}
        <span className="repo-switcher-marks">
          {status && (
            <span
              className={`tab-status tab-status-${status}`}
              title={status === 'conflict' ? t('titlebar.conflictsInProgress') : t('titlebar.uncommittedChangesShort')}
            />
          )}
        </span>
        <span className="repo-switcher-key">{e.tabIndex !== null ? `${mod}${e.tabIndex + 1}` : ''}</span>
      </>
    )
    if (idx === null)
      return (
        <div key={e.path} className="repo-switcher-row current" title={t('switcher.currentTitle')}>
          {body}
        </div>
      )
    return (
      <button
        key={e.path}
        type="button"
        id={`repo-switcher-opt-${idx}`}
        data-idx={idx}
        role="option"
        aria-selected={idx === active}
        className={`repo-switcher-row ${idx === active ? 'active' : ''}`}
        onMouseMove={() => setActive(idx)}
        onClick={() => go(e)}
      >
        {body}
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="repo-switcher"
          role="dialog"
          aria-label={t('switcher.title')}
          initial={{ opacity: 0, y: -6, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -4, x: '-50%' }}
          transition={{ duration: 0.12 }}
        >
          <div className="repo-switcher-input-row">
            <Search size={15} className="repo-switcher-search-icon" />
            <input
              ref={inputRef}
              className="repo-switcher-input"
              role="combobox"
              aria-expanded
              aria-controls="repo-switcher-list"
              aria-activedescendant={`repo-switcher-opt-${active}`}
              placeholder={t('switcher.placeholder')}
              value={query}
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className="repo-switcher-list" id="repo-switcher-list" role="listbox" ref={listRef}>
            {choices.map((e, idx) => row(e, idx))}
            {query.trim() && choices.length === 0 && (
              <div className="repo-switcher-empty">{t('switcher.noOpenMatch')}</div>
            )}
            {current && (
              <>
                <div className="repo-switcher-sep">{t('switcher.current')}</div>
                {row(current, null)}
              </>
            )}
            <button
              type="button"
              id={`repo-switcher-opt-${findIdx}`}
              data-idx={findIdx}
              role="option"
              aria-selected={findIdx === active}
              className={`repo-switcher-row find ${findIdx === active ? 'active' : ''}`}
              onMouseMove={() => setActive(findIdx)}
              onClick={findElsewhere}
            >
              <FolderSearch size={15} className="repo-switcher-icon" />
              <span className="repo-switcher-name">
                {query.trim() ? interp(t('switcher.findAll'), { query: query.trim() }) : t('switcher.browseAll')}
              </span>
            </button>
          </div>
          <div className="repo-switcher-foot">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> {t('switcher.hintChoose')}
            </span>
            <span>
              <kbd>⏎</kbd> {t('switcher.hintSwitch')}
            </span>
            <span>
              <kbd>esc</kbd> {t('switcher.hintClose')}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
