# shellcheck shell=bash disable=SC2154
# 42. secure-share — exercise encrypted .gitcito file bundles (export/import).
#
# A repo with gitignored secrets at several depths (root .env, app/.env.prod,
# certs/dev.pem) plus normal tracked sources. Manual test guide:
#
#   Export:
#   1. Open the repo → Repo Settings → Vault → "Secure share" (or ⌘K →
#      "Share files securely"). EXPECT: modal opens on the Export tab, the file
#      list shows .env, app/.env.prod and certs/dev.pem FIRST with a key badge,
#      all three preselected; src/config.ts is listed but unselected;
#      .env.example is listed WITHOUT a badge and unselected; node_modules
#      content never appears.
#   2. Type a password shorter than 8 chars. EXPECT: warning, Export disabled.
#   3. Type matching 8+ char passwords, click "Export bundle", save as
#      secure-share.gitcito. EXPECT: success toast with the saved path; the
#      file on disk is JSON whose payload is base64 — grep it for "API_KEY"
#      and for ".env": neither may appear (paths are encrypted too).
#
#   Import (use a second clone or delete the local .env files first):
#   4. ⌘K → "Import secure bundle", pick the .gitcito file. EXPECT: project
#      name, file count and date shown before any password is asked.
#   5. Enter a wrong password → Unlock. EXPECT: "Wrong password" toast, no
#      file list.
#   6. Enter the right password. EXPECT: preview list with all bundle paths;
#      entries that already exist on disk show an "overwrites existing" badge.
#   7. Click "Write files". EXPECT: toast with the written count; the files
#      exist at the same relative paths (app/.env.prod nested correctly) and
#      git status still shows them as ignored.
R="$ROOT/secure-share"
new_repo "$R"

cat > "$R/.gitignore" <<'EOF'
.env
app/.env.prod
certs/
node_modules/
EOF

cat > "$R/.env" <<'EOF'
# Root secrets (demo only)
API_KEY=sk-live-abc123def456
DATABASE_URL=postgres://user:s3cr3t@db.example.com:5432/app
EOF

mkdir -p "$R/app"
cat > "$R/app/.env.prod" <<'EOF'
NODE_ENV=production
STRIPE_SECRET=sk_live_51DemoNotReal
EOF

mkdir -p "$R/certs"
cat > "$R/certs/dev.pem" <<'EOF'
-----BEGIN PRIVATE KEY-----
MIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEA1demoNotARealKey
-----END PRIVATE KEY-----
EOF

cat > "$R/.env.example" <<'EOF'
API_KEY=your-key-here
DATABASE_URL=postgres://localhost/app
EOF

mkdir -p "$R/src"
cat > "$R/src/config.ts" <<'EOF'
// Normal tracked source — appears in the picker but is not preselected.
export const config = { retries: 3, timeout: 5000 }
EOF

# Bulk directory that must be skipped by the candidate walker.
mkdir -p "$R/node_modules/leftpad"
echo "module.exports = (s) => s" > "$R/node_modules/leftpad/index.js"

git -C "$R" add -A
collab_commit "$R" "Ada Lovelace" "ada@example.com" "feat: scaffold secure-share playground"

summary "secure-share" "encrypted .gitcito bundles — export gitignored secrets (root + nested), import recreates them at the same relative paths (Vault tab or ⌘K)"
