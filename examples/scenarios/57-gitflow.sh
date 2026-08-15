# shellcheck shell=bash disable=SC2154
# 57. gitflow — a repository already laid out the git-flow way: main + develop,
# the standard prefixes recorded in git config, one feature branch in progress
# and one release branch ready to finish.
R="$ROOT/gitflow"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# Gitflow

Branch layout:

- `main` — released code, tagged `v*`
- `develop` — integration branch, where features land
- `feature/search` — in progress, branched off develop
- `release/1.1.0` — ready to finish: merges into main, gets tagged, merges back

The prefixes live in `git config gitflow.*`, the same keys the `git flow` CLI
uses, so Gitcito and the CLI read the same repository the same way.
EOF
cat > "$R/app.js" <<'EOF'
function main() {
  return 'v1.0.0'
}
module.exports = main
EOF
git -C "$R" add -A && git -C "$R" commit -qm "init: app + readme"
git -C "$R" tag -a v1.0.0 -m "Release 1.0.0"

# The git-flow layout, recorded exactly as the CLI records it.
git -C "$R" config gitflow.branch.master main
git -C "$R" config gitflow.branch.develop develop
git -C "$R" config gitflow.prefix.feature 'feature/'
git -C "$R" config gitflow.prefix.release 'release/'
git -C "$R" config gitflow.prefix.hotfix 'hotfix/'
git -C "$R" config gitflow.prefix.versiontag v

git -C "$R" checkout -q -b develop
printf 'exports.version = "1.1.0-dev"\n' > "$R/version.js"
git -C "$R" add -A && git -C "$R" commit -qm "chore: start 1.1.0"

# A feature still being worked on.
git -C "$R" checkout -q -b feature/search develop
cat > "$R/search.js" <<'EOF'
module.exports = function search(items, term) {
  return items.filter((i) => i.includes(term))
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add search"

# A release branch that is ready to be finished.
git -C "$R" checkout -q -b release/1.1.0 develop
printf 'exports.version = "1.1.0"\n' > "$R/version.js"
git -C "$R" add -A && git -C "$R" commit -qm "chore: bump to 1.1.0"

git -C "$R" checkout -q develop

summary "gitflow" "main + develop with gitflow config, a feature branch and a release branch ready to finish"
