# shellcheck shell=bash disable=SC2154
# 10. detached-head — 5 commits + a stable branch, then HEAD detached at commit 3.
R="$ROOT/detached-head"
new_repo "$R"

for i in 1 2 3 4 5; do
  printf 'version: %d\nbuild: %d\n' "$i" "$((i * 100))" > "$R/version.txt"
  printf '=== Entry #%d ===\nBuild %d shipped.\n\n' "$i" "$((i * 100))" >> "$R/history.log"
  git -C "$R" add -A && git -C "$R" commit -qm "chore: bump to version $i (build $((i * 100)))"
done

git -C "$R" checkout -qb stable HEAD~1  # stable points at commit 4
git -C "$R" checkout -q main            # back to commit 5

TARGET=$(git -C "$R" rev-parse HEAD~2)  # commit 3
git -C "$R" checkout -q "$TARGET"
# HEAD is now detached at version 3; main→v5, stable→v4

summary "detached-head" "HEAD detached at version 3; main→v5, stable→v4"
