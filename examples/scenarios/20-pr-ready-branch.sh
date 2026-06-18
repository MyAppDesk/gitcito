# shellcheck shell=bash disable=SC2154
# 20. pr-ready-branch — main + a feature branch a few commits ahead, with a
# (fake) GitHub origin so the "Create PR" form opens prefilled. Actually
# submitting needs a real GitHub repo + token in Settings → Integrations; without
# those the form still demonstrates prefill + "Open in browser".
R="$ROOT/pr-ready-branch"
new_repo "$R"

cat > "$R/app.js" <<'EOF'
function main() { console.log('v1') }
module.exports = { main }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "init: app"
printf 'MIT\n' > "$R/LICENSE"
git -C "$R" add -A && git -C "$R" commit -qm "chore: add license"

# Feature branch, a few commits ahead of main.
git -C "$R" checkout -q -b feat/awesome-feature
cat > "$R/feature.js" <<'EOF'
function awesome() { return 42 }
module.exports = { awesome }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add awesome() helper"
cat >> "$R/app.js" <<'EOF'
// wire up the awesome feature
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: wire awesome() into app"
printf '# Awesome\n\nDocs for the awesome feature.\n' > "$R/AWESOME.md"
git -C "$R" add -A && git -C "$R" commit -qm "docs: document awesome feature"

# Fake origin so Create-PR has a remote URL to target.
git -C "$R" remote add origin https://github.com/example/pr-ready-branch.git

cat > "$R/README.md" <<'EOF'
# PR-ready branch

`feat/awesome-feature` is 3 commits ahead of `main`.

To try Create PR:
1. Add a GitHub token in Settings → Integrations (the button is gated on a token).
2. Compare `feat/awesome-feature` vs `main` (branch compare) → **Create PR…**.
3. The form prefills title/description from the branch's commits.

The origin here is a placeholder, so a real submit will fail — point origin at
your own GitHub repo to actually open the PR. "Open in browser" works regardless.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: readme"

summary "pr-ready-branch" "feat branch 3 commits ahead + fake origin — Create PR form"
