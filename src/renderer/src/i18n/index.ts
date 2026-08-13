import type { Language } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'
import { en, type Dict, type TranslationKey } from './en'
import { es } from './es'

export type { TranslationKey }

/** One dictionary per supported language; `en` is the fallback. */
const dictionaries: Record<Language, Dict> = { en, es }

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' }
]

export function translate(lang: Language, key: TranslationKey): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
}

/** Simple string interpolation — replaces {key} tokens with values. */
export function interp(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

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
