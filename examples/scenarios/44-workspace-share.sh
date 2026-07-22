# shellcheck shell=bash disable=SC2154
# 44. workspace-share — multi-section .gitcito bundles from the Global Vault.
#
# The Secure Share feature now lives in the Global Vault too, and a bundle can
# carry MORE THAN ONE section: the global vault's key/value secrets plus any
# number of repositories' files, all under one password. On import each section
# is routed independently — repos are auto-matched to a local checkout by git
# remote URL (ssh/https forms are normalised) then by folder name, with a manual
# override dropdown; the vault section merges into the Global Vault.
#
# Layout: the scenario root IS the "acme-api" repo; two more repos are nested
# (and parent-gitignored) so you can open all three and exercise every match:
#   • workspace-share    → origin git@github.com:acme/api.git  (ssh)   secrets: .env, config/prod.key
#   • …/acme-web         → origin https://github.com/acme/web.git (https)  secrets: .env.local
#   • …/acme-tools       → NO remote (folder-name match only)             secrets: .env
#
# Manual test guide:
#
#   Global Vault secure share (Export):
#   1. Open all three repos (workspace-share and the two nested folders). Go to
#      the Global Vault page (Toolbar globe icon / ⌘K → "Global Vault"). Add a
#      couple of secrets (STRIPE=sk_live_x, SENTRY=https://…) or "Paste .env".
#   2. Click "Workspace secure share" (or ⌘K → "Workspace secure share: export").
#      EXPECT: modal on Export. A "Global Vault secrets" row shows the count,
#      preselected. Below, ONE GROUP PER WORKSPACE (each with a checkbox +
#      repo count), each listing its repos; repos opened outside any workspace
#      appear under "Other open repos". Workspace repos appear even if not
#      opened this session.
#   3. Click a workspace's group checkbox. EXPECT: all its repos switch on and
#      each immediately shows "N files" with its SECRET FILES PRESELECTED
#      (.env & friends — expand a repo to confirm; node_modules never appears;
#      .env.example listed without a key badge, unselected). Toggling a single
#      repo on must preselect its secrets too. Clicking the group checkbox
#      again clears the whole workspace.
#   4. Type matching 8+ char passwords → "Export bundle" → save workspace.gitcito.
#      EXPECT: success toast. grep the file for "sk_live_x", "API_KEY", ".env":
#      none may appear (values, contents AND paths are encrypted; only repo
#      folder/remote and the envelope label are plaintext, for matching).
#
#   Import (delete the local .env files first, or use fresh clones):
#   5. "Workspace secure share" → Import → pick workspace.gitcito. EXPECT: the
#      envelope shows the label and "N sections" before any password.
#   6. Wrong password → Unlock. EXPECT: "Wrong password" toast.
#   7. Right password → Unlock. EXPECT: one card per section:
#        · Global Vault card — every key listed + checkbox, all selected.
#        · acme-api card — target dropdown ALREADY set to workspace-share
#          (matched by the ssh remote) with an "auto-matched" badge; preview
#          lists .env + config/prod.key; on-disk files show "overwrites existing".
#        · acme-web card — target set to acme-web (matched by the https remote,
#          normalised to the same host/path).
#        · acme-tools card — matched by FOLDER NAME (no remote badge).
#   8. Change a repo card's target dropdown. EXPECT: its file preview reloads
#      against the new target (exists badges update). Blanking it disables Write.
#   9. "Write files". EXPECT: toast "N file(s), M secret(s) written"; files land
#      at the same relative paths (config/prod.key nested); vault secrets appear
#      in the Global Vault.
R="$ROOT/workspace-share"

# ── Root repo = acme-api: ssh remote, secrets at root + nested ──────────────
new_repo "$R"
git -C "$R" remote add origin "git@github.com:acme/api.git"
cat > "$R/.gitignore" <<'EOF'
.env
config/
node_modules/
acme-web/
acme-tools/
EOF
cat > "$R/.env" <<'EOF'
API_KEY=sk-live-api-abc123
DATABASE_URL=postgres://user:s3cr3t@db/api
EOF
mkdir -p "$R/config"
cat > "$R/config/prod.key" <<'EOF'
-----BEGIN PRIVATE KEY-----
MIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEA1demoApiKeyNotReal
-----END PRIVATE KEY-----
EOF
cat > "$R/.env.example" <<'EOF'
API_KEY=your-key-here
EOF
mkdir -p "$R/src"
echo "export const api = true" > "$R/src/index.ts"
mkdir -p "$R/node_modules/leftpad"
echo "module.exports = (s) => s" > "$R/node_modules/leftpad/index.js"
git -C "$R" add -A
collab_commit "$R" "Ada Lovelace" "ada@example.com" "feat: scaffold acme-api"

# ── Nested acme-web: https remote (normalises to the same host/path shape) ──
WEB="$R/acme-web"
new_repo "$WEB"
git -C "$WEB" remote add origin "https://github.com/acme/web.git"
cat > "$WEB/.gitignore" <<'EOF'
.env.local
node_modules/
EOF
cat > "$WEB/.env.local" <<'EOF'
NEXT_PUBLIC_URL=https://acme.example
STRIPE_PUBLISHABLE=pk_live_webDemo
EOF
mkdir -p "$WEB/app"
echo "export default function Page() { return null }" > "$WEB/app/page.tsx"
git -C "$WEB" add -A
collab_commit "$WEB" "Grace Hopper" "grace@example.com" "feat: scaffold acme-web"

# ── Nested acme-tools: no remote — folder-name matching only ────────────────
TOOLS="$R/acme-tools"
new_repo "$TOOLS"
cat > "$TOOLS/.gitignore" <<'EOF'
.env
EOF
cat > "$TOOLS/.env" <<'EOF'
DEPLOY_TOKEN=dpl_toolsDemoNotReal
EOF
echo "#!/bin/sh" > "$TOOLS/deploy.sh"
chmod +x "$TOOLS/deploy.sh"
git -C "$TOOLS" add -A
collab_commit "$TOOLS" "Alan Turing" "alan@example.com" "feat: scaffold acme-tools"

summary "workspace-share" "multi-section .gitcito from the Global Vault — bundle vault secrets + multiple repos (nested acme-web/acme-tools), import routes each section (repos auto-matched by remote/folder, vault merges into global)"
