# shellcheck shell=bash disable=SC2154
# 03. stash-picking — a stash with several files (incl. an untracked one) for partial apply.
R="$ROOT/stash-picking"
new_repo "$R"

echo "alpha v1" > "$R/alpha.txt"
echo "beta v1"  > "$R/beta.txt"
mkdir -p "$R/src"
echo "gamma v1" > "$R/src/gamma.txt"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

echo "alpha v2 (stashed change)" > "$R/alpha.txt"
echo "beta v2 (stashed change)"  > "$R/beta.txt"
echo "gamma v2 (stashed change)" > "$R/src/gamma.txt"
echo "delta — untracked file captured by the stash" > "$R/delta-untracked.txt"
git -C "$R" stash push -u -m "WIP: alpha+beta+gamma edits and a new untracked file"

summary "stash-picking" "click the stash node and apply only some files"
