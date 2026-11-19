# shellcheck shell=bash disable=SC2154
# 69. worktree-care — one linked worktree in each state the WORKTREES section reports.
#
# Layout produced:
#   worktree-care/                 ← main worktree (HEAD on main)
#   worktree-care.wt-search        ← feature/search: 3 uncommitted files, 2 commits ahead of main
#   worktree-care.wt-ssd           ← release/2.x: locked, reason "on the external SSD"
#   (worktree-care.wt-spike)       ← spike/old-idea: folder deleted, only git's record left
#
# Verify:
#   • WORKTREES section ⇒ feature/search shows ●3 and ↑2.
#   • release/2.x shows a lock whose tooltip gives the reason; Remove and Move are disabled.
#   • spike/old-idea is struck through with a "missing" badge; the eraser button appears
#     in the section header, and right-click offers only Reconnect / Copy path / Forget.
R="$ROOT/worktree-care"
new_repo "$R"

cat > "$R/search.ts" <<'EOF'
export function search(items: string[], q: string): string[] {
  return items.filter((i) => i.includes(q))
}
EOF
cat > "$R/README.md" <<'EOF'
# Catalogue

A small catalogue with three worktrees in different states.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: catalogue with plain search"

git -C "$R" branch -q feature/search
git -C "$R" branch -q release/2.x
git -C "$R" branch -q spike/old-idea

# ── feature/search: work in progress, ahead of main ────────────────────────────
WT_SEARCH="$ROOT/worktree-care.wt-search"
git -C "$R" worktree add -q "$WT_SEARCH" feature/search
git -C "$WT_SEARCH" branch -q --set-upstream-to main
cat >> "$WT_SEARCH/search.ts" <<'EOF'

export const normalise = (s: string): string => s.toLowerCase().trim()
EOF
git -C "$WT_SEARCH" commit -qam "feat(search): normalise queries"
cat >> "$WT_SEARCH/search.ts" <<'EOF'
export const rank = (items: string[]): string[] => [...items].sort()
EOF
git -C "$WT_SEARCH" commit -qam "feat(search): rank results"
# Three uncommitted files: two edits and one new file.
printf '\nSearch is case-insensitive.\n' >> "$WT_SEARCH/README.md"
printf '\n// TODO: fuzzy matching\n' >> "$WT_SEARCH/search.ts"
printf 'export const fuzzy = true\n' > "$WT_SEARCH/fuzzy.ts"

# ── release/2.x: locked, as on a drive that is not always plugged in ───────────
WT_SSD="$ROOT/worktree-care.wt-ssd"
git -C "$R" worktree add -q "$WT_SSD" release/2.x
git -C "$R" worktree lock --reason "on the external SSD" "$WT_SSD"

# ── spike/old-idea: the folder was deleted by hand ─────────────────────────────
WT_SPIKE="$ROOT/worktree-care.wt-spike"
git -C "$R" worktree add -q "$WT_SPIKE" spike/old-idea
rm -rf "$WT_SPIKE"

summary "worktree-care" "3 linked worktrees: one with uncommitted work and commits ahead, one locked, one whose folder is gone"
