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
- `npm run typecheck`, `npm run lint:i18n` and `npm test` must pass

## Releasing

Maintainers only. Requires a clean working tree.

```bash
npm run release:patch   # 0.9.0 → 0.9.1
npm run release:minor   # 0.9.0 → 0.10.0
npm run release:major   # 0.9.0 → 1.0.0
```

This bumps the version, updates `CHANGELOG.md`, commits, tags, and pushes. The GitHub Actions workflow then builds and publishes the release automatically.
