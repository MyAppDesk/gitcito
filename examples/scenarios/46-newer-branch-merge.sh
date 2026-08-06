# shellcheck shell=bash disable=SC2154
# 46. newer-branch-merge — a merged branch (`javi`) whose commits are NEWER than
# the trunk's own first-parent side. In --date-order the branch commits sit
# above the trunk commit, which used to make the graph hand lane 0 over to the
# branch at the merge base: main bent, javi drew straight. The trunk must keep
# lane 0 all the way down; javi bends in from lane 1 (like `git log --graph`).
R="$ROOT/newer-branch-merge"
new_repo "$R"

# Fixed dates so the ordering trap is deterministic on every rebuild.
commit_at() {
  local when="$1" msg="$2"
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" \
    git -C "$R" commit -q -m "$msg"
}

cat > "$R/app.ts" <<'EOF'
export const VERSION = '1.0.0'
EOF
git -C "$R" add -A
commit_at "2026-08-01T10:00:00" "chore: initial commit"

cat > "$R/registry.ts" <<'EOF'
export const apps = ['weddygo', 'mythologynow']
EOF
git -C "$R" add -A
commit_at "2026-08-01T11:00:00" "feat: add apps registry"

# Trunk side: one older commit on main.
cat >> "$R/app.ts" <<'EOF'
export const EFFECTIVE_DATE = '2026-08-01'
EOF
git -C "$R" add -A
commit_at "2026-08-02T09:00:00" "chore: update effective date"

# Branch side: javi forks from the merge base and commits LATER than main's side.
git -C "$R" checkout -q -b javi main~1
cat > "$R/legal.ts" <<'EOF'
export const legalPages = ['privacy', 'terms']
EOF
git -C "$R" add -A
commit_at "2026-08-05T15:00:00" "feat: add legal pages"

cat >> "$R/legal.ts" <<'EOF'
export const locales = ['en', 'es']
EOF
git -C "$R" add -A
commit_at "2026-08-05T16:00:00" "feat: translate legal pages"

# Merge javi into main (first parent = main's side, second parent = javi).
git -C "$R" checkout -q main
GIT_AUTHOR_DATE="2026-08-06T10:00:00" GIT_COMMITTER_DATE="2026-08-06T10:00:00" \
  git -C "$R" merge -q --no-ff --no-edit javi

summary "newer-branch-merge" "javi's commits are newer than main's side of the merge — main must render as a straight lane-0 rail, javi bends in from the right"
