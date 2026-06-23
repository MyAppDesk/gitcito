# shellcheck shell=bash disable=SC2154
# 36. diverged-checkout — local `feature` and origin/feature have each gained a
# different commit on top of the same base. Double-clicking origin/feature
# ("checkout as local branch") can't fast-forward, so Gitcito surfaces the
# rebase / merge / reset divergence dialog instead of a raw git error.
ORIGIN_BARE="$ROOT/diverged-checkout-origin.git"

SEED="$ROOT/_seed_dc"
new_repo "$SEED"

cat > "$SEED/app.ts" <<'EOF'
export const VERSION = '1.0.0'
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "initial commit"

git -C "$SEED" checkout -q -b feature
cat > "$SEED/feature.ts" <<'EOF'
export const feature = () => 'wip'
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: start feature"

# Bare-clone with seed on main so origin's default branch (and the working
# clone's checkout) is main, not feature.
git -C "$SEED" checkout -q main
git clone -q --bare "$SEED" "$ORIGIN_BARE"

R="$ROOT/diverged-checkout"
git clone -q "$ORIGIN_BARE" "$R"
git -C "$R" config user.name "Playground"
git -C "$R" config user.email "playground@example.com"

# Create the local `feature` branch and add a local-only commit.
git -C "$R" checkout -q -b feature --track origin/feature
cat >> "$R/feature.ts" <<'EOF'
export const localOnly = () => 'added locally'
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: local tweak to feature (not pushed)"

# Start the user off main so checking out origin/feature is the action under test.
git -C "$R" checkout -q main

# Meanwhile origin/feature gains a different commit via the seed.
git -C "$SEED" checkout -q feature
cat >> "$SEED/feature.ts" <<'EOF'
export const remoteOnly = () => 'added on remote'
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: remote tweak to feature"
git -C "$SEED" push -q "$ORIGIN_BARE" feature

# Working repo now sees the divergence after a fetch.
git -C "$R" fetch -q origin
rm -rf "$SEED"

summary "diverged-checkout" "local feature & origin/feature diverged (1 commit each) — double-click origin/feature to trigger the rebase/merge/reset dialog"
