# shellcheck shell=bash disable=SC2154
# 40. terminal-per-tab — terminal-pane visibility is now remembered per repo/tab.
#
# Before: the bottom terminal pane was a single GLOBAL toggle. Opening it on one
# tab opened it on ALL tabs; switching to a tab you'd never opened a terminal on
# still showed the pane. Now the open/closed state is keyed per repo path:
#   • Open the terminal on tab A → it stays closed on tab B (never opened).
#   • Switch back to tab A → its terminal is still there, exactly as left.
#   • Killing the last terminal in a tab auto-closes only THAT tab's pane.
#   • A Run/Debug launch opens the pane only for the launching repo.
#
# This is a multi-tab UI-state feature, so it needs TWO repos open as tabs. This
# scenario builds one small repo; pair it with ANY other playground repo (or a
# second copy) as the second tab. The repo itself just gives the terminal a cwd.
#
# How to test:
#   1. Open this repo (tab A) AND any other playground repo (tab B) — two tabs.
#   2. On tab A: click the terminal toggle in the toolbar (or ⌘K → Terminal).
#      Pane opens, shows a shell at this repo's path.
#   3. Switch to tab B. EXPECT: terminal pane is CLOSED (you never opened it here).
#   4. Switch back to tab A. EXPECT: terminal pane still OPEN, same session.
#   5. Open the terminal on tab B too, then kill its last terminal. EXPECT: only
#      tab B's pane closes; tab A's stays open when you switch back.
R="$ROOT/terminal-per-tab"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# terminal-per-tab

A tiny repo used to verify the bottom terminal pane remembers its open/closed
state per tab. Open this alongside another repo and toggle the terminal on only
one of them.
EOF

cat > "$R/run.sh" <<'EOF'
#!/usr/bin/env bash
echo "hello from the per-tab terminal"
EOF
chmod +x "$R/run.sh"

git -C "$R" add -A
collab_commit "$R" "Playground" "playground@example.com" "chore: scaffold terminal-per-tab repo"

summary "terminal-per-tab" "bottom terminal pane visibility is remembered per repo/tab (open on A, still closed on B)"
