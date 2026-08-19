#!/usr/bin/env bash
# Creates throwaway git repos under examples/playground/ to test Gitcito features.
#
# This is the orchestrator: it wipes playground/, then runs every scenario in
# scenarios/*.sh. Scenarios are independent, so they run in parallel — each in
# its own bash process — and each registers a summary line via `summary`, which
# the orchestrator stitches into the manifest in scenario order afterwards.
#
# Add a new example by dropping a NN-name.sh file into scenarios/ — no edits
# here. Scenarios must stay self-contained (own repos under $ROOT, no state
# shared with other scenario files): that independence is what makes the
# parallel run safe.
#
# Usage:  bash examples/setup-playground.sh
#         bash examples/setup-playground.sh 14              # only scenarios matching "14"
#         bash examples/setup-playground.sh binary unicode  # filter by substring(s)
#         PLAYGROUND_JOBS=4 bash examples/setup-playground.sh   # cap parallelism
# Re-running wipes and recreates the playground.

set -euo pipefail
cd "$(dirname "$0")"
HERE="$PWD"
ROOT="$PWD/playground"
MANIFEST="$ROOT/MANIFEST.tsv"
export ROOT MANIFEST HERE

rm -rf "$ROOT"
mkdir -p "$ROOT"
: > "$MANIFEST"

# One throwaway global config for every git the scenarios spawn, for speed and
# isolation. fsync=none skips the per-object/per-ref fsyncs that dominate the
# cost of building many tiny commits on APFS — these repos are regenerated on
# demand, so crash-safety buys nothing. Pointing GLOBAL and SYSTEM away from
# the machine's config also extends new_repo's rerere protection to every git
# invocation a scenario makes.
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_CONFIG_GLOBAL="$ROOT/.gitconfig"
printf '[core]\n\tfsync = none\n\tfsyncMethod = writeout-only\n' > "$GIT_CONFIG_GLOBAL"

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

# Collect matches up front so the bar knows its denominator.
PG_SCENARIOS=()
for PG_FILE in "$HERE"/scenarios/*.sh; do
  matches_filter "$(basename "$PG_FILE")" "$@" && PG_SCENARIOS+=("$PG_FILE")
done

if [ "${#PG_SCENARIOS[@]}" -eq 0 ]; then
  echo "No scenarios matched: $*" >&2
  exit 1
fi

# Scratch area for per-scenario logs, manifest fragments and done markers.
# Cleaned up on success; left behind (with logs) when a scenario fails.
PG_WORK="$ROOT/.work"
mkdir -p "$PG_WORK"

# Default to one job per core. `nproc` covers Linux/CI, `sysctl` covers macOS.
PG_JOBS="${PLAYGROUND_JOBS:-$( { sysctl -n hw.ncpu || nproc || echo 4; } 2>/dev/null )}"

# Run one scenario in a fresh bash process. A separate process (not a subshell)
# so its `set -e` is honoured even though the caller guards the exit code —
# bash suppresses errexit inside `if (...)` conditions, but never across exec.
# MANIFEST points at a private fragment so parallel writers cannot interleave.
run_scenario() {
  local file="$1" base="$2"
  if MANIFEST="$PG_WORK/$base.tsv" bash -c 'set -euo pipefail; . "$HERE/lib/playground-lib.sh"; . "$1"' bash "$file" \
      > "$PG_WORK/$base.log" 2>&1; then
    : > "$PG_WORK/$base.ok"
  else
    : > "$PG_WORK/$base.fail"
  fi
}

count_done() {
  # shellcheck disable=SC2012
  ls "$PG_WORK" 2>/dev/null | grep -c -e '\.ok$' -e '\.fail$' || true
}

PG_TOTAL=${#PG_SCENARIOS[@]}
for PG_FILE in "${PG_SCENARIOS[@]}"; do
  PG_BASE="$(basename "$PG_FILE")"
  if [ "$TTY" -eq 1 ]; then
    progress "$(count_done)" "$PG_TOTAL" "$PG_BASE"
  else
    echo "▶ $PG_BASE"
  fi
  # Simple job pool, bash-3.2 compatible (macOS ships no `wait -n`).
  while [ "$(jobs -pr | wc -l | tr -d ' ')" -ge "$PG_JOBS" ]; do sleep 0.05; done
  run_scenario "$PG_FILE" "$PG_BASE" &
done

if [ "$TTY" -eq 1 ]; then
  while :; do
    PG_DONE="$(count_done)"
    progress "$PG_DONE" "$PG_TOTAL" "$PG_JOBS jobs"
    [ "$PG_DONE" -ge "$PG_TOTAL" ] && break
    sleep 0.1
  done
  printf '\n'
fi
wait

# Report failures with their captured logs; keep the scratch dir for debugging.
PG_FAILED=0
for PG_FILE in "$PG_WORK"/*.fail; do
  PG_FAILED=1
  PG_BASE="$(basename "${PG_FILE%.fail}")"
  echo "✖ $PG_BASE failed — output:" >&2
  sed 's/^/    /' "$PG_WORK/$PG_BASE.log" >&2
done
if [ "$PG_FAILED" -eq 1 ]; then
  echo "Scenario logs kept in $PG_WORK" >&2
  exit 1
fi

# Stitch the manifest together in scenario order, so the result is identical
# to what a serial run would have produced.
: > "$MANIFEST"
for PG_FILE in "${PG_SCENARIOS[@]}"; do
  PG_BASE="$(basename "$PG_FILE")"
  [ -f "$PG_WORK/$PG_BASE.tsv" ] && cat "$PG_WORK/$PG_BASE.tsv" >> "$MANIFEST"
done
rm -rf "$PG_WORK"

print_summary
