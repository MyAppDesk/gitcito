# shellcheck shell=bash
# Shared helpers for the Gitcito playground scenarios.
# Sourced by setup-playground.sh; every scenario file may use these.
#
# Globals expected to be set by the orchestrator before sourcing scenarios:
#   ROOT      — absolute path to examples/playground
#   MANIFEST  — absolute path to the manifest TSV (name<TAB>description)

# Create a fresh git repo at $1 with a deterministic identity.
new_repo() {
  local dir="$1"
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.name "Playground"
  git -C "$dir" config user.email "playground@example.com"
  # Deterministic so re-runs produce identical history (helps future e2e).
  git -C "$dir" config commit.gpgsign false
  git -C "$dir" config core.autocrlf false
}

# Commit as a specific author. Usage:
#   collab_commit <dir> <name> <email> <msg> [trailers]
# `trailers` (optional) are appended after a blank line (e.g. Co-authored-by).
# Stages nothing — `git add` yourself first, or rely on --allow-empty here.
collab_commit() {
  local dir="$1" name="$2" email="$3" msg="$4" trailers="${5:-}"
  local full_msg="$msg"
  if [ -n "$trailers" ]; then
    full_msg="$(printf '%s\n\n%s' "$msg" "$trailers")"
  fi
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git -C "$dir" commit -q --allow-empty -m "$full_msg"
}

# Decode base64 from stdin to the file named in $1 (portable across GNU/BSD).
write_b64() {
  local dest="$1"
  if printf '' | base64 -d >/dev/null 2>&1; then
    base64 -d > "$dest"
  else
    base64 -D > "$dest"
  fi
}

# Emit N lines of deterministic lorem-ish text. Usage: rand_text <n> [seed]
rand_text() {
  local n="$1" seed="${2:-x}" i
  for ((i = 1; i <= n; i++)); do
    printf '%s line %03d — the quick brown fox jumps over %d lazy dogs.\n' "$seed" "$i" "$((i * 7 % 13))"
  done
}

# Record a playground repo for the final summary + e2e manifest.
# Usage: summary <repo-name> <one-line description>
SUMMARY_NAMES=()
SUMMARY_DESCS=()
summary() {
  SUMMARY_NAMES+=("$1")
  SUMMARY_DESCS+=("$2")
  printf '%s\t%s\n' "$1" "$2" >> "$MANIFEST"
}

# Pretty-print everything collected via summary().
print_summary() {
  local i width=0
  for i in "${!SUMMARY_NAMES[@]}"; do
    (( ${#SUMMARY_NAMES[i]} > width )) && width=${#SUMMARY_NAMES[i]}
  done
  echo
  echo "Playground ready! Open these repos in Gitcito:"
  for i in "${!SUMMARY_NAMES[@]}"; do
    printf "  %s/%-${width}s  → %s\n" "$ROOT" "${SUMMARY_NAMES[i]}" "${SUMMARY_DESCS[i]}"
  done
  echo
  echo "Manifest (name<TAB>description) written to: $MANIFEST"
}
