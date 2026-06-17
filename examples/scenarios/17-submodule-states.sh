# shellcheck shell=bash disable=SC2154
# 17. submodule-states — a superproject whose submodules cover every status badge.
# Tests the Submodules sidebar section: in-sync, modified, and uninitialized states,
# plus a pinned-but-upstream-ahead one you can pull via "Update".
#
# Layout produced:
#   submodule-states/             ← superproject (HEAD on main)
#     libs/core    ← in-sync     (clean, checked out at the recorded commit)
#     libs/ui      ← modified    (checked out at a DIFFERENT commit than recorded → '+')
#     libs/api     ← uninitialized (registered in .gitmodules, not checked out → '-')
#     libs/theme   ← in-sync, but its source has a newer commit to pull via Update

# Local file:// transport must be explicitly allowed for submodule add on modern git.
GIT_SUB="git -c protocol.file.allow=always"

# ── Build standalone library repos to use as submodule sources ──────────────────
CORE_SRC="$ROOT/_sub_src/core"
UI_SRC="$ROOT/_sub_src/ui"
API_SRC="$ROOT/_sub_src/api"
THEME_SRC="$ROOT/_sub_src/theme"

new_repo "$CORE_SRC"
echo 'export const VERSION = "1.0.0"' > "$CORE_SRC/core.ts"
git -C "$CORE_SRC" add -A && git -C "$CORE_SRC" commit -qm "feat: core v1"

new_repo "$UI_SRC"
echo 'export const Button = () => "btn"' > "$UI_SRC/ui.ts"
git -C "$UI_SRC" add -A && git -C "$UI_SRC" commit -qm "feat: ui v1"
# A second commit so the superproject can pin v1 but check out v2 → 'modified'.
echo 'export const Modal = () => "modal"' >> "$UI_SRC/ui.ts"
git -C "$UI_SRC" add -A && git -C "$UI_SRC" commit -qm "feat: ui v2 (Modal)"

new_repo "$API_SRC"
echo 'export const fetchAll = () => []' > "$API_SRC/api.ts"
git -C "$API_SRC" add -A && git -C "$API_SRC" commit -qm "feat: api v1"

new_repo "$THEME_SRC"
echo 'export const dark = { bg: "#111" }' > "$THEME_SRC/theme.ts"
git -C "$THEME_SRC" add -A && git -C "$THEME_SRC" commit -qm "feat: theme v1"

# ── Superproject ────────────────────────────────────────────────────────────────
R="$ROOT/submodule-states"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# submodule-states

A superproject whose submodules demonstrate every Gitcito status badge:
- libs/core  — in-sync (clean)
- libs/ui    — modified (checked out off the recorded commit)
- libs/api   — uninitialized (deinitialized; use "Update" to check it out)
- libs/theme — in-sync, but the source has a newer commit to pull via "Update"
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: superproject scaffold"

$GIT_SUB -C "$R" submodule add -q "$CORE_SRC" libs/core
$GIT_SUB -C "$R" submodule add -q "$UI_SRC" libs/ui
$GIT_SUB -C "$R" submodule add -q "$API_SRC" libs/api
$GIT_SUB -C "$R" submodule add -q "$THEME_SRC" libs/theme
git -C "$R" commit -qm "feat: vendor core + ui + api + theme as submodules"

# libs/ui → check out v1 inside the submodule while the superproject recorded v2,
# so `git submodule status` flags it as modified ('+').
UI_V1="$(git -C "$UI_SRC" rev-list --max-parents=0 HEAD)"
git -C "$R/libs/ui" checkout -q "$UI_V1"

# libs/api → deinitialize so it shows as uninitialized ('-'). Still in .gitmodules.
$GIT_SUB -C "$R" submodule deinit -q -f libs/api

# libs/theme → advance the SOURCE by one commit AFTER pinning, so "Update" has
# something to pull (the superproject still points at the old commit, clean).
echo 'export const light = { bg: "#fff" }' >> "$THEME_SRC/theme.ts"
git -C "$THEME_SRC" add -A && git -C "$THEME_SRC" commit -qm "feat: theme — add light (not yet pulled)"

summary "submodule-states" "4 submodules: in-sync, modified ('+'), uninitialized ('-') + one with an upstream update"
