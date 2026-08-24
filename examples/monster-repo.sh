#!/usr/bin/env bash
# Builds a synthetic repository the size of a large corporate monorepo, so the
# slow paths in Gitcito can be measured on a laptop instead of guessed at.
#
# This is NOT part of the playground. The playground is wiped and rebuilt on
# every `npm run playground`, and a monster repo is not something you want
# rebuilt from under you mid-measurement — it lives in examples/monster/
# (gitignored) and nothing regenerates it automatically.
#
# Usage:
#   bash examples/monster-repo.sh                    # huge preset (see below)
#   bash examples/monster-repo.sh --preset small     # a few seconds, to try the script
#   bash examples/monster-repo.sh --dir /tmp/beast --force
#   MONSTER_COMMITS=50000 MONSTER_FILES=40000 bash examples/monster-repo.sh --preset custom
#
# Flags: --preset small|medium|huge|custom  --dir PATH  --force  --pad-mb N
#        --no-commit-graph
#
# Presets, measured on an M-series Mac:
#
#   preset   commits   files   remote refs   tags   build   .git
#   small      2 000   3 000            60     20     ~1s   2.2M
#   medium    25 000  25 000           600    120     ~5s    35M
#   huge     140 000  92 000         3 436    557    ~25s   130M
#
# What it deliberately does NOT reproduce: the 10GB .git of the repo this was
# modelled on. That size comes from years of large binary blobs; it costs a long
# time to write and measures nothing, because `status`, `log` and `for-each-ref`
# are bounded by file count, commit count and ref count, none of which care how
# fat the blobs are. Use --pad-mb if you want the disk footprint anyway.
#
# Also deliberately absent: core.fsmonitor and core.untrackedCache. The real repo
# has neither, and that is exactly why its `git status` takes seconds. Turn them
# on afterwards and re-run examples/repo-stats.sh to see what they buy:
#   git -C <repo> config core.fsmonitor true
#   git -C <repo> config core.untrackedCache true
#
# One honest caveat: the generated files are ~120 bytes of ASCII each, so a
# `git status` here is faster than on a real tree of the same file count, where
# each lstat lands on a bigger, colder file. Treat the absolute number as a floor
# and the ratios between commands as the useful signal.

set -euo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"

DIR="$REPO_ROOT/examples/monster/universal-ish"
PRESET=huge
FORCE=0
PAD_MB=0
COMMIT_GRAPH=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --preset) PRESET="${2:?--preset needs a value}"; shift 2;;
    --dir) DIR="${2:?--dir needs a path}"; shift 2;;
    --pad-mb) PAD_MB="${2:?--pad-mb needs a number}"; shift 2;;
    --force) FORCE=1; shift;;
    --no-commit-graph) COMMIT_GRAPH=0; shift;;
    -h|--help) sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) echo "Unknown argument: $1" >&2; exit 2;;
  esac
done

# Presets set defaults only — an explicit env var always wins, so
# `MONSTER_FILES=200000 ... --preset medium` does what it says.
case "$PRESET" in
  small)
    : "${MONSTER_COMMITS:=2000}" "${MONSTER_FILES:=3000}" "${MONSTER_SIDE_COMMITS:=200}"
    : "${MONSTER_SIDE_BRANCHES:=10}" "${MONSTER_REMOTE_REFS:=60}" "${MONSTER_TAGS:=20}"
    ;;
  medium)
    : "${MONSTER_COMMITS:=25000}" "${MONSTER_FILES:=25000}" "${MONSTER_SIDE_COMMITS:=2000}"
    : "${MONSTER_SIDE_BRANCHES:=50}" "${MONSTER_REMOTE_REFS:=600}" "${MONSTER_TAGS:=120}"
    ;;
  huge)
    : "${MONSTER_COMMITS:=140000}" "${MONSTER_FILES:=92000}" "${MONSTER_SIDE_COMMITS:=11000}"
    : "${MONSTER_SIDE_BRANCHES:=200}" "${MONSTER_REMOTE_REFS:=3436}" "${MONSTER_TAGS:=557}"
    ;;
  custom) ;;
  *) echo "Unknown preset: $PRESET (small | medium | huge | custom)" >&2; exit 2;;
esac
: "${MONSTER_LOCAL_BRANCHES:=6}"
export MONSTER_COMMITS MONSTER_FILES MONSTER_SIDE_COMMITS MONSTER_SIDE_BRANCHES \
       MONSTER_REMOTE_REFS MONSTER_TAGS MONSTER_LOCAL_BRANCHES

if [ -e "$DIR" ]; then
  if [ "$FORCE" -eq 1 ]; then
    echo "Removing existing $DIR"
    rm -rf "$DIR"
  else
    echo "$DIR already exists. Pass --force to rebuild it, or --dir for another path." >&2
    exit 1
  fi
fi

echo "Building $PRESET monster repo at $DIR"
echo "  ${MONSTER_COMMITS} commits · ${MONSTER_FILES} files · ${MONSTER_REMOTE_REFS} remote refs · ${MONSTER_TAGS} tags"
echo

mkdir -p "$DIR"
git -C "$DIR" init -q -b main

# Deterministic identity, and no background gc — an auto-gc kicking in halfway
# through would make the build time meaningless and is not what we are measuring.
cat >> "$DIR/.git/config" <<'EOF'
[user]
	name = Monster
	email = monster@example.com
[commit]
	gpgsign = false
[gc]
	auto = 0
EOF

started=$SECONDS

# fsync=none for the import only — passed with -c rather than written to the
# config, so the finished repo behaves like any other repo when Gitcito uses it.
echo "→ fast-import…"
node "$REPO_ROOT/examples/monster-repo.mjs" \
  | git -C "$DIR" -c core.fsync=none -c core.fsyncMethod=writeout-only \
        fast-import --force --quiet --done

echo "→ packing refs…"
git -C "$DIR" pack-refs --all

# A repo this size that anyone has ever fetched into has a commit-graph — git
# writes one automatically. Without it, `log` and `--merged=HEAD` walk raw
# commit objects and come out several times slower than the real repo they are
# meant to imitate, which would send you optimising a cost the user never pays.
if [ "$COMMIT_GRAPH" -eq 1 ]; then
  echo "→ writing the commit-graph…"
  git -C "$DIR" commit-graph write --reachable --changed-paths
fi

echo "→ checking out the working tree (${MONSTER_FILES} files)…"
git -C "$DIR" reset -q --hard main

# A remote so the UI has something to show in the branch lists. The URL is never
# contacted — there is no fetch here, and fetching it would fail.
git -C "$DIR" remote add origin https://example.invalid/monster.git
git -C "$DIR" config branch.main.remote origin
git -C "$DIR" config branch.main.merge refs/heads/main

if [ "$PAD_MB" -gt 0 ]; then
  echo "→ padding .git with ${PAD_MB}MB of incompressible blobs…"
  pad="$DIR/.pad.bin"
  dd if=/dev/urandom of="$pad" bs=1048576 count="$PAD_MB" status=none
  git -C "$DIR" add -f .pad.bin
  git -C "$DIR" -c core.fsync=none commit -qm "chore: vendor a large binary asset"
  git -C "$DIR" rm -q --cached .pad.bin
  rm -f "$pad"
  git -C "$DIR" -c core.fsync=none commit -qm "chore: drop the large binary asset"
fi

elapsed=$((SECONDS - started))
echo
echo "Built in ${elapsed}s."
echo
bash "$REPO_ROOT/examples/repo-stats.sh" "$DIR"
