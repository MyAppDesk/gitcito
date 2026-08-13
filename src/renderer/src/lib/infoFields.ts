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
import type { TranslationKey } from '../i18n'

export type FieldKind = 'text' | 'url' | 'email' | 'phone'

export interface FieldPreset {
  /** Stable key persisted on the entry (`InfoEntry.field`). */
  id: string
  /** Dictionary key for the default label; resolve with `t()` at render time. */
  labelKey: TranslationKey
  Icon: typeof Hash
  kind: FieldKind
  /** Prefix turned into a clickable link when the value is a bare handle/path. */
  hrefPrefix?: string
  placeholder?: string
}

/** Curated catalog of common, non-secret repo metadata fields. Order matters —
 *  it's the order shown in the picker. Add to the end so existing keys stay put. */
export const FIELD_PRESETS: FieldPreset[] = [
  { id: 'appId', labelKey: 'infoField.appId', Icon: Hash, kind: 'text', placeholder: '1234567890' },
  { id: 'bundleId', labelKey: 'infoField.bundleId', Icon: Package, kind: 'text', placeholder: 'com.acme.app' },
  { id: 'packageName', labelKey: 'infoField.packageName', Icon: Package, kind: 'text', placeholder: 'com.acme.app' },
  { id: 'website', labelKey: 'infoField.website', Icon: Globe, kind: 'url', placeholder: 'https://…' },
  { id: 'docs', labelKey: 'infoField.docs', Icon: BookOpen, kind: 'url', placeholder: 'https://…' },
  { id: 'repo', labelKey: 'infoField.repo', Icon: Github, kind: 'url', placeholder: 'https://github.com/…' },
  { id: 'appStore', labelKey: 'infoField.appStore', Icon: Apple, kind: 'url', placeholder: 'https://apps.apple.com/…' },
  { id: 'playStore', labelKey: 'infoField.playStore', Icon: Play, kind: 'url', placeholder: 'https://play.google.com/…' },
  { id: 'instagram', labelKey: 'infoField.instagram', Icon: Instagram, kind: 'url', hrefPrefix: 'https://instagram.com/', placeholder: '@handle' },
  { id: 'twitter', labelKey: 'infoField.twitter', Icon: Twitter, kind: 'url', hrefPrefix: 'https://x.com/', placeholder: '@handle' },
  { id: 'linkedin', labelKey: 'infoField.linkedin', Icon: Linkedin, kind: 'url', placeholder: 'https://linkedin.com/…' },
  { id: 'facebook', labelKey: 'infoField.facebook', Icon: Facebook, kind: 'url', placeholder: 'https://facebook.com/…' },
  { id: 'youtube', labelKey: 'infoField.youtube', Icon: Youtube, kind: 'url', placeholder: 'https://youtube.com/…' },
  { id: 'discord', labelKey: 'infoField.discord', Icon: MessageCircle, kind: 'url', placeholder: 'https://discord.gg/…' },
  { id: 'slack', labelKey: 'infoField.slack', Icon: Slack, kind: 'url', placeholder: 'https://…slack.com' },
  { id: 'figma', labelKey: 'infoField.figma', Icon: Figma, kind: 'url', placeholder: 'https://figma.com/…' },
  { id: 'notion', labelKey: 'infoField.notion', Icon: FileText, kind: 'url', placeholder: 'https://notion.so/…' },
  { id: 'email', labelKey: 'infoField.email', Icon: Mail, kind: 'email', placeholder: 'team@acme.com' },
  { id: 'phone', labelKey: 'infoField.phone', Icon: Phone, kind: 'phone', placeholder: '+1…' },
  { id: 'environment', labelKey: 'infoField.environment', Icon: Server, kind: 'text', placeholder: 'production' },
  { id: 'license', labelKey: 'infoField.license', Icon: Scale, kind: 'text', placeholder: 'MIT' },
  { id: 'billing', labelKey: 'infoField.billing', Icon: CreditCard, kind: 'text' },
  { id: 'marketing', labelKey: 'infoField.marketing', Icon: Megaphone, kind: 'url' },
  { id: 'link', labelKey: 'infoField.link', Icon: LinkIcon, kind: 'url', placeholder: 'https://…' },
  { id: 'custom', labelKey: 'infoField.custom', Icon: Tag, kind: 'text' }
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
