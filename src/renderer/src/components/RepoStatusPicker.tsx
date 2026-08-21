import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, FolderGit2 } from 'lucide-react'
import type { RepoData } from '../stores/repo'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { openRepoSwitcherEntries, type RepoSwitcherEntry } from '../lib/repositoryMenu'
import { repoDisplayName } from '../lib/repoAlias'
import { useT } from '../i18n'
import { confirmRemoveRepoFromGroup, repositoryMenuItems, requestCloseTab } from '../lib/repositoryMenuItems'

interface PickerPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

export function RepoStatusPicker({ repo }: { repo: RepoData }): React.JSX.Element {
  const t = useT()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PickerPosition | null>(null)
  const { openContextMenu, openModal } = useUIStore()
  const settings = useSettingsStore((s) => s.settings)
  const setActiveTab = useSettingsStore((s) => s.setActiveTab)
  const setGroupActiveRepo = useSettingsStore((s) => s.setGroupActiveRepo)
  const aliases = settings.repoAliases
  const display = repoDisplayName(repo.path, aliases, repo.name)

  const close = (): void => setPosition(null)

  useEffect(() => {
    if (!position) return
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target as HTMLElement
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      // The context menu is portalled to <body>, same as BranchStatusPicker's
      // overlay — keep the picker open behind it.
      if (target.closest?.('.context-menu')) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [position])

  const toggle = (): void => {
    if (position) {
      close()
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(440, window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const top = rect.bottom + 6
    setPosition({ left, top, width, maxHeight: window.innerHeight - top - 8 })
  }

  const activate = (entry: RepoSwitcherEntry): void => {
    close()
    setActiveTab(entry.tabId)
    if (entry.tabKind === 'group') setGroupActiveRepo(entry.tabId, entry.path)
  }

  const removeFor = (entry: RepoSwitcherEntry): void => {
    if (entry.tabKind === 'group') confirmRemoveRepoFromGroup(entry.tabId, entry.path)
    else requestCloseTab(entry.tabId)
  }

  const openRepoContextMenu = (event: React.MouseEvent, entry: RepoSwitcherEntry): void => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenu(event.clientX, event.clientY, repositoryMenuItems(entry.path, () => removeFor(entry)))
  }

  const entries = openRepoSwitcherEntries(settings.tabs)
  const currentEntry =
    entries.find((e) => e.path === repo.path && e.tabId === settings.activeTabId) ??
    entries.find((e) => e.path === repo.path)

  return (
    <>
      <button
        ref={triggerRef}
        className="repo-pill"
        title={t('toolbar.switchRepo')}
        aria-haspopup="listbox"
        aria-expanded={position !== null}
        onClick={toggle}
        onContextMenu={(event) => {
          if (currentEntry) openRepoContextMenu(event, currentEntry)
        }}
      >
        <span className="repo-pill-stack">
          <span className="repo-pill-label">{t('toolbar.repository')}</span>
          <strong>{display}</strong>
        </span>
        <ChevronDown size={13} />
      </button>

      {position &&
        createPortal(
          <div
            ref={popoverRef}
            className="branch-picker-popover repo-picker-popover"
            role="listbox"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight
            }}
          >
            <div className="branch-picker-scroll">
              {entries.map((entry, i) => {
                const heading =
                  entry.groupName && entry.groupName !== entries[i - 1]?.groupName ? entry.groupName : null
                const label = repoDisplayName(entry.path, aliases, entry.name)
                const active = entry.path === repo.path
                return (
                  <div key={`${entry.tabId}:${entry.path}`}>
                    {heading && <div className="branch-picker-heading">{heading}</div>}
                    <button
                      type="button"
                      className={`branch-picker-item ${active ? 'active' : ''}`}
                      role="option"
                      aria-selected={active}
                      title={entry.path}
                      onClick={() => activate(entry)}
                      onContextMenu={(event) => openRepoContextMenu(event, entry)}
                    >
                      <span className="branch-picker-check">{active && <Check size={15} />}</span>
                      <span className="branch-picker-name">{label}</span>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="branch-picker-separator" />
            <button
              type="button"
              className="branch-picker-item branch-picker-new"
              role="option"
              onClick={() => {
                close()
                openModal({ kind: 'launcher' })
              }}
            >
              <span className="branch-picker-check">
                <FolderGit2 size={15} />
              </span>
              <span className="branch-picker-name">{t('tools.openRepo')}</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
