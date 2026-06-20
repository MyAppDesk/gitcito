# shellcheck shell=bash disable=SC2154
# 31. changelog — exercise the Conventional-Commit changelog generator.
#
# Tags v1.0.0, then lands a spread of conventional commits (plus one breaking
# change and one non-conventional message) so "Generate changelog" from the
# latest tag → HEAD produces every section:
#   ⚠ BREAKING CHANGES, ✨ Features, 🐛 Bug Fixes, ⚡ Performance,
#   📝 Documentation, 🔧 Chores, ♻️ Refactoring, and Other.
R="$ROOT/changelog"
new_repo "$R"

cm() { git -C "$R" commit -q --allow-empty -m "$1"; }

cm "chore: initial commit"
cm "feat: first feature"
git -C "$R" tag v1.0.0   # baseline release — changelog runs from here

# ── Post-1.0.0 work (this is what the changelog should capture) ──
cm "feat(auth): add OAuth login"
cm "feat(ui): dark mode toggle"
cm "fix(api): handle null user in profile fetch"
cm "fix: off-by-one in pagination"
cm "perf(graph): memoize layout computation"
cm "docs: document the plugin API"
cm "refactor(core): extract scheduler module"
cm "chore(deps): bump electron to 32"
cm "feat(api)!: drop v1 endpoints"
printf 'feat(session): new session store\n\nBREAKING CHANGE: cookies are no longer used.\n' | git -C "$R" commit -q --allow-empty -F -
cm "tweak some stuff without a type prefix"

summary "changelog" "Conventional commits + v1.0.0 tag — Generate changelog from latest tag → HEAD"
