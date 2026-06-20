# shellcheck shell=bash disable=SC2154
# 27. command-palette — exercise the Cmd/Ctrl+K command palette.
#
# Stocks a repo so every palette source has something distinctive to jump to:
#   • Branches → several local branches to fuzzy-checkout
#       (feature/login, feature/search, bugfix/crash, release/1.2)
#   • Commits  → a memorable subject ("Add rate limiter to API gateway")
#                plus a SHA you can paste to jump straight to it
#   • Files    → a nested tree (src/api/…, src/auth/…, docs/…) so file
#                fuzzy-search like "gw" → src/api/gateway.ts works
#   • Actions  → static (fetch/pull/push/stash/terminal/settings/…) — always present
R="$ROOT/command-palette"
new_repo "$R"

mkdir -p "$R/src/api" "$R/src/auth" "$R/docs"

cat > "$R/README.md" <<'EOF'
# Command Palette Demo
Press Cmd+K (macOS) or Ctrl+K to open the palette, then fuzzy-search.
EOF
cat > "$R/src/api/gateway.ts" <<'EOF'
export function gateway(): void {
  console.log('routing requests')
}
EOF
cat > "$R/src/auth/login.ts" <<'EOF'
export const login = (user: string): boolean => user.length > 0
EOF
cat > "$R/docs/architecture.md" <<'EOF'
# Architecture
The gateway fronts every service.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial: gateway, auth, docs"

# A memorable commit to find by message or SHA in the palette.
cat > "$R/src/api/limiter.ts" <<'EOF'
export const limit = (n: number): boolean => n < 100
EOF
git -C "$R" add -A && git -C "$R" commit -qm "Add rate limiter to API gateway"

# A few more commits so the Commits source isn't trivial.
echo "// retries" >> "$R/src/api/gateway.ts"
git -C "$R" add -A && git -C "$R" commit -qm "Retry failed upstream calls"
echo "// 2fa" >> "$R/src/auth/login.ts"
git -C "$R" add -A && git -C "$R" commit -qm "Support two-factor auth"

# Branches for the Branches source (stay on main at the end).
git -C "$R" branch feature/login
git -C "$R" branch feature/search
git -C "$R" branch bugfix/crash
git -C "$R" branch release/1.2

summary "command-palette" "Cmd/Ctrl+K palette: fuzzy jump to branches, commits, files & actions"
