import type { LaunchConfig, LaunchGroup, LaunchInput } from '../../../shared/types'

/**
 * Collect, in first-seen order, the `${input:id}` ids referenced by the config
 * about to run (compound members included) and the tasks it triggers, limited
 * to ids that actually have a definition in the group's `inputs`.
 */
export function collectInputRefs(group: LaunchGroup, config: LaunchConfig): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const scan = (v: unknown): void => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\$\{input:([^}]+)\}/g)) {
        const id = m[1]
        if (!seen.has(id) && group.inputs.some((i) => i.id === id)) {
          seen.add(id)
          ids.push(id)
        }
      }
    } else if (Array.isArray(v)) {
      v.forEach(scan)
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(scan)
    }
  }
  const configsToScan = Array.isArray(config.compound)
    ? config.compound.map((n) => group.configs.find((c) => c.name === n)).filter(Boolean)
    : [config]
  configsToScan.forEach(scan)
  // Tasks reachable via preLaunchTask / postDebugTask (and their dependsOn).
  const taskLabels = new Set<string>()
  const addTask = (label?: string): void => {
    if (!label || taskLabels.has(label)) return
    taskLabels.add(label)
    const task = group.tasks.find((t) => t.label === label)
    const deps = task?.dependsOn ? (Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn]) : []
    deps.forEach(addTask)
  }
  configsToScan.forEach((c) => {
    addTask(c?.preLaunchTask)
    addTask(c?.postDebugTask)
  })
  group.tasks.filter((t) => taskLabels.has(t.label)).forEach(scan)
  return ids
}

/** A `pickString` option normalised to what the picker renders: VS Code allows
 *  both raw strings and `{ label?, value }` objects in the same array. */
export interface PickOption {
  label: string
  value: string
}

export function normalizeOptions(input: LaunchInput): PickOption[] {
  return (input.options ?? []).map((o) =>
    typeof o === 'string' ? { label: o, value: o } : { label: o.label ?? o.value, value: o.value }
  )
}

/** Index of the option preselected when the picker opens: the input's
 *  `default` when it matches an option's value, else the first option. */
export function defaultOptionIndex(input: LaunchInput): number {
  const options = normalizeOptions(input)
  const i = options.findIndex((o) => o.value === input.default)
  return i >= 0 ? i : 0
}

/** True when the input renders as a picker (has options), not a text field. */
export function isPickInput(input: LaunchInput): boolean {
  return input.type === 'pickString' && (input.options?.length ?? 0) > 0
}
