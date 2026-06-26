# shellcheck shell=bash disable=SC2154
# 38. launch-configs — exercise the LAUNCH picker (.vscode/launch.json).
#
# Gitcito surfaces a Run/Launch dropdown in the sidebar (next to GIT / FILES)
# whenever a repo has a .vscode/launch.json (and the setting is on). This repo
# seeds TWO launch.json files so you can see the divider behaviour:
#   • root .vscode/launch.json   → group "Workspace" (3 configs, one with a
#                                   preLaunchTask wired to tasks.json)
#   • services/api/.vscode/...   → a deeper group, listed after a divider
# Every config runs a tiny, dependency-free Node script so you can actually hit
# Run and watch it stream in the integrated terminal, then pause / restart /
# stop it from the floating debug toolbar.
R="$ROOT/launch-configs"
new_repo "$R"

mkdir -p "$R/.vscode" "$R/scripts" "$R/services/api/.vscode" "$R/services/api/src"

# ── A couple of runnable Node scripts (no deps) ──────────────────────────
cat > "$R/scripts/hello.js" <<'EOF'
// Prints a friendly banner and exits — the simplest possible launch target.
console.log('👋  Hello from Gitcito launch!')
console.log('args:', process.argv.slice(2).join(' ') || '(none)')
console.log('GREETING =', process.env.GREETING || '(unset)')
EOF

cat > "$R/scripts/watch.js" <<'EOF'
// A long-running ticker — great for testing Pause / Resume / Stop / Restart.
let n = 0
console.log('⏱   watcher started — Ctrl+C or the Stop button to end')
setInterval(() => console.log(`tick ${++n}  @ ${new Date().toLocaleTimeString()}`), 1000)
EOF

cat > "$R/scripts/build.js" <<'EOF'
// Stand-in "build" used as a preLaunchTask before the app runs.
console.log('🔧  building… (preLaunchTask)')
console.log('✓  build complete')
EOF

# ── Root launch.json — three configs, JSONC with comments + a preLaunchTask ──
cat > "$R/.vscode/launch.json" <<'EOF'
{
  // VS Code-style launch configs. Gitcito runs the ones it understands.
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run hello",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/hello.js",
      "args": ["--from", "gitcito"],
      "env": { "GREETING": "hola" }
    },
    {
      "name": "Watch (long-running)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/watch.js"
    },
    {
      "name": "Run hello (after build)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/hello.js",
      "preLaunchTask": "build"
    }
  ]
}
EOF

cat > "$R/.vscode/tasks.json" <<'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "node",
      "args": ["${workspaceFolder}/scripts/build.js"]
    }
  ]
}
EOF

# ── A deeper .vscode/launch.json (services/api) — shown after a divider ──────
cat > "$R/services/api/src/server.js" <<'EOF'
console.log('🚀  api service booting on port', process.env.PORT || 3000)
console.log('   (this demo exits immediately — swap in your real server)')
EOF

cat > "$R/services/api/.vscode/launch.json" <<'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "API service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.js",
      "env": { "PORT": "4000" }
    }
  ]
}
EOF

cat > "$R/README.md" <<'EOF'
# Launch demo

Open the **LAUNCH** dropdown in the sidebar (next to GIT / FILES) and pick a
configuration. The root `.vscode/launch.json` configs appear under *Workspace*;
`services/api/.vscode/launch.json` appears after a divider. Running one streams
its output in the terminal — use the floating debug bar to pause / restart / stop.
EOF

git -C "$R" add -A && git -C "$R" commit -qm "chore: seed launch + tasks configs"

summary "launch-configs" "LAUNCH picker: root .vscode/launch.json (Workspace, 3 configs incl. preLaunchTask) + nested services/api after a divider — Run streams in terminal, debug bar pauses/restarts/stops"
