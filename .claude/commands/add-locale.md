---
description: Add a new UI locale to Gitcito — scaffold its dictionary from the English reference, wire it up, and verify parity.
argument-hint: <locale-code> [language endonym]
---

Add the locale `$1` to Gitcito. If `$2` is given, use it as the language's
display name; otherwise use the language's own endonym (its name in that
language — "Français", not "French").

Load the `translations` skill first, then:

1. Read `src/renderer/src/i18n/en.ts` — it is the reference locale and the
   source of `Dict`.
2. Create `src/renderer/src/i18n/$1.ts` exporting `export const $1: Dict = { … }`
   with `import type { Dict } from './en'`, covering **every** English key.
   Translate the values properly — keep every `{placeholder}` token exactly as
   the English string uses it, and preserve product names, filenames, and git
   terms untranslated where that is what a speaker of the language would
   expect.
3. Wire it in `src/renderer/src/i18n/index.ts`: import it, add it to
   `dictionaries`, add `{ id: '$1', label: '<endonym>' }` to `LANGUAGES`.
4. Add `'$1'` to the `Language` union in `src/shared/types.ts`.
5. Verify: `npm run typecheck && npm test`. The i18n tests discover the new file
   automatically and check key parity, duplicate keys, and placeholder
   consistency.

The dictionary is large. Work through it in order rather than sampling, and do
not leave any value as untranslated English — a missing translation is the bug
this whole system exists to prevent. If a term genuinely has no translation
(a product name, a git command), leave it as-is deliberately and say so in your
summary.
