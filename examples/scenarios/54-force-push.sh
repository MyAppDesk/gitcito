# shellcheck shell=bash disable=SC2154
# 54. force-push — "they rewrote the branch, what actually changed?"
#
# A real force-push against a real (local, bare) remote, done from a *second*
# clone so it lands the way a teammate's rewrite does: your tracking ref still
# points at the old tip until you fetch. That is what makes the whole chain
# observable — `git fetch --porcelain` reports the forced update, the tracking
# ref's reflog remembers where the branch was, and `git range-diff` pairs the
# two versions commit by commit.
#
# The rewritten branch (feature/login) is set up so every verdict appears:
#   • "add login form"      identical  — same commit on both sides
#   • "validate password"   rewritten  — the reviewer's comment was addressed
#   • "add debug logging"   dropped    — removed before merging
#   • "add rate limiting"   new        — added after the review
#
# Verify:
#   • The repo opens with origin/feature/login still on the OLD tip (nothing has
#     been fetched yet — that is the point).
#   • Fetch (toolbar or ⌘K) ⇒ a toast says origin/feature/login was
#     force-pushed, and the branch row under Remotes gains a ⟳ history marker.
#   • Click that marker ⇒ "What changed since" opens already comparing the
#     commit the branch used to point at against the new tip.
#   • Rows read: "validate password" rewritten, "add rate limiting" new,
#     "add debug logging" dropped. ("add login form" survived the rewrite byte
#     for byte, so it sits before the two versions' common ancestor and is not
#     part of the comparison at all.)
#   • Clicking the rewritten row expands the interdiff — the commit message
#     change plus the extra length check, NOT the whole file.
#   • The "Previous positions" chips list the tracking ref's reflog entries
#     (forced-update, fetch); picking one re-runs the comparison against it.
#   • Right-click any branch (local or remote) → "What changed since…" opens the
#     same dialog for that ref.
#   • A branch nobody rewrote (main) shows no marker and, compared with itself,
#     reports "Both versions are identical".
R="$ROOT/force-push"
REMOTE="$ROOT/force-push-origin.git"
# The teammate's clone — whoever it is that keeps rebasing.
MATE="$ROOT/force-push-teammate"

# The "server" everyone pushes to.
rm -rf "$REMOTE"
git init -q --bare "$REMOTE"

new_repo "$R"
printf '# Auth service\n\nLogin and friends.\n' > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "init: auth service"
git -C "$R" remote add origin "$REMOTE"
git -C "$R" push -q -u origin HEAD

# ── The branch as it was first pushed (what a reviewer would have seen) ──
git -C "$R" checkout -qb feature/login
mkdir -p "$R/src"
cat > "$R/src/login.ts" <<'TS'
export function loginForm() {
  return { user: '', password: '' }
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "add login form"

cat > "$R/src/validate.ts" <<'TS'
export function validatePassword(pw: string) {
  return pw.length > 0
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "validate password"

cat > "$R/src/debug.ts" <<'TS'
export function debugLog(msg: string) {
  console.log('[auth]', msg)
}
TS
git -C "$R" add -A && git -C "$R" commit -qm "add debug logging"
git -C "$R" push -q -u origin feature/login

# ── The teammate rewrites the branch and force-pushes ──
# Rebuilt from the branch point, so this is a genuine history rewrite: same
# first commit, one reworked, one dropped, one added.
rm -rf "$MATE"
git clone -q "$REMOTE" "$MATE"
# Same identity as the original author: the point of the exercise is which
# commits were rewritten, and a different author would mark every single one as
# changed (range-diff compares commit metadata too).
git -C "$MATE" config user.email "playground@example.com"
git -C "$MATE" config user.name "Playground"
git -C "$MATE" checkout -q -b feature/login origin/feature/login
git -C "$MATE" reset -q --hard origin/main
mkdir -p "$MATE/src"

cat > "$MATE/src/login.ts" <<'TS'
export function loginForm() {
  return { user: '', password: '' }
}
TS
git -C "$MATE" add -A && git -C "$MATE" commit -qm "add login form"

cat > "$MATE/src/validate.ts" <<'TS'
export function validatePassword(pw: string) {
  if (pw.length < 12) return false
  return pw.length > 0
}
TS
git -C "$MATE" add -A && git -C "$MATE" commit -qm "validate password (min length)"

cat > "$MATE/src/rate-limit.ts" <<'TS'
export function rateLimit(ip: string) {
  return buckets.take(ip)
}
TS
git -C "$MATE" add -A && git -C "$MATE" commit -qm "add rate limiting"

git -C "$MATE" push -q --force origin feature/login

# Your clone is deliberately left un-fetched: origin/feature/login still points
# at the version you reviewed, so fetching inside Gitcito is what reveals the
# rewrite.
git -C "$R" checkout -q main

summary "force-push" "A branch force-pushed to a local bare remote (rewritten, dropped and new commits) for range-diff and the forced-update marker."
