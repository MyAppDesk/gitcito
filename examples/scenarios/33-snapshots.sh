# shellcheck shell=bash disable=SC2154
# 33. snapshots — exercise WIP snapshots (Camera / ⌘K), the uncommitted-work
# safety net (commits pinned under refs/gitcito/wip/<ts>).
#
# Seeds three existing snapshots (manual, auto, guard) taken from different
# working-tree states, then leaves the tree dirty — with an untracked file —
# so "Snapshot now" captures something and "Restore" has files to copy back.
# The seeds use `git stash create` on purpose: that is the app's legacy
# snapshot shape, so listing/restoring them also covers backwards compat.
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

# State C → guard snapshot (5 minutes ago), as taken before a destructive op
printf 'Work in progress: section three.\n' >> "$R/draft.md"
snap "gitcito-wip (guard)" "-g" 300

# Leave the working tree dirty — a tracked edit AND an untracked file — for
# "Snapshot now" / "Restore" (untracked capture is the new mechanism's point).
printf 'Even more uncommitted edits.\n' >> "$R/draft.md"
echo "todo: not yet added" > "$R/scratch.txt"

summary "snapshots" "WIP snapshots: 3 seeded (manual + auto + guard) + dirty tree with an untracked file"
