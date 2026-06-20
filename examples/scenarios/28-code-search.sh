# shellcheck shell=bash disable=SC2154
# 28. code-search — exercise the in-app code search (⌘⇧F / Ctrl+Shift+F).
#
# Two search modes to test:
#   • Working tree (git grep) — content + line hits across tracked & untracked
#       files. Seeded targets:
#         - "TODO" markers scattered across 3 files (multi-file grouping)
#         - a regex-friendly target: emails like alice@corp.dev
#         - an untracked file (scratch.js) so --untracked coverage is visible
#   • History pickaxe (git log -S/-G) — commits that change a string's count.
#       Seeded target: the symbol `validateToken` is INTRODUCED in one commit
#       and REMOVED in a later one ⇒ searching "validateToken" returns 2 commits.
R="$ROOT/code-search"
new_repo "$R"

mkdir -p "$R/src/auth" "$R/src/util"

# ── Commit 1: baseline with grep targets ────────────────────────────────
cat > "$R/src/util/log.js" <<'EOF'
// TODO: switch to structured logging
export function log(msg) {
  console.log(msg)
}
EOF
cat > "$R/src/util/mail.js" <<'EOF'
// contacts — handy for a regex search: \w+@\w+\.\w+
export const team = ['alice@corp.dev', 'bob@corp.dev', 'carol@corp.dev']
EOF
cat > "$R/README.md" <<'EOF'
# Code Search Demo
TODO: document the search feature.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "baseline: log, mail, readme"

# ── Commit 2: INTRODUCE validateToken (pickaxe target appears) ───────────
cat > "$R/src/auth/token.js" <<'EOF'
export function validateToken(tok) {
  // TODO: verify signature properly
  return typeof tok === 'string' && tok.length > 0
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "auth: add validateToken helper"

# ── Commit 3: use it elsewhere (still present) ───────────────────────────
cat > "$R/src/auth/guard.js" <<'EOF'
import { validateToken } from './token.js'
export const guard = (tok) => (validateToken(tok) ? 'ok' : 'deny')
EOF
git -C "$R" add -A && git -C "$R" commit -qm "auth: guard uses validateToken"

# ── Commit 4: REMOVE validateToken (pickaxe shows the removal too) ───────
cat > "$R/src/auth/token.js" <<'EOF'
// replaced by the new session module
export const SESSION_TTL = 3600
EOF
cat > "$R/src/auth/guard.js" <<'EOF'
export const guard = (tok) => (tok ? 'ok' : 'deny')
EOF
git -C "$R" add -A && git -C "$R" commit -qm "auth: drop validateToken for sessions"

# ── Untracked file (covered by git grep --untracked) ─────────────────────
cat > "$R/scratch.js" <<'EOF'
// TODO: try searching for this untracked file in the working-tree tab
const debug = true
EOF

summary "code-search" "⌘⇧F code search: git grep working tree + history pickaxe (validateToken added→removed)"
