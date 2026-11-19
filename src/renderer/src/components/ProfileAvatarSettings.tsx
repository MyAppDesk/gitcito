import { useEffect, useState } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { hostingApi } from '../infrastructure/api'
import { useT, interp, type TranslationKey } from '../i18n'
import { useUIStore } from '../stores/ui'
import { useProfileAvatarsStore } from '../stores/profileAvatars'
import { ProfileAvatar, PROFILE_AVATAR_GLYPHS } from './ProfileAvatar'
import {
  PROFILE_AVATAR_COLORS,
  PROFILE_AVATAR_ICONS,
  validProfileAvatar
} from '../../../shared/profileAvatar'
import type { ConnectedAccount, Profile, ProfileAvatar as ProfileAvatarSetting } from '../../../shared/types'

/** Hosts whose account picture and noreply email a profile can use. */
type AvatarHost = 'github' | 'gitlab'
const HOSTS: { id: AvatarHost; label: string; field: 'githubToken' | 'gitlabToken' }[] = [
  { id: 'github', label: 'GitHub', field: 'githubToken' },
  { id: 'gitlab', label: 'GitLab', field: 'gitlabToken' }
]

const SOURCES: { id: ProfileAvatarSetting['source']; key: TranslationKey }[] = [
  { id: 'auto', key: 'profileAvatar.sourceAuto' },
  { id: 'account', key: 'profileAvatar.sourceAccount' },
  { id: 'icon', key: 'profileAvatar.sourceIcon' },
  { id: 'image', key: 'profileAvatar.sourceImage' }
]

export type ProfileAccounts = Partial<Record<AvatarHost, ConnectedAccount>>

/**
 * The GitHub / GitLab accounts this profile is connected to, looked up quietly
 * (never a sign-in window) — the same lookup the Integrations page makes. Only
 * a profile's own token or link counts, so another profile's login never shows.
 */
export function useProfileAccounts(profile: Profile): ProfileAccounts {
  const [accounts, setAccounts] = useState<ProfileAccounts>({})
  const keys = HOSTS.map((h) => `${profile[h.field]}|${profile.links?.[h.id]?.login ?? ''}`).join(',')

  useEffect(() => {
    let alive = true
    setAccounts({})
    for (const h of HOSTS) {
      const token = profile[h.field]
      const link = profile.links?.[h.id]
      if (!token && !link) continue
      void hostingApi
        .whoAmI(h.id, token, undefined, false, link)
        .then((account) => {
          if (alive && account) setAccounts((cur) => ({ ...cur, [h.id]: account }))
        })
        .catch(() => undefined)
    }
    return () => {
      alive = false
    }
    // `keys` stands for the tokens and links: the profile object changes on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, keys])

  return accounts
}

/** Settings → Profile → Avatar: where the profile's picture comes from. */
export function ProfileAvatarSettings({
  profile,
  edit,
  accounts
}: {
  profile: Profile
  edit: (p: Partial<Profile>) => void
  accounts: ProfileAccounts
}): React.JSX.Element {
  const t = useT()
  const toast = useUIStore((s) => s.toast)
  const pickProfileImage = useProfileAvatarsStore((s) => s.pickProfileImage)
  const image = useProfileAvatarsStore((s) => s.images[profile.id])
  const ensureProfileImage = useProfileAvatarsStore((s) => s.ensureProfileImage)
  const [picking, setPicking] = useState(false)
  const current = validProfileAvatar(profile.avatar) ?? { source: 'auto' as const }
  const withPicture = HOSTS.filter((h) => accounts[h.id]?.avatarUrl)

  useEffect(() => ensureProfileImage(profile.id), [profile.id, ensureProfileImage])

  const setAvatar = (avatar: ProfileAvatarSetting): void => edit({ avatar })

  const chooseImage = async (): Promise<void> => {
    setPicking(true)
    try {
      const result = await pickProfileImage(profile.id)
      if (result === 'picked') setAvatar({ source: 'image' })
      else if (result === 'unreadable') toast('error', t('profileAvatar.imageFailed'))
    } finally {
      setPicking(false)
    }
  }

  const chooseSource = (source: ProfileAvatarSetting['source']): void => {
    if (source === 'auto') setAvatar({ source: 'auto' })
    else if (source === 'icon')
      setAvatar(current.source === 'icon' ? current : { source: 'icon', icon: 'user', color: PROFILE_AVATAR_COLORS[0] })
    else if (source === 'account') {
      const host = withPicture[0]
      if (host) setAvatar({ source: 'account', accountHost: host.id, accountUrl: accounts[host.id]!.avatarUrl! })
    } else if (image) setAvatar({ source: 'image' })
    // No stored picture yet: "Image" means "choose one".
    else void chooseImage()
  }

  return (
    <div className="profile-avatar-settings">
      <div className="profile-avatar-preview">
        <ProfileAvatar profile={profile} size={64} />
      </div>
      <div className="profile-avatar-body">
        <div className="profile-avatar-sources" role="radiogroup" aria-label={t('profileAvatar.title')}>
          {SOURCES.map((s) => {
            const disabled = s.id === 'account' && withPicture.length === 0
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={current.source === s.id}
                className={`btn ghost small profile-avatar-source${current.source === s.id ? ' selected' : ''}`}
                disabled={disabled}
                title={disabled ? t('profileAvatar.noAccount') : undefined}
                onClick={() => chooseSource(s.id)}
              >
                {t(s.key)}
              </button>
            )
          })}
        </div>

        {current.source === 'auto' && <span className="settings-hint">{t('profileAvatar.sourceAutoHint')}</span>}

        {current.source === 'account' && (
          <div className="profile-avatar-accounts">
            {withPicture.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`btn ghost small profile-avatar-account${current.accountHost === h.id ? ' selected' : ''}`}
                onClick={() => setAvatar({ source: 'account', accountHost: h.id, accountUrl: accounts[h.id]!.avatarUrl! })}
              >
                <img src={accounts[h.id]!.avatarUrl} alt="" />
                {/* i18n-ignore provider product name and account handle */}
                {`${h.label} · ${accounts[h.id]!.login}`}
              </button>
            ))}
          </div>
        )}

        {current.source === 'icon' && (
          <>
            <div className="profile-avatar-icons">
              {PROFILE_AVATAR_ICONS.map((id) => {
                const Glyph = PROFILE_AVATAR_GLYPHS[id]
                return (
                  <button
                    key={id}
                    type="button"
                    className={`profile-avatar-icon${current.icon === id ? ' selected' : ''}`}
                    aria-pressed={current.icon === id}
                    aria-label={t('profileAvatar.pickIcon')}
                    title={t('profileAvatar.pickIcon')}
                    onClick={() => setAvatar({ ...current, icon: id })}
                  >
                    <Glyph size={16} />
                  </button>
                )
              })}
            </div>
            <div className="profile-avatar-colors">
              {PROFILE_AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`profile-avatar-color${current.color === color ? ' selected' : ''}`}
                  style={{ background: color }}
                  aria-pressed={current.color === color}
                  aria-label={t('profileAvatar.pickColor')}
                  title={t('profileAvatar.pickColor')}
                  onClick={() => setAvatar({ ...current, color })}
                />
              ))}
            </div>
          </>
        )}

        {current.source === 'image' && (
          <div className="form-inline-actions">
            <button type="button" className="btn ghost small" disabled={picking} onClick={() => void chooseImage()}>
              {picking ? <Loader2 size={13} className="spin" /> : <ImageUp size={13} />}
              {t(image ? 'profileAvatar.replaceImage' : 'profileAvatar.chooseImage')}
            </button>
          </div>
        )}
        {current.source === 'image' && <span className="settings-hint">{t('profileAvatar.imageHint')}</span>}
        <span className="settings-hint">{t('profileAvatar.commitsHint')}</span>
      </div>
    </div>
  )
}

/**
 * "Use my GitHub noreply email": the one email setting that makes a host show
 * the account picture on commits, without publishing the real address. Shown
 * per connected host that has one, and hidden once the profile already uses it.
 */
export function NoreplyEmailButtons({
  profile,
  edit,
  accounts
}: {
  profile: Profile
  edit: (p: Partial<Profile>) => void
  accounts: ProfileAccounts
}): React.JSX.Element | null {
  const t = useT()
  const offers = HOSTS.flatMap((h) => {
    const email = accounts[h.id]?.noreplyEmail
    return email && email !== profile.gitEmail ? [{ ...h, email }] : []
  })
  if (offers.length === 0) return null
  return (
    <div className="noreply-email">
      {offers.map((o) => (
        <div key={o.id}>
          <button type="button" className="btn ghost small" onClick={() => edit({ gitEmail: o.email })}>
            {interp(t('settings.useNoreplyEmail'), { provider: o.label })}
          </button>
          <span className="settings-hint">
            {interp(t('settings.useNoreplyEmailHint'), { provider: o.label, email: o.email })}
          </span>
        </div>
      ))}
    </div>
  )
}
