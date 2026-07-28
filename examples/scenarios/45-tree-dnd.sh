# shellcheck shell=bash disable=SC2154
# 45. tree-dnd — drag & drop files/folders inside the Files tab.
#
# The sidebar's Files tab (right tab) is now a drop surface:
#   • Drag any row onto a FOLDER row  → moves the item into that folder.
#     The folder row fills with the accent color while it is the target.
#   • Drag onto a FILE row → lands in the folder that holds that file, and it is
#     the PARENT FOLDER row that lights up (VS Code behaviour).
#   • Drag onto the empty space under the tree, or onto a top-level file, → drops
#     at the REPOSITORY ROOT: the whole tree gets a dashed accent outline.
#   • Hovering a collapsed folder for ~0.7s springs it open mid-drag, so nested
#     folders are reachable without dropping first.
#   • Dropping files/folders from Finder (or any OS file manager) copies them in
#     at the hovered target. A path already inside this repo is MOVED, not
#     duplicated.
#   • Name already taken at the destination → a dialog asks: Replace (the old
#     entry goes to the Trash, recoverable) · Keep both (the new one lands as
#     "name 2.ext", counting up) · Cancel. Nothing is ever clobbered silently.
# Tracked paths move via `git mv` so history follows; untracked paths are a
# plain filesystem rename. Illegal drops are simply not accepted (no drop
# cursor, no highlight): a folder into itself or a descendant, and moving an
# item into the folder it already lives in.
#
# Layout committed here:
#   src/app.ts, src/util.ts          tracked, top of the tree
#   src/deep/nested/keep.ts          3 levels down — spring-loading target
#   lib/helpers.ts                   tracked
#   docs/readme.md                   tracked
#   loose.txt, draft.md              UNTRACKED, at the repo root
#   readme.md                        UNTRACKED clash material — docs/readme.md
#                                    already exists, so dropping it on docs/
#                                    triggers the Replace / Keep both dialog
#   vendor/                          tracked folder to drag wholesale
#
# How to test:
#   1. Open this repo → sidebar Files tab.
#   2. Drag loose.txt (untracked, root) onto the docs/ folder row. EXPECT: the
#      docs row highlights while hovered; on drop the file moves, docs/ expands
#      and shows loose.txt (still green/untracked).
#   3. Drag src/app.ts (tracked) onto lib/. EXPECT: move succeeds; the commit
#      panel shows it as a RENAME (blue "→" chip), not delete+add — proof that
#      `git mv` was used.
#   4. Drag lib/app.ts back onto the empty area below the last tree row.
#      EXPECT: dashed accent outline around the whole tree while hovering, and
#      the file lands back at the repo root.
#   5. Drag vendor/ (a whole folder) onto src/. EXPECT: folder moves with its
#      contents; expand src/ to confirm.
#   6. Spring-load: start dragging draft.md, hover src/ (collapsed) and hold.
#      EXPECT: src/ opens by itself after ~0.7s; keep hovering deep/, then
#      nested/, and drop into src/deep/nested/.
#   7. Drop onto a FILE row: drag draft.md onto the src/util.ts row. EXPECT: the
#      src/ folder row highlights (not util.ts), and draft.md lands in src/.
#      Then drag it onto the top-level docs/readme.md row → the tree gets the
#      dashed root outline and the file goes back to the root.
#   8. Illegal drops: drag src/ onto src/deep/ (folder into its own descendant)
#      and drag docs/readme.md onto docs/ (already there). EXPECT: no highlight,
#      no drop allowed, nothing changes.
#   9. External import: drag any file from Finder onto the lib/ row. EXPECT: it
#      is copied in and appears as untracked (green). Drag a Finder file onto
#      the empty area → lands at the repo root.
#  10. Name clash — Keep both: root also has a readme.md (docs/readme.md exists).
#      Drag the root readme.md onto docs/. EXPECT: dialog "Name already used";
#      choose Keep both → docs/ now holds readme.md AND "readme 2.md". Repeat
#      with another copy → "readme 3.md".
#  11. Name clash — Replace: put a readme.md back at the root, drag it onto docs/
#      and choose Replace. EXPECT: docs/readme.md has the new content and the old
#      one is in the macOS Trash (recoverable). Cancel in the same dialog must
#      leave everything untouched.
#  12. Undo check: every drop refreshes the tree and the commit panel, so staged
#      renames show up immediately in the changes list.
R="$ROOT/tree-dnd"
new_repo "$R"

mkdir -p "$R/src/deep/nested" "$R/lib" "$R/docs" "$R/vendor"
echo "export const app = 1" > "$R/src/app.ts"
echo "export const util = 2" > "$R/src/util.ts"
echo "export const keep = 3" > "$R/src/deep/nested/keep.ts"
echo "export const helper = 4" > "$R/lib/helpers.ts"
echo "# Docs" > "$R/docs/readme.md"
echo "vendored dependency" > "$R/vendor/dep.js"

git -C "$R" add -A
collab_commit "$R" "Playground" "playground@example.com" "chore: scaffold tree-dnd repo"

# Untracked drag material — these move with a plain fs rename (no git mv).
echo "drag me around" > "$R/loose.txt"
echo "# Draft" > "$R/draft.md"
# Same base name as docs/readme.md — drop it on docs/ to get the clash dialog.
echo "# Readme from the root" > "$R/readme.md"

summary "tree-dnd" "drag files/folders onto folder rows, file rows (→ their folder) or the root drop zone; Finder drops import; clashes ask Replace / Keep both"
