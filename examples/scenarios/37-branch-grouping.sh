# shellcheck shell=bash disable=SC2154
# 37. branch-grouping — exercise the "Group branches by prefix" sidebar setting.
#
# Builds many local branches sharing "/"-separated prefixes so the Local section
# folds into collapsible folders (setting is on by default):
#
#     main                         (flat — no prefix)
#     develop                      (flat — no prefix)
#     release/1.2.3                (flat — "release" has a single branch)
#     feature/  ▸  (folder, 4)
#         login
#         signup
#         payments/  ▸ (nested folder, 2)
#             stripe
#             paypal
#     bugfix/  ▸ (folder, 3)
#         crash-on-start
#         memory-leak
#         off-by-one
#
# Verify:
#   • feature/ and bugfix/ render as dropdowns; feature/payments/ nests inside.
#   • release/1.2.3 stays a FLAT row (prefix with only one branch ⇒ no folder).
#   • Toggle "Group branches by prefix" off in Settings ⇒ flat list returns.
R="$ROOT/branch-grouping"
new_repo "$R"

echo "export const app = () => 'v1'" > "$R/app.js"
git -C "$R" add -A && git -C "$R" commit -qm "main: initial app"

# Flat branches (no prefix, or a lone prefix that should NOT fold).
git -C "$R" branch develop
git -C "$R" branch release/1.2.3

# feature/* group — two leaves plus a nested feature/payments/* sub-group.
for b in feature/login feature/signup feature/payments/stripe feature/payments/paypal; do
  git -C "$R" branch "$b"
done

# bugfix/* group — three leaves.
for b in bugfix/crash-on-start bugfix/memory-leak bugfix/off-by-one; do
  git -C "$R" branch "$b"
done

# Tags with "/" namespaces (folder) + a flat one + a single-prefix one.
git -C "$R" tag v1.0.0                 # flat, no prefix
git -C "$R" tag release/1.0            # release/ has 2 ⇒ folder
git -C "$R" tag release/2.0
git -C "$R" tag nightly/2026-06-01     # nightly/ has 2 ⇒ folder
git -C "$R" tag nightly/2026-06-02
git -C "$R" tag stable/1.0             # stable/ has 1 ⇒ stays flat as "stable/1.0"

# Push branches + tags to a bare origin so Remotes/Tags fold the same way.
ORIGIN_BARE="$ROOT/branch-grouping-origin.git"
git init -q --bare "$ORIGIN_BARE"
git -C "$R" remote add origin "$ORIGIN_BARE"
git -C "$R" push -q origin --all
git -C "$R" push -q origin --tags

# Land on a grouped leaf so the folder containing the current branch is visible.
git -C "$R" checkout -q feature/login

summary "branch-grouping" "10 branches (feature/*, bugfix/*, feature/payments/*) + namespaced tags (release/*, nightly/*) local + pushed to origin"
