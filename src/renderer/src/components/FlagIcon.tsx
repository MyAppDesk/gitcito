import type { JSX } from 'react'
import type { Language } from '../../../shared/types'

/**
 * Flags for the language picker.
 *
 * A flag names a country and a locale names a language, and the two do not
 * line up — Arabic is spoken across two dozen states, English across more.
 * These follow the same convention every OS locale picker uses: the locale's
 * primary CLDR region. It is a recognisable icon, not a claim about who owns
 * a language, and the handbook says so.
 *
 * Drawn inline rather than as emoji because Windows ships no flag glyphs —
 * `🇩🇪` renders there as the letters "DE" in a box.
 */

// i18n-ignore SVG geometry, not user-facing copy
const FLAGS: Record<Language, JSX.Element> = {
  // United Kingdom — simplified Union Jack (diagonals without the pinwheel offset).
  en: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.8" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3.2" />
    </>
  ),
  es: (
    <>
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
    </>
  ),
  de: (
    <>
      <rect width="24" height="5.34" fill="#000" />
      <rect y="5.34" width="24" height="5.33" fill="#DD0000" />
      <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
    </>
  ),
  fr: (
    <>
      <rect width="8" height="16" fill="#002395" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ED2939" />
    </>
  ),
  'pt-BR': (
    <>
      <rect width="24" height="16" fill="#009B3A" />
      <path d="M12 2.2 21.6 8 12 13.8 2.4 8Z" fill="#FEDF00" />
      <circle cx="12" cy="8" r="3.1" fill="#002776" />
      <path d="M9.2 7.1a9 9 0 0 1 5.7 1.5" stroke="#fff" strokeWidth="0.9" fill="none" />
    </>
  ),
  it: (
    <>
      <rect width="8" height="16" fill="#008C45" />
      <rect x="8" width="8" height="16" fill="#F4F5F0" />
      <rect x="16" width="8" height="16" fill="#CD212A" />
    </>
  ),
  nl: (
    <>
      <rect width="24" height="5.34" fill="#AE1C28" />
      <rect y="5.34" width="24" height="5.33" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#21468B" />
    </>
  ),
  pl: (
    <>
      <rect width="24" height="8" fill="#fff" />
      <rect y="8" width="24" height="8" fill="#DC143C" />
    </>
  ),
  tr: (
    <>
      <rect width="24" height="16" fill="#E30A17" />
      <circle cx="9.4" cy="8" r="3.6" fill="#fff" />
      <circle cx="10.7" cy="8" r="2.9" fill="#E30A17" />
      <path d="m14.4 8 3.3-1.1-2 2.8V6.3l2 2.8Z" fill="#fff" />
    </>
  ),
  ru: (
    <>
      <rect width="24" height="5.34" fill="#fff" />
      <rect y="5.34" width="24" height="5.33" fill="#0039A6" />
      <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
    </>
  ),
  uk: (
    <>
      <rect width="24" height="8" fill="#0057B7" />
      <rect y="8" width="24" height="8" fill="#FFDD00" />
    </>
  ),
  'zh-CN': (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <path d="m5 2.2 1 3.1 -2.6-1.9h3.2L4 5.3Z" fill="#FFDE00" />
      <circle cx="9.4" cy="1.9" r="0.7" fill="#FFDE00" />
      <circle cx="11.2" cy="3.7" r="0.7" fill="#FFDE00" />
      <circle cx="11.2" cy="6.2" r="0.7" fill="#FFDE00" />
      <circle cx="9.4" cy="7.9" r="0.7" fill="#FFDE00" />
    </>
  ),
  ja: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.6" fill="#BC002D" />
    </>
  ),
  ko: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <path d="M12 3.6a4.4 4.4 0 0 1 0 8.8 2.2 2.2 0 0 0 0-4.4 2.2 2.2 0 0 1 0-4.4Z" fill="#CD2E3A" />
      <path d="M12 3.6a4.4 4.4 0 0 0 0 8.8 2.2 2.2 0 0 1 0-4.4 2.2 2.2 0 0 0 0-4.4Z" fill="#0047A0" />
      <g stroke="#000" strokeWidth="0.8">
        <path d="M3.4 4.1 5.6 2.3M3.4 5.6 5.6 3.8M18.4 12.2l2.2-1.8M18.4 13.7l2.2-1.8" />
      </g>
    </>
  ),
  // Saudi Arabia — the CLDR primary region for `ar`. The shahada is not drawn:
  // rendering scripture as decorative geometry at 16px is worse than omitting it.
  ar: (
    <>
      <rect width="24" height="16" fill="#006C35" />
      <rect x="4" y="10.6" width="16" height="1.1" rx="0.5" fill="#fff" />
      <path d="M5 9.6h1v-1h.8v1h1v-1h.8v1h1V8h.8v2.2H5Z" fill="#fff" />
    </>
  ),
  he: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect y="2" width="24" height="1.8" fill="#0038B8" />
      <rect y="12.2" width="24" height="1.8" fill="#0038B8" />
      <path
        d="M12 5.2 14.6 9.6H9.4ZM12 10.8 9.4 6.4h5.2Z"
        fill="none"
        stroke="#0038B8"
        strokeWidth="0.9"
      />
    </>
  )
}

export function FlagIcon({ lang, size = 16 }: { lang: Language; size?: number }): JSX.Element {
  return (
    <svg
      className="flag-icon"
      width={size * 1.5}
      height={size}
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
    >
      <clipPath id={`flag-clip-${lang}`}>
        <rect width="24" height="16" rx="2.5" />
      </clipPath>
      <g clipPath={`url(#flag-clip-${lang})`}>{FLAGS[lang]}</g>
      <rect
        width="24"
        height="16"
        rx="2.5"
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.8"
      />
    </svg>
  )
}
