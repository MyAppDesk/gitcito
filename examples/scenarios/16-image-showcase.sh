# shellcheck shell=bash disable=SC2154
# 16. image-showcase — the same image committed twice (before → after) so the
# image diff shows a real before/after of the mascot illustration instead of a
# tiny generated swatch. This is the repo behind the "image-diff" README shot
# (examples/screenshots/shots.config.mjs); having it in the playground lets you
# open the exact before/after diff by hand.
R="$ROOT/image-showcase"
ASSETS="$HERE/screenshots/assets"
new_repo "$R"

# v1 — original mascot illustration.
cp "$ASSETS/hero-before.png" "$R/mascot.png"
git -C "$R" add -A && git -C "$R" commit -qm "feat: add mascot illustration"

# v2 — redesign → real binary before/after diff on mascot.png.
cp "$ASSETS/hero-after.png" "$R/mascot.png"
git -C "$R" add -A && git -C "$R" commit -qm "design: summer-vibes mascot redesign"

summary "image-showcase" "same image committed before→after ⇒ real image before/after diff (README image-diff shot)"
