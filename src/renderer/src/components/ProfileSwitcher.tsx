import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { useSettingsStore } from '../stores/settings'
import { useRepoStore } from '../stores/repo'
import { useUIStore } from '../stores/ui'
import { useT, interp } from '../i18n'
import { repoMood } from '../lib/repoMood'
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

  // The pose the title-bar avatar wears. This avatar is the only one that means
  // "you, in this repository, right now", so it is the only one that reacts —
  // see lib/repoMood.ts. Subscribed to the status slice alone so an unrelated
  // refresh does not re-render the title bar.
  // Each slice is selected on its own and every one of them is a primitive or
  // an already-stable reference, so a refresh that touches none of them does
  // not re-render the title bar.
  const status = useRepoStore((s) => (repo ? s.repos[repo.path]?.status ?? null : null))
  const mergeState = useRepoStore((s) => (repo ? s.repos[repo.path]?.mergeState ?? null : null))
  const stashCount = useRepoStore((s) => (repo ? s.repos[repo.path]?.stashes.length ?? 0 : 0))
  const newestCommitAt = useRepoStore((s) => (repo ? s.repos[repo.path]?.commits[0]?.date ?? null : null))
  const hint = repoMood({ status, mergeState, stashCount, newestCommitAt, now: Date.now() })
  const moodText = hint.key ? interp(t(hint.key), hint.vars ?? {}) : null

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
      placeholder: interp(t('settings.profileNameDefault'), { n: settings.profiles.length + 1 }),
      submitLabel: t('settings.newProfile'),
      onSubmit: (name) =>
        addProfile(
          name.trim() || interp(t('settings.profileNameDefault'), { n: settings.profiles.length + 1 })
        )
    })
  }

  if (!active) return <></>

  return (
    <>
      <button
        ref={btnRef}
        className={`profile-switcher ${open ? 'open' : ''}`}
        // A face that changed for no stated reason is a puzzle, not a signal.
        title={
          moodText ? interp(t('profile.moodTitle'), { name: active.name, mood: moodText }) : active.name
        }
        onClick={toggle}
      >
        <Avatar
          email={active.gitEmail}
          name={active.name}
          // Bigger than the 20px it used to be: an expression needs room. A
          // Gravatar photo reads fine at 20, a face does not.
          size={26}
          mood={hint.mood}
          animate={settings.avatarMotion ?? true}
        />
        <span className="profile-switcher-name">{active.name}</span>
        {isAuto && <span className="profile-switcher-auto">{t('profile.auto')}</span>}
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
                  <span className="profile-switcher-label">{t('profile.auto')}</span>
                </button>
                <div className="profile-switcher-hint">
                  {isAuto
                    ? interp(t('profile.followingActive'), { name: active.name })
                    : interp(t('profile.pinned'), { repo: repo.name })}
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
