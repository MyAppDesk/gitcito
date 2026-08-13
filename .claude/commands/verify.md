---
description: Run Gitcito's full gate — typecheck, i18n guard, tests, build — and report what failed.
allowed-tools: Bash(npm run *), Bash(node scripts/*), Bash(npx vitest *)
---

Run the project gate, in this order, and stop at the first failure that makes
the later steps meaningless:

1. `npm run typecheck`
2. `npm run lint:i18n`
3. `npm test`
4. `npm run build`

Report the result as a short list — one line per step, pass or fail. For any
failure, quote the actual error output and fix it; do not summarize a failure
as "some tests failed". If everything passes, say so plainly in one line.

Never launch the app to verify. Building and testing is the verification.
