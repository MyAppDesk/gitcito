# shellcheck shell=bash disable=SC2154
# 41. panel-layout — configurable workspace layout (Settings → Layout).
#
# The bottom terminal, sidebar and details panel can now be rearranged from a
# dedicated Settings → Layout page with a live schematic preview:
#   • Terminal placement — Bottom (full width) | Center (under the graph only,
#     sidebars stay full height) | Right (its own full-height column).
#   • Sidebar side       — dock the branches/files sidebar Left or Right.
#   • Full-height details panel — in Bottom placement, keep the terminal out
#     from under the details panel so that panel runs the whole height.
#   • Reset panel sizes  — restore every panel width/height to defaults.
# Sidebar width, terminal size and the details-panel width remain drag-resizable
# and are remembered; terminal open/closed state is per-tab (see terminal-per-tab).
#
# This is a UI-only feature; the repo just gives the graph, a selectable commit
# (details panel) and a terminal cwd so every panel has real content while you
# try the layouts.
#
# How to test:
#   1. Open this repo. Click a commit row → details panel opens on the right.
#      Open the terminal (toolbar toggle or ⌘K → Terminal).
#   2. Open Settings (⌘,) → Layout. The schematic mirrors the current layout.
#   3. Terminal placement → Center. EXPECT: terminal moves under the graph only;
#      sidebar + details panel now run full height. Preview updates to match.
#   4. Terminal placement → Right. EXPECT: terminal becomes a right-hand column
#      with a left-edge drag handle.
#   5. Sidebar side → Right. EXPECT: the sidebar jumps to the right edge; its
#      resize handle follows to its inner edge.
#   6. Placement → Bottom, toggle "Full-height details panel". EXPECT: the
#      bottom terminal no longer spans under the details panel.
#   7. Drag a couple of panels to odd sizes, then "Reset panel sizes". EXPECT:
#      all panels snap back to defaults and a confirmation toast appears.
R="$ROOT/panel-layout"
new_repo "$R"

cat > "$R/README.md" <<'EOF'
# panel-layout

Scratch repo for exercising the configurable workspace layout in
Settings → Layout: terminal placement, sidebar side, full-height details
panel, and reset-panel-sizes.
EOF

mkdir -p "$R/src"
cat > "$R/src/app.js" <<'EOF'
export function main() {
  console.log('panel layout playground')
}
EOF

git -C "$R" add -A
collab_commit "$R" "Ada Lovelace" "ada@example.com" "feat: scaffold panel-layout playground"

# A second commit so there is a graph and a selectable row for the details panel.
printf '\nexport const VERSION = 2\n' >> "$R/src/app.js"
git -C "$R" add -A
collab_commit "$R" "Grace Hopper" "grace@example.com" "chore: bump version constant"

summary "panel-layout" "configurable workspace layout — terminal placement, sidebar side, full-height details panel, reset sizes (Settings → Layout)"
