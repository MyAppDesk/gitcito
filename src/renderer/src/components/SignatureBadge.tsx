import { ShieldCheck, ShieldQuestion, ShieldAlert, ShieldX } from 'lucide-react'
import type { CommitSignature } from '../../../shared/types'

const META: Record<
  Exclude<CommitSignature, 'none'>,
  { cls: string; label: string; Icon: typeof ShieldCheck }
> = {
  good: { cls: 'sig-good', label: 'Verified signature', Icon: ShieldCheck },
  unverified: { cls: 'sig-unverified', label: 'Signed — unverified', Icon: ShieldQuestion },
  expired: { cls: 'sig-expired', label: 'Signature expired', Icon: ShieldAlert },
  bad: { cls: 'sig-bad', label: 'Bad signature', Icon: ShieldX }
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
  if (!signature || signature === 'none') return null
  const m = META[signature]
  const Icon = m.Icon
  const title = signer ? `${m.label} — ${signer}` : m.label
  return (
    <span className={`sig-badge ${m.cls}`} title={title}>
      <Icon size={size} />
      {withText && <span>{signer ? `${m.label} · ${signer}` : m.label}</span>}
    </span>
  )
}
