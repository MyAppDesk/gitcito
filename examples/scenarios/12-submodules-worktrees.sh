# shellcheck shell=bash disable=SC2154
# 12. submodules-worktrees — a superproject with two git submodules and two linked worktrees.
# Tests recursive/nested-repo display, .gitmodules parsing, and `git worktree` listing.
#
# Layout produced:
#   submodules-worktrees/            ← superproject (HEAD on main)
#     vendor/logger                  ← submodule #1 (pinned, clean)
#     vendor/utils                   ← submodule #2 (pinned, but with a NEW upstream commit to pull)
#   submodules-worktrees.wt-release  ← linked worktree on branch `release/1.x`
#   submodules-worktrees.wt-hotfix   ← linked worktree on branch `hotfix/login`

# Local file:// transport must be explicitly allowed for submodule add on modern git.
GIT_SUB="git -c protocol.file.allow=always"

# ── Build two standalone library repos to use as submodule sources ──────────────
LOGGER_SRC="$ROOT/_sub_src/logger"
UTILS_SRC="$ROOT/_sub_src/utils"

new_repo "$LOGGER_SRC"
cat > "$LOGGER_SRC/logger.ts" <<'EOF'
export const logger = {
  info: (...a: unknown[]) => console.log('[INFO]', ...a),
  warn: (...a: unknown[]) => console.warn('[WARN]', ...a),
  error: (...a: unknown[]) => console.error('[ERROR]', ...a),
}
EOF
git -C "$LOGGER_SRC" add -A && git -C "$LOGGER_SRC" commit -qm "feat: logger v1"

new_repo "$UTILS_SRC"
cat > "$UTILS_SRC/utils.ts" <<'EOF'
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export const uniq = <T>(xs: T[]) => [...new Set(xs)]
EOF
git -C "$UTILS_SRC" add -A && git -C "$UTILS_SRC" commit -qm "feat: utils v1"

# ── Superproject ────────────────────────────────────────────────────────────────
R="$ROOT/submodules-worktrees"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# Superproject

Consumes two git submodules under vendor/.
EOF
cat > "$R/main.ts" <<'EOF'
import { logger } from './vendor/logger/logger'
import { uniq } from './vendor/utils/utils'

logger.info('booting', uniq([1, 1, 2, 3]))
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: superproject scaffold"

$GIT_SUB -C "$R" submodule add -q "$LOGGER_SRC" vendor/logger
$GIT_SUB -C "$R" submodule add -q "$UTILS_SRC" vendor/utils
git -C "$R" commit -qm "feat: vendor logger + utils as submodules"

# Advance the utils source by one commit AFTER pinning → superproject is now behind.
cat >> "$UTILS_SRC/utils.ts" <<'EOF'
export const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)
EOF
git -C "$UTILS_SRC" add -A && git -C "$UTILS_SRC" commit -qm "feat: utils — add clamp (not yet pulled into superproject)"

# ── Two linked worktrees off the superproject ───────────────────────────────────
git -C "$R" branch -q release/1.x
git -C "$R" branch -q hotfix/login
$GIT_SUB -C "$R" worktree add -q "$ROOT/submodules-worktrees.wt-release" release/1.x
$GIT_SUB -C "$R" worktree add -q "$ROOT/submodules-worktrees.wt-hotfix" hotfix/login

summary "submodules-worktrees" "2 submodules (utils has an upstream commit to pull) + 2 linked worktrees"
