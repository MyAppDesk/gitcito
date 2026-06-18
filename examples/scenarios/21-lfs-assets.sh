# shellcheck shell=bash disable=SC2154
# 21. lfs-assets — a repo that tracks binaries with Git LFS, for the LFS manager
# (tracked patterns, LFS file list, pull/prune). If git-lfs is installed it sets
# up real LFS filters; otherwise it writes the .gitattributes by hand so the repo
# is LFS-ready and the manager shows the "git-lfs not installed" banner.
R="$ROOT/lfs-assets"
new_repo "$R"

printf "# LFS Assets\n\nTracks *.bin and *.psd via Git LFS. Open Toolbar → LFS.\n" > "$R/README.md"
git -C "$R" add README.md && git -C "$R" commit -qm "docs: readme"

if git lfs version >/dev/null 2>&1; then
  git -C "$R" lfs install --local >/dev/null 2>&1
  git -C "$R" lfs track "*.bin" "*.psd" >/dev/null 2>&1
  git -C "$R" add .gitattributes && git -C "$R" commit -qm "chore: track *.bin and *.psd with LFS"
  NOTE="real LFS filters configured"
else
  # No git-lfs binary: write the attributes by hand so the repo is LFS-ready.
  printf '*.bin filter=lfs diff=lfs merge=lfs -text\n*.psd filter=lfs diff=lfs merge=lfs -text\n' > "$R/.gitattributes"
  git -C "$R" add .gitattributes && git -C "$R" commit -qm "chore: track *.bin and *.psd with LFS"
  NOTE="install git-lfs to populate"
fi

# Binary assets matching the tracked patterns.
dd if=/dev/zero of="$R/asset.bin" bs=1024 count=8 2>/dev/null
printf '8BPS\0\0\0\0fake-photoshop-document\n' > "$R/design.psd"
git -C "$R" add -A && git -C "$R" commit -qm "feat: add binary assets (asset.bin, design.psd)"

summary "lfs-assets" "Git LFS: tracked patterns + binary assets ($NOTE)"
