import type { Language } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'
import { en, type Dict, type TranslationKey } from './en'
import { ar } from './ar'
import { de } from './de'
import { es } from './es'
import { fr } from './fr'
import { he } from './he'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { nl } from './nl'
import { pl } from './pl'
import { ptBR } from './pt-BR'
import { ru } from './ru'
import { tr } from './tr'
import { uk } from './uk'
import { zhCN } from './zh-CN'

export type { TranslationKey }

/** One dictionary per supported language; `en` is the fallback. */
const dictionaries: Record<Language, Dict> = {
  en,
  es,
  de,
  fr,
  'pt-BR': ptBR,
  it,
  nl,
  pl,
  tr,
  ru,
  uk,
  'zh-CN': zhCN,
  ja,
  ko,
  ar,
  he
}

/**
 * Every language in its own name — someone hunting for Korean is scanning for
 * 한국어, not for the word "Korean" in a language they are trying to leave.
 * Ordered by endonym, which sorts each script into its own block.
 */
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'it', label: 'Italiano' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'pl', label: 'Polski' },
  { id: 'pt-BR', label: 'Português (Brasil)' },
  { id: 'tr', label: 'Türkçe' },
  { id: 'ru', label: 'Русский' },
  { id: 'uk', label: 'Українська' },
  { id: 'ar', label: 'العربية' },
  { id: 'he', label: 'עברית' },
  { id: 'ja', label: '日本語' },
  { id: 'zh-CN', label: '简体中文' },
  { id: 'ko', label: '한국어' }
]

export function translate(lang: Language, key: TranslationKey): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
}

/** Simple string interpolation — replaces {key} tokens with values. */
// Re-exported so the hundreds of `import { interp } from '../i18n'` keep working.
export { interp } from './interp'

export { isRtl } from './direction'

/** Non-reactive translator (for use outside React render). */
export function t(key: TranslationKey): string {
  const lang = useSettingsStore.getState().settings.language ?? 'en'
  return translate(lang, key)
}

/** Reactive hook: re-renders when the language setting changes. */
export function useT(): (key: TranslationKey) => string {
  const lang = useSettingsStore((s) => s.settings.language ?? 'en')
  return (key: TranslationKey) => translate(lang, key)
}
