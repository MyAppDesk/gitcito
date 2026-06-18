# shellcheck shell=bash disable=SC2154
# 25. line-staging — a file with several independent edits in one hunk, left
# unstaged, so you can stage INDIVIDUAL lines (not just whole hunks) in the diff.
R="$ROOT/line-staging"
new_repo "$R"

cat > "$R/config.js" <<'EOF'
const config = {
  host: 'localhost',
  port: 3000,
  retries: 3,
  timeout: 1000,
}
module.exports = config
EOF
cat > "$R/README.md" <<'EOF'
# Line staging

`config.js` has several unstaged edits in a single hunk:
- `host` changed to a real domain
- `debug: true` added
- `tls: true` added

Open it in the commit view's diff. Click individual + / - lines to select
them, then **Stage N lines** — only the picked lines move to staged, the rest
stay unstaged. Verify with `git diff` vs `git diff --cached`.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "init: config + readme"

# Working-tree edits: change one line + add two new lines (one hunk, mixed).
cat > "$R/config.js" <<'EOF'
const config = {
  host: 'api.example.com',
  port: 3000,
  retries: 3,
  timeout: 1000,
  debug: true,
  tls: true,
}
module.exports = config
EOF

summary "line-staging" "stage individual diff lines (not whole hunks) from config.js"
