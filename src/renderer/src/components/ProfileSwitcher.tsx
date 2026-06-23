import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { useT } from '../i18n'
import { Avatar } from './Avatar'

/**
 * Title-bar profile selector. Shows the active profile's avatar + name and
 * opens a dropdown to switch between profiles. The dropdown always offers a
 * "New profile" action, even when only a single profile exists.
 */
export function ProfileSwitcher(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile)
  const setRepoProfile = useSettingsStore((s) => s.setRepoProfile)
  const activeRepo = useSettingsStore((s) => s.activeRepo)
  const addProfile = useSettingsStore((s) => s.addProfile)
  const openModal = useUIStore((s) => s.openModal)
  const t = useT()

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const active = settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0]

  // Per-repo binding state. "Auto" = a repo is active but has no bound profile,
  // so it just follows whichever profile is globally active. With no active repo
  // (e.g. a page tab) there's nothing to bind, so Auto doesn't apply.
  const repo = activeRepo()
  const bound = repo ? settings.repoProfiles[repo.path] : undefined
  const isAuto = !!repo && !bound
  // Which profile row shows the check: the bound one when a repo is bound,
  // otherwise the globally active one.
  const checkedId = repo ? bound ?? null : active?.id ?? null

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ right: window.innerWidth - r.right, top: r.bottom + 4 })
    setOpen(true)
  }

  const createProfile = (): void => {
    setOpen(false)
    openModal({
      kind: 'input',
      title: t('settings.newProfile'),
      label: t('settings.profileName'),
      placeholder: `Profile ${settings.profiles.length + 1}`,
      submitLabel: t('settings.newProfile'),
      onSubmit: (name) => addProfile(name.trim() || `Profile ${settings.profiles.length + 1}`)
    })
  }

  if (!active) return <></>

  return (
    <>
      <button
        ref={btnRef}
        className={`profile-switcher ${open ? 'open' : ''}`}
        title={active.name}
        onClick={toggle}
      >
        <Avatar email={active.gitEmail} name={active.name} size={20} />
        <span className="profile-switcher-name">{active.name}</span>
        {isAuto && <span className="profile-switcher-auto">Auto</span>}
        <ChevronDown size={13} className="profile-switcher-chevron" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="profile-switcher-menu"
            style={{ right: pos.right, top: pos.top }}
          >
            {repo && (
              <>
                <button
                  className={`profile-switcher-item ${isAuto ? 'selected' : ''}`}
                  onClick={() => {
                    // Clear the binding — this repo follows the global active profile.
                    setRepoProfile(repo.path, null)
                    setOpen(false)
                  }}
                >
                  <span className="profile-switcher-check">{isAuto ? '✓' : ''}</span>
                  <span className="profile-switcher-auto-dot">A</span>
                  <span className="profile-switcher-label">Auto</span>
                </button>
                <div className="profile-switcher-hint">
                  {isAuto
                    ? `Following the active profile — ${active.name}`
                    : `${repo.name} is pinned to a profile`}
                </div>
                <div className="profile-switcher-sep" />
              </>
            )}
            {settings.profiles.map((p) => (
              <button
                key={p.id}
                className={`profile-switcher-item ${p.id === checkedId ? 'selected' : ''}`}
                onClick={() => {
                  setActiveProfile(p.id)
                  // Remember this choice for the active repo so revisiting its
                  // tab auto-restores the profile.
                  if (repo) setRepoProfile(repo.path, p.id)
                  setOpen(false)
                }}
              >
                <span className="profile-switcher-check">{p.id === checkedId ? '✓' : ''}</span>
                <Avatar email={p.gitEmail} name={p.name} size={20} />
                <span className="profile-switcher-label">{p.name}</span>
              </button>
            ))}
            <div className="profile-switcher-sep" />
            <button className="profile-switcher-item" onClick={createProfile}>
              <span className="profile-switcher-check" />
              <span className="profile-switcher-plus">
                <Plus size={14} />
              </span>
              <span className="profile-switcher-label">{t('settings.newProfile')}</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
