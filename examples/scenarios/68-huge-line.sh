# shellcheck shell=bash disable=SC2154
# 68. huge-line — an edit inside one very long line, the shape of minified HTML.
#
# Word-level marking used to build a full token-by-token table for each edited
# line pair. Two lines of ~80,000 characters asked for hundreds of millions of
# cells, and the window went black while opening the diff. This commits a
# single-line minified page, then changes one word near its start.
#
# Verify:
#   • Select index.min.html (modified) ⇒ the diff opens at once, two rows.
#   • Word-level marking highlights only "Spring" → "Summer" in the title.
R="$ROOT/huge-line"
new_repo "$R"

page() {
  local season=$1
  printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>%s sale</title>' "$season"
  printf '<link rel="stylesheet" href="/app.min.css"></head><body><main class="shop"><ul class="grid">'
  local card='<li class="card" data-id="%d"><a href="/p/%d">Item %d</a><span class="price">$%d.99</span></li>'
  awk -v card="$card" 'BEGIN { for (i = 1; i <= 1200; i++) printf card, i, i, i, i % 90 + 9 }'
  printf '</ul></main><script src="/app.min.js"></script></body></html>\n'
}

page Spring > "$R/index.min.html"
git -C "$R" add -A && git -C "$R" commit -qm "site: spring sale page"

page Summer > "$R/index.min.html"

summary "huge-line" "word diff on a huge line: select index.min.html (modified) and see only the title word marked"
