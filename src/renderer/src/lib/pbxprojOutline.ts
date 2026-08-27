/**
 * `project.pbxproj` as Xcode's navigator shows it, for the file preview.
 *
 * The file is a flat dictionary of objects that point at each other by id, so
 * reading it top to bottom tells you almost nothing: the group tree, the
 * targets and the build settings are all there, interleaved, in the order the
 * writer happened to emit them. This walks the references and puts them back
 * into the three shapes a person actually looks for.
 */

import { parsePbxproj, isaOf, type PbxEntry, type PbxDoc } from '../../../shared/pbxproj'

export interface PbxTreeNode {
  /** Empty for the main group, which Xcode draws as the root of the navigator
   *  rather than as a folder in it. The renderer skips the row and keeps the
   *  children — a raw uuid here is exactly what this view exists to avoid. */
  name: string
  /** Present on a group; absent on a file reference. */
  children?: PbxTreeNode[]
}

export interface PbxTarget {
  name: string
  /** `com.apple.product-type.application`, minus nothing — it is a git token. */
  productType: string
  /** `Sources · 12`, `Frameworks · 3` — the phase and how much it carries. */
  phases: { name: string; count: number }[]
}

export interface PbxConfiguration {
  name: string
  settings: { key: string; value: string }[]
}

export interface PbxOutline {
  targets: PbxTarget[]
  tree: PbxTreeNode[]
  configurations: PbxConfiguration[]
  counts: { objects: number; files: number; groups: number }
  objectVersion: string
}

/** A named string field of an object, '' when it is absent or not a string. */
function field(entry: PbxEntry, key: string): string {
  if (entry.value.kind !== 'dict') return ''
  const e = entry.value.entries.find((x) => x.key === key)
  return e && e.value.kind === 'string' ? e.value.value : ''
}

/** The uuids in an array field — `children`, `files`, `buildPhases`. */
function refs(entry: PbxEntry, key: string): string[] {
  if (entry.value.kind !== 'dict') return []
  const e = entry.value.entries.find((x) => x.key === key)
  if (!e || e.value.kind !== 'array') return []
  return e.value.items.flatMap((it) => (it.value.kind === 'string' ? [it.value.value] : []))
}

/** What to call an object: the `name` Xcode set, else its `path`, else the
 *  annotation it wrote beside the id. */
function label(entry: PbxEntry): string {
  return field(entry, 'name') || field(entry, 'path') || entry.keyComment || ''
}

/** The same, but never empty — for the places a row must say something. */
function displayName(entry: PbxEntry, uuid: string): string {
  return label(entry) || uuid
}

/** A phase's class turned back into the label Xcode shows in the target editor. */
function phaseLabel(isa: string): string {
  return isa.replace(/^PBX/, '').replace(/BuildPhase$/, '')
}

function buildTree(doc: PbxDoc, uuid: string, seen: Set<string>): PbxTreeNode | null {
  // A malformed file can point a group at an ancestor; without this the walk
  // never returns.
  if (seen.has(uuid)) return null
  const entry = doc.objects.get(uuid)
  if (!entry) return null
  const isa = isaOf(entry)
  if (isa !== 'PBXGroup' && isa !== 'PBXVariantGroup' && isa !== 'XCVersionGroup') {
    return { name: displayName(entry, uuid) }
  }
  // A group keeps whatever Xcode called it, and nothing when it called it
  // nothing — the main group has neither a name nor a path.
  const name = label(entry)
  seen.add(uuid)
  const children = refs(entry, 'children')
    .map((child) => buildTree(doc, child, seen))
    .filter((n): n is PbxTreeNode => n !== null)
  seen.delete(uuid)
  return { name, children }
}

/** Read a project into the three views. Null when the file will not parse — the
 *  preview then says so rather than showing an empty navigator. */
export function pbxprojOutline(text: string): PbxOutline | null {
  const doc = parsePbxproj(text)
  if (!doc) return null

  let files = 0
  let groups = 0
  const groupUuids: string[] = []
  const childOfSomeGroup = new Set<string>()
  const targets: PbxTarget[] = []
  const configurations: PbxConfiguration[] = []

  for (const [uuid, entry] of doc.objects) {
    const isa = isaOf(entry)
    if (isa === 'PBXFileReference') files++
    if (isa === 'PBXGroup' || isa === 'PBXVariantGroup' || isa === 'XCVersionGroup') {
      groups++
      groupUuids.push(uuid)
      for (const child of refs(entry, 'children')) childOfSomeGroup.add(child)
    }
    if (isa === 'PBXNativeTarget' || isa === 'PBXAggregateTarget') {
      targets.push({
        name: displayName(entry, uuid),
        productType: field(entry, 'productType'),
        phases: refs(entry, 'buildPhases').flatMap((p) => {
          const phase = doc.objects.get(p)
          if (!phase) return []
          return [{ name: phaseLabel(isaOf(phase)), count: refs(phase, 'files').length }]
        })
      })
    }
    if (isa === 'XCBuildConfiguration') {
      const settingsEntry =
        entry.value.kind === 'dict'
          ? entry.value.entries.find((x) => x.key === 'buildSettings')
          : undefined
      const settings =
        settingsEntry && settingsEntry.value.kind === 'dict'
          ? settingsEntry.value.entries.map((s) => ({
              key: s.key,
              value: s.value.kind === 'string' ? s.value.value : '…'
            }))
          : []
      configurations.push({ name: displayName(entry, uuid), settings })
    }
  }

  // The main group is the one nobody lists as a child. Xcode writes exactly one;
  // an odd file can have none or several, and both render fine.
  const seen = new Set<string>()
  const tree = groupUuids
    .filter((u) => !childOfSomeGroup.has(u))
    .map((u) => buildTree(doc, u, seen))
    .filter((n): n is PbxTreeNode => n !== null)

  const versionEntry = doc.root.entries.find((e) => e.key === 'objectVersion')
  return {
    targets,
    tree,
    configurations,
    counts: { objects: doc.objects.size, files, groups },
    objectVersion:
      versionEntry && versionEntry.value.kind === 'string' ? versionEntry.value.value : ''
  }
}
