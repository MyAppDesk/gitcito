/**
 * Files a build or an editor writes for itself, which nobody meant to commit.
 *
 * Committed `xcuserdata/` is the everyday one: it holds one folder per developer
 * — window positions, breakpoints, the last scheme you picked — so it conflicts
 * on every merge, and each person's copy is worthless to everyone else. The
 * commit guard already knows how to warn and offer *Ignore & untrack*; this is
 * only the question of what counts.
 *
 * Deliberately short. A guard that fires on files people did mean to commit
 * gets dismissed on reflex, and then it is not a guard. Anything ambiguous —
 * `build/`, `dist/`, `vendor/`, a checked-in `node_modules` — is left out, since
 * every one of those is somebody's deliberate choice.
 */

const NOISE: RegExp[] = [
  // Xcode's per-developer state, in the project package and the workspace both.
  /(^|\/)xcuserdata(\/|$)/,
  /\.xcuserdatad(\/|$)/,
  /\.xcuserstate$/,
  // Xcode build output. Only when it is the conventional folder name — a
  // source directory called `DerivedData` would be a strange thing to own.
  /(^|\/)DerivedData(\/|$)/,
  // Finder and Explorer droppings.
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/i
]

/** True when a path is build or editor noise rather than anybody's work. */
export function isBuildNoise(path: string): boolean {
  return NOISE.some((re) => re.test(path))
}

/** The `.gitignore` line that would keep this path out from now on. A directory
 *  of per-developer state is ignored wholesale; a stray file by name, anywhere. */
export function ignoreLineFor(path: string): string {
  const m = /(^|\/)(xcuserdata|DerivedData)(\/|$)/.exec(path)
  if (m) return `${path.slice(0, m.index + (m[1] ? 1 : 0))}${m[2]}/`
  const base = path.split('/').pop() ?? path
  return base
}
