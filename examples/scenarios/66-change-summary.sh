# shellcheck shell=bash disable=SC2154
# 66. change-summary — one commit that touches every kind of change at once.
#
# Every other playground repo tops out at two kinds per commit (see the shape of
# time-machine or merge-conflict), which is enough to use the feature and not
# enough to photograph it. This builds a single commit whose file list contains
# all five buckets the change summary knows about, so one screenshot shows the
# whole vocabulary:
#
#   6 modified · 2 added · 1 deleted · 1 renamed
#
# The working tree is then left dirty with a mix of its own, so the staging
# panel's copy of the summary has something to say too — including an untracked
# file, which is the one case where staging differs from a commit (untracked
# counts as an addition).
#
# Verify:
#   • Select "refactor: split the client" ⇒ the header above the file list reads
#     the counts above, each coloured like the status glyph on its rows.
#   • A kind with no files is absent, not shown as zero.
#   • Hovering the summary gives the plain "10 changed files" total.
R="$ROOT/change-summary"
new_repo "$R"

mk() { mkdir -p "$(dirname "$R/$1")"; printf '%s\n' "$2" > "$R/$1"; }

# ── Baseline: enough files that the follow-up commit can modify six of them ──
mk src/client.js       "export function request(url) { return fetch(url) }"
mk src/auth.js         "export const token = () => localStorage.getItem('t')"
mk src/format.js       "export const pad = (n) => String(n).padStart(2, '0')"
mk src/routes.js       "export const routes = ['/', '/about']"
mk src/config.js       "export const BASE = 'https://api.example.com'"
mk src/legacy.js       "// superseded by src/client.js — delete once nothing imports it"
mk README.md           "# Demo app"
mk docs/api.md         "# API"
git -C "$R" add -A
git -C "$R" commit -q -m "initial: project scaffold"

# ── The showcase commit: modify 6, add 2, delete 1, rename 1 ──
mk src/client.js       "export function request(url, init) { return fetch(url, init) }"
mk src/auth.js         "export const token = () => sessionStorage.getItem('t')"
mk src/format.js       "export const pad = (n, w = 2) => String(n).padStart(w, '0')"
mk src/routes.js       "export const routes = ['/', '/about', '/settings']"
mk src/config.js       "export const BASE = process.env.API_URL"
mk README.md           "# Demo app\n\nNow with a typed request client."
mk src/http/retry.js   "export const retry = (fn, n = 3) => fn().catch(() => n && retry(fn, n - 1))"
mk src/http/headers.js "export const json = { 'content-type': 'application/json' }"
rm "$R/src/legacy.js"
git -C "$R" mv docs/api.md docs/reference.md
git -C "$R" add -A
git -C "$R" commit -q -m "refactor: split the client"

# ── Leave the working tree mixed, for the staging panel's summary ──
mk src/client.js       "export function request(url, init = {}) { return fetch(url, init) }"
mk src/routes.js       "export const routes = ['/', '/about', '/settings', '/help']"
rm "$R/src/config.js"
mk src/http/cache.js   "export const cache = new Map()"   # untracked ⇒ counts as added

summary "change-summary" "One commit touching all five change kinds (modify/add/delete/rename) + a mixed dirty tree — for the change summary above a file list"
