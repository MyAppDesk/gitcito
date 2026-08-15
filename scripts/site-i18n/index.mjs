/**
 * The website's own copy, one file per locale.
 *
 * `en` is the reference: `strings(locale)` falls back to it key by key, so a
 * half-translated locale renders the rest in English instead of printing raw
 * keys at a reader. Adding a language is a new file plus a line here.
 */
import { en } from './en.mjs'
import { ar } from './ar.mjs'
import { de } from './de.mjs'
import { es } from './es.mjs'
import { fr } from './fr.mjs'
import { he } from './he.mjs'
import { it } from './it.mjs'
import { ja } from './ja.mjs'
import { ko } from './ko.mjs'
import { nl } from './nl.mjs'
import { pl } from './pl.mjs'
import { ptBR } from './pt-BR.mjs'
import { ru } from './ru.mjs'
import { tr } from './tr.mjs'
import { uk } from './uk.mjs'
import { zhCN } from './zh-CN.mjs'

export const SITE = {
  en,
  ar,
  de,
  es,
  fr,
  he,
  it,
  ja,
  ko,
  nl,
  pl,
  'pt-BR': ptBR,
  ru,
  tr,
  uk,
  'zh-CN': zhCN
}

/** Endonyms, so the switcher shows each language in its own name. */
export const LOCALE_NAMES = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  'pt-BR': 'Português (Brasil)',
  tr: 'Türkçe',
  ru: 'Русский',
  uk: 'Українська',
  ar: 'العربية',
  he: 'עברית',
  ja: '日本語',
  'zh-CN': '简体中文',
  ko: '한국어'
}

export const RTL_LOCALES = new Set(['ar', 'he'])

/**
 * A translator bound to one locale: `t('nav.handbook')`, with `{token}`
 * substitution for the handful of strings that carry one.
 */
export function strings(locale) {
  const dict = SITE[locale] ?? en
  return (key, vars) => {
    let out = dict[key] ?? en[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v)
    return out
  }
}

/** How many of English's keys a locale actually carries — reported by the build. */
export function coverage(locale) {
  const dict = SITE[locale] ?? {}
  const keys = Object.keys(en)
  return { done: keys.filter((k) => dict[k] !== undefined).length, total: keys.length }
}
