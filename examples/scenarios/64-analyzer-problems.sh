# shellcheck shell=bash disable=SC2154
# 64. analyzer-problems — a repo whose own toolchain reports diagnostics, for
# the Problems dock.
#
# Gitcito runs the project's analyzers exactly the way the project would: a
# binary in node_modules/.bin wins over PATH. So the repo ships stand-in `tsc`
# and `eslint` there — real executables printing real-shaped output — and the
# panel exercises the whole path (detect → run → parse → group) without needing
# a TypeScript install or a network. Two of the files are dirty in the working
# tree, so "changed only" has something to narrow to.
R="$ROOT/analyzer-problems"
new_repo "$R"

mkdir -p "$R/src" "$R/node_modules/.bin"

cat > "$R/.gitignore" <<'EOF'
node_modules/
EOF

cat > "$R/tsconfig.json" <<'EOF'
{
  "compilerOptions": { "strict": true, "noEmit": true, "target": "ES2022" },
  "include": ["src"]
}
EOF

cat > "$R/eslint.config.js" <<'EOF'
export default [{ rules: { eqeqeq: 'warn', 'no-unused-vars': 'error' } }]
EOF

cat > "$R/src/cart.ts" <<'EOF'
export interface Item { sku: string; price: number; qty: number }

export function total(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

export function applyCoupon(items: Item[], code: string): number {
  const discount = COUPONS[code]
  return total(items) * (1 - discount)
}
EOF

cat > "$R/src/checkout.ts" <<'EOF'
import { total, type Item } from './cart'

export async function checkout(items: Item[], token) {
  const amount = total(items)
  if (amount == 0) return { ok: false }
  return { ok: true, amount, token }
}
EOF

cat > "$R/src/index.ts" <<'EOF'
import { checkout } from './checkout'

const unused = 'left over from the refactor'

void checkout([], 'tok_123')
EOF

# ── The stand-in analyzers ───────────────────────────────────────────────────
# Both print what the real tools print, in the format Gitcito parses: tsc's
# `file(line,col): error TSxxxx: message`, and eslint's `-f json`.
cat > "$R/node_modules/.bin/tsc" <<'EOF'
#!/usr/bin/env node
const lines = [
  "src/cart.ts(8,20): error TS2304: Cannot find name 'COUPONS'.",
  "src/checkout.ts(3,45): error TS7006: Parameter 'token' implicitly has an 'any' type.",
  "src/checkout.ts(5,7): error TS2367: This comparison appears unintentional because the types have no overlap.",
  "src/index.ts(3,7): error TS6133: 'unused' is declared but its value is never read."
]
console.log(lines.join('\n'))
console.log(`Found ${lines.length} errors.`)
process.exit(2)
EOF
chmod +x "$R/node_modules/.bin/tsc"

cat > "$R/node_modules/.bin/eslint" <<'EOF'
#!/usr/bin/env node
const cwd = process.cwd()
const report = [
  {
    filePath: `${cwd}/src/checkout.ts`,
    messages: [
      { ruleId: 'eqeqeq', severity: 1, message: 'Expected === and instead saw ==.', line: 5, column: 14 }
    ]
  },
  {
    filePath: `${cwd}/src/index.ts`,
    messages: [
      { ruleId: 'no-unused-vars', severity: 2, message: "'unused' is assigned a value but never used.", line: 3, column: 7 },
      { ruleId: 'no-console', severity: 1, message: 'Unexpected console statement.', line: 5, column: 1 }
    ]
  }
]
console.log(JSON.stringify(report))
process.exit(1)
EOF
chmod +x "$R/node_modules/.bin/eslint"

git -C "$R" add -A && git -C "$R" commit -qm "feat: cart and checkout"

# Leave two files dirty: the "changed only" filter needs a working tree that
# differs from HEAD, and the point of the toggle is that it narrows.
printf '\nexport const FREE_SHIPPING = 50\n' >> "$R/src/cart.ts"
printf '\n// TODO: validate the token\n' >> "$R/src/checkout.ts"

summary "analyzer-problems" "a repo with stand-in tsc/eslint in node_modules/.bin — for the Problems dock (errors, warnings, and the changed-files filter)"
