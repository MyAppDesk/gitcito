#!/usr/bin/env bash
# Creates throwaway git repos under examples/playground/ to test Gitcito features:
#   1. merge-conflict      — merge `feature` into `main` → several conflicts to resolve visually
#   2. cherry-pick         — cherry-pick commits from `feature` (one clean, one conflicting)
#   3. stash-picking       — a stash with several files (incl. an untracked one) for partial apply
#   4. rebase-conflict     — rebase a diverged feature branch onto main (conflicts on each step)
#   5. interactive-rebase  — messy commit history to squash / fixup / reorder interactively
#   6. bisect-bug          — 13-commit JS library with a bug introduced mid-history (bisect practice)
#   7. multi-remote        — working repo with origin + upstream remotes and diverged histories
#   8. octopus-merge       — three independent feature branches ready for an octopus/sequential merge
#   9. tags-and-releases   — annotated + lightweight tags, hotfix branch, breaking v2 release
#  10. detached-head       — repo left in detached HEAD state for graph display testing
#  11. collaborators       — realistic team history with 4 distinct authors across branches
#
# Usage:  bash examples/setup-playground.sh
# Re-running wipes and recreates the playground.

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD/playground"
rm -rf "$ROOT"
mkdir -p "$ROOT"

new_repo() {
  local dir="$1"
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.name "Playground"
  git -C "$dir" config user.email "playground@example.com"
}

# ─── 1. merge-conflict ────────────────────────────────────────────────────────
R="$ROOT/merge-conflict"
new_repo "$R"

cat > "$R/greeting.txt" <<'EOF'
Hello world
This line stays the same.
Goodbye world
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return 'Hello ' + name
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
cat > "$R/units_service.dart" <<'EOF'
String formatUnits(int count) {
  return 'units: $count';
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb feature
cat > "$R/greeting.txt" <<'EOF'
Hola mundo (from feature)
This line stays the same.
Adios mundo (from feature)
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return `¡Hola ${name}! (feature version)`
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
cat > "$R/units_service.dart" <<'EOF'
String formatUnits(int count) {
  return 'feature units => $count';
}
EOF
echo "only on feature" > "$R/feature-notes.md"
git -C "$R" add -A && git -C "$R" commit -qm "feature: translate to Spanish"

git -C "$R" checkout -q main
cat > "$R/greeting.txt" <<'EOF'
HELLO WORLD (from main)
This line stays the same.
GOODBYE WORLD (from main)
EOF
cat > "$R/app.js" <<'EOF'
function greet(name) {
  return `HELLO ${name.toUpperCase()} (main version)`
}

function farewell(name) {
  return 'Bye ' + name
}

module.exports = { greet, farewell }
EOF
git -C "$R" rm -q -- units_service.dart
git -C "$R" add -A && git -C "$R" commit -qm "main: shout the greetings"

# ─── 2. cherry-pick ───────────────────────────────────────────────────────────
R="$ROOT/cherry-pick"
new_repo "$R"

cat > "$R/config.json" <<'EOF'
{
  "name": "demo",
  "version": "1.0.0"
}
EOF
echo "line 1" > "$R/log.txt"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb feature
echo "a brand new file, applies cleanly anywhere" > "$R/clean-addition.txt"
git -C "$R" add -A && git -C "$R" commit -qm "add clean-addition.txt (cherry-picks cleanly)"

cat > "$R/config.json" <<'EOF'
{
  "name": "demo-feature",
  "version": "2.0.0-feature"
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "bump version on feature (will CONFLICT when cherry-picked)"

git -C "$R" checkout -q main
cat > "$R/config.json" <<'EOF'
{
  "name": "demo-main",
  "version": "1.5.0-main"
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "main: rename package"

# ─── 3. stash-picking ─────────────────────────────────────────────────────────
R="$ROOT/stash-picking"
new_repo "$R"

echo "alpha v1" > "$R/alpha.txt"
echo "beta v1"  > "$R/beta.txt"
mkdir -p "$R/src"
echo "gamma v1" > "$R/src/gamma.txt"
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

echo "alpha v2 (stashed change)" > "$R/alpha.txt"
echo "beta v2 (stashed change)"  > "$R/beta.txt"
echo "gamma v2 (stashed change)" > "$R/src/gamma.txt"
echo "delta — untracked file captured by the stash" > "$R/delta-untracked.txt"
git -C "$R" stash push -u -m "WIP: alpha+beta+gamma edits and a new untracked file"

# ─── 4. rebase-conflict ───────────────────────────────────────────────────────
# feature branches from initial commit; main advances 2 commits touching same files
# → rebase feature onto main triggers conflicts on api.ts and utils.ts at each step
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

# ─── 5. interactive-rebase ────────────────────────────────────────────────────
# messy-feature has 6 commits: real code mixed with WIPs and fixup commits — ideal for squash/reorder
R="$ROOT/interactive-rebase"
new_repo "$R"

cat > "$R/index.ts" <<'EOF'
export const VERSION = '1.0.0'
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial commit"

git -C "$R" checkout -qb messy-feature

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "add login function"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}
// TODO: logout
EOF
git -C "$R" add -A && git -C "$R" commit -qm "WIP"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function logout() {
  return fetch('/logout', { method: 'POST' })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "add logout + fix login path"

cat > "$R/auth.ts" <<'EOF'
export function login(user: string, pass: string) {
  return fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, pass }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function logout() {
  return fetch('/auth/logout', { method: 'POST' })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "fixup! add logout + fix login path"

cat > "$R/session.ts" <<'EOF'
let _token: string | null = null
export const setToken = (t: string) => { _token = t }
export const getToken = () => _token
EOF
git -C "$R" add -A && git -C "$R" commit -qm "WIP session module"

cat > "$R/session.ts" <<'EOF'
let _token: string | null = null
export const setToken = (t: string) => { _token = t }
export const getToken = () => _token
export const clearToken = () => { _token = null }

export function getSession() {
  return fetch('/session', {
    headers: _token ? { Authorization: `Bearer ${_token}` } : {},
  }).then(r => r.json())
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "finish session module — getSession + clearToken"

# ─── 6. bisect-bug ────────────────────────────────────────────────────────────
# 13-commit JS math library; discount() silently breaks at commit 8
# .bisect-hint shows the last-known-good SHA for git bisect
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

Test command for each step:
```sh
node -e "const {discount}=require('.'); console.assert(discount(100,20)===80,'BROKEN: got '+discount(100,20))"
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
printf '# Run:\n#   git bisect start\n#   git bisect bad                # HEAD is broken\n#   git bisect good %s   # last known-good\n#\n# Test: node -e "const {discount}=require('"'"'.'"'"'); console.assert(discount(100,20)===80)"\n' \
  "$GOOD_SHA" > "$R/.bisect-hint"
git -C "$R" add -A && git -C "$R" commit -qm "chore: add .bisect-hint"

# ─── 7. multi-remote ─────────────────────────────────────────────────────────
# origin.git + upstream.git are local bare repos acting as remote servers
# working repo is cloned from origin; upstream has 2 extra commits; local has 1 unpushed commit
ORIGIN_BARE="$ROOT/multi-remote-origin.git"
UPSTREAM_BARE="$ROOT/multi-remote-upstream.git"

SEED="$ROOT/_seed_mr"
new_repo "$SEED"

cat > "$SEED/README.md" <<'EOF'
# shared-lib
A shared utility library.
EOF
cat > "$SEED/index.ts" <<'EOF'
export const VERSION = '1.0.0'
export function identity<T>(x: T): T { return x }
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "initial commit"

cat > "$SEED/math.ts" <<'EOF'
export const add = (a: number, b: number) => a + b
export const sub = (a: number, b: number) => a - b
export const mul = (a: number, b: number) => a * b
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: add math.ts"

git clone -q --bare "$SEED" "$ORIGIN_BARE"

cat > "$SEED/string.ts" <<'EOF'
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '\u2026' : s
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "feat: string.ts — capitalize/truncate/slugify"

cat >> "$SEED/README.md" <<'EOF'

## Utilities
- `math.ts` — arithmetic helpers
- `string.ts` — string manipulation (upstream only)
EOF
git -C "$SEED" add -A && git -C "$SEED" commit -qm "docs: update README with string module"

git clone -q --bare "$SEED" "$UPSTREAM_BARE"
rm -rf "$SEED"

R="$ROOT/multi-remote"
git clone -q "$ORIGIN_BARE" "$R"
git -C "$R" config user.name "Playground"
git -C "$R" config user.email "playground@example.com"

cat > "$R/array.ts" <<'EOF'
export const unique = <T>(arr: T[]) => [...new Set(arr)]
export const chunk = <T>(arr: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))
export const flatten = <T>(arr: T[][]): T[] => ([] as T[]).concat(...arr)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: array.ts — unique/chunk/flatten (not pushed to origin)"

git -C "$R" remote add upstream "$UPSTREAM_BARE"
git -C "$R" fetch -q upstream
# graph shows: local main (3 commits) ahead of origin/main (2); upstream/main (4) has 2 extra

# ─── 8. octopus-merge ────────────────────────────────────────────────────────
# Three independent feature branches (auth / api / ui) all branching from the same initial commit
# → each touches different files so git merge feat/auth feat/api feat/ui is a clean octopus merge
R="$ROOT/octopus-merge"
new_repo "$R"

cat > "$R/package.json" <<'EOF'
{
  "name": "octopus-app",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "node index.js" }
}
EOF
cat > "$R/index.js" <<'EOF'
console.log('octopus-app v1.0.0')
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial: project scaffold"

git -C "$R" checkout -qb feat/auth main

cat > "$R/auth.ts" <<'EOF'
export interface User { id: string; email: string; role: 'admin' | 'user' }

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  return res.json()
}

export async function logout(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(auth): login / logout with JWT"

cat > "$R/session.ts" <<'EOF'
const KEY = 'auth_token'
export const saveToken = (t: string) => localStorage.setItem(KEY, t)
export const loadToken = () => localStorage.getItem(KEY)
export const clearToken = () => localStorage.removeItem(KEY)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(auth): session helpers — save/load/clear token"

git -C "$R" checkout -qb feat/api main

cat > "$R/api.ts" <<'EOF'
const BASE_URL = process.env.API_URL ?? 'https://api.example.com/v1'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:  <T>(path: string, token?: string) =>                       request<T>('GET',    path, undefined, token),
  post: <T>(path: string, body: unknown, token?: string) =>        request<T>('POST',   path, body,      token),
  put:  <T>(path: string, body: unknown, token?: string) =>        request<T>('PUT',    path, body,      token),
  del:      (path: string, token?: string) =>                      request<void>('DELETE', path, undefined, token),
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(api): generic typed request client"

cat > "$R/endpoints.ts" <<'EOF'
export const ENDPOINTS = {
  users:    '/users',
  user:     (id: string) => `/users/${id}`,
  products: '/products',
  product:  (id: string) => `/products/${id}`,
  orders:   '/orders',
  order:    (id: string) => `/orders/${id}`,
} as const
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(api): endpoint constants"

git -C "$R" checkout -qb feat/ui main
mkdir -p "$R/components"

cat > "$R/components/Button.tsx" <<'EOF'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
interface Props {
  label: string
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ label, onClick, variant = 'primary', disabled = false, type = 'button' }: Props) {
  return (
    <button type={type} className={`btn btn--${variant}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
EOF
cat > "$R/components/Input.tsx" <<'EOF'
import React from 'react'

interface Props {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  error?: string
  required?: boolean
}

export function Input({ id, label, value, onChange, type = 'text', placeholder, error, required }: Props) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}{required && ' *'}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
      />
      {error && <span id={`${id}-error`} className="field__error">{error}</span>}
    </div>
  )
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(ui): Button + Input components"

cat > "$R/components/Modal.tsx" <<'EOF'
import React from 'react'

interface Props {
  title: string
  children: React.ReactNode
  onClose: () => void
}

export function Modal({ title, children, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal aria-labelledby="modal-title">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat(ui): Modal component"

git -C "$R" checkout -q main
# run: git merge feat/auth feat/api feat/ui  →  clean octopus merge (all files are different)

# ─── 9. tags-and-releases ────────────────────────────────────────────────────
# annotated + lightweight tags, hotfix branch off an old tag, breaking v2 release
R="$ROOT/tags-and-releases"
new_repo "$R"

cat > "$R/CHANGELOG.md" <<'EOF'
# Changelog
EOF
cat > "$R/app.py" <<'EOF'
VERSION = "0.1.0"

def main():
    print(f"App v{VERSION}")
EOF
git -C "$R" add -A && git -C "$R" commit -qm "chore: initial scaffolding"

cat > "$R/app.py" <<'EOF'
VERSION = "1.0.0"

def greet(name: str) -> str:
    return f"Hello, {name}!"

def main():
    print(f"App v{VERSION}")
    print(greet("World"))
EOF
cat > "$R/CHANGELOG.md" <<'EOF'
# Changelog

## v1.0.0
- Initial stable release
- Add `greet()`
EOF
git -C "$R" add -A && git -C "$R" commit -qm "release: v1.0.0"
git -C "$R" tag -a v1.0.0 -m "Release v1.0.0 — initial stable"

cat > "$R/app.py" <<'EOF'
VERSION = "1.0.1"

def greet(name: str) -> str:
    name = name.strip() or "stranger"
    return f"Hello, {name}!"

def main():
    print(f"App v{VERSION}")
    print(greet("World"))
EOF
git -C "$R" add -A && git -C "$R" commit -qm "fix: handle blank name in greet() — v1.0.1"
git -C "$R" tag v1.0.1  # lightweight tag

cat > "$R/app.py" <<'EOF'
VERSION = "1.1.0"

def greet(name: str) -> str:
    name = name.strip() or "stranger"
    return f"Hello, {name}!"

def farewell(name: str) -> str:
    return f"Goodbye, {name}. See you soon!"

def main():
    print(f"App v{VERSION}")
    print(greet("World"))
    print(farewell("World"))
EOF
cat >> "$R/CHANGELOG.md" <<'EOF'

## v1.1.0
- Add `farewell()`
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: add farewell() — v1.1.0"
git -C "$R" tag -a v1.1.0 -m "Release v1.1.0 — farewell function"

# hotfix branch off the v1.0.1 lightweight tag
git -C "$R" checkout -qb hotfix/security-patch v1.0.1

cat > "$R/app.py" <<'EOF'
VERSION = "1.0.2"
import re
_SAFE = re.compile(r"[^A-Za-z0-9 .\'-]")

def greet(name: str) -> str:
    name = _SAFE.sub('', name.strip()) or "stranger"
    return f"Hello, {name}!"

def main():
    print(f"App v{VERSION}")
    print(greet("World"))
EOF
git -C "$R" add -A && git -C "$R" commit -qm "security: sanitise name input — v1.0.2"
git -C "$R" tag -a v1.0.2 -m "Release v1.0.2 — security patch (input sanitisation)"

git -C "$R" checkout -q main

cat > "$R/app.py" <<'EOF'
VERSION = "2.0.0"
from dataclasses import dataclass

@dataclass
class App:
    name: str

    def greet(self) -> str:
        return f"Hello from {self.name}!"

    def farewell(self) -> str:
        return f"{self.name} signing off."

def main():
    app = App("Demo")
    print(app.greet())
    print(app.farewell())
EOF
cat >> "$R/CHANGELOG.md" <<'EOF'

## v2.0.0 ⚠ BREAKING
- Rewrite as `App` dataclass (breaks standalone `greet()` / `farewell()` API)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat!: rewrite as App class — v2.0.0 BREAKING"
git -C "$R" tag -a v2.0.0 -m "Release v2.0.0 — breaking API redesign"

cat > "$R/plugins.py" <<'EOF'
from typing import Protocol

class Plugin(Protocol):
    name: str
    def run(self, app: object) -> None: ...

_registry: dict[str, 'Plugin'] = {}

def register(plugin: 'Plugin') -> None:
    _registry[plugin.name] = plugin

def run_all(app: object) -> None:
    for p in _registry.values():
        p.run(app)
EOF
git -C "$R" add -A && git -C "$R" commit -qm "feat: plugin system (unreleased, post-v2.0.0 dev)"

# ─── 10. detached-head ────────────────────────────────────────────────────────
# A repo with 5 commits and a stable branch, then HEAD detached at commit 3
R="$ROOT/detached-head"
new_repo "$R"

for i in 1 2 3 4 5; do
  printf 'version: %d\nbuild: %d\n' "$i" "$((i * 100))" > "$R/version.txt"
  printf '=== Entry #%d ===\nBuild %d shipped.\n\n' "$i" "$((i * 100))" >> "$R/history.log"
  git -C "$R" add -A && git -C "$R" commit -qm "chore: bump to version $i (build $((i * 100)))"
done

git -C "$R" checkout -qb stable HEAD~1  # stable points at commit 4
git -C "$R" checkout -q main            # back to commit 5

TARGET=$(git -C "$R" rev-parse HEAD~2)  # commit 3
git -C "$R" checkout -q "$TARGET"
# HEAD is now detached at version 3; main→v5, stable→v4

# ─── 11. collaborators ───────────────────────────────────────────────────────
# A realistic team repo: 4 authors (Alice, Bob, Carol, Dave) commit across main
# and two feature branches, then Alice merges everything. Good for testing
# author avatars/initials and co-author display in the graph.
R="$ROOT/collaborators"
new_repo "$R"

# Helper: commit as a specific author; optional 5th arg is extra trailer lines (Co-authored-by etc.)
collab_commit() {
  local dir="$1" name="$2" email="$3" msg="$4" trailers="${5:-}"
  local full_msg="$msg"
  if [ -n "$trailers" ]; then
    full_msg="$(printf '%s\n\n%s' "$msg" "$trailers")"
  fi
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git -C "$dir" commit -q --allow-empty -m "$full_msg"
}

# Seed README as Alice
cat > "$R/README.md" <<'EOF'
# Team Project

A shared repo for collaboration testing.
EOF
cat > "$R/app.js" <<'EOF'
// Main entry point
function main() {
  console.log('Hello, team!');
}
main();
EOF
git -C "$R" add -A
collab_commit "$R" "Alice Liddell" "alice-liddell@users.noreply.github.com" "feat: initial project scaffold"

# Bob adds auth module on main, Carol pair-programmed
cat > "$R/auth.js" <<'EOF'
// Auth module
function login(user, pass) {
  return user === 'admin' && pass === 'secret';
}
module.exports = { login };
EOF
git -C "$R" add -A
collab_commit "$R" "Bob Marley" "bob-marley@users.noreply.github.com" "feat: add basic auth module" \
  "Co-authored-by: Carol Danvers <carol-danvers@users.noreply.github.com>"

# Carol branches off to build the API
git -C "$R" checkout -qb feat/api
cat > "$R/api.js" <<'EOF'
const { login } = require('./auth');
function handleRequest(req) {
  if (!login(req.user, req.pass)) return { status: 401 };
  return { status: 200, data: 'ok' };
}
module.exports = { handleRequest };
EOF
git -C "$R" add -A
collab_commit "$R" "Carol Danvers" "carol-danvers@users.noreply.github.com" "feat: add API request handler"

# Carol and Alice co-authored the list endpoint
cat >> "$R/api.js" <<'EOF'

function handleList(req) {
  return { status: 200, data: [] };
}
module.exports = { handleRequest, handleList };
EOF
git -C "$R" add -A
collab_commit "$R" "Carol Danvers" "carol-danvers@users.noreply.github.com" "feat: add list endpoint" \
  "Co-authored-by: Alice Liddell <alice-liddell@users.noreply.github.com>"

# Dave branches off main to build the UI
git -C "$R" checkout -q main
git -C "$R" checkout -qb feat/ui
cat > "$R/ui.html" <<'EOF'
<!DOCTYPE html>
<html>
  <head><title>Team App</title></head>
  <body>
    <h1>Login</h1>
    <form><input name="user"/><input name="pass" type="password"/><button>Go</button></form>
  </body>
</html>
EOF
git -C "$R" add -A
# Dave + Bob + Carol all worked on the login UI
collab_commit "$R" "Dave Grohl" "dave-grohl@users.noreply.github.com" "feat: add login UI" \
  "Co-authored-by: Bob Marley <bob-marley@users.noreply.github.com>
Co-authored-by: Carol Danvers <carol-danvers@users.noreply.github.com>"

cat >> "$R/ui.html" <<'EOF'
<!-- dashboard placeholder -->
EOF
git -C "$R" add -A
collab_commit "$R" "Dave Grohl" "dave-grohl@users.noreply.github.com" "feat: add dashboard placeholder" \
  "Co-authored-by: Alice Liddell <alice-liddell@users.noreply.github.com>"

# Alice merges both feature branches into main
git -C "$R" checkout -q main
GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" merge -q --no-ff feat/api -m "Merge feat/api into main (Carol's API layer)"

GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" merge -q --no-ff feat/ui -m "Merge feat/ui into main (Dave's login UI)"

# Bob adds a final hotfix on main
cat >> "$R/auth.js" <<'EOF'

function logout(session) {
  session.token = null;
}
module.exports = { login, logout };
EOF
git -C "$R" add -A
collab_commit "$R" "Bob Marley" "bob-marley@users.noreply.github.com" "fix: add logout to auth module" \
  "Co-authored-by: Dave Grohl <dave-grohl@users.noreply.github.com>"

# Alice tags the release
GIT_AUTHOR_NAME="Alice Liddell" GIT_AUTHOR_EMAIL="alice-liddell@users.noreply.github.com" \
GIT_COMMITTER_NAME="Alice Liddell" GIT_COMMITTER_EMAIL="alice-liddell@users.noreply.github.com" \
  git -C "$R" tag -a v1.0.0 -m "Release v1.0.0 — team effort"

echo
echo "Playground ready! Open these repos in Gitcito:"
echo "  $ROOT/merge-conflict      → merge 'feature' into main ⇒ content conflicts + modify/delete"
echo "  $ROOT/cherry-pick         → cherry-pick two 'feature' commits (one clean, one conflicting)"
echo "  $ROOT/stash-picking       → click the stash node and apply only some files"
echo "  $ROOT/rebase-conflict     → rebase 'feature' onto main ⇒ conflicts on api.ts + utils.ts"
echo "  $ROOT/interactive-rebase  → interactive rebase 'messy-feature': squash WIPs, autosquash fixups"
echo "  $ROOT/bisect-bug          → git bisect: find which commit broke discount() (see .bisect-hint)"
echo "  $ROOT/multi-remote        → origin + upstream diverged; local has 1 unpushed commit"
echo "  $ROOT/octopus-merge       → merge feat/auth feat/api feat/ui (all touch different files)"
echo "  $ROOT/tags-and-releases   → v1.0.0–v2.0.0 annotated tags, lightweight patch tag, hotfix branch"
echo "  $ROOT/detached-head       → HEAD detached at version 3; main→v5, stable→v4"
echo "  $ROOT/collaborators       → 4 authors (Alice/Bob/Carol/Dave), 2 feature branches, merge commits, v1.0.0 tag"
