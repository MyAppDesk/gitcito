# shellcheck shell=bash disable=SC2154
# 49. nested-folders — folders inside a group tab, nested to any depth.
#
# A group tab can now hold FOLDERS as well as repositories, and a folder can
# hold further folders with no depth limit. Folders are organisation only: every
# repo stays an ordinary member of the group, so status dots, "Fetch all" and
# close warnings still cover the whole group no matter how deep a repo is filed.
#
# Layout: the scenario root IS "nested-folders" (a docs repo); four more repos
# are nested (and parent-gitignored) so one group can be arranged into a tree:
#   • nested-folders     → docs
#   • …/acme-api         → backend service (left dirty, to check status dots)
#   • …/acme-worker      → backend worker
#   • …/acme-web         → frontend
#   • …/acme-terraform   → infra
#
# Suggested arrangement (any nesting works):
#   Acme ┬ docs                 (group root)
#        ├ Backend ┬ acme-api
#        │         └ Workers ─ acme-worker      ← folder inside a folder
#        ├ Frontend ─ acme-web
#        └ Infra ─ acme-terraform
#
# Manual test guide:
#
#   Create and fill folders:
#   1. Open the five repos, then drag them into one group (or "+" → Create group
#      → right-click the group chip → "Manage repositories…").
#   2. Right-click the group chip → "New folder…" → "Backend". EXPECT: a folder
#      chip appears after the group's loose repos, showing a count of 0.
#   3. Drag acme-api onto the "Backend" chip. EXPECT: the chip highlights while
#      hovering, the repo moves in behind it, and the count reads 1.
#   4. Right-click acme-web → "Move to folder" → shows "Group root" plus every
#      folder by its full trail. Move it into a new "Frontend" folder.
#
#   Nest without limit:
#   5. Right-click "Backend" → "New subfolder…" → "Workers". Drag acme-worker
#      onto it. EXPECT: Workers renders inside Backend, its repo behind it, and
#      Backend's count now counts acme-worker too (nested repos are included).
#   6. Repeat "New subfolder…" a few levels deep. EXPECT: no depth limit, each
#      level readable, the strip scrolls rather than wrapping.
#   7. Drag "Workers" onto "Frontend". EXPECT: the whole subtree (folder + repo)
#      re-parents. Drag "Backend" onto its own "Workers" child. EXPECT: nothing
#      happens — a folder cannot be moved into its own subtree.
#
#   Collapse, status and batch actions:
#   8. Click a folder chip. EXPECT: it collapses to a single chip with its repo
#      count; click again to expand.
#   9. `echo x >> README.md` inside acme-api (it is already left dirty by this
#      scenario). EXPECT: the WIP dot shows on the repo chip AND on every folder
#      above it, collapsed or not.
#  10. Right-click a folder → "Fetch all (N)" / "Pull all (N)". EXPECT: it acts
#      on every repo under the folder including nested ones.
#  11. Collapse the whole group (click the group chip). EXPECT: only the repo in
#      view remains visible, folders hidden; expanding restores the tree.
#
#   Removal keeps repos in the group:
#  12. Right-click a folder → "Delete folder". EXPECT: the folder disappears and
#      its repos + subfolders move UP to its parent (group root when it was top
#      level) — no repository is closed.
#  13. Right-click a repo inside a folder → "Remove from group" / drag it to a
#      gap in the tab strip to eject it. EXPECT: it leaves the group and the
#      folder count drops. Reopening the app restores the exact tree.
#  14. Right-click a folder → "Change color…". EXPECT: the folder chip and the
#      repos under it take that colour, distinct from the group's.
R="$ROOT/nested-folders"

# ── Root repo = docs ────────────────────────────────────────────────────────
new_repo "$R"
cat > "$R/.gitignore" <<'EOF'
acme-api/
acme-worker/
acme-web/
acme-terraform/
EOF
cat > "$R/README.md" <<'EOF'
# Acme docs

Handbook for the Acme platform. Group the sibling repos into folders:
Backend (api + Workers/worker), Frontend (web), Infra (terraform).
EOF
git -C "$R" add -A
collab_commit "$R" "Ada Lovelace" "ada@example.com" "docs: platform handbook"

# ── acme-api: left DIRTY so folder status dots have something to show ───────
API="$R/acme-api"
new_repo "$API"
mkdir -p "$API/src"
echo "export const serve = () => 'ok'" > "$API/src/server.ts"
echo "# acme-api" > "$API/README.md"
git -C "$API" add -A
collab_commit "$API" "Grace Hopper" "grace@example.com" "feat: scaffold acme-api"
echo "// TODO: rate limiting" >> "$API/src/server.ts"

# ── acme-worker: the repo to file two levels deep ───────────────────────────
WORKER="$R/acme-worker"
new_repo "$WORKER"
mkdir -p "$WORKER/jobs"
echo "export const nightly = () => null" > "$WORKER/jobs/nightly.ts"
git -C "$WORKER" add -A
collab_commit "$WORKER" "Alan Turing" "alan@example.com" "feat: scaffold acme-worker"

# ── acme-web: frontend ──────────────────────────────────────────────────────
WEB="$R/acme-web"
new_repo "$WEB"
mkdir -p "$WEB/app"
echo "export default function Page() { return null }" > "$WEB/app/page.tsx"
git -C "$WEB" add -A
collab_commit "$WEB" "Katherine Johnson" "katherine@example.com" "feat: scaffold acme-web"

# ── acme-terraform: infra ───────────────────────────────────────────────────
TF="$R/acme-terraform"
new_repo "$TF"
mkdir -p "$TF/envs/prod"
echo 'module "api" { source = "../../modules/api" }' > "$TF/envs/prod/main.tf"
git -C "$TF" add -A
collab_commit "$TF" "Margaret Hamilton" "margaret@example.com" "chore: scaffold infra"

summary "nested-folders" "five repos for one group tab — file them into folders nested to any depth (Backend/Workers/…), check counts, status dots, batch fetch, re-parenting and delete-lifts-children"
