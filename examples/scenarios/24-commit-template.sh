# shellcheck shell=bash disable=SC2154
# 24. commit-template — repo with a committed .gitmessage and commit.template set.
# Gitcito should prefill the commit composer from the template's non-comment lines
# (the '#' guidance lines are stripped). A dirty file is left staged-able so you
# have something to commit with the prefilled message.
R="$ROOT/commit-template"
new_repo "$R"

# The template: real scaffold lines (prefilled) + '#' comments (stripped by git
# and by Gitcito, so they never end up in the actual commit).
cat > "$R/.gitmessage" <<'EOF'
<type>(<scope>): <short summary>

Why is this change needed?

What does it do?

Refs:

# ── Commit template ─────────────────────────────────────────────────────────
# type: feat | fix | docs | refactor | test | chore
# Keep the summary under ~50 chars; wrap the body at 72.
# Lines starting with '#' are comments — they are stripped, not committed.
EOF

cat > "$R/app.js" <<'EOF'
function greet(name) { return 'Hello, ' + name }
module.exports = { greet }
EOF

cat > "$R/README.md" <<'EOF'
# Template Shop

This repo sets `commit.template = .gitmessage` (see `git config commit.template`).

Open it in Gitcito and look at the commit box: it should be prefilled from the
template — the first scaffold line becomes the summary, the rest the body, and
the `#` comment lines are dropped.

There is an unstaged edit to `app.js` so you have something to stage & commit.
EOF

git -C "$R" add -A && git -C "$R" commit -qm "chore: initial commit with .gitmessage template"

# Point this repo at the template (relative path — resolved against the repo root).
git -C "$R" config commit.template .gitmessage

# Leave a dirty change so the composer is usable right away.
cat > "$R/app.js" <<'EOF'
function greet(name) { return 'Hello, ' + name + '!' }
function farewell(name) { return 'Bye, ' + name }
module.exports = { greet, farewell }
EOF

summary "commit-template" "commit.template (.gitmessage) prefills the composer; '#' lines stripped"
