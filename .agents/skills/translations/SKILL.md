---
name: translations
description: Working with Gitcito's locale dictionaries — adding a user-facing string, adding a whole new locale, or clearing a `npm run lint:i18n` failure. Use whenever renderer copy is added or changed, when the i18n guard reports a hardcoded string, or when someone asks to translate the app / support another language.
---

# Translations

Gitcito's UI copy lives in one dictionary file per locale under
`src/renderer/src/i18n/`. Nothing a user can read may be hardcoded in a
component.

## Layout

| File | Role |
|------|------|
| `en.ts` | The reference locale. Exports `en`, and derives `Dict = typeof en` and `TranslationKey`. |
| `<code>.ts` | One per additional locale (`es.ts`, …). Typed `Dict`, so it must cover exactly the reference keys. |
| `index.ts` | The public API only: `t`, `useT`, `translate`, `interp`, `LANGUAGES`, `TranslationKey`. |

Import from `'../i18n'`. The locale files are data; `index.ts` is the interface.

## Adding a string

1. Add the key to `en.ts`, then the same key to **every** other locale file.
   `Dict` makes a missing entry a compile error — never paper over it by
   copying the English text into another locale. Translate it.
2. Key naming: `feature.thing` in lowerCamel (`titlebar.closeTab`,
   `act.checkedOut`). Group by feature; put a shared word under `common.`.
3. Render it:

```tsx
import { useT } from '../i18n'

function Panel(): React.JSX.Element {
  const t = useT()
  return <button title={t('panel.refreshTitle')}>{t('panel.refresh')}</button>
}
```

`useT()` is a hook — it re-renders on a language switch. Call it at the top of
the component, above any early `return`.

## Interpolation — never concatenate

Word order differs between languages, so a sentence must be one key with
`{placeholder}` tokens:

```tsx
import { useT, interp } from '../i18n'
interp(t('act.checkedOut'), { ref: 'main' })
```

```ts
// en.ts
'act.checkedOut': 'Checked out {ref}',
```

Every locale must use the same placeholder names — `test/i18n.test.ts` fails
otherwise. Pluralization is explicit: pass the noun as its own key
(`{n} {fileWord}` with `fileWord` resolved from a singular/plural key pair).

## Outside a React component

Stores, `lib/`, and event handlers use the non-reactive `t()`, which reads the
current language from the settings store at call time. Correct for transient
copy — toasts, confirm dialogs, busy labels:

```ts
import { t, interp } from '../i18n'
toast('success', interp(t('act.merged'), { ref }))
```

## Module-level constants: store the key, not the string

A translated string in a module-level array is frozen at the language active on
first import, so it never updates on a language switch. Store a
`TranslationKey` and resolve at render:

```ts
import type { TranslationKey } from '../i18n'

const MODES: { id: Mode; labelKey: TranslationKey }[] = [
  { id: 'galaxy', labelKey: 'cosmos.modeGalaxy' }
]
// in the component: {t(m.labelKey)}
```

The same shape works for pure logic that returns messages: return
`{ key, vars }` (see `LintHint` in `lib/commitLint.ts`) and let the caller
render it. That keeps the logic testable against stable keys.

## Strings that double as model input

Some copy is both shown to the user and sent to a model (e.g. the artifact
descriptions in `AIConfigWizard`). Show the translation, send English:

```ts
import { translate } from '../i18n'
translate('en', a.descriptionKey)   // stable prompt input
```

## Adding a locale

1. Copy `en.ts` to `<code>.ts`, change the export to
   `export const <code>: Dict = { … }`, import `Dict` from `./en`, translate
   every value.
2. In `index.ts`: import it, add it to `dictionaries`, add it to `LANGUAGES`
   with its endonym (the language's own name — "Español", not "Spanish").
3. Add the code to `Language` in `src/shared/types.ts`.
4. `npm run typecheck && npm test` — the i18n tests discover the new file
   automatically and check key parity, duplicates, and placeholders.

## When the guard fails

`npm run lint:i18n` prints every offending `file:line`. For each one, decide:

- **It is copy** → give it a key. This is the answer almost every time.
- **It must read identically in every language** (product name, filename,
  git/CLI token, code sample) → add the exact string to
  `scripts/i18n-allowlist.json`, or annotate the line with
  `// i18n-ignore <reason>` (in JSX, `{/* i18n-ignore <reason> */}` on the line
  directly above).

Do not silence a real string. If a user reads it, it gets translated.
