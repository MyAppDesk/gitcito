#!/usr/bin/env bash
# Stop hook — the project's definition of "done".
#
# Runs the three fast, always-required checks (typecheck + i18n guard + docs
# guard) when the working tree has staged or unstaged source or docs changes. Exit 2 hands the failure
# back to the model rather than ending the turn on a broken tree.
#
# `stop_hook_active` guards against a loop: if the model already got this
# feedback once and stopped again, let it stop.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT" || exit 0

payload=$(cat)
if [ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  exit 0
fi

# Nothing touched under src/, test/ or docs/ → nothing to verify.
changed=$(git status --porcelain -- src test docs scripts 2>/dev/null)
[ -n "$changed" ] || exit 0

fail=""
if ! out=$(npm run --silent typecheck 2>&1); then
  fail="$fail
── typecheck ──
$out"
fi
if ! out=$(node scripts/check-i18n.mjs 2>&1); then
  fail="$fail
── i18n guard ──
$out"
fi
if ! out=$(node scripts/docs-check.mjs 2>&1); then
  fail="$fail
── docs guard ──
$out"
fi

if [ -n "$fail" ]; then
  printf 'The project gate is red. Fix these before finishing:%s\n' "$fail" >&2
  exit 2
fi
exit 0
