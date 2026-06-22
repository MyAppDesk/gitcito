# shellcheck shell=bash disable=SC2154
# 34. secrets — exercise secret-value masking (KEY=•••• in .env/key files).
#
# A repo that (intentionally, for the demo) tracks a .env plus a key file, then
# dirties the .env. Open the diff or file view: values render masked by default
# (KEY=••••••), with an eye toggle to reveal. A normal source file is unaffected.
#
# Also exercises:
#  - file preview text selection: open config.ts, drag-select code, ⌘C copies it.
#  - vault .env paste: copy the .env body, open Vault (or Repo Settings → Vault),
#    click "Paste .env", paste, Import → each KEY=value lands as a secret; blank
#    lines and # comments are dropped, quotes stripped, repeat keys overwrite.
R="$ROOT/secrets"
new_repo "$R"

cat > "$R/.env" <<'EOF'
# App configuration (demo only — never commit real secrets!)
NODE_ENV=production
PORT=3000
API_KEY=sk-live-abc123def456
DATABASE_URL=postgres://user:s3cr3t@db.example.com:5432/app
JWT_SECRET="super-secret-signing-key"
EOF
cat > "$R/config.ts" <<'EOF'
// A normal source file — NOT masked.
export const config = { retries: 3, timeout: 5000 }
EOF
cat > "$R/deploy.pem" <<'EOF'
-----BEGIN PRIVATE KEY-----
MIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEA1demoNotARealKey
-----END PRIVATE KEY-----
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: add config (demo secrets)"

# Dirty the .env so the diff view shows masked add/del lines.
cat > "$R/.env" <<'EOF'
# App configuration (demo only — never commit real secrets!)
NODE_ENV=production
PORT=8080
API_KEY=sk-live-zzz999rotated
DATABASE_URL=postgres://user:n3wp4ss@db.example.com:5432/app
JWT_SECRET="rotated-signing-key"
SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
EOF

summary "secrets" "secret masking + text-selection in preview + Vault 'Paste .env' bulk import (copy this repo's .env into the vault)"
