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
  # One append instead of five `git config` spawns — across ~80 repos the
  # process overhead is measurable. Deterministic identity so re-runs produce
  # identical history (helps future e2e); rerere off because the machine's
  # config must not change what a scenario builds — rerere rewrites conflicted
  # files during a scenario's own merges, so a developer with it enabled would
  # generate different fixtures from everyone else.
  cat >> "$dir/.git/config" <<'EOF'
[user]
	name = Playground
	email = playground@example.com
[commit]
	gpgsign = false
[core]
	autocrlf = false
[rerere]
	enabled = false
EOF
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
# Scenarios run in parallel child processes, so the file (not shell state) is
# the only channel back to the orchestrator — each child writes its own
# fragment, which the orchestrator stitches into the real manifest in order.
summary() {
  printf '%s\t%s\n' "$1" "$2" >> "$MANIFEST"
}

# Pretty-print everything collected via summary(), read back from $MANIFEST.
print_summary() {
  local name desc width=0
  while IFS=$'\t' read -r name desc; do
    (( ${#name} > width )) && width=${#name}
  done < "$MANIFEST"
  echo
  echo "Playground ready! Open these repos in Gitcito:"
  while IFS=$'\t' read -r name desc; do
    printf "  %s/%-${width}s  → %s\n" "$ROOT" "$name" "$desc"
  done < "$MANIFEST"
  echo
  echo "Manifest (name<TAB>description) written to: $MANIFEST"
}
