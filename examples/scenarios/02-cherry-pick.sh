# shellcheck shell=bash disable=SC2154
# 02. cherry-pick — cherry-pick two `feature` commits (one clean, one conflicting).
R="$ROOT/cherry-pick"
new_repo "$R"

cat > "$R/config.json" <<'EOF'
{
  "name": "demo",
  "version": "1.0.0"
}
EOF
echo "line 1" > "$R/log.txt"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb feature
echo "a brand new file, applies cleanly anywhere" > "$R/clean-addition.txt"
git -C "$R" add -A && git -C "$R" commit -qm "add clean-addition.txt (cherry-picks cleanly)"

cat > "$R/config.json" <<'EOF'
{
  "name": "demo-feature",
  "version": "2.0.0-feature"
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "bump version on feature (will CONFLICT when cherry-picked)"

git -C "$R" checkout -q main
cat > "$R/config.json" <<'EOF'
{
  "name": "demo-main",
  "version": "1.5.0-main"
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "main: rename package"

summary "cherry-pick" "cherry-pick two 'feature' commits (one clean, one conflicting)"
