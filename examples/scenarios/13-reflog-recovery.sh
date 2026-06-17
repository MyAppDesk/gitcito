# shellcheck shell=bash disable=SC2154
# 13. reflog-recovery — dangling commits left behind by a deleted branch, an amend, and a
# hard reset. None are reachable from any ref, but all are recoverable via reflog / fsck.
# RECOVERY.md (committed early) explains how to get each one back inside Gitcito.
R="$ROOT/reflog-recovery"
new_repo "$R"

cat > "$R/RECOVERY.md" <<'EOF'
# Lost & Found

Three commits were "lost" here — none are on any branch or tag, but git keeps
them until garbage collection. Recover them in Gitcito (or the CLI):

1. **Deleted branch `experiment`** — two commits ("spike: parser", "spike: tokenizer").
   `git reflog`  → find the tip → `git branch experiment <sha>`

2. **Amended commit** — the ORIGINAL "add feature flag" (pre-amend) is orphaned.
   The amended one is on main; the original is in `git reflog` / `git fsck --lost-found`.

3. **Hard-reset commit** — "WIP: broken refactor" was discarded by `git reset --hard`.
   `git reflog`  → `git cherry-pick <sha>`  (or reset back to it).

List all dangling commits:  `git fsck --lost-found --no-reflogs`
EOF
cat > "$R/app.js" <<'EOF'
function main() { console.log('app v1') }
module.exports = { main }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "init: app + recovery notes"

echo "stable feature" > "$R/feature.js"
git -C "$R" add -A && git -C "$R" commit -qm "feat: stable feature"

# ── (1) Branch that gets deleted ────────────────────────────────────────────────
git -C "$R" checkout -q -b experiment
cat > "$R/parser.js" <<'EOF'
// experimental parser — never merged
function parse(src) { return src.split(/\s+/) }
module.exports = { parse }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "spike: parser"
cat > "$R/tokenizer.js" <<'EOF'
// experimental tokenizer — never merged
function tokenize(src) { return [...src] }
module.exports = { tokenize }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "spike: tokenizer"
git -C "$R" checkout -q main
git -C "$R" branch -D experiment >/dev/null   # tip now dangling (reachable only via reflog)

# ── (2) Amended commit (original is orphaned) ───────────────────────────────────
cat > "$R/flags.js" <<'EOF'
const FLAGS = { newUI: false }
module.exports = { FLAGS }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "add feature flag"
cat > "$R/flags.js" <<'EOF'
const FLAGS = { newUI: false, betaSearch: false }
module.exports = { FLAGS }
EOF
git -C "$R" add -A && git -C "$R" commit -q --amend -m "add feature flags (newUI + betaSearch)"

# ── (3) Hard-reset commit (discarded) ───────────────────────────────────────────
cat > "$R/refactor.js" <<'EOF'
// half-finished refactor — broken on purpose
function doThing() { throw new Error('not implemented') }
module.exports = { doThing }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "WIP: broken refactor"
git -C "$R" reset --hard -q HEAD~1   # commit discarded, recoverable via reflog

summary "reflog-recovery" "3 dangling commits (deleted branch, amend, hard reset) — recover via reflog"
