#!/usr/bin/env bash
# Creates throwaway git repos under examples/playground/ to test Gitcito features.
#
# This is the orchestrator: it wipes playground/, sources the shared helpers in
# lib/playground-lib.sh, then runs every scenario in scenarios/*.sh (sorted).
# Each scenario builds one repo and registers a summary line via `summary`.
#
# Add a new example by dropping a NN-name.sh file into scenarios/ — no edits here.
#
# Usage:  bash examples/setup-playground.sh
#         bash examples/setup-playground.sh 14              # only scenarios matching "14"
#         bash examples/setup-playground.sh binary unicode  # filter by substring(s)
# Re-running wipes and recreates the playground.

set -euo pipefail
cd "$(dirname "$0")"
HERE="$PWD"
ROOT="$PWD/playground"
MANIFEST="$ROOT/MANIFEST.tsv"
export ROOT MANIFEST

rm -rf "$ROOT"
mkdir -p "$ROOT"
: > "$MANIFEST"

# shellcheck source=lib/playground-lib.sh
. "$HERE/lib/playground-lib.sh"

# Optional CLI filters: only run scenarios whose filename matches any given arg.
matches_filter() {
  local file="$1"; shift
  [ "$#" -eq 0 ] && return 0
  local pat
  for pat in "$@"; do
    case "$file" in *"$pat"*) return 0;; esac
  done
  return 1
}

shopt -s nullglob
ran=0
for scenario in "$HERE"/scenarios/*.sh; do
  base="$(basename "$scenario")"
  if matches_filter "$base" "$@"; then
    echo "▶ $base"
    # shellcheck source=/dev/null
    . "$scenario"
    ran=$((ran + 1))
  fi
done

if [ "$ran" -eq 0 ]; then
  echo "No scenarios matched: $*" >&2
  exit 1
fi

print_summary
