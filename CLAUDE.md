# Gitcito — working agreement

A Git client built with Electron, React and TypeScript. Three processes, one
shared type module, and a hard rule about translations.

This file is the contract for anyone — human or agent — changing this codebase.
Read the section that matches what you are about to do; the checklist at the
bottom applies to everything.

---

## 1. The non-negotiables

**Every string a user can read is translated.** Not "most". See §3.

**Git runs in the main process only.** The renderer never spawns a process,
never touches the filesystem directly, never imports from `src/main`.

**The gate is green before you call something done:**

```bash
npm run typecheck     # both tsconfigs — node (main/preload) and web (renderer)
npm run lint:i18n     # no hardcoded user-facing strings
npm test              # 500+ tests, real git against real fixture repos
npm run build         # electron-vite build
```

`/verify` runs all four and reports what failed.

**Do not launch the app.** No `npm run dev`, no simulator, no "let me open it
to check". The user runs the app. Compile-only checks — build, typecheck,
tests — are yours.

**Report honestly.** If tests fail, say so and quote the output. If you skipped
part of the scope, say which part and why. A green summary over a red tree is
the one unrecoverable mistake.

---

## 2. Architecture

```
src/
├── main/        Node. Owns git, the filesystem, the OS keychain, hosting APIs,
│                terminals, the updater. One IPC handler module per domain.
├── preload/     The contextBridge. The only place `ipcRenderer` appears.
├── renderer/    React. No Node APIs. Talks to main exclusively through
│   └── src/     `infrastructure/api.ts`.
└── shared/      Types crossing the boundary. Imported by both sides.
```

### Renderer layout

| Directory | Holds |
|-----------|-------|
| `components/` | React components. One feature per file. |
| `stores/` | Zustand stores — `repo`, `settings`, `ui`, `terminals`, `launch`. |
| `lib/` | Pure logic, no React, no IPC. The cheapest thing to test — push logic here. |
| `infrastructure/api.ts` | The **only** file that touches `window.api`. |
| `i18n/` | One dictionary file per locale (§3). |
| `graph/`, `theme/`, `preview/` | Commit-graph layout, theming, file previews. |

### The IPC contract

Git calls ride a single channel: `window.api.git(method, ...args)` dispatches to
`gitService[method]` in `src/main/git.ts`. That dispatcher also serializes calls
per repository under a read/write lock, records the operation log, and streams
clone progress. Two consequences you must respect:

- The **first argument is the repo path** for every repo-scoped method — that
  is the lock key.
- A method absent from `READ_METHODS` is treated as a **write** and takes the
  exclusive lock. Labeling a write as a read corrupts state under concurrency.

For the full end-to-end recipe — main service → `READ_METHODS` → shared type →
`api.ts` adapter → store action → component — load the **`git-operation`**
skill.

### State and the `run()` contract

Mutations go through `useRepoStore.getState().run(path, label, fn, undo?, op?,
onError?, refetch?)`. It queues the call per repo, shows a busy label, toasts
the result, records an undo entry, and refreshes. Never call `gitApi` for a
mutation straight from a component.

Two details carry real weight:

- `label` is user-facing → it comes from the dictionary, never a raw string.
- `refetch` is a performance contract: omitting a slice preserves its array
  *identity*, so the graph memo does not invalidate. Pass the narrowest set
  that reflects your change.

Add an undo entry whenever the operation is reversible with a git command. Undo
is what makes this app safe to explore, and it is expected, not optional.

---

## 3. Translations — the rule that has teeth

Gitcito's UI copy lives in **one dictionary file per locale** under
`src/renderer/src/i18n/`:

| File | Role |
|------|------|
| `en.ts` | The reference locale. Exports `en`, derives `Dict = typeof en` and `TranslationKey`. |
| `<code>.ts` | One per additional locale. Typed `Dict`, so it must cover exactly the reference keys. |
| `index.ts` | The public API: `t`, `useT`, `translate`, `interp`, `LANGUAGES`, `TranslationKey`. |

A hardcoded string in the renderer is a bug, not a shortcut: a user on any
non-reference locale gets raw English in the middle of a translated UI.

### The four rules

**1. Add the key to every locale file.** `Dict` is derived from the reference
locale, so a missing entry is a compile error. Never clear that error by
copying the English text across — translate it.

**2. Render through the hook.** `useT()` re-renders on a language switch. Call
it at the top of the component, above any early return.

```tsx
import { useT } from '../i18n'
const t = useT()
<button title={t('panel.refreshTitle')}>{t('panel.refresh')}</button>
```

Outside React — stores, `lib/`, event handlers — use the non-reactive `t()`,
which reads the current language at call time. Correct for transient copy:
toasts, confirm dialogs, busy labels.

**3. Interpolate, never concatenate.** Word order differs between languages, so
a sentence is one key with `{placeholder}` tokens:

```ts
interp(t('act.checkedOut'), { ref })     // 'Checked out {ref}'
```

Every locale must use the same placeholder names — the test suite enforces it.

**4. Module-level constants store the key, not the string.** A translated
string in a module-level array is frozen at the language active on first
import and never updates:

```ts
const MODES: { id: Mode; labelKey: TranslationKey }[] = [
  { id: 'galaxy', labelKey: 'cosmos.modeGalaxy' }
]
// in the component: {t(m.labelKey)}
```

The same shape applies to pure logic that produces messages: return
`{ key, vars }` and let the caller render it — that keeps the logic testable
against stable keys. See `LintHint` in `lib/commitLint.ts`.

### Copy that is also model input

Some strings are both shown to the user and sent to a model. Show the
translation, send the reference locale: `translate('en', key)`.

### The narrow exceptions

Product names, filenames, git/CLI tokens, code samples. Two escape hatches:

- `scripts/i18n-allowlist.json` for a recurring value.
- `// i18n-ignore <reason>` on the line, or `{/* i18n-ignore <reason> */}`
  directly above it in JSX.

Never use these to silence a string a user actually reads.

### Enforcement

`scripts/check-i18n.mjs` scans the renderer for JSX text, UI props, inline
ternaries, and toast calls holding literal copy. It runs:

- after every renderer edit (`.claude/hooks/i18n-guard.sh`),
- when a turn ends with source changes (`.claude/hooks/verify-gate.sh`),
- on pre-commit (`.husky/pre-commit`),
- in the suite (`test/i18n.test.ts`, which also checks key parity, duplicate
  keys, and placeholder consistency across **all** locale files it finds).

Adding a locale is four steps — new `<code>.ts`, wire into `dictionaries` and
`LANGUAGES`, extend `Language` in `src/shared/types.ts`, verify. `/add-locale`
does it; the **`translations`** skill has the detail.

---

## 4. Testing

Real git, real repositories, no mocks. `examples/setup-playground.sh` generates
fixture repos (merge conflicts, submodules, LFS, signed commits, deep history,
…) from `examples/scenarios/*.sh`; the suite generates them on first run.

**A test that mutates a shared playground repo corrupts every later test.** Use
`cloneFixture(name)` from `test/fixtures.ts` and `cleanupFixtures()` in
`afterAll`.

Push logic into `renderer/src/lib` and test it in `pureLogic.test.ts` — that is
the cheapest coverage in the repo. Load the **`playground-fixture`** skill
before adding a scenario or a git-backed test.

---

## 5. Security

This app handles credentials. Treat these as invariants:

- **Tokens and vault secrets** live in the OS keychain via `safeStorage`, with
  explicit user consent (`main/keychain.ts`). Never write them to plain
  settings, never log them, never include them in an export unless the user
  ticked the opt-in.
- **Secret-looking files** are masked in previews and warned about before
  commit/push (`lib/secrets.ts`, the push guard in `stores/repo.ts`). Do not
  weaken those paths for convenience.
- **Repo paths from a model or CLI** go through `isSafeRepoPath`
  (`main/aiSchemas.ts`) before they reach the filesystem.
- **Destructive git operations** (force push, discard, hard reset, deleting a
  protected branch) always confirm first, and the confirm text says what is
  lost. Adding a new destructive action without a confirm is a defect.
- Never add a command that exfiltrates repository contents to a third party
  without the user explicitly asking for that integration.

---

## 6. Style

Match the file you are editing. The house style, briefly:

- No semicolons, single quotes, 2-space indent, ~110 columns.
- Explicit return types on exported functions.
- Comments explain **why**, not what — the codebase leans on short comments
  above non-obvious decisions. Keep that density; do not narrate obvious code.
- `type` over `interface` for unions; `interface` for object shapes that get
  extended.
- No `any`. If a boundary is genuinely untyped, `unknown` plus a narrowing
  check.
- One feature per file; extract a helper into `lib/` rather than growing a
  component past readability.

## 7. Commits and PRs

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on commit and by CI on the PR title:

```
feat: Add range-diff comparison
fix: Resolve crash on empty repo
docs: Update README with mission control
```

One concern per PR. Commit only when asked; if you are on `main`, branch first.

---

## 8. Documentation — the second rule that has teeth

Gitcito ships its own handbook: **`docs/help/*.md`**, rendered inside the app
(Help, in the status bar) and readable straight from the repository on GitHub.
One source, two readers.

**A user-facing change is not finished until the handbook says so.** Docs rot
because nothing breaks when they lag; here something does — `npm run lint:docs`
fails when a modal, page tab or command-palette entry has no page behind it.

### When you add or change a feature

1. **Write or update the page** in `docs/help/`. Front matter is required:

   ```md
   ---
   title: Conflict radar
   category: Branching & surgery
   order: 44
   summary: One line — shown under the title and in search results.
   keywords: extra words search should match, including old names
   ---
   ```

2. **Map the surface** in `scripts/docs-map.json`: point the modal kind, page
   type or command id at a page id — or add it to `exempt` **with a reason**.
   "It is obvious" is not a reason; "generic confirmation dialog" is.

3. **Add a line to `README.md`** if the feature is worth mentioning at all, and
   link it to its page. The README is a tour, not a manual: one line per
   feature, the depth lives in the handbook.

### How to write a page

- Say **what problem it solves** before saying which buttons to press. A page
  that opens with "click the gear" teaches nothing.
- **State the limits.** What it refuses to do, what it cannot detect, what it
  costs. A doc that only lists strengths is marketing, and readers can tell.
- Links between pages are plain relative Markdown — `[absorb](absorb.md)` — so
  they work on GitHub and in the app alike.
- Images live in `docs/screenshots/` and are referenced as
  `![alt](../screenshots/name.png)`. Every screenshot must be used by some page;
  an orphan is either a missing page or dead weight.
- Tables for "what each option does". Prose for why you would want it.

---

## 9. Before you say you are done

- [ ] `npm run typecheck` passes
- [ ] `npm run lint:i18n` passes — every new string is in **every** locale file
- [ ] `npm run lint:docs` passes — every new surface has a handbook page
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] New user-facing actions have a confirm if destructive, and an undo entry
      if reversible
- [ ] `docs/help/` updated, and `scripts/docs-map.json` maps the new surface
- [ ] `README.md` updated (one line, linked to the page) if the change adds or
      alters a user-visible feature
- [ ] You did not launch the app

## Project tooling

| Path | What it is |
|------|-----------|
| `.claude/skills/translations/` | Locale workflow — adding strings, adding a locale, clearing guard failures |
| `.claude/skills/git-operation/` | Wiring a git operation across all four layers |
| `.claude/skills/playground-fixture/` | Test strategy and fixture repos |
| `.claude/commands/verify.md` | `/verify` — the full gate |
| `.claude/commands/add-locale.md` | `/add-locale <code>` — scaffold a new locale |
| `.claude/hooks/` | The i18n guard (per edit) and the verify gate (per turn) |
| `docs/help/` | The in-app handbook — one Markdown file per page |
| `scripts/docs-check.mjs` | The docs guard (`npm run lint:docs`) |
| `scripts/docs-map.json` | Which page documents which modal / page tab / command |
