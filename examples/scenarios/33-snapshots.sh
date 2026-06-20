# shellcheck shell=bash disable=SC2154
# 33. snapshots — exercise WIP snapshots (Camera / ⌘K), the uncommitted-work
# safety net (git stash create pinned under refs/gitcito/wip/<ts>).
#
# Seeds two existing snapshots (one "manual", one "auto") taken from different
# working-tree states, then leaves the tree dirty so "Snapshot now" works and
# "Restore" has something to apply.
R="$ROOT/snapshots"
new_repo "$R"

cat > "$R/draft.md" <<'EOF'
# Draft
Initial committed content.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "draft: initial content"

# Make a snapshot ref from a given dirty state. $1=label $2=suffix(-m/-a) $3=age-seconds
snap() {
  local sha ts
  ts=$(( $(date +%s) - $3 ))
  sha=$(GIT_COMMITTER_DATE="$ts" git -C "$R" stash create "$1")
  [ -n "$sha" ] && git -C "$R" update-ref "refs/gitcito/wip/${ts}$2" "$sha"
}

# State A → manual snapshot (2 hours ago)
printf 'Work in progress: section one.\n' >> "$R/draft.md"
snap "gitcito-wip manual" "-m" 7200

# State B → auto snapshot (20 minutes ago), more changes
printf 'Work in progress: section two.\n' >> "$R/draft.md"
echo "scratch notes" > "$R/notes.md" && git -C "$R" add notes.md
snap "gitcito-wip (auto)" "-a" 1200

# Leave the working tree dirty (tracked edit) for "Snapshot now" / "Restore".
printf 'Even more uncommitted edits.\n' >> "$R/draft.md"

summary "snapshots" "WIP snapshots: 2 seeded (manual + auto) + dirty tree — Snapshot now / Restore / auto-interval"
