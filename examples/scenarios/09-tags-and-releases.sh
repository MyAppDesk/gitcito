# shellcheck shell=bash disable=SC2154
# 09. tags-and-releases — annotated + lightweight tags, hotfix branch off an old tag, breaking v2.
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

summary "tags-and-releases" "v1.0.0–v2.0.0 annotated tags, lightweight patch tag, hotfix branch"
