# shellcheck shell=bash disable=SC2154
# 29. stacked-branches — exercise the branch-stack feature (Layers icon / ⌘K).
#
# Builds a 2-level stack on top of main and records the stack metadata gitcito
# stores in git config (branch.<name>.gitcitoparent / .gitcitobase):
#
#     feature/ui   (leaf, current)   ── parent: feature/api
#     feature/api                    ── parent: main
#     main         (trunk/base)
#
# Then it advances BOTH lower branches so the stack is out of date:
#   • a new commit on main          ⇒ feature/api "needs restack"
#   • a new commit on feature/api   ⇒ feature/ui  "needs restack"
# Open the stack and hit Restack to cascade-rebase the whole chain.
R="$ROOT/stacked-branches"
new_repo "$R"

cat > "$R/app.js" <<'EOF'
export const app = () => 'v1'
EOF
git -C "$R" add -A && git -C "$R" commit -qm "main: initial app"
MAIN_TIP="$(git -C "$R" rev-parse main)"

# ── Level 1: feature/api on main ─────────────────────────────────────────
git -C "$R" checkout -q -b feature/api
cat > "$R/api.js" <<'EOF'
export const fetchUser = (id) => ({ id })
EOF
git -C "$R" add -A && git -C "$R" commit -qm "api: add fetchUser"
echo "export const fetchOrg = (id) => ({ id })" >> "$R/api.js"
git -C "$R" add -A && git -C "$R" commit -qm "api: add fetchOrg"
git -C "$R" config branch.feature/api.gitcitoparent main
git -C "$R" config branch.feature/api.gitcitobase "$MAIN_TIP"
API_TIP="$(git -C "$R" rev-parse feature/api)"

# ── Level 2: feature/ui on feature/api ───────────────────────────────────
git -C "$R" checkout -q -b feature/ui
cat > "$R/ui.js" <<'EOF'
import { fetchUser } from './api.js'
export const UserCard = (id) => fetchUser(id)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "ui: add UserCard"
echo "export const OrgCard = (id) => id" >> "$R/ui.js"
git -C "$R" add -A && git -C "$R" commit -qm "ui: add OrgCard"
git -C "$R" config branch.feature/ui.gitcitoparent feature/api
git -C "$R" config branch.feature/ui.gitcitobase "$API_TIP"

# ── Make the stack stale ─────────────────────────────────────────────────
# New commit on main ⇒ feature/api is now behind its parent.
git -C "$R" checkout -q main
echo "// hotfix on main" >> "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "main: hotfix"

# New commit on feature/api ⇒ feature/ui is now behind its parent.
git -C "$R" checkout -q feature/api
echo "export const fetchTeam = (id) => ({ id })" >> "$R/api.js"
git -C "$R" add -A && git -C "$R" commit -qm "api: add fetchTeam"

# Land on the leaf so opening the repo shows the full stack.
git -C "$R" checkout -q feature/ui

summary "stacked-branches" "branch stack: feature/ui → feature/api → main, both lower levels need restack"
