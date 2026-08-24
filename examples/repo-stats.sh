#!/usr/bin/env bash
# Measures the git commands Gitcito runs on every refresh, against any repo.
#
#   bash examples/repo-stats.sh                     # the monster repo
#   bash examples/repo-stats.sh ~/code/some-monorepo
#
# Point it at a real repository that feels slow and at the generated monster
# repo, and compare. The commands are the ones the main process actually
# spawns (see `branches()`, `log()` and `status()` in src/main/git.ts), not
# stand-ins — a benchmark of commands the app does not run measures nothing.
#
# Every timing is a wall-clock measurement of a real subprocess, so the numbers
# include process spawn cost. That is deliberate: spawn cost is a real part of
# what a refresh costs, and it is the part Gitcito can actually remove.

set -euo pipefail

R="${1:-$(cd "$(dirname "$0")/.." && pwd)/examples/monster/universal-ish}"
if [ ! -d "$R/.git" ] && [ ! -f "$R/.git" ]; then
  echo "Not a git repository: $R" >&2
  exit 1
fi
R="$(cd "$R" && pwd)"

# Milliseconds, portably. BSD `date` has no %N, so borrow a high-resolution
# clock from whichever runtime is installed.
if perl -MTime::HiRes -e1 >/dev/null 2>&1; then
  now_ms() { perl -MTime::HiRes=time -e 'printf "%.0f", time*1000'; }
elif command -v python3 >/dev/null 2>&1; then
  now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
else
  now_ms() { echo $(( $(date +%s) * 1000 )); }
fi

# Run a command, print how long it took. Output is discarded — we are timing
# git, not the terminal.
timed() {
  local label="$1"; shift
  local start end
  start="$(now_ms)"
  "$@" >/dev/null 2>&1 || true
  end="$(now_ms)"
  printf '  %-58s %6s ms\n' "$label" "$((end - start))"
}

count() { "$@" 2>/dev/null | wc -l | tr -d ' '; }

echo "Repository: $R"
echo
echo "Shape"
printf '  %-42s %12s\n' "commits reachable from HEAD" "$(git -C "$R" rev-list --count HEAD 2>/dev/null || echo '-')"
printf '  %-42s %12s\n' "commits total (--all)" "$(git -C "$R" rev-list --all --count 2>/dev/null || echo '-')"
printf '  %-42s %12s\n' "local branches" "$(count git -C "$R" for-each-ref refs/heads)"
printf '  %-42s %12s\n' "remote branches" "$(count git -C "$R" for-each-ref refs/remotes)"
printf '  %-42s %12s\n' "tags" "$(count git -C "$R" for-each-ref refs/tags)"
printf '  %-42s %12s\n' "remotes configured" "$(count git -C "$R" remote)"
printf '  %-42s %12s\n' "tracked files" "$(count git -C "$R" ls-files)"
printf '  %-42s %12s\n' "untracked files" "$(count git -C "$R" ls-files --others --exclude-standard)"
printf '  %-42s %12s\n' ".git size" "$(du -sh "$(git -C "$R" rev-parse --absolute-git-dir)" 2>/dev/null | cut -f1)"

echo
echo "Config that decides how slow status is"
for key in core.fsmonitor core.untrackedCache core.preloadIndex feature.manyFiles; do
  printf '  %-42s %12s\n' "$key" "$(git -C "$R" config --get "$key" 2>/dev/null || echo 'unset')"
done

echo
echo "Timings — the commands a Gitcito refresh actually spawns"
# A full refresh runs status TWICE: once for the file list and once for the
# tree badges, the second with --ignored -uall, which is the more expensive of
# the two. Both are timed here because both are paid.
timed "status --porcelain=v2 -uall --branch (1st run)" git -C "$R" status --porcelain=v2 --branch -uall -z
timed "status --porcelain=v2 -uall --branch (2nd run)" git -C "$R" status --porcelain=v2 --branch -uall -z
timed "status --porcelain=v1 --ignored -uall (tree badges)" git -C "$R" status --porcelain=v1 --ignored -uall -z
# The real graph query, signature placeholders and all: %G?/%GS make git load
# the gpg config and verify each commit, which is not free at 400 commits.
timed "log --max-count=400 (the graph query, verbatim)" \
  git -C "$R" log --branches --tags --remotes HEAD --ignore-missing --date-order --max-count=400 \
      --pretty=format:'%H%x00%P%x00%an%x00%ae%x00%at%x00%D%x00%s%x00%G?%x00%GS'
timed "log --max-count=400 (same query, no signature fields)" \
  git -C "$R" log --branches --tags --remotes HEAD --ignore-missing --date-order --max-count=400 --pretty=format:%H
timed "for-each-ref refs/heads" git -C "$R" for-each-ref refs/heads
timed "for-each-ref refs/remotes" git -C "$R" for-each-ref refs/remotes
timed "for-each-ref refs/tags" git -C "$R" for-each-ref refs/tags
timed "for-each-ref --merged=HEAD heads+remotes" git -C "$R" for-each-ref --merged=HEAD refs/heads refs/remotes
timed "rev-parse --abbrev-ref HEAD" git -C "$R" rev-parse --abbrev-ref HEAD
timed "rev-parse --absolute-git-dir (mergeState, cached after 1st)" git -C "$R" rev-parse --absolute-git-dir
timed "stash list" git -C "$R" stash list

echo
echo "If the status lines are the outliers, it is not Gitcito — it is git walking"
echo "every tracked file. Try these, then re-run this script:"
echo "  git -C $R config core.fsmonitor true"
echo "  git -C $R config core.untrackedCache true"
echo
echo "Everything above ran against a warm filesystem cache, which flatters the"
echo "status numbers. For a cold measurement on macOS: sudo purge, then re-run."
