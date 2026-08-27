// macOS/Xcode package directories — a folder on disk, one document to the user.
// Finder opens them rather than descending into them, and so does the file tree:
// `MyApp.xcodeproj` expanded to reveal `project.pbxproj` and `xcuserdata` is
// noise for everyone who is not resolving a project-file conflict.
//
// Deliberately narrow. `.xcassets` and `.lproj` are packages too, but people
// genuinely edit the files inside them, so they stay ordinary folders.

const BUNDLE_EXT =
  /\.(xcodeproj|xcworkspace|xcuserdatad|playground|app|framework|dSYM|appex|xcframework)$/i

/** True when a directory name is a package the user thinks of as one item. */
export function isBundleDir(name: string): boolean {
  return BUNDLE_EXT.test(name)
}
