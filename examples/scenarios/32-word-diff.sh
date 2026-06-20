# shellcheck shell=bash disable=SC2154
# 32. word-diff — exercise the word-level (intra-line) diff highlighting.
#
# Commits a file, then makes small in-place edits so each changed line differs
# from its original by only a word/number/symbol. Open the file's diff and
# toggle "Word diff": only the changed token on each line is highlighted
# (red on the old line, green on the new), not the whole line.
R="$ROOT/word-diff"
new_repo "$R"

cat > "$R/config.ts" <<'EOF'
export const config = {
  host: 'localhost',
  port: 3000,
  retries: 3,
  timeout: 5000,
  featureFlags: ['search', 'export'],
}

export function connect(user: string): string {
  return `connecting ${user} to localhost`
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "config: initial settings"

# Small in-place edits — each line changes by a single token.
cat > "$R/config.ts" <<'EOF'
export const config = {
  host: 'example.com',
  port: 8080,
  retries: 5,
  timeout: 5000,
  featureFlags: ['search', 'import'],
}

export function connect(account: string): string {
  return `connecting ${account} to example.com`
}
EOF

summary "word-diff" "word-level diff: select config.ts (modified) and toggle Word diff to mark only changed tokens"
