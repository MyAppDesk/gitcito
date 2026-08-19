# shellcheck shell=bash disable=SC2154
# 62. teammate-radar — remote activity that collides with local uncommitted work.
#
# A bare "origin" holds three teammates' pushes: María's feature/api-tokens
# (touches api.ts — which is DIRTY locally → overlap), Sam's feature/ui-polish
# (rewrites the same ui.css line a local commit changed → predicted conflict),
# and Priya's commit on main (quiet: no overlap, no conflict). The local repo
# has already fetched, so the radar works offline from refs/remotes.
R="$ROOT/teammate-radar"
BARE="$ROOT/teammate-radar-origin.git"
T="$ROOT/_teammate_clone"
new_repo "$R"

cat > "$R/api.ts" <<'EOF'
export function getUser(id: string) {
  return fetch(`/api/users/${id}`).then((r) => r.json())
}
EOF
cat > "$R/ui.css" <<'EOF'
.button { background: #6366f1; }
.panel  { border-radius: 8px; }
EOF
echo "# Demo app" > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "init: app skeleton"

git clone -q --bare "$R" "$BARE"
git -C "$R" remote add origin "$BARE"

# ── Teammates push to origin from their own clone ──
git clone -q "$BARE" "$T"
git -C "$T" config commit.gpgsign false

git -C "$T" checkout -qb feature/api-tokens
printf '\nexport function getToken() {\n  return localStorage.getItem("token")\n}\n' >> "$T/api.ts"
mkdir -p "$T/docs" && echo "Token endpoints." > "$T/docs/api.md"
git -C "$T" add -A
collab_commit "$T" "María García" "maria@example.com" "feat(api): token helpers"
git -C "$T" push -q origin feature/api-tokens

git -C "$T" checkout -q main && git -C "$T" checkout -qb feature/ui-polish
sed -i.bak 's/#6366f1/#10b981/' "$T/ui.css" && rm -f "$T/ui.css.bak"
git -C "$T" add -A
collab_commit "$T" "Sam Lee" "sam@example.com" "style: green buttons"
git -C "$T" push -q origin feature/ui-polish

git -C "$T" checkout -q main
echo "Now with tokens." >> "$T/README.md"
git -C "$T" add -A
collab_commit "$T" "Priya Patel" "priya@example.com" "docs: mention tokens"
git -C "$T" push -q origin main

rm -rf "$T"

# ── Back home: fetch, then diverge and get dirty ──
git -C "$R" fetch -q origin

# A local commit that fights Sam's branch over the same ui.css line.
sed -i.bak 's/#6366f1/#f59e0b/' "$R/ui.css" && rm -f "$R/ui.css.bak"
git -C "$R" add -A && git -C "$R" commit -qm "style: amber buttons"

# Uncommitted work that overlaps María's branch, plus an untracked note.
printf '\n// WIP: caching layer\n' >> "$R/api.ts"
echo "remember to sync with María" > "$R/notes-todo.md"

summary "teammate-radar" "origin has 3 teammates' pushes: one overlaps your dirty api.ts, one conflicts on ui.css, one is quiet"
