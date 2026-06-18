# shellcheck shell=bash disable=SC2154
# 06. bisect-bug — 13-commit JS math library; discount() silently breaks at commit 8.
# .bisect-hint shows the last-known-good SHA for git bisect.
R="$ROOT/bisect-bug"
new_repo "$R"

cat > "$R/math.js" <<'EOF'
function add(a, b) { return a + b }
function subtract(a, b) { return a - b }
module.exports = { add, subtract }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add + subtract"

cat > "$R/math.js" <<'EOF'
function add(a, b) { return a + b }
function subtract(a, b) { return a - b }
function multiply(a, b) { return a * b }
function divide(a, b) {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}
module.exports = { add, subtract, multiply, divide }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: multiply + divide"

cat > "$R/currency.js" <<'EOF'
const { multiply, divide } = require('./math')
function toCents(dollars) { return Math.round(multiply(dollars, 100)) }
function toDollars(cents) { return divide(cents, 100) }
module.exports = { toCents, toDollars }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: currency helpers"

cat > "$R/discount.js" <<'EOF'
const { multiply } = require('./math')
// discount(100, 20) should return 80  (100 - 20 % of 100)
function discount(price, pct) {
  return price - multiply(price, pct / 100)
}
module.exports = { discount }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: discount function"

cat > "$R/format.js" <<'EOF'
function formatCurrency(amount) {
  return '$' + Number(amount).toFixed(2)
}
module.exports = { formatCurrency }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: formatCurrency"

cat > "$R/math.js" <<'EOF'
function add(a, b) { return a + b }
function subtract(a, b) { return a - b }
function multiply(a, b) { return a * b }
function divide(a, b) {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}
function abs(n) { return n < 0 ? -n : n }
function clamp(n, min, max) { return Math.min(Math.max(n, min), max) }
module.exports = { add, subtract, multiply, divide, abs, clamp }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: abs + clamp"

cat > "$R/tax.js" <<'EOF'
const { multiply } = require('./math')
function addTax(price, taxRate) { return price + multiply(price, taxRate / 100) }
module.exports = { addTax }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: addTax"

# ── BUG INTRODUCED HERE (commit 8) ── discount now adds pct instead of subtracting
cat > "$R/discount.js" <<'EOF'
const { multiply } = require('./math')
// BUG: + instead of -  (discount(100,20) returns 120 instead of 80)
function discount(price, pct) {
  return price + multiply(price, pct / 100)
}
module.exports = { discount }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "refactor: simplify discount calculation"

cat > "$R/index.js" <<'EOF'
module.exports = {
  ...require('./math'),
  ...require('./currency'),
  ...require('./discount'),
  ...require('./tax'),
  ...require('./format'),
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: barrel export index.js"

cat > "$R/README.md" <<'EOF'
# BugShop

A small JS math/currency library.

## The Bug

`discount(100, 20)` should return **80** (20 % off a $100 item).
It currently returns **120** — the percentage is being *added* instead of subtracted.

Last known-good commit: `feat: discount function`
Current HEAD: **bad**

## Quick Bisect

```sh
git bisect start
git bisect bad                        # HEAD is broken
git bisect good <sha>                 # see .bisect-hint for the SHA
```

Test command for each step (requires ./discount directly so it works on every
commit in the good..bad range, before the barrel index.js exists):
```sh
node -e "const {discount}=require('./discount'); console.assert(discount(100,20)===80,'BROKEN: got '+discount(100,20))"
```
EOF
git -C "$R" add -A && git -C "$R" commit -qm "docs: README with bisect instructions"

cat > "$R/stats.js" <<'EOF'
function sum(arr) { return arr.reduce((a, b) => a + b, 0) }
function mean(arr) { return sum(arr) / arr.length }
function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
module.exports = { sum, mean, median }
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: stats — sum / mean / median"

cat > "$R/index.js" <<'EOF'
module.exports = {
  ...require('./math'),
  ...require('./currency'),
  ...require('./discount'),
  ...require('./tax'),
  ...require('./format'),
  ...require('./stats'),
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: add stats to barrel export"

GOOD_SHA=$(git -C "$R" log --oneline | grep "feat: discount function" | awk '{print $1}')
printf '# Run:\n#   git bisect start\n#   git bisect bad                # HEAD is broken\n#   git bisect good %s   # last known-good\n#\n# Test: node -e "const {discount}=require('"'"'./discount'"'"'); console.assert(discount(100,20)===80)"\n' \
  "$GOOD_SHA" > "$R/.bisect-hint"
git -C "$R" add -A && git -C "$R" commit -qm "chore: add .bisect-hint"

summary "bisect-bug" "git bisect: find which commit broke discount() (see .bisect-hint)"
