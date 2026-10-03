---
name: playground-fixture
description: Gitcito's test strategy — the generated playground repos under examples/, writing tests that run real git against them, and adding a new scenario. Use when adding or fixing a test, when a test needs a repo in a particular git state, or when a test mutates a repository.
---

# Tests and the playground

Gitcito's tests run **real git** against **real repositories**. There are no git
mocks: a mock that agrees with a wrong assumption about git's output is worse
than no test.

## The playground

`examples/setup-playground.sh` builds a set of throwaway repos under
`examples/playground/`, one per scenario file in `examples/scenarios/*.sh`
(merge conflicts, submodules, LFS, signed commits, detached HEAD, deep history,
…). It writes `MANIFEST.tsv` listing what it produced.

`test/setup/global-setup.ts` generates the playground before the suite runs if
`MANIFEST.tsv` is missing, so a fresh checkout and CI just work.

```bash
npm run playground              # regenerate if missing
npm run playground:rebuild      # force a clean rebuild
bash examples/setup-playground.sh 29 stacked   # only matching scenarios
```

## Writing a test

```ts
import { repoPath } from './helpers'
import { cloneFixture, cleanupFixtures } from './fixtures'

// Read-only assertions may point straight at the shared repo:
const repo = repoPath('merge-conflict')

// Anything that MUTATES must work on a copy:
const tmp = cloneFixture('cherry-pick')
afterAll(cleanupFixtures)
```

**A test that mutates a shared playground repo corrupts every later test in the
run.** `cloneFixture()` copies the repo (including `.git`) to a temp dir; the
test mutates the copy and `cleanupFixtures()` removes it.

Exception: `submodules-worktrees` cannot be cloned — its linked worktrees and
submodule gitlinks hold absolute paths that do not survive a copy. Use it
read-only, or build a fresh repo in the test.

Because git output is timing- and version-sensitive, assert on structure
(counts, ordering, presence of a ref) rather than on exact prose.

## Adding a scenario

Drop `NN-name.sh` into `examples/scenarios/` — the orchestrator picks it up
sorted, no edits elsewhere. Source the shared helpers, build the repo, and
register one `summary` line. Keep it deterministic: fixed author identity,
fixed dates, no network.

Then reference it from a test with `repoPath('name')`.

## Layout of the suite

| File | Covers |
|------|--------|
| `pureLogic.test.ts` | Pure functions from `renderer/src/lib` — no git, no IO. The cheapest place to test logic, so push logic there. |
| `gitService.test.ts`, `gitOps.test.ts` | The main-process git service against fixtures. |
| `newFeatures.test.ts` | End-to-end behavior of recent features. |
| `i18n.test.ts` | The locale dictionaries and the hardcoded-string guard. |
| `playground.smoke.test.ts` | Every scenario in the manifest still builds and opens. |

Run one file while iterating:

```bash
npx vitest run test/gitOps.test.ts
```

`test/stubs/electron.ts` stands in for the `electron` module so main-process
code can be imported under Node (see the alias in `vitest.config.ts`).
