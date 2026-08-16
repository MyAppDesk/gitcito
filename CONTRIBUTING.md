# Contributing to Gitcito

## Development setup

```bash
npm install
npm run dev
```

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
type(scope): Subject

feat: Add dark mode support
fix: Resolve crash on empty repo
docs: Update README with new features
chore: Upgrade electron to v32
refactor: Extract auth logic into service
perf: Reduce re-renders in GraphView
test: Add unit tests for git service
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, deps, config |
| `refactor` | No feature, no bug fix |
| `perf` | Performance improvement |
| `test` | Tests only |
| `build` | Build system changes |
| `ci` | CI/CD changes |

Breaking changes: append `!` after the type — `feat!: Drop Node 18 support`

## Translations

**Every string a user can read must be translated.** UI copy lives in
`src/renderer/src/i18n/`, one dictionary file per locale:

| File | Role |
|------|------|
| `en.ts` | The reference locale. Exports `en`, and derives `Dict = typeof en`. |
| `<code>.ts` | One per additional locale, typed `Dict` — so it must cover exactly the reference keys. |
| `index.ts` | The API: `t`, `useT`, `translate`, `interp`, `LANGUAGES`. |

Add your key to **every** locale file and render it with `t('your.key')`
(`useT()` in components, `t()` elsewhere). Build sentences with
`interp(t(key), vars)` rather than string concatenation — word order differs
between languages. Store keys, not translated strings, in module-level
constants. `CLAUDE.md` has the full patterns.

```bash
npm run lint:i18n   # fails on any hardcoded user-facing string
```

This runs on pre-commit and in the test suite, which also checks key parity,
duplicates, and placeholder consistency across every locale file it finds.
Strings that must read identically in every language (product names, filenames,
git tokens) belong in `scripts/i18n-allowlist.json` or carry an inline
`// i18n-ignore <reason>`.

### Adding a locale

New translations are welcome. Copy `en.ts` to `<code>.ts`, export it as
`Dict`, translate every value, then wire it into `dictionaries` and `LANGUAGES`
in `index.ts` and add the code to `Language` in `src/shared/types.ts`. The
tests pick the new file up automatically — no test changes needed.

## Documentation

Gitcito carries its own handbook: **`docs/help/*.md`**. The app renders it
(the **Help** button in the status bar) and GitHub renders the same files —
one source, two readers, offline in both.

**A user-facing change is not done until the handbook covers it.** This is
enforced, not requested:

```bash
npm run lint:docs   # fails when a surface has no page behind it
```

The guard walks every modal kind, page-tab type and command-palette entry, and
asks where each one is explained. It also checks front matter, internal links
and image paths — so a deleted screenshot or a renamed page fails the build
instead of quietly producing a broken page.

### Adding a page

1. Create `docs/help/<id>.md` with front matter:

   ```md
   ---
   title: Conflict radar
   category: Branching & surgery
   order: 44
   summary: One line, shown under the title and in search results.
   keywords: words search should also match, including old names
   ---
   ```

   `category` groups it in the sidebar; `order` sorts it inside that group.

2. Point the new surface at it in `scripts/docs-map.json` — or, if it is not a
   feature of its own (a generic confirm dialog, say), add it to `exempt` with
   a reason in writing.

3. If it is worth a mention, add **one line** to `README.md` linking to the
   page. The README is a tour; depth belongs in the handbook.

### Writing well here

- Lead with the problem, not the button. "Which branch will conflict?" beats
  "Click Tools → Conflict radar".
- Say what it **refuses** to do and what it cannot detect. Docs that only list
  strengths read as marketing.
- Link pages with plain relative Markdown — `[absorb](absorb.md)` — so links
  work in the app and on GitHub.
- Images go in `docs/screenshots/` and are used as
  `![alt](../screenshots/name.webp)`. Regenerate them with
  `npm run screenshots` (add `:clips` for the animated ones), which drives the
  app against the playground repos — then `npm run playground:rebuild`, because
  capturing mutates them. Every screenshot must be used by some page.

### Screenshots

Each shot is declared in `examples/screenshots/shots.config.mjs`: which
playground repo to load, an optional `prepare` that puts the repo into the right
state on disk, and a `drive` that puts the running UI into the exact state to
capture. **Add a feature → add a shot there.**

Prefer a still when the value is the information on screen, and a motion clip
(the `clips` export) only when the value is the movement itself — a scrubber, an
animation, a scan landing verdict by verdict.

```bash
npm run screenshots                                    # every still (WebP)
node examples/screenshots/capture.mjs conflict-radar   # just one
npm run screenshots:clips                              # stills + motion clips
npm run playground:rebuild                             # capturing dirties the repos
```

### The website

`docs/help/` is also the source of <https://myappdesk.github.io/gitcito/>.
`scripts/build-site.mjs` renders the landing page and one HTML page per
handbook entry — no framework, no bundler, `marked` and nothing else.

```bash
npm run site         # → dist-site/
npm run site:serve   # …and serve it locally
```

CI redeploys it on every published release and on any push to `main` that
touches `docs/`, so a documentation fix is live without anyone remembering to
publish it. The deploy runs `docs-check` first: if the docs do not line up, the
site is not published.

**The one thing that does not update itself.** The handbook pages come from
Markdown, but the landing page's headline features are a hand-written
`FEATURES` array in `scripts/build-site.mjs`. It is the only place the site's
copy is not derived from `docs/`, and therefore the only place that can quietly
go stale. If a change deserves a spot on the front page, add it there too — and
point it at its handbook page, which the link test then verifies.

## Testing

Tests run real git against generated fixture repos
(`examples/setup-playground.sh`, invoked automatically on first run). Anything
that mutates a repo must work on a copy via `cloneFixture()` — mutating a shared
playground repo breaks every later test in the run.

```bash
npm test                          # full suite
npx vitest run test/gitOps.test.ts # one file
npm run playground:rebuild         # force-regenerate fixtures
```

## Pull requests

- PR title must follow the same `type: Subject` format (enforced by CI)
- One concern per PR
- `npm run typecheck`, `npm run lint:i18n`, `npm run lint:docs` and `npm test`
  must pass

### Show the thing

Reviewers read diffs; they rarely build the branch. So a PR that changes what a
user sees has to show it:

| Your PR adds | Put in the description |
|---|---|
| A panel, a modal, a settings section, a new badge or banner | A **screenshot** |
| A drag, a drop target, an animation, a keyboard flow | A **short screen recording** — a still cannot show a gesture |
| Nothing visible | Say so: `n/a` |

This is a review aid, not a substitute for the generated shots: the handbook's
images still come from `npm run screenshots`, and a new surface still needs its
entry in `examples/screenshots/shots.config.mjs`. Paste the quick capture in the
PR, add the reproducible one to the manifest.

The docs guard also asks where each **right panel tab** is documented, alongside
modals, page tabs and palette commands — a tab in the right column is as
findable as a modal, and just as easy to ship undocumented.

## Releasing

Maintainers only. Requires a clean working tree.

```bash
npm run release:patch   # 0.9.0 → 0.9.1
npm run release:minor   # 0.9.0 → 0.10.0
npm run release:major   # 0.9.0 → 1.0.0
```

This bumps the version, updates `CHANGELOG.md`, commits, tags, and pushes. The GitHub Actions workflow then builds and publishes the release automatically.
