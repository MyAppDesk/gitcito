# shellcheck shell=bash disable=SC2154
# 43. tree-badges — collapsed folders in the Files tab show aggregate change counts.
#
# The sidebar's Files tab (right tab) previously marked a changed folder with a
# single colored dot. Collapsed folders now show summed per-status badges, like
# other Git UIs: "+N" added/untracked (green), "✎N" modified/renamed (yellow),
# "−N" deleted (red), "!N" conflicted (red). Expanding a folder hides its badges
# (the children show their own status); the plain dot remains for expanded
# folders. Rows also highlight on hover (was nearly invisible before).
#
# This repo commits a nested tree, then dirties it so each folder aggregates a
# distinct mix:
#   • assets/      → 1 modified + 1 renamed (staged) EXPECT: ✎1 →1 (arrow badge, blue)
#   • icons/       → 2 untracked + 1 modified       EXPECT: +2 ✎1
#   • lib/         → 1 modified + 1 deleted         EXPECT: ✎1 −1
#   • lib/nested/  → the deleted file lives here    EXPECT (on lib collapsed): counts
#     include nested children; expand lib → nested/ shows its own −1.
# Moved/renamed files show a blue "→" chip (commit panel) and blue name (Files
# tab); commit file lists detect renames too (moved file = one → entry, not +/−).
#
# How to test:
#   1. Open this repo, go to the sidebar's Files tab.
#   2. Hover any row. EXPECT: visible row highlight (folders and files alike).
#   3. All folders start collapsed. EXPECT badges per the table above, colored
#      green/yellow/red, right-aligned on each folder row.
#   4. Expand lib/. EXPECT: lib's badges disappear (dot remains), nested/ shows
#      its own −1 badge while collapsed.
#   5. Ignored files must NOT count: ignored.log exists under assets/ and is
#      gitignored — assets/ stays at ✎1.
#   6. Same badges in the commit panel's changes list (details panel, tree view
#      mode — Settings → file list "tree"): collapse a folder there and EXPECT
#      the same summed counts; folder rows highlight on hover too.
R="$ROOT/tree-badges"
new_repo "$R"

mkdir -p "$R/assets" "$R/icons" "$R/lib/nested"
echo "logo" > "$R/assets/logo.txt"
echo "styles" > "$R/assets/styles.css"
echo "old icon" > "$R/icons/app.svg"
echo "core" > "$R/lib/core.js"
echo "util" > "$R/lib/nested/util.js"
echo "ignored.log" > "$R/.gitignore"

git -C "$R" add -A
collab_commit "$R" "Playground" "playground@example.com" "chore: scaffold tree-badges repo"

# Dirty the tree: modified / untracked / deleted / ignored mixes per folder.
echo "logo v2" > "$R/assets/logo.txt"            # assets: ✎1
echo "noise" > "$R/assets/ignored.log"           # ignored — must not count
echo "new" > "$R/icons/new-icon.svg"             # icons: +1
echo "extra" > "$R/icons/extra-icon.svg"         # icons: +2
echo "old icon v2" > "$R/icons/app.svg"          # icons: ✎1
echo "core v2" > "$R/lib/core.js"                # lib: ✎1
rm "$R/lib/nested/util.js"                       # lib: −1 (inside nested/)
git -C "$R" mv assets/styles.css assets/theme.css # assets: →1 (staged rename)

summary "tree-badges" "collapsed folders in the Files tab show +added ✎modified −deleted badges; rows highlight on hover"
