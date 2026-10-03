#!/usr/bin/env bash
# PostToolUse hook — blocks a renderer edit that hardcodes user-facing copy.
#
# Reads the hook payload on stdin, and only pays the cost of the scan when the
# edited file lives in the renderer. Exit 2 feeds the guard's output back to the
# model so it fixes the string immediately instead of at commit time.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
GUARD="$ROOT/scripts/check-i18n.mjs"
[ -f "$GUARD" ] || exit 0

payload=$(cat)
file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$file" ] || exit 0

case "$file" in
  */src/renderer/src/*.ts|*/src/renderer/src/*.tsx) ;;
  *) exit 0 ;;
esac

if ! out=$(node "$GUARD" 2>&1); then
  printf '%s\n' "$out" >&2
  exit 2
fi
exit 0
