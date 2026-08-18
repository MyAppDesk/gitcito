import type { LaunchConfig, LaunchTask } from '../../../shared/types'

/** Ordered `preLaunchTask` chain for a config: `dependsOn` expanded depth-first
 *  (dependencies before dependents), deduped — the order the tasks would run. */
export function taskChain(config: LaunchConfig, tasks: LaunchTask[]): string[] {
  const out: string[] = []
  const walk = (label: string | undefined, seen: Set<string>): void => {
    if (!label || seen.has(label)) return
    seen.add(label)
    const task = tasks.find((t) => t.label === label)
    if (!task) return
    const deps = task.dependsOn ? (Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]) : []
    for (const d of deps) walk(d, seen)
    out.push(label)
  }
  walk(config.preLaunchTask, new Set())
  return out
}

/**
 * Task labels that appear in two or more members' chains, in run order.
 * VS Code runs a task once even when several compound members depend on it —
 * these are the tasks a compound launch must hoist into a single up-front run,
 * so a version-bump script asks (and bumps) once, not once per member.
 */
export function sharedTaskLabels(members: LaunchConfig[], tasks: LaunchTask[]): string[] {
  const chains = members.map((m) => taskChain(m, tasks))
  const counts = new Map<string, number>()
  for (const chain of chains) for (const label of chain) counts.set(label, (counts.get(label) ?? 0) + 1)
  const shared: string[] = []
  for (const chain of chains) {
    for (const label of chain) {
      if ((counts.get(label) ?? 0) >= 2 && !shared.includes(label)) shared.push(label)
    }
  }
  return shared
}

/** True when a member has nothing left to do once the shared tasks have run
 *  elsewhere: an attach-style config whose entire chain was hoisted. Spawning
 *  it would only produce a "not runnable" error pane. */
export function memberFullyCovered(member: LaunchConfig, tasks: LaunchTask[], shared: string[]): boolean {
  const own = taskChain(member, tasks).filter((l) => !shared.includes(l))
  if (own.length > 0) return false
  const request = (member.request ?? 'launch').toLowerCase()
  const hasWork =
    !!member.program ||
    typeof member.command === 'string' ||
    typeof member.url === 'string' ||
    !!member.runtimeExecutable
  return request === 'attach' && !hasWork
}
