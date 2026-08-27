# shellcheck shell=bash disable=SC2154
# 65. xcode-project — an Xcode project whose project.pbxproj conflicts on merge.
# Sourced by setup-playground.sh with $ROOT and lib helpers in scope.
#
# Two shapes, deliberately:
#   feature  ⇒ each side added a different Swift file. Textually a conflict,
#              structurally nothing to decide — the case the structural merge
#              exists for.
#   bump     ⇒ both sides moved MARKETING_VERSION. A real disagreement, and the
#              one thing the structural merge must refuse to guess.
R="$ROOT/xcode-project"
new_repo "$R"

mkdir -p "$R/Demo.xcodeproj" "$R/Demo"

# Xcode mints a random 24-hex id per object, so two branches adding a file each
# get different ids — that is why the additions are independent and why a
# structural merge can take both. Map each name to a fixed id here so the repo
# is reproducible without pretending the ids collide.
id_for() {
  case "$1" in
    Login.swift) echo 3 ;;
    Signup.swift) echo 4 ;;
    *) echo 9 ;;
  esac
}

# Emit a whole project.pbxproj. $1 is MARKETING_VERSION, the rest are extra
# source file names — writing the file out in full keeps every state exact
# rather than depending on the order sed happened to patch things in.
write_proj() {
  local version="$1"; shift
  local i n
  {
    echo '// !$*UTF8*$!'
    echo '{'
    printf '\tarchiveVersion = 1;\n\tclasses = {\n\t};\n\tobjectVersion = 56;\n\tobjects = {\n\n'

    echo '/* Begin PBXBuildFile section */'
    printf '\t\tA1B0000000000000000001 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = A1C0000000000000000001 /* AppDelegate.swift */; };\n'
    printf '\t\tA1B0000000000000000002 /* ViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = A1C0000000000000000002 /* ViewController.swift */; };\n'
    for n in "$@"; do
      i="$(id_for "$n")"
      printf '\t\tA1B000000000000000000%s /* %s in Sources */ = {isa = PBXBuildFile; fileRef = A1C000000000000000000%s /* %s */; };\n' "$i" "$n" "$i" "$n"
    done
    echo '/* End PBXBuildFile section */'
    echo

    echo '/* Begin PBXFileReference section */'
    printf '\t\tA1C0000000000000000001 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };\n'
    printf '\t\tA1C0000000000000000002 /* ViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ViewController.swift; sourceTree = "<group>"; };\n'
    printf '\t\tA1C0000000000000000090 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };\n'
    printf '\t\tA1C0000000000000000091 /* Demo.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = Demo.entitlements; sourceTree = "<group>"; };\n'
    for n in "$@"; do
      i="$(id_for "$n")"
      printf '\t\tA1C000000000000000000%s /* %s */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = %s; sourceTree = "<group>"; };\n' "$i" "$n" "$n"
    done
    echo '/* End PBXFileReference section */'
    echo

    echo '/* Begin PBXGroup section */'
    printf '\t\tA1D0000000000000000001 = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\tA1D0000000000000000002 /* Demo */,\n\t\t\t);\n\t\t\tsourceTree = "<group>";\n\t\t};\n'
    printf '\t\tA1D0000000000000000002 /* Demo */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
    printf '\t\t\t\tA1C0000000000000000001 /* AppDelegate.swift */,\n'
    printf '\t\t\t\tA1C0000000000000000002 /* ViewController.swift */,\n'
    for n in "$@"; do
      i="$(id_for "$n")"
      printf '\t\t\t\tA1C000000000000000000%s /* %s */,\n' "$i" "$n"
    done
    printf '\t\t\t\tA1C0000000000000000090 /* Info.plist */,\n'
    printf '\t\t\t\tA1C0000000000000000091 /* Demo.entitlements */,\n'
    printf '\t\t\t);\n\t\t\tpath = Demo;\n\t\t\tsourceTree = "<group>";\n\t\t};\n'
    echo '/* End PBXGroup section */'
    echo

    echo '/* Begin PBXNativeTarget section */'
    printf '\t\tA1E0000000000000000001 /* Demo */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildPhases = (\n\t\t\t\tA1F0000000000000000001 /* Sources */,\n\t\t\t);\n\t\t\tname = Demo;\n\t\t\tproductName = Demo;\n\t\t\tproductType = "com.apple.product-type.application";\n\t\t};\n'
    echo '/* End PBXNativeTarget section */'
    echo

    echo '/* Begin PBXSourcesBuildPhase section */'
    printf '\t\tA1F0000000000000000001 /* Sources */ = {\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n'
    printf '\t\t\t\tA1B0000000000000000001 /* AppDelegate.swift in Sources */,\n'
    printf '\t\t\t\tA1B0000000000000000002 /* ViewController.swift in Sources */,\n'
    for n in "$@"; do
      i="$(id_for "$n")"
      printf '\t\t\t\tA1B000000000000000000%s /* %s in Sources */,\n' "$i" "$n"
    done
    printf '\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n'
    echo '/* End PBXSourcesBuildPhase section */'
    echo

    echo '/* Begin XCBuildConfiguration section */'
    printf '\t\tA200000000000000000001 /* Debug */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = %s;\n\t\t\t\tSWIFT_VERSION = 5.0;\n\t\t\t};\n\t\t\tname = Debug;\n\t\t};\n' "$version"
    echo '/* End XCBuildConfiguration section */'

    printf '\t};\n\trootObject = A1A0000000000000000001 /* Project object */;\n}\n'
  } > "$R/Demo.xcodeproj/project.pbxproj"
}

swift_file() { printf 'import UIKit\n\nfinal class %s {\n}\n' "${1%.swift}" > "$R/Demo/$1"; }

swift_file AppDelegate.swift
swift_file ViewController.swift
write_proj 1.0

# An XML plist and an entitlements file, so the plist preview has both a nested
# dictionary and an array to render.
cat > "$R/Demo/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>Demo</string>
	<key>CFBundleIdentifier</key>
	<string>com.example.demo</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchScreen</key>
	<dict>
		<key>UIColorName</key>
		<string>LaunchBackground</string>
	</dict>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>NSCameraUsageDescription</key>
	<string>Demo uses the camera to scan QR codes.</string>
</dict>
</plist>
EOF
cat > "$R/Demo/Demo.entitlements" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.example.demo</string>
	</array>
	<key>aps-environment</key>
	<string>development</string>
</dict>
</plist>
EOF
# A UTF-16 .strings file — the encoding Xcode used for most of its life, and the
# reason git calls these binary and shows no diff at all.
mkdir -p "$R/Demo/en.lproj"
printf '/* The greeting on the home screen */\n"home.greeting" = "Hello";\n"home.subtitle" = "Welcome back";\n' \
  | iconv -f UTF-8 -t UTF-16 > "$R/Demo/en.lproj/Localizable.strings"

cat > "$R/.gitignore" <<'EOF'
.DS_Store
EOF

# Committed by mistake, as it is in a great many real projects: Xcode's
# per-developer state. One folder per person, worthless to everybody else, and a
# conflict on every merge — what the commit guard offers to ignore and untrack.
mkdir -p "$R/Demo.xcodeproj/xcuserdata/carlos.xcuserdatad/xcschemes"
printf 'bplist00 (not really — a placeholder standing in for Xcode window state)\n' \
  > "$R/Demo.xcodeproj/xcuserdata/carlos.xcuserdatad/UserInterfaceState.xcuserstate"
cat > "$R/Demo.xcodeproj/xcuserdata/carlos.xcuserdatad/xcschemes/xcschememanagement.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>SchemeUserState</key>
	<dict>
		<key>Demo.xcscheme_^#shared#^_</key>
		<dict>
			<key>orderHint</key>
			<integer>0</integer>
		</dict>
	</dict>
</dict>
</plist>
EOF

# A CocoaPods lockfile, so a merge can collide on a file whose text nobody
# should be merging by hand.
cat > "$R/Podfile.lock" <<'EOF'
PODS:
  - Alamofire (5.8.0)
  - SnapKit (5.6.0)

DEPENDENCIES:
  - Alamofire
  - SnapKit

SPEC CHECKSUMS:
  Alamofire: 3ca42e259043ee0dc5c0cdd76c4bc568b8e42af7
  SnapKit: a42d492c16e80209130a3379f73596c3454b7694

PODFILE CHECKSUM: 7c0ecbd0f0ce0cb5c1ac4d84d94ab0e9dcbf6f8d

COCOAPODS: 1.15.2
EOF
git -C "$R" add -A && git -C "$R" commit -qm "initial Demo app"

# ── feature: adds Login.swift ────────────────────────────────────────────────
git -C "$R" checkout -qb feature
swift_file Login.swift
write_proj 1.0 Login.swift
git -C "$R" add -A && git -C "$R" commit -qm "feature: add the login screen"

# ── bump: moves MARKETING_VERSION, and nothing else ──────────────────────────
git -C "$R" checkout -q main
git -C "$R" checkout -qb bump
write_proj 2.0
git -C "$R" add -A && git -C "$R" commit -qm "bump: marketing version 2.0"

# ── pods: bumps Alamofire; main bumps SnapKit ────────────────────────────────
git -C "$R" checkout -q main
git -C "$R" checkout -qb pods
sed -i.bak 's/Alamofire (5.8.0)/Alamofire (5.9.1)/; s/3ca42e259043ee0dc5c0cdd76c4bc568b8e42af7/f0f1d4b4c4a5c0d8a1c0b8e6d1f2a3b4c5d6e7f8/' "$R/Podfile.lock"
rm -f "$R/Podfile.lock.bak"
git -C "$R" add -A && git -C "$R" commit -qm "pods: bump Alamofire to 5.9.1"

# ── main: adds Signup.swift and its own version bump ─────────────────────────
git -C "$R" checkout -q main
sed -i.bak 's/SnapKit (5.6.0)/SnapKit (5.7.1)/; s/a42d492c16e80209130a3379f73596c3454b7694/b53e5a3d27f91320241b4a80fa62d7d5e8a9c0b1/' "$R/Podfile.lock"
rm -f "$R/Podfile.lock.bak"
swift_file Signup.swift
write_proj 1.1 Signup.swift
git -C "$R" add -A && git -C "$R" commit -qm "main: add the signup screen"

summary "xcode-project" "an Xcode app whose project.pbxproj conflicts on merge; 'feature' adds a different Swift file (structurally clean, nothing to decide), 'bump' moves MARKETING_VERSION against main's (a real disagreement the structural merge must refuse), 'pods' collides on Podfile.lock (take a side and re-resolve); xcuserdata/ is tracked by mistake, for the commit guard"
