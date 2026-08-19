# shellcheck shell=bash disable=SC2154
# 59. subtree — a project with a library vendored in via `git subtree`, plus the
# bare repo it came from. Unlike a submodule the files are really in the tree, and
# nothing in the repo records where they came from — which is the interesting part.
LIB_BARE="$ROOT/subtree-lib.git"

SEED="$ROOT/_seed_subtree_lib"
new_repo "$SEED"
cat > "$SEED/parser.js" <<'EOF'
exports.parse = (s) => JSON.parse(s)
EOF
printf '# tiny-parser\n\nA library that lives in its own repository.\n' > "$SEED/README.md"
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: parser"
printf 'exports.parse = (s) => JSON.parse(s)\nexports.safe = (s) => { try { return JSON.parse(s) } catch { return null } }\n' > "$SEED/parser.js"
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: safe parse"
git clone -q --bare "$SEED" "$LIB_BARE"
rm -rf "$SEED"

R="$ROOT/subtree"
new_repo "$R"
cat > "$R/README.md" <<'EOF'
# Subtree

`vendor/parser` was added with:

    git subtree add --prefix=vendor/parser <lib> main --squash

The files are really here — a plain clone gets them, no `--recurse-submodules`,
no detached HEAD. What is *not* here is any record of where they came from:
git subtree writes no `.gitmodules` equivalent, only a `git-subtree-dir:` trailer
on the commit it made.
EOF
printf 'const { parse } = require("./vendor/parser/parser")\nconsole.log(parse("{}"))\n' > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "init: app + readme"

# Even with -q, git-subtree echoes its internal `git fetch` plus the fetch's
# transport progress whenever stderr is a terminal. Capture everything and only
# replay it if the import actually failed.
if ! SUBTREE_OUT=$(git -C "$R" subtree add -q --prefix=vendor/parser "$LIB_BARE" main --squash 2>&1); then
  printf '%s\n' "$SUBTREE_OUT" >&2
  false
fi

# A local commit after the import, so history is not just the subtree merge.
printf 'const { parse, safe } = require("./vendor/parser/parser")\nconsole.log(safe("{}"))\n' > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "feat: use safe parse"

summary "subtree" "a library vendored in at vendor/parser with git subtree, plus the bare repo it came from"
