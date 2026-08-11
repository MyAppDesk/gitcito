# shellcheck shell=bash disable=SC2154
# 47. pinned-branches — exercise the pinned (favorite) branches sidebar group.
#
# Builds a repo with enough local branches that the ones you care about (main,
# develop, release/2.x) drown in the list — the exact scenario pinning solves.
#
# Verify:
#   • Hover a branch row in Local ⇒ a star appears at the right edge; clicking
#     it pins the branch. Right-click ⇒ "Pin branch" does the same.
#   • Pinned branches show in a "Pinned" group at the TOP of Local (star icon),
#     in the order they were pinned, and stay in their normal spot below too.
#   • Star on a pinned row is filled/accent and always visible; clicking it (or
#     "Unpin branch" in the context menu) removes it from the group.
#   • Pins persist per-repo: switch repo tabs and back, restart the app — the
#     Pinned group is unchanged. Other repos are unaffected.
#   • The sidebar filter applies to the Pinned group as well.
#   • Delete a pinned branch ⇒ it disappears from the Pinned group (no ghost).
R="$ROOT/pinned-branches"
new_repo "$R"

echo "console.log('hi')" > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "main: initial app"

# The branches worth pinning.
git -C "$R" branch develop
git -C "$R" branch release/2.x

# Noise: plenty of feature/bugfix branches to bury the important ones.
for b in feature/login feature/signup feature/checkout feature/search feature/profile \
         bugfix/crash-on-start bugfix/memory-leak bugfix/flicker bugfix/typo \
         chore/deps chore/ci experiment/new-graph experiment/dark-mode; do
  git -C "$R" branch "$b"
done

summary "pinned-branches" "Many local branches; pin main/develop/release-2.x and verify the Pinned group at the top of Local."
