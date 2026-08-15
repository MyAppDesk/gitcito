# shellcheck shell=bash disable=SC2154
# 60. untracked-mess — everything `git clean` can reach, in one repository.
#
# Exercises "Remove untracked files": the dialog has to separate three kinds of
# path that look identical in a file browser and behave nothing alike.
#   • Untracked, never committed:  notes.md, debug-output.txt, tmp/
#   • Ignored by .gitignore:       dist/, node_modules/, .env  ← the trap: the
#     .env is the only copy on the machine, which is why ignored paths are
#     listed apart and start unselected.
#   • A nested repository:         experiment/ — git clean refuses it
#     without -ff, so only the Trash route removes it.
R="$ROOT/untracked-mess"
new_repo "$R"

# The real project, committed.
mkdir -p "$R/src"
cat > "$R/src/app.js" <<'EOF'
import { render } from './render.js'
render(document.body)
EOF
cat > "$R/src/render.js" <<'EOF'
export function render(root) {
  root.textContent = 'hello'
}
EOF
echo "# Untracked mess" > "$R/README.md"
cat > "$R/.gitignore" <<'EOF'
dist/
node_modules/
.env
*.log
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial project"

# Untracked leftovers — the ordinary case, safe to remove.
echo "scratch notes, never committed" > "$R/notes.md"
echo "run 14: exit 0" > "$R/debug-output.txt"
mkdir -p "$R/tmp/cache"
rand_text 40 tmp > "$R/tmp/cache/blob.txt"
rand_text 10 tmp > "$R/tmp/scratch.txt"

# Ignored — build output, but also a secret with no copy anywhere else.
mkdir -p "$R/dist/assets"
rand_text 300 dist > "$R/dist/bundle.js"
rand_text 120 dist > "$R/dist/assets/app.css"
mkdir -p "$R/node_modules/left-pad"
echo '{"name":"left-pad","version":"1.3.0"}' > "$R/node_modules/left-pad/package.json"
rand_text 200 dep > "$R/node_modules/left-pad/index.js"
cat > "$R/.env" <<'EOF'
# The local-only secret every clean is one wrong checkbox away from.
API_KEY=local-dev-key-not-in-git
EOF
echo "2026-06-18T00:00:00Z [info] boot" > "$R/app.log"

# A nested repository: its own .git, so `git clean -fd` skips it and says so.
# At the top level on purpose — git collapses an untracked directory into its
# shallowest entry, so a repo buried inside one would never be listed by name.
new_repo "$R/experiment"
echo "spike, kept out of the parent history on purpose" > "$R/experiment/README.md"
git -C "$R/experiment" add -A
git -C "$R/experiment" commit -qm "spike"

summary "untracked-mess" "untracked leftovers + ignored dist/node_modules/.env + a nested repo — for Remove untracked files"
