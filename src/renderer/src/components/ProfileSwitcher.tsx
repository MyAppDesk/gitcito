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
            {settings.profiles.map((p) => (
              <button
                key={p.id}
                className={`profile-switcher-item ${p.id === active.id ? 'selected' : ''}`}
                onClick={() => {
                  setActiveProfile(p.id)
                  // Remember this choice for the active repo so revisiting its
                  // tab auto-restores the profile.
                  const repo = activeRepo()
                  if (repo) setRepoProfile(repo.path, p.id)
                  setOpen(false)
                }}
              >
                <span className="profile-switcher-check">{p.id === active.id ? '✓' : ''}</span>
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
