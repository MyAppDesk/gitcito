# shellcheck shell=bash disable=SC2154
# 52. conflict-radar — forecast which branches will conflict, before merging any.
#
# main has moved on since every branch was cut, so the repo holds one of each
# possible verdict at once:
#   • feature/rename-api    → conflicts in src/app.js
#   • feature/config-bump   → conflicts in src/config.js
#   • feature/big-refactor  → conflicts in app.js, config.js AND README.md
#   • feature/docs          → merges clean (touches a file main never moved)
#   • chore/merged          → already merged into main (nothing to do)
#   • legacy/import         → orphan branch, git refuses (unrelated histories)
#
# Verify:
#   • Tools menu (or ⌘K → "Conflict radar…", or right-click a branch) opens the
#     radar; it scans on open with "Merge into" = the current branch.
#   • Conflicting branches sort to the TOP, worst first: big-refactor (3 files)
#     above rename-api / config-bump (1 each). Counts pill reads "3 will
#     conflict, 1 clean, 1 already in, 1 failed".
#   • Click a conflicting row ⇒ expands to the exact conflicting paths.
#     legacy/import expands to git's "refusing to merge unrelated histories".
#   • "Contested files" at the bottom ranks src/app.js and src/config.js by how
#     many branches fight over them (2 each) with the branch names beside them.
#   • "Only risky" hides the clean/merged rows.
#   • Nothing is checked out and nothing changes: the working tree stays clean
#     (`git status` empty), HEAD and the branch list are untouched after a scan.
#   • After a scan, sidebar branch rows wear a coloured dot (red = will
#     conflict, green = clean, amber = git refused); merged branches show none.
#   • Switch "Merge into" to feature/docs and rescan ⇒ verdicts change.
#   • Scope buttons: Remote scans origin/* copies, All scans both.
R="$ROOT/conflict-radar"
new_repo "$R"

mkdir -p "$R/src"
printf 'export function start() {\n  return "v1"\n}\n' > "$R/src/app.js"
printf 'export const config = {\n  timeout: 1000\n}\n' > "$R/src/config.js"
printf '# Project\n\nA demo project.\n' > "$R/README.md"
git -C "$R" add -A && git -C "$R" commit -qm "init: app, config and readme"
BASE=$(git -C "$R" rev-parse HEAD)

# Every feature branch is cut from the same commit, then main moves under them.
git -C "$R" checkout -q -b feature/rename-api "$BASE"
printf 'export function boot() {\n  return "v1"\n}\n' > "$R/src/app.js"
git -C "$R" commit -qam "rename start() to boot()"

git -C "$R" checkout -q -b feature/config-bump "$BASE"
printf 'export const config = {\n  timeout: 5000\n}\n' > "$R/src/config.js"
git -C "$R" commit -qam "raise timeout to 5s"

git -C "$R" checkout -q -b feature/big-refactor "$BASE"
printf 'export function run() {\n  return "next"\n}\n' > "$R/src/app.js"
printf 'export const config = {\n  timeout: 250,\n  retries: 3\n}\n' > "$R/src/config.js"
printf '# Project\n\nRewritten docs.\n' > "$R/README.md"
git -C "$R" commit -qam "refactor: run(), retries and new docs"

# Touches a file main never moves ⇒ merges clean.
git -C "$R" checkout -q -b feature/docs "$BASE"
printf 'MIT\n' > "$R/LICENSE"
git -C "$R" add -A && git -C "$R" commit -qm "docs: add a license"

# Landed already: merge-tree sees a no-op merge and reports "already in".
git -C "$R" checkout -q -b chore/merged "$BASE"
printf 'node_modules/\n' > "$R/.gitignore"
git -C "$R" add -A && git -C "$R" commit -qm "chore: ignore node_modules"

git -C "$R" checkout -q main
git -C "$R" merge -q --no-ff -m "merge chore/merged" chore/merged

# main's own edits to the same lines the feature branches touched.
printf 'export function launch() {\n  return "v2"\n}\n' > "$R/src/app.js"
printf 'export const config = {\n  timeout: 2000\n}\n' > "$R/src/config.js"
printf '# Project\n\nA demo project, now documented on main.\n' > "$R/README.md"
git -C "$R" commit -qam "main: launch(), 2s timeout, better readme"

# An imported history with no common ancestor — git refuses to merge it, which
# also proves the radar keeps scanning the remaining branches after a refusal.
git -C "$R" checkout -q --orphan legacy/import
git -C "$R" rm -rq --cached . >/dev/null 2>&1 || true
rm -rf "$R/src" "$R/README.md" "$R/LICENSE" "$R/.gitignore"
printf 'print("legacy tool")\n' > "$R/legacy.py"
git -C "$R" add -A && git -C "$R" commit -qm "import legacy tool"

git -C "$R" checkout -q main

summary "conflict-radar" "Branches with every merge verdict (conflicts, clean, already merged, unrelated) to exercise the Conflict Radar."
