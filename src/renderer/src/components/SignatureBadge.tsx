import { ShieldCheck, ShieldQuestion, ShieldAlert, ShieldX } from 'lucide-react'
import { useT, type TranslationKey } from '../i18n'
import type { CommitSignature } from '../../../shared/types'

const META: Record<
  Exclude<CommitSignature, 'none'>,
  { cls: string; labelKey: TranslationKey; Icon: typeof ShieldCheck }
> = {
  good: { cls: 'sig-good', labelKey: 'sig.good', Icon: ShieldCheck },
  unverified: { cls: 'sig-unverified', labelKey: 'sig.unverified', Icon: ShieldQuestion },
  expired: { cls: 'sig-expired', labelKey: 'sig.expired', Icon: ShieldAlert },
  bad: { cls: 'sig-bad', labelKey: 'sig.bad', Icon: ShieldX }
}

export function SignatureBadge({
  signature,
  signer,
  size = 12,
  withText = false
}: {
  signature?: CommitSignature
  signer?: string
  size?: number
  withText?: boolean
}): React.JSX.Element | null {
  const t = useT()
  if (!signature || signature === 'none') return null
  const m = META[signature]
  const Icon = m.Icon
  const label = t(m.labelKey)
  const title = signer ? `${label} — ${signer}` : label
  return (
    <span className={`sig-badge ${m.cls}`} title={title}>
      <Icon size={size} />
      {withText && <span>{signer ? `${label} · ${signer}` : label}</span>}
    </span>
  )
}
