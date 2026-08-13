# shellcheck shell=bash disable=SC2154
# 50. file-nav — walk file lists with ↑/↓ (or j/k), like the commit graph.
#
# Seeds long file lists in the three places the keyboard walks:
#   • a commit touching 12 files across nested folders (commit details panel,
#       in both the flat "path" view and the "tree" view where collapsing a
#       folder must make the arrows skip its files)
#   • an unstaged list of 7 files
#   • a staged list of 5 files
# The lists are long enough to overflow their panes, so the row the arrows
# select has to scroll itself into view.
R="$ROOT/file-nav"
new_repo "$R"

mkdir -p "$R/src/api" "$R/src/ui/widgets" "$R/src/util" "$R/docs"

# ── Commit 1: small baseline so commit 2 shows as modifications ──────────
for f in src/api/users.ts src/api/orders.ts src/ui/app.ts; do
  rand_text 12 "base" > "$R/$f"
done
git -C "$R" add -A && git -C "$R" commit -qm "baseline: api + ui skeleton"

# ── Commit 2: 12 files, several folders deep ─────────────────────────────
# Select this commit and hold ↓ — every row opens in the center panel.
files=(
  src/api/users.ts
  src/api/orders.ts
  src/api/invoices.ts
  src/ui/app.ts
  src/ui/widgets/button.ts
  src/ui/widgets/dialog.ts
  src/ui/widgets/table.ts
  src/util/date.ts
  src/util/money.ts
  src/util/text.ts
  docs/architecture.md
  README.md
)
for f in "${files[@]}"; do
  rand_text 20 "${f##*/}" > "$R/$f"
done
git -C "$R" add -A && git -C "$R" commit -qm "wide change: touch 12 files across api, ui, util, docs"

# ── Working tree: 5 staged + 7 unstaged files for the WIP panel ──────────
staged=(
  src/api/users.ts
  src/api/orders.ts
  src/ui/widgets/button.ts
  src/util/date.ts
  docs/architecture.md
)
for f in "${staged[@]}"; do
  rand_text 20 "staged-${f##*/}" > "$R/$f"
done
git -C "$R" add "${staged[@]}"

unstaged=(
  src/api/invoices.ts
  src/ui/app.ts
  src/ui/widgets/dialog.ts
  src/ui/widgets/table.ts
  src/util/money.ts
  src/util/text.ts
  README.md
)
for f in "${unstaged[@]}"; do
  rand_text 20 "wip-${f##*/}" > "$R/$f"
done

# An untracked file lands in the unstaged list too — arrows must include it.
rand_text 8 "scratch" > "$R/src/util/scratch.ts"

summary "file-nav" "long file lists for ↑/↓ (or j/k) keyboard walking: a 12-file commit plus 5 staged / 8 unstaged WIP files"
