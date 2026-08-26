# shellcheck shell=bash disable=SC2154
# 38. launch-configs — exercise the LAUNCH picker (.vscode/launch.json).
#
# Gitcito surfaces a Run/Launch dropdown in the sidebar (next to GIT / FILES)
# whenever a repo has a .vscode/launch.json (and the setting is on). This repo
# seeds TWO launch.json files so you can see the divider behaviour:
#   • root .vscode/launch.json   → group "Workspace" (a preLaunchTask wired to
#                                   tasks.json, a config that prompts for
#                                   ${input:} values, an isBackground dev server,
#                                   a stopAll compound that runs two services as
#                                   parallel sessions, and a serverReadyAction
#                                   server that opens the browser when ready)
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

cat > "$R/scripts/serve.js" <<'EOF'
// A never-exiting dev server — used as an isBackground preLaunchTask so the
// launch doesn't block waiting for it to finish (Gitcito runs it detached).
console.log('🌐  dev server listening — left running in the background')
setInterval(() => {}, 1000)
EOF

# Two long-running "services" — launched together by the compound below, each
# in its own parallel session (VS Code-style), stopped together via stopAll.
cat > "$R/scripts/svc-a.js" <<'EOF'
let n = 0
console.log('🛰   service A up — one member of the "Run both services" compound')
setInterval(() => console.log(`[A] beat ${++n}`), 1500)
EOF

cat > "$R/scripts/svc-b.js" <<'EOF'
let n = 0
console.log('🛰   service B up — one member of the "Run both services" compound')
setInterval(() => console.log(`[B] beat ${++n}`), 1500)
EOF

# A task both services depend on — Gitcito runs it ONCE per compound launch
# (its own pane, before the members), exactly like VS Code's shared tasks.
cat > "$R/scripts/prep.js" <<'EOF'
console.log('🔧  prep — runs once for the whole compound, not once per member')
console.log('✓  prep complete')
EOF

cat > "$R/scripts/serve-ready.js" <<'EOF'
// A real tiny HTTP server that announces its URL — exercises serverReadyAction:
// Gitcito watches the output and opens the printed URL in your browser.
const http = require('http')
const srv = http.createServer((_q, res) => res.end('Hello from the launch demo!\n'))
srv.listen(0, () => console.log(`- Local:   http://localhost:${srv.address().port}`))
EOF

# ── A stand-in `flutter` on PATH — exercises the HOT ACTIONS ────────────────
# The debug toolbar reads the command line, spots `flutter run` and offers the
# keys that CLI listens for (r = hot reload, R = hot restart). This shim answers
# them exactly like the real thing so the fast path is demonstrable without a
# Flutter SDK on the machine.
mkdir -p "$R/lib"
cat > "$R/lib/main.dart" <<'EOF'
// A stand-in entrypoint: the launch config points here, the shim fakes the run.
void main() => print('hello from the launch demo');
EOF

cat > "$R/scripts/flutter" <<'EOF'
#!/usr/bin/env node
// Fake `flutter run`: the same banner and the same interactive keys.
const out = (s) => process.stdout.write(s + '\n')
out('Launching lib/main.dart on iPhone 16 Pro in debug mode...')
out('Running Xcode build...  \x1b[32m✓\x1b[0m  Built build/ios/iphonesimulator/Runner.app')
out('Syncing files to device iPhone 16 Pro...                     412ms')
out('')
out('\x1b[1mFlutter run key commands.\x1b[0m')
out('r Hot reload. 🔥🔥🔥')
out('R Hot restart.')
out('p Toggle the display of construction lines (debugPaintSizeEnabled).')
out('P Toggle performance overlay.')
out('o Toggle platform (iOS / Android).')
out('v Open Flutter DevTools.')
out('q Quit (terminate the application on the device).')
out('')
out('A Dart VM Service on iPhone 16 Pro is available at: http://127.0.0.1:53412/uJ8k=/')
let libs = 3
let platform = 'iOS'
const keys = {
  r: () => { out('\nPerforming hot reload...'); setTimeout(() => out(`\x1b[32mReloaded ${libs++} of 718 libraries in 231ms.\x1b[0m`), 220) },
  R: () => { out('\nPerforming hot restart...'); setTimeout(() => out('\x1b[32mRestarted application in 1,148ms.\x1b[0m'), 700) },
  p: () => out('\nToggled debug paint.'),
  P: () => out('\nToggled performance overlay.'),
  o: () => { platform = platform === 'iOS' ? 'Android' : 'iOS'; out(`\nSwitched target platform to ${platform}.`) },
  v: () => out('\nThe Flutter DevTools debugger is available at: http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/')
}
if (process.stdin.isTTY) process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => {
  for (const ch of d) {
    if (ch === 'q' || ch === '\u0003') process.exit(0)
    keys[ch]?.()
  }
})
setInterval(() => {}, 1000)
EOF
chmod +x "$R/scripts/flutter"

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
      // Hot actions: the toolbar spots `flutter run` and offers r / R, which
      // reload the app in place instead of restarting the whole config.
      "name": "Flutter app (hot reload)",
      "type": "node-terminal",
      "request": "launch",
      "command": "env PATH=\"${workspaceFolder}/scripts:$PATH\" flutter run -t lib/main.dart"
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
    },
    {
      "name": "Run hello (ask for a greeting)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/hello.js",
      "args": ["--from", "${input:who}"],
      "env": { "GREETING": "${input:greeting}" }
    },
    {
      "name": "Run hello (after dev server)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/hello.js",
      "preLaunchTask": "serve"
    },
    {
      "name": "Run hello (secret token)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/hello.js",
      "env": { "GREETING": "${input:token}" }
    },
    {
      "name": "Service A",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/svc-a.js",
      "preLaunchTask": "prep"
    },
    {
      "name": "Service B",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/svc-b.js",
      "preLaunchTask": "prep"
    },
    {
      "name": "Server (opens browser when ready)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/serve-ready.js",
      "serverReadyAction": {
        "pattern": "Local:\\s+(https?://localhost:\\d+)",
        "uriFormat": "%s",
        "action": "openExternally"
      }
    }
  ],
  // A compound runs its members as parallel sessions; stopAll stops them together.
  "compounds": [
    {
      "name": "Run both services",
      "configurations": ["Service A", "Service B"],
      "stopAll": true
    }
  ],
  "inputs": [
    {
      "id": "who",
      "type": "promptString",
      "description": "Who is saying hello?",
      "default": "gitcito"
    },
    {
      "id": "greeting",
      "type": "pickString",
      "description": "Pick a greeting",
      "default": "hola",
      "options": ["hola", "hello", "bonjour", "ciao"]
    },
    {
      "id": "token",
      "type": "promptString",
      "description": "Paste a secret token (input is masked)",
      "password": true
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
    },
    {
      "label": "serve",
      "type": "shell",
      "command": "node",
      "args": ["${workspaceFolder}/scripts/serve.js"],
      "isBackground": true
    },
    {
      "label": "prep",
      "type": "shell",
      "command": "node",
      "args": ["${workspaceFolder}/scripts/prep.js"]
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

summary "launch-configs" "LAUNCH picker: root .vscode/launch.json (Workspace: preLaunchTask, \${input:} prompts, isBackground task, a stopAll compound running two parallel services, and a serverReadyAction server) + nested services/api after a divider — Run streams in terminal, debug bar pauses/restarts/stops"
