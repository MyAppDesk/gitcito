# shellcheck shell=bash disable=SC2154
# 35. terminal-naming — exercise terminal tab/group naming (auto + manual).
#
# The integrated terminal list (right rail of the bottom pane) now names each
# terminal like VSCode:
#   • Auto title  — each row shows the foreground process running in its PTY
#     (zsh when idle; flips to vim/git/node/claude/etc. while one runs). Polled
#     ~every 2s from node-pty's foreground-process getter.
#   • Manual alias — double-click a row's label, or right-click → Rename…, to set
#     your own name. A manual alias always WINS over the auto title; clear it
#     (rename to empty) to fall back to auto again.
#   • Right-click menu — group row: Rename… / Split terminal / Kill terminal;
#     split-child row: Rename… / Kill panel.
#
# How to test (UI-only feature; this repo just gives the terminal a cwd):
#   1. Open this repo, open the bottom pane (terminal toggle).
#   2. Idle row should read "zsh". Run `vim` (or `git log`, `top`) → label flips
#      to the process name; quit it → back to "zsh".
#   3. Double-click the label → inline input. Type "build", Enter → stays "build"
#      even while a process runs. Esc cancels an edit.
#   4. Split the terminal (split icon or right-click → Split terminal). Each child
#      panel row gets its own auto title; rename one via right-click → Rename….
#   5. Rename a manual alias back to empty → reverts to the live process name.
R="$ROOT/terminal-naming"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# terminal-naming playground

Open the integrated terminal and try:
- run `vim`, `git log`, `top` → the terminal row auto-names to the process
- double-click a row to rename it (manual alias overrides auto)
- right-click a row for Rename / Split / Kill
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: terminal naming playground"

summary "terminal-naming" "terminal tabs auto-name to the running process; double-click or right-click → Rename… to set a manual alias (alias wins; clear it to revert to auto)"
