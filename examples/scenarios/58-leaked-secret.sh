# shellcheck shell=bash disable=SC2154
# 58. leaked-secret — a credentials file committed early and deleted later, the
# shape that needs history rewriting: `git log` no longer shows it in the tree,
# but every clone still carries the blob.
R="$ROOT/leaked-secret"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# Leaked secret

`config/credentials.env` was committed in the second commit and deleted in the
fifth. Deleting it did not remove it: `git show <sha>:config/credentials.env`
still prints the key, and so does every clone.

This is the repo for **Remove file from history** — and for the reminder that a
pushed secret has to be rotated regardless of what the history says.
EOF
printf 'console.log("app")\n' > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "init: app + readme"

mkdir -p "$R/config"
cat > "$R/config/credentials.env" <<'EOF'
API_TOKEN=sk-live-4f9a2c7e11b84d6e93aa07c5
DB_PASSWORD=hunter2-but-worse
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: add service credentials"

printf 'console.log("app v2")\n' > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "feat: bump app"

# The secret changes once more, so more than one blob is in history.
printf 'API_TOKEN=sk-live-77c1de00aa934b12b8ef\nDB_PASSWORD=hunter2-but-worse\n' > "$R/config/credentials.env"
git -C "$R" add -A && git -C "$R" commit -qm "chore: rotate token"

git -C "$R" rm -q "$R/config/credentials.env" 2>/dev/null || git -C "$R" rm -q config/credentials.env
printf 'config/credentials.env\n' > "$R/.gitignore"
git -C "$R" add -A && git -C "$R" commit -qm "fix: stop tracking credentials"

# A branch and a tag, so a rewrite has to touch more than main.
git -C "$R" tag -a v1.0.0 -m "Release 1.0.0"
git -C "$R" checkout -q -b feature/reporting
printf 'console.log("reports")\n' > "$R/reports.js"
git -C "$R" add -A && git -C "$R" commit -qm "feat: reporting"
git -C "$R" checkout -q main

summary "leaked-secret" "a credentials file committed then deleted — still in history, plus a branch and a tag to rewrite"
