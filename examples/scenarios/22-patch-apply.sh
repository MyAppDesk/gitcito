# shellcheck shell=bash disable=SC2154
# 22. patch-apply — a repo plus two committed .patch files: one that applies
# cleanly and one that conflicts. Exercises Toolbar → Patch (apply / git am) and
# the commit context-menu "Export as patch…".
R="$ROOT/patch-apply"
new_repo "$R"

printf "const VERSION = '1.0.0'\nmodule.exports = { VERSION }\n" > "$R/app.js"
git -C "$R" add app.js && git -C "$R" commit -qm "init: app v1"

# ── CLEAN patch — adds a brand-new file, so it always applies ───────────────────
printf "function feature() { return 'new feature' }\nmodule.exports = { feature }\n" > "$R/feature.js"
git -C "$R" add feature.js && git -C "$R" commit -qm "feat: add feature module"
# format-patch output is an UNTRACKED file → survives the reset below.
git -C "$R" format-patch -1 --stdout > "$R/0001-add-feature.patch"
git -C "$R" reset --hard -q HEAD~1   # drop the commit (and feature.js); patch file remains

# ── CONFLICTING patch — edits the VERSION line ──────────────────────────────────
printf "const VERSION = '2.0.0'\nmodule.exports = { VERSION }\n" > "$R/app.js"
git -C "$R" add app.js && git -C "$R" commit -qm "chore: bump to 2.0.0"
git -C "$R" format-patch -1 --stdout > "$R/conflict-bump-version.patch"
git -C "$R" reset --hard -q HEAD~1   # back to v1; patch file remains

# Diverge main so the version patch no longer applies cleanly.
printf "const VERSION = '9.9.9'\nmodule.exports = { VERSION }\n" > "$R/app.js"
git -C "$R" add app.js && git -C "$R" commit -qm "chore: bump to 9.9.9 on main"

cat > "$R/README.md" <<'EOF'
# Patch Apply

Two patches sit in this repo:

- **0001-add-feature.patch** — adds `feature.js`. Applies cleanly.
- **conflict-bump-version.patch** — sets VERSION to 2.0.0, but main is now 9.9.9,
  so it CONFLICTS on apply.

Try (Toolbar → **Patch**):
- *Apply patch to working tree…* → pick 0001 → `feature.js` appears unstaged.
- *Apply patch & commit (git am)…* → pick 0001 → a new commit lands.
- Either option with the conflict patch → git reports a conflict
  (recover with `git am --abort` in the terminal).

Reverse direction: right-click any commit → **Export as patch…**.
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: add patches + README"

summary "patch-apply" "format-patch / git apply+am: one clean patch, one conflicting patch"
