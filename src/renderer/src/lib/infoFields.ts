import {
  Hash,
  Package,
  Globe,
  BookOpen,
  Github,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  MessageCircle,
  Slack,
  Mail,
  Phone,
  Apple,
  Play,
  Figma,
  FileText,
  Server,
  Scale,
  CreditCard,
  Megaphone,
  Tag,
  Link as LinkIcon
} from 'lucide-react'

export type FieldKind = 'text' | 'url' | 'email' | 'phone'

export interface FieldPreset {
  /** Stable key persisted on the entry (`InfoEntry.field`). */
  id: string
  /** Default label shown when the user picks this preset. */
  label: string
  Icon: typeof Hash
  kind: FieldKind
  /** Prefix turned into a clickable link when the value is a bare handle/path. */
  hrefPrefix?: string
  placeholder?: string
}

/** Curated catalog of common, non-secret repo metadata fields. Order matters —
 *  it's the order shown in the picker. Add to the end so existing keys stay put. */
export const FIELD_PRESETS: FieldPreset[] = [
  { id: 'appId', label: 'App ID', Icon: Hash, kind: 'text', placeholder: '1234567890' },
  { id: 'bundleId', label: 'Bundle ID', Icon: Package, kind: 'text', placeholder: 'com.acme.app' },
  { id: 'packageName', label: 'Package name', Icon: Package, kind: 'text', placeholder: 'com.acme.app' },
  { id: 'website', label: 'Website', Icon: Globe, kind: 'url', placeholder: 'https://…' },
  { id: 'docs', label: 'Documentation', Icon: BookOpen, kind: 'url', placeholder: 'https://…' },
  { id: 'repo', label: 'Repository', Icon: Github, kind: 'url', placeholder: 'https://github.com/…' },
  { id: 'appStore', label: 'App Store', Icon: Apple, kind: 'url', placeholder: 'https://apps.apple.com/…' },
  { id: 'playStore', label: 'Play Store', Icon: Play, kind: 'url', placeholder: 'https://play.google.com/…' },
  { id: 'instagram', label: 'Instagram', Icon: Instagram, kind: 'url', hrefPrefix: 'https://instagram.com/', placeholder: '@handle' },
  { id: 'twitter', label: 'X / Twitter', Icon: Twitter, kind: 'url', hrefPrefix: 'https://x.com/', placeholder: '@handle' },
  { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin, kind: 'url', placeholder: 'https://linkedin.com/…' },
  { id: 'facebook', label: 'Facebook', Icon: Facebook, kind: 'url', placeholder: 'https://facebook.com/…' },
  { id: 'youtube', label: 'YouTube', Icon: Youtube, kind: 'url', placeholder: 'https://youtube.com/…' },
  { id: 'discord', label: 'Discord', Icon: MessageCircle, kind: 'url', placeholder: 'https://discord.gg/…' },
  { id: 'slack', label: 'Slack', Icon: Slack, kind: 'url', placeholder: 'https://…slack.com' },
  { id: 'figma', label: 'Figma', Icon: Figma, kind: 'url', placeholder: 'https://figma.com/…' },
  { id: 'notion', label: 'Notion', Icon: FileText, kind: 'url', placeholder: 'https://notion.so/…' },
  { id: 'email', label: 'Email', Icon: Mail, kind: 'email', placeholder: 'team@acme.com' },
  { id: 'phone', label: 'Phone', Icon: Phone, kind: 'phone', placeholder: '+1…' },
  { id: 'environment', label: 'Environment', Icon: Server, kind: 'text', placeholder: 'production' },
  { id: 'license', label: 'License', Icon: Scale, kind: 'text', placeholder: 'MIT' },
  { id: 'billing', label: 'Billing / Plan', Icon: CreditCard, kind: 'text' },
  { id: 'marketing', label: 'Marketing', Icon: Megaphone, kind: 'url' },
  { id: 'link', label: 'Link', Icon: LinkIcon, kind: 'url', placeholder: 'https://…' },
  { id: 'custom', label: 'Custom', Icon: Tag, kind: 'text' }
]

const BY_ID = new Map(FIELD_PRESETS.map((p) => [p.id, p]))
const FALLBACK: FieldPreset = FIELD_PRESETS[FIELD_PRESETS.length - 1] // 'custom'

export function fieldPreset(id: string): FieldPreset {
  return BY_ID.get(id) ?? FALLBACK
}

/** Resolve a clickable URL for a field value, or null if it isn't linkable. */
export function fieldHref(field: string, value: string): string | null {
  const preset = fieldPreset(field)
  const v = value.trim()
  if (!v) return null
  if (preset.kind === 'email') return `mailto:${v}`
  if (preset.kind === 'phone') return `tel:${v.replace(/\s+/g, '')}`
  if (preset.kind === 'url') {
    if (/^https?:\/\//i.test(v)) return v
    if (preset.hrefPrefix) return preset.hrefPrefix + v.replace(/^@/, '')
    if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`
  }
  return null
}
