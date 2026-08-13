# Gitcito — agent instructions

## Every user-facing string must be translated. No exceptions.

Gitcito ships in **English (`en`) and Spanish (`es`)**. A hardcoded English
string in the renderer is a bug, not a shortcut — Spanish users see raw English
in the middle of a translated UI.

**Whenever you write or edit renderer code, before you consider the task done:**

```bash
npm run lint:i18n
```

It must print `✔ i18n: no hardcoded user-facing strings found.` The same check
runs in `test/i18n.test.ts` and on pre-commit, so skipping it only moves the
failure later.

### Where the dictionaries live

One file per locale in `src/renderer/src/i18n/`:

| File | Role |
|------|------|
| `en.ts` | English — the reference. Exports `en`, and derives `Dict = typeof en` + `TranslationKey`. |
| `es.ts` | Spanish. Typed `Dict`, so it must cover exactly the English keys. |
| `index.ts` | The API only: `t`, `useT`, `translate`, `interp`, `LANGUAGES`, `TranslationKey`. |

Always import from `'../i18n'` (the barrel), never from `'../i18n/en'` — the
locale files are data, `index.ts` is the interface.

**Adding a locale:** create `<code>.ts` exporting `export const <code>: Dict = {…}`,
add it to `dictionaries` and `LANGUAGES` in `index.ts`, and add the code to
`Language` in `src/shared/types`. The tests pick the new file up automatically.

### How to add a string

1. Add the key to **every** locale file — `en.ts` first, then the matching entry
   in `es.ts`. Because `es` is typed as `Dict`, a missing Spanish entry fails
   `npm run typecheck`.
2. Render it through the hook:

```tsx
import { useT } from '../i18n'

function MyPanel(): React.JSX.Element {
  const t = useT()
  return <button title={t('myPanel.refresh')}>{t('myPanel.refreshLabel')}</button>
}
```

3. Interpolate with `interp`, never with string concatenation — word order
   differs between languages:

```tsx
import { useT, interp } from '../i18n'
interp(t('act.checkedOut'), { ref: 'main' })   // 'Checked out main' / 'Cambiado a main'
```

### Outside a React component

Stores, `lib/`, and event handlers use the non-reactive `t()` (it reads the
current language from the settings store at call time). That is correct for
transient copy — toasts, confirm dialogs, busy labels:

```ts
import { t, interp } from '../i18n'
toast('success', interp(t('act.merged'), { ref }))
```

### Data tables and module-level constants

Never store a translated string in a module-level array — it would be frozen at
the language active on first import. Store the **key** and resolve at render:

```ts
import type { TranslationKey } from '../i18n'

const MODES: { id: Mode; labelKey: TranslationKey }[] = [
  { id: 'galaxy', labelKey: 'cosmos.modeGalaxy' }
]
// …then, in the component: {t(m.labelKey)}
```

The same applies to strings that double as model input: keep the UI copy
translated and send English to the model with `translate('en', key)`.

### The narrow set of strings that stay untranslated

Product names, filenames, git/CLI tokens, and code samples. Two escape hatches,
in order of preference:

- `scripts/i18n-allowlist.json` — for a value that recurs (e.g. `"GitHub"`).
- `// i18n-ignore <reason>` on the offending line, or a `{/* i18n-ignore … */}`
  comment on the line directly above it in JSX.

Do not reach for these to silence a string that a user actually reads. If it is
copy, translate it.

## Other project conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) —
  see `CONTRIBUTING.md`.
- `npm run typecheck` and `npm test` must pass before a change is done.
- Do not launch the app (`npm run dev`, simulators) to verify — the user runs it.
  Building, typechecking, and tests are fine.
