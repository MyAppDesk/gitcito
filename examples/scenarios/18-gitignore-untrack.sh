# shellcheck shell=bash disable=SC2154
# 18. gitignore-untrack — exercise right-click "Add to .gitignore" / "Stop tracking".
#
# Leaves the repo with a mix of states so every menu branch is reachable:
#   • Tracked files that SHOULD be ignored (committed by mistake, left dirty so
#     they appear in the commit panel right away):
#       - .env                  → secret accidentally committed
#       - debug.log             → log accidentally committed
#       - build/                → a whole folder of build output, tracked
#   • Untracked files/folders (only "Add to .gitignore" applies):
#       - cache.tmp             → loose untracked file
#       - node_modules/         → untracked folder
# No .gitignore exists yet, so you can create it from the context menu.
R="$ROOT/gitignore-untrack"
new_repo "$R"

# Real project files (these stay tracked).
cat > "$R/index.js" <<'EOF'
import { config } from './config.js'
console.log(`starting ${config.name}`)
EOF
cat > "$R/config.js" <<'EOF'
export const config = { name: 'demo', port: 3000 }
EOF
echo "# Demo project" > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "initial project files"

# Oops — a secret and a log file get committed.
cat > "$R/.env" <<'EOF'
API_KEY=sk-do-not-commit-me-1234567890
DATABASE_URL=postgres://user:password@localhost:5432/demo
EOF
echo "2026-06-18T00:00:00Z [info] boot sequence started" > "$R/debug.log"
git -C "$R" add -A && git -C "$R" commit -qm "add config (accidentally commits .env + debug.log)"

# Oops again — a whole build/ folder of generated output gets committed.
mkdir -p "$R/build/assets"
echo "console.log('bundled')" > "$R/build/bundle.js"
echo "body{margin:0}" > "$R/build/assets/style.css"
git -C "$R" add -A && git -C "$R" commit -qm "commit build output (should have been ignored)"

# Untracked noise that was never committed — only "Add to .gitignore" applies here.
echo "transient" > "$R/cache.tmp"
mkdir -p "$R/node_modules/left-pad"
echo '{"name":"left-pad"}' > "$R/node_modules/left-pad/package.json"

# Leave the tracked-but-should-be-ignored files DIRTY so they surface in the
# commit panel immediately (a clean tracked file isn't listed). Now you can
# right-click .env / debug.log and exercise "Add to .gitignore & stop tracking"
# without having to touch them first.
echo "API_KEY=sk-do-not-commit-me-1234567890" >> "$R/.env"
echo "2026-06-18T00:05:00Z [warn] still logging to a committed file" >> "$R/debug.log"
echo "console.log('rebundled')" > "$R/build/bundle.js"

summary "gitignore-untrack" "tracked .env/debug.log/build (dirty) + untracked cache.tmp/node_modules to ignore & untrack"
