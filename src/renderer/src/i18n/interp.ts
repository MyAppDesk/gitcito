/**
 * Placeholder substitution for translated strings.
 *
 * It lives apart from `index.ts` on purpose: that module reaches into the
 * settings store (and therefore the browser) the moment it loads, while this is
 * pure string work that anything — including a plain Node test — can import.
 */
export function interp(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
