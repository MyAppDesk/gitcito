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

Gitcito ships in English and Spanish. Every string a user can read must come
from the dictionaries in `src/renderer/src/i18n/` — one file per locale
(`en.ts`, `es.ts`), with `index.ts` exposing the API. Add the key to every
locale file and render it with `t('your.key')` (see `CLAUDE.md` for the
patterns, including interpolation and module-level constants).

```bash
npm run lint:i18n   # fails on any hardcoded user-facing string
```

This runs on pre-commit and in the test suite. Strings that must not be
translated (product names, filenames, git tokens) belong in
`scripts/i18n-allowlist.json` or carry an inline `// i18n-ignore <reason>`.

## Pull requests

- PR title must follow the same `type: Subject` format (enforced by CI)
- One concern per PR
- `npm run typecheck` and `npm run lint:i18n` must pass

## Releasing

Maintainers only. Requires a clean working tree.

```bash
npm run release:patch   # 0.9.0 → 0.9.1
npm run release:minor   # 0.9.0 → 0.10.0
npm run release:major   # 0.9.0 → 1.0.0
```

This bumps the version, updates `CHANGELOG.md`, commits, tags, and pushes. The GitHub Actions workflow then builds and publishes the release automatically.
