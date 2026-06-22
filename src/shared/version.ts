/** Minimal semver helpers shared by the main process (update detection) and the
 *  renderer (What's-new "newer version" callout). Tolerant of a leading `v` and
 *  of a `-prerelease` suffix, which it treats as lower than the same release. */

function parse(v: string): { nums: number[]; pre: string } {
  const cleaned = v.trim().replace(/^v/i, '')
  const [core, pre = ''] = cleaned.split('-', 2)
  const nums = core.split('.').map((n) => parseInt(n, 10) || 0)
  while (nums.length < 3) nums.push(0)
  return { nums, pre }
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] < pb.nums[i] ? -1 : 1
  }
  // A release with no prerelease tag outranks one that has it (1.0.0 > 1.0.0-rc).
  if (pa.pre === pb.pre) return 0
  if (!pa.pre) return 1
  if (!pb.pre) return -1
  return pa.pre < pb.pre ? -1 : 1
}

/** True when `candidate` is a strictly newer version than `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}
