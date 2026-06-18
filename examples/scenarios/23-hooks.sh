# shellcheck shell=bash disable=SC2154
# 23. hooks — exercises the hooks manager: an ACTIVE (executable) pre-commit hook,
# a DISABLED (non-executable) commit-msg hook, the SAMPLE templates git ships in
# .git/hooks, and a pre-commit-framework config for detection.
#
# Hooks live in .git/hooks (not the working tree), so they're written directly
# into the repo's git dir here.
R="$ROOT/hooks"
new_repo "$R"

# pre-commit FRAMEWORK config (lives in the working tree → committed).
cat > "$R/.pre-commit-config.yaml" <<'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
EOF

cat > "$R/README.md" <<'EOF'
# Hooks Playground

Open **Toolbar → Hooks**. You should see:

| Hook        | State    |
|-------------|----------|
| pre-commit  | Active   | (executable — blocks commits containing FIXME)
| commit-msg  | Disabled | (present but not executable — enable it to enforce conventional prefixes)
| others      | Sample   | (the templates `git init` ships in .git/hooks)

A `.pre-commit-config.yaml` is committed, so the framework banner shows too.

Try:
- Toggle commit-msg on, then commit "bad message" → it's rejected.
- Edit pre-commit in the editor and save.
EOF

# Commit the fixture BEFORE installing the active hook, so the build isn't gated.
git -C "$R" add -A && git -C "$R" commit -qm "chore: add pre-commit-framework config + README"

# Install hooks into .git/hooks after the commit.
HOOKS="$R/.git/hooks"
mkdir -p "$HOOKS"

# (1) ACTIVE pre-commit — blocks commits that still contain FIXME.
cat > "$HOOKS/pre-commit" <<'EOF'
#!/bin/sh
# Reject commits whose staged changes still contain a FIXME marker.
if git diff --cached | grep -q 'FIXME'; then
  echo "pre-commit: remove FIXME before committing." >&2
  exit 1
fi
EOF
chmod +x "$HOOKS/pre-commit"

# (2) DISABLED commit-msg — present but NOT executable, so git skips it.
cat > "$HOOKS/commit-msg" <<'EOF'
#!/bin/sh
# Require a conventional-commit prefix. Disabled until made executable.
head -1 "$1" | grep -qE '^(feat|fix|docs|chore|refactor|test)(\(.+\))?: ' || {
  echo "commit-msg: use a conventional prefix (feat:, fix:, ...)." >&2
  exit 1
}
EOF
chmod -x "$HOOKS/commit-msg"

summary "hooks" "git hooks: active pre-commit, disabled commit-msg, samples, framework config"
