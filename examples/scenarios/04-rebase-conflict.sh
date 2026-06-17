# shellcheck shell=bash disable=SC2154
# 04. rebase-conflict — rebase a diverged `feature` onto main; conflicts on api.ts + utils.ts.
# feature branches from initial commit; main advances 2 commits touching the same files.
R="$ROOT/rebase-conflict"
new_repo "$R"

cat > "$R/api.ts" <<'EOF'
export function getUser(id: string) {
  return fetch(`/api/users/${id}`).then(r => r.json())
}
export function getProducts() {
  return fetch('/api/products').then(r => r.json())
}
EOF
cat > "$R/utils.ts" <<'EOF'
export const formatDate = (d: Date) => d.toISOString().split('T')[0]
export const formatPrice = (n: number) => `$${n.toFixed(2)}`
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial: api + utils"

git -C "$R" checkout -qb feature

cat > "$R/api.ts" <<'EOF'
export function getUser(id: string) {
  return fetch(`/api/users/${id}`, { credentials: 'include' }).then(r => r.json())
}
export function getProducts() {
  return fetch('/api/products', { credentials: 'include' }).then(r => r.json())
}
export function createOrder(payload: unknown) {
  return fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feature: add credentials + createOrder"

cat > "$R/utils.ts" <<'EOF'
export const formatDate = (d: Date) => d.toLocaleDateString('en-GB')
export const formatPrice = (n: number) => `£${n.toFixed(2)}`
export const debounce = <T extends (...a: unknown[]) => void>(fn: T, ms: number) => {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feature: en-GB formatting + debounce helper"

git -C "$R" checkout -q main

cat > "$R/api.ts" <<'EOF'
import { logger } from './logger'

export async function getUser(id: string) {
  logger.info('getUser', id)
  return fetch(`/api/v2/users/${id}`).then(r => r.json())
}
export async function getProducts(category?: string) {
  const url = category ? `/api/v2/products?cat=${category}` : '/api/v2/products'
  return fetch(url).then(r => r.json())
}
EOF
cat > "$R/logger.ts" <<'EOF'
export const logger = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "main: migrate to v2 API + add logger"

cat > "$R/utils.ts" <<'EOF'
import { format } from 'date-fns'

export const formatDate = (d: Date) => format(d, 'yyyy-MM-dd')
export const formatPrice = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "main: upgrade utils — date-fns + Intl"

git -C "$R" checkout -q feature
# left on feature; user rebases onto main in Gitcito

summary "rebase-conflict" "rebase 'feature' onto main ⇒ conflicts on api.ts + utils.ts"
