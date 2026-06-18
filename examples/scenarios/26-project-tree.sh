# shellcheck shell=bash disable=SC2154
# 26. project-tree — exercise the Files sidebar section (VSCode-style explorer).
#
# Lays out a nested directory tree where every status decoration is reachable so
# you can eyeball the colors and the folder change-dots, and right-click every
# context-menu branch (open/edit, new, rename, trash, ignore, untrack):
#   • clean tracked      → src/app.ts, README.md           (default color)
#   • modified           → src/util.ts                     (yellow)
#   • added (staged)     → src/new-feature.ts              (green, staged)
#   • untracked          → scratch.todo, src/draft.ts      (green)
#   • deleted            → src/legacy.ts                   (red, strikethrough)
#   • renamed            → docs/intro.md → docs/guide.md    (yellow)
#   • ignored            → dist/, .env                     (dim grey)
# Nested folders (src/, docs/, dist/) show change-dots when something inside
# them changed, so expand/collapse + aggregation is visible.
R="$ROOT/project-tree"
new_repo "$R"

mkdir -p "$R/src" "$R/docs"

# ── Baseline commit: a small, clean project ──────────────────────────────
cat > "$R/README.md" <<'EOF'
# Tree Demo
A repo for exercising the project tree view.
EOF
cat > "$R/src/app.ts" <<'EOF'
export function main(): void {
  console.log('hello tree')
}
EOF
cat > "$R/src/util.ts" <<'EOF'
export const add = (a: number, b: number): number => a + b
EOF
cat > "$R/src/legacy.ts" <<'EOF'
// soon to be deleted
export const old = true
EOF
cat > "$R/docs/intro.md" <<'EOF'
# Introduction
Read me first.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial project tree"

# ── Now dirty it up so each status decoration is present ─────────────────
# modified
echo "export const sub = (a: number, b: number): number => a - b" >> "$R/src/util.ts"

# deleted (removed from working tree, still tracked)
rm "$R/src/legacy.ts"

# renamed (staged rename so it shows as R)
git -C "$R" mv "$R/docs/intro.md" "$R/docs/guide.md"

# added (new file, staged)
cat > "$R/src/new-feature.ts" <<'EOF'
export const feature = () => 'shiny'
EOF
git -C "$R" add "$R/src/new-feature.ts"

# untracked (never added)
echo "- [ ] try the tree view" > "$R/scratch.todo"
cat > "$R/src/draft.ts" <<'EOF'
// work in progress, not staged
export const draft = 1
EOF

# ignored (gitignored content — should render dim grey)
cat > "$R/.gitignore" <<'EOF'
/dist/
/.env
EOF
git -C "$R" add "$R/.gitignore" && git -C "$R" commit -qm "add .gitignore"
mkdir -p "$R/dist/assets"
echo "console.log('bundled')" > "$R/dist/bundle.js"
echo "body{margin:0}" > "$R/dist/assets/style.css"
echo "SECRET=do-not-commit" > "$R/.env"

summary "project-tree" "files section: clean/modified/added/untracked/deleted/renamed/ignored + nested folders"
