/**
 * Dependency lockfiles, and what to do when two branches both changed one.
 *
 * A lockfile is generated, not written. Merging its text is the one resolution
 * that is almost always wrong: the file records a solved dependency graph, and
 * half of one solution stitched to half of another is a graph nobody solved.
 * Git cannot know that, so it offers the same three-pane surgery it offers for
 * source, and people do it — carefully, at length, and to no purpose.
 *
 * The right move is take a side and regenerate. That takes one command, and the
 * command is the only thing worth showing.
 */

export interface Lockfile {
  /** The tool that owns the file — a product name, never translated. */
  manager: string
  /** The command that regenerates it, to run after taking a side. */
  command: string
}

// Matched on the whole repo-relative path so a vendored copy deep in the tree is
// recognised too. Ordered most-specific first: `pnpm-lock.yaml` before any
// generic yaml rule would go, were one ever added.
const LOCKFILES: { re: RegExp; manager: string; command: string }[] = [
  { re: /(^|\/)Package\.resolved$/, manager: 'Swift Package Manager', command: 'xcodebuild -resolvePackageDependencies' },
  { re: /(^|\/)Podfile\.lock$/, manager: 'CocoaPods', command: 'pod install' },
  { re: /(^|\/)Cartfile\.resolved$/, manager: 'Carthage', command: 'carthage update' },
  { re: /(^|\/)pnpm-lock\.yaml$/, manager: 'pnpm', command: 'pnpm install' },
  { re: /(^|\/)yarn\.lock$/, manager: 'Yarn', command: 'yarn install' },
  { re: /(^|\/)package-lock\.json$/, manager: 'npm', command: 'npm install' },
  { re: /(^|\/)bun\.lockb?$/, manager: 'Bun', command: 'bun install' },
  { re: /(^|\/)Cargo\.lock$/, manager: 'Cargo', command: 'cargo build' },
  { re: /(^|\/)Gemfile\.lock$/, manager: 'Bundler', command: 'bundle install' },
  { re: /(^|\/)composer\.lock$/, manager: 'Composer', command: 'composer update --lock' },
  { re: /(^|\/)poetry\.lock$/, manager: 'Poetry', command: 'poetry lock' },
  { re: /(^|\/)uv\.lock$/, manager: 'uv', command: 'uv lock' },
  { re: /(^|\/)pubspec\.lock$/, manager: 'pub', command: 'dart pub get' },
  { re: /(^|\/)go\.sum$/, manager: 'Go modules', command: 'go mod tidy' },
  { re: /(^|\/)gradle\.lockfile$/, manager: 'Gradle', command: 'gradle dependencies --write-locks' },
  { re: /(^|\/)mix\.lock$/, manager: 'Mix', command: 'mix deps.get' }
]

/** The lockfile this path is, or null when it is an ordinary file. */
export function lockfileFor(path: string): Lockfile | null {
  const hit = LOCKFILES.find((l) => l.re.test(path))
  return hit ? { manager: hit.manager, command: hit.command } : null
}
