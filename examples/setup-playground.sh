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

# In-place progress bar when attached to a terminal; plain per-scenario lines
# otherwise so CI logs stay greppable.
TTY=0
[ -t 1 ] && TTY=1

progress() {
  local cur="$1" total="$2" label="$3" width=28 filled bar='' i
  filled=$(( cur * width / total ))
  for ((i = 0; i < filled; i++)); do bar+='█'; done
  for ((i = filled; i < width; i++)); do bar+='░'; done
  printf '\r\033[K  %s %*d/%d  %s' "$bar" "${#total}" "$cur" "$total" "$label"
}

# Collect matches up front so the bar knows its denominator. Scenarios are
# sourced into this shell, so orchestrator state is PG_-prefixed to survive
# whatever variable names a scenario uses internally.
PG_SCENARIOS=()
for PG_FILE in "$HERE"/scenarios/*.sh; do
  matches_filter "$(basename "$PG_FILE")" "$@" && PG_SCENARIOS+=("$PG_FILE")
done

if [ "${#PG_SCENARIOS[@]}" -eq 0 ]; then
  echo "No scenarios matched: $*" >&2
  exit 1
fi

# If a scenario dies under set -e, break out of the bar line so the error
# lands on its own line instead of appending to it.
[ "$TTY" -eq 1 ] && trap 'printf "\n" >&2' ERR

PG_TOTAL=${#PG_SCENARIOS[@]}
PG_IDX=0
for PG_FILE in "${PG_SCENARIOS[@]}"; do
  PG_BASE="$(basename "$PG_FILE")"
  if [ "$TTY" -eq 1 ]; then
    progress "$PG_IDX" "$PG_TOTAL" "$PG_BASE"
  else
    echo "▶ $PG_BASE"
  fi
  # shellcheck source=/dev/null
  . "$PG_FILE"
  PG_IDX=$((PG_IDX + 1))
done

if [ "$TTY" -eq 1 ]; then
  progress "$PG_TOTAL" "$PG_TOTAL" "done"
  printf '\n'
fi

print_summary
