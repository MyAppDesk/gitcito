# shellcheck shell=bash disable=SC2154
# 63. local-ci — a repo with GitHub Actions workflows, for the optional
# act-based local-CI integration: one workflow with a `name:` (listing shows
# it) and one without (listing falls back to the filename). The workflows are
# trivial echoes so an actual `act` run finishes in seconds.
R="$ROOT/local-ci"
new_repo "$R"

mkdir -p "$R/.github/workflows"
cat > "$R/.github/workflows/ci.yml" <<'EOF'
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "tests pass"
EOF
cat > "$R/.github/workflows/lint.yml" <<'EOF'
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: echo "lint clean"
EOF
cat > "$R/app.js" <<'EOF'
console.log('hello from local-ci')
EOF
git -C "$R" add -A && git -C "$R" commit -qm "ci: workflows + app"

# A second commit plus seeded local-CI verdicts (git notes under
# refs/notes/gitcito-ci), so the graph's ✓/✗ flask badges are visible without
# act installed: the first commit passed, the follow-up broke the build.
FIRST=$(git -C "$R" rev-parse HEAD)
printf 'console.log(oops_undefined)\n' >> "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "feat: risky change"
git -C "$R" notes --ref=gitcito-ci add -m '{"ok":true,"workflow":"ci.yml","at":1755600000000}' "$FIRST"
git -C "$R" notes --ref=gitcito-ci add -m '{"ok":false,"workflow":"ci.yml","at":1755603600000}' HEAD

summary "local-ci" "two workflows (one named, one not) + seeded per-commit local-CI verdicts (pass, fail)"
